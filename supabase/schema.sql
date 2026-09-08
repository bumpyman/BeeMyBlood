-- ============================================================================
-- BeeMyBlood — accès alpha : demandes d'invitation, codes, NDA, journal
-- À exécuter UNE fois dans Supabase > SQL Editor (projet uyrpozgbfklqfltnduvv).
-- Rejouable : tout est en "if not exists" / "create or replace".
-- Principe : aucune table n'est lisible ou modifiable directement depuis le
-- navigateur (RLS sans policy). Tout passe par les fonctions ci-dessous,
-- qui vérifient elles-mêmes qui appelle (auth.uid(), courriel du jeton).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- Administrateurs (courriels autorisés à approuver) ----------
create table if not exists public.admins (
  email text primary key,
  ajoute_le timestamptz not null default now()
);
insert into public.admins (email) values ('davidzac.issom@hes-so.ch'), ('david.issom@gmail.com')
on conflict do nothing;

-- ---------- Demandes d'accès ----------
create table if not exists public.demandes_acces (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  nom text not null,
  email text not null,
  organisation text,
  role text not null check (role in ('donneur','receveur','pro')),
  motif text,
  statut text not null default 'en_attente' check (statut in ('en_attente','approuvee','refusee','activee')),
  code_hash text,
  code_expire_le timestamptz,
  traitee_le timestamptz,
  traitee_par text,
  note_admin text
);
create unique index if not exists demandes_acces_email_vivante
  on public.demandes_acces (lower(email)) where statut in ('en_attente','approuvee');

-- ---------- Accès activés (une ligne par compte) ----------
create table if not exists public.acces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nom text,
  role text not null check (role in ('donneur','receveur','pro','admin')),
  active_le timestamptz not null default now(),
  demande_id uuid references public.demandes_acces(id)
);

-- ---------- NDA : versions et signatures ----------
create table if not exists public.nda_versions (
  version text primary key,
  titre text not null,
  texte text not null,
  publie_le timestamptz not null default now(),
  courante boolean not null default false
);
create table if not exists public.signatures_nda (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  nom_signe text not null,
  version text not null references public.nda_versions(version),
  signe_le timestamptz not null default now(),
  user_agent text
);
create index if not exists signatures_nda_user on public.signatures_nda (user_id, version);

-- ---------- Journal des accès aux espaces ----------
create table if not exists public.journal_acces (
  id bigserial primary key,
  user_id uuid,
  email text,
  espace text,
  at timestamptz not null default now()
);

-- ---------- RLS : tout fermé, seules les fonctions "security definer" passent ----------
alter table public.admins          enable row level security;
alter table public.demandes_acces  enable row level security;
alter table public.acces           enable row level security;
alter table public.nda_versions    enable row level security;
alter table public.signatures_nda  enable row level security;
alter table public.journal_acces   enable row level security;
revoke all on all tables in schema public from anon, authenticated;

-- ============================================================================
-- Utilitaires
-- ============================================================================
create or replace function public.bmb_hash(t text) returns text
language sql immutable set search_path = public, extensions as $$ select encode(extensions.digest(coalesce(t,''), 'sha256'), 'hex') $$;

-- Code lisible sans caractères ambigus : BMB-XXXX-XXXX
create or replace function public.bmb_nouveau_code() returns text
language plpgsql volatile as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; s text := ''; i int;
begin
  for i in 1..8 loop
    s := s || substr(a, 1 + floor(random()*length(a))::int, 1);
    if i = 4 then s := s || '-'; end if;
  end loop;
  return 'BMB-' || s;
end $$;

create or replace function public.bmb_email_courant() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.admins where lower(email) = public.bmb_email_courant())
$$;

-- ============================================================================
-- Public (anon) : demander un accès, lire le NDA courant
-- ============================================================================
create or replace function public.demander_acces(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_email text := lower(trim(coalesce(p->>'email','')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'courriel_invalide'; end if;
  if length(trim(coalesce(p->>'nom',''))) < 2 then raise exception 'nom_manquant'; end if;
  if coalesce(p->>'role','') not in ('donneur','receveur','pro') then raise exception 'role_invalide'; end if;
  if exists (select 1 from public.demandes_acces where lower(email) = v_email and statut in ('en_attente','approuvee')) then
    return jsonb_build_object('ok', true, 'deja', true);
  end if;
  insert into public.demandes_acces (nom, email, organisation, role, motif)
  values (left(trim(p->>'nom'), 120), v_email, left(trim(coalesce(p->>'organisation','')), 160), p->>'role', left(coalesce(p->>'motif',''), 1000));
  return jsonb_build_object('ok', true, 'deja', false);
end $$;

create or replace function public.nda_courant() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('version', version, 'titre', titre, 'texte', texte, 'publie_le', publie_le)
  from public.nda_versions where courante limit 1
$$;

-- ============================================================================
-- Connecté : état, activation d'un code, signature, journal
-- ============================================================================
create or replace function public.mon_etat() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_email text := public.bmb_email_courant(); v_acces public.acces; v_version text; v_signe boolean;
begin
  if v_uid is null then return jsonb_build_object('connecte', false); end if;
  -- un administrateur reçoit son accès automatiquement, sans code
  if public.est_admin() and not exists (select 1 from public.acces where user_id = v_uid) then
    insert into public.acces (user_id, email, nom, role) values (v_uid, v_email, 'Administrateur', 'admin');
  end if;
  select * into v_acces from public.acces where user_id = v_uid;
  select version into v_version from public.nda_versions where courante limit 1;
  select exists (select 1 from public.signatures_nda where user_id = v_uid and version = v_version) into v_signe;
  return jsonb_build_object(
    'connecte', true, 'email', v_email, 'admin', public.est_admin(),
    'acces', v_acces.user_id is not null, 'role', v_acces.role, 'nom', v_acces.nom,
    'nda_version', v_version, 'nda_signe', coalesce(v_signe, false));
end $$;

create or replace function public.activer_invitation(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_email text := public.bmb_email_courant(); d public.demandes_acces;
begin
  if v_uid is null then raise exception 'non_connecte'; end if;
  if exists (select 1 from public.acces where user_id = v_uid) then
    return jsonb_build_object('ok', true, 'deja', true);
  end if;
  select * into d from public.demandes_acces
   where statut = 'approuvee' and code_hash = public.bmb_hash(upper(trim(p_code)));
  if d.id is null then raise exception 'code_invalide'; end if;
  if lower(d.email) <> v_email then raise exception 'courriel_different'; end if;
  if d.code_expire_le < now() then raise exception 'code_expire'; end if;
  insert into public.acces (user_id, email, nom, role, demande_id) values (v_uid, v_email, d.nom, d.role, d.id);
  update public.demandes_acces set statut = 'activee' where id = d.id;
  return jsonb_build_object('ok', true, 'role', d.role, 'nom', d.nom);
end $$;

create or replace function public.signer_nda(p_nom text, p_version text, p_user_agent text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'non_connecte'; end if;
  if not exists (select 1 from public.acces where user_id = v_uid) then raise exception 'acces_manquant'; end if;
  if length(trim(coalesce(p_nom,''))) < 3 then raise exception 'nom_manquant'; end if;
  if not exists (select 1 from public.nda_versions where version = p_version and courante) then raise exception 'version_obsolete'; end if;
  insert into public.signatures_nda (user_id, email, nom_signe, version, user_agent)
  values (v_uid, public.bmb_email_courant(), left(trim(p_nom), 120), p_version, left(coalesce(p_user_agent,''), 300));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.journaliser_acces(p_espace text) returns void
language sql security definer set search_path = public, extensions as $$
  insert into public.journal_acces (user_id, email, espace)
  select auth.uid(), public.bmb_email_courant(), left(coalesce(p_espace,''), 40) where auth.uid() is not null
$$;

-- ============================================================================
-- Administration
-- ============================================================================
create or replace function public.admin_lister_demandes() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select case when public.est_admin() then coalesce(jsonb_agg(to_jsonb(d) - 'code_hash' order by d.cree_le desc), '[]'::jsonb)
              else null end
  from public.demandes_acces d
$$;

create or replace function public.admin_approuver(p_id uuid, p_jours int default 30) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_code text := public.bmb_nouveau_code(); d public.demandes_acces;
begin
  if not public.est_admin() then raise exception 'non_admin'; end if;
  update public.demandes_acces
     set statut = 'approuvee', code_hash = public.bmb_hash(v_code), code_expire_le = now() + make_interval(days => greatest(1, p_jours)),
         traitee_le = now(), traitee_par = public.bmb_email_courant()
   where id = p_id and statut in ('en_attente','approuvee') returning * into d;
  if d.id is null then raise exception 'demande_introuvable'; end if;
  return jsonb_build_object('code', v_code, 'email', d.email, 'nom', d.nom, 'role', d.role, 'expire_le', d.code_expire_le);
end $$;

create or replace function public.admin_refuser(p_id uuid, p_note text default null) returns void
language sql security definer set search_path = public, extensions as $$
  update public.demandes_acces set statut = 'refusee', traitee_le = now(), traitee_par = public.bmb_email_courant(), note_admin = left(coalesce(p_note,''), 500)
   where id = p_id and public.est_admin()
$$;

create or replace function public.admin_tableau() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select case when public.est_admin() then jsonb_build_object(
    'acces', (select coalesce(jsonb_agg(to_jsonb(a) order by a.active_le desc), '[]'::jsonb) from public.acces a),
    'signatures', (select coalesce(jsonb_agg(jsonb_build_object('email', s.email, 'nom_signe', s.nom_signe, 'version', s.version, 'signe_le', s.signe_le) order by s.signe_le desc), '[]'::jsonb) from public.signatures_nda s),
    'journal', (select coalesce(jsonb_agg(jsonb_build_object('email', j.email, 'espace', j.espace, 'at', j.at) order by j.at desc), '[]'::jsonb) from (select * from public.journal_acces order by at desc limit 200) j)
  ) else null end
$$;

-- ---------- Droits d'exécution ----------
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.demander_acces(jsonb), public.nda_courant() to anon, authenticated;
grant execute on function public.mon_etat(), public.activer_invitation(text), public.signer_nda(text, text, text), public.journaliser_acces(text),
                          public.admin_lister_demandes(), public.admin_approuver(uuid, int), public.admin_refuser(uuid, text), public.admin_tableau(), public.est_admin()
  to authenticated;

-- ============================================================================
-- NDA version 1 (2026-09)
-- ============================================================================
insert into public.nda_versions (version, titre, texte, courante) values ('v1-2026-09',
'Accord de confidentialité — version alpha de BeeMyBlood™',
$nda$Entre : la Haute école de gestion de Genève (HES-SO), Convivens Lab, rue de la Tambourine 17, 1227 Carouge, représentée par le Prof. David-Zacharie Issom (« l’Éditeur »), et la personne qui accepte le présent accord (« le Testeur »).

1. Objet. L’Éditeur donne au Testeur un accès personnel et temporaire à la version alpha de la plateforme BeeMyBlood™ (espaces donneur, receveur, professionnel, jumeau numérique, assistants BeeBot), afin de recueillir son avis et d’améliorer le prototype. Cet accès est un service de recherche, sans contrepartie financière et sans garantie.

2. Informations confidentielles. Sont confidentiels : le contenu des espaces accessibles sur invitation, les fonctionnalités non publiées, les maquettes, les données affichées, les résultats des simulations, les échanges avec les assistants, les documents et informations transmis dans le cadre du test, ainsi que l’existence et le contenu des retours d’autres testeurs. Ne sont pas confidentielles les informations déjà publiques (page d’accueil, page projet, code source publié sous licence AGPL-3.0) ou que le Testeur détenait légitimement avant l’accès.

3. Engagements du Testeur. Le Testeur s’engage à : (a) ne pas divulguer les informations confidentielles à des tiers ni les publier, y compris sous forme de captures d’écran, enregistrements ou descriptions sur les réseaux sociaux ou dans la presse ; (b) n’utiliser l’accès qu’à des fins d’évaluation ; (c) ne pas partager son code d’invitation ni ses codes de connexion ; (d) ne pas tenter de contourner les mesures d’accès, d’extraire massivement des données ou de perturber le service ; (e) signaler à contact@beemyblood.ch toute faille ou tout accès non autorisé dont il aurait connaissance.

4. Données de démonstration. Les personnes, dossiers, stocks et chiffres affichés dans la version alpha sont fictifs ou simulés, sauf mention contraire. Aucune donnée réelle de patient ne doit être saisie dans la plateforme. Le Testeur ne doit pas se fonder sur la plateforme pour une décision médicale ou transfusionnelle.

5. Données du Testeur. L’Éditeur enregistre le nom, l’adresse courriel, l’organisation, le rôle déclaré, la date de signature du présent accord et un journal des connexions aux espaces. Ces données servent uniquement à gérer l’accès, à sécuriser la plateforme et à documenter le test auprès des instances de recherche et de financement. Elles sont hébergées dans l’Union européenne (Supabase) et en Suisse (Infomaniak), conservées au plus trois ans après la fin de la phase alpha, puis supprimées ou anonymisées. Le Testeur peut demander l’accès, la rectification ou la suppression de ses données à contact@beemyblood.ch, conformément à la loi fédérale sur la protection des données (nLPD).

6. Retours et propriété intellectuelle. Les remarques, idées et suggestions transmises par le Testeur peuvent être utilisées librement par l’Éditeur pour améliorer BeeMyBlood™, sans obligation de rémunération ni d’attribution. Le présent accord ne transfère aucun droit sur la plateforme, ses marques (BeeMyBlood™, HémoRush™, BeeBot) ou ses contenus.

7. Durée. L’obligation de confidentialité s’applique dès l’acceptation et pendant deux ans après la fin de l’accès du Testeur, quelle qu’en soit la cause. L’Éditeur peut retirer l’accès à tout moment.

8. Droit applicable et for. Le présent accord est soumis au droit suisse. Le for est à Genève, sous réserve des dispositions impératives.

En saisissant son nom et en cochant la case d’acceptation, le Testeur déclare avoir lu le présent accord et l’accepter. L’horodatage et la version du texte sont enregistrés à titre de preuve.$nda$,
true) on conflict (version) do nothing;

-- ============================================================================
-- Activation automatique (2026-09-08) : voir 2026-09-08-activation-automatique.sql
-- ============================================================================
create or replace function public.mon_etat() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_email text := public.bmb_email_courant(); v_acces public.acces; v_version text; v_signe boolean; d public.demandes_acces; v_demande text;
begin
  if v_uid is null then return jsonb_build_object('connecte', false); end if;
  -- un administrateur reçoit son accès automatiquement
  if public.est_admin() and not exists (select 1 from public.acces where user_id = v_uid) then
    insert into public.acces (user_id, email, nom, role) values (v_uid, v_email, 'Administrateur', 'admin');
  end if;
  -- une demande approuvée pour ce courriel s'active à la première connexion
  if not exists (select 1 from public.acces where user_id = v_uid) then
    select * into d from public.demandes_acces
     where lower(email) = v_email and statut = 'approuvee' and coalesce(code_expire_le, now() + interval '1 day') > now()
     order by traitee_le desc nulls last limit 1;
    if d.id is not null then
      insert into public.acces (user_id, email, nom, role, demande_id) values (v_uid, v_email, d.nom, d.role, d.id);
      update public.demandes_acces set statut = 'activee' where id = d.id;
    end if;
  end if;
  select * into v_acces from public.acces where user_id = v_uid;
  select statut into v_demande from public.demandes_acces where lower(email) = v_email order by cree_le desc limit 1;
  select version into v_version from public.nda_versions where courante limit 1;
  select exists (select 1 from public.signatures_nda where user_id = v_uid and version = v_version) into v_signe;
  return jsonb_build_object(
    'connecte', true, 'email', v_email, 'admin', public.est_admin(),
    'acces', v_acces.user_id is not null, 'role', v_acces.role, 'nom', v_acces.nom,
    'demande', v_demande,
    'nda_version', v_version, 'nda_signe', coalesce(v_signe, false));
end $$;

grant execute on function public.mon_etat() to authenticated;
