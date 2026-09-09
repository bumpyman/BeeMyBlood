-- ============================================================================
-- BeeMyBlood — cycle du don (portail professionnel, groupe « Opérer »)
-- À coller dans Supabase > SQL Editor après schema.sql et les fichiers précédents. Rejouable.
-- Tables : donneur·se·s, réservations (dont liste d'attente), consentements, journal chaîné,
-- paramètres par région (lits, créneaux, lien de réservation en ligne), événements de parcours
-- (clics vers la réservation depuis l'espace donneur, anonymes).
-- Tout passe par des fonctions « security definer » réservées aux comptes de l'espace pro
-- (ou administrateur / développeur) ; les tables restent fermées par RLS.
-- Les données de démonstration sont semées à la première ouverture d'une région (demo = true).
-- ============================================================================

create table if not exists public.cd_parametres (
  region text primary key,
  nom text not null,
  lits int not null default 4,
  creneau_min int not null default 30,
  ouverture text not null default '08:00',
  fermeture text not null default '17:00',
  reservation_url text,
  reservation_label text,
  rappels jsonb not null default '{"r1":true,"r2":true,"r3":true,"r4":true}',
  demo_seme boolean not null default false,
  maj_le timestamptz not null default now()
);

create table if not exists public.cd_donneurs (
  id uuid primary key default gen_random_uuid(),
  region text not null references public.cd_parametres(region),
  prenom text not null,
  nom text not null,
  sexe text check (sexe in ('F','H','X')),
  age int,
  groupe text,
  pheno text,
  dons int not null default 0,
  dernier_don date,
  consent_version text,
  consent_le timestamptz,
  canal text default 'courriel',
  tel text,
  email text,
  hb int,
  poids int,
  voyage boolean default false,
  medic boolean default false,
  demo boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index if not exists cd_donneurs_region on public.cd_donneurs(region);

create table if not exists public.cd_reservations (
  id uuid primary key default gen_random_uuid(),
  region text not null references public.cd_parametres(region),
  donneur_id uuid not null references public.cd_donneurs(id) on delete cascade,
  jour date,
  heure text,
  lit int,
  statut text not null default 'reserve' check (statut in ('attente','reserve','confirme','arrive','questionnaire','prelevement','termine','noshow','ajourne')),
  source text not null default 'interne',
  hb int,
  poids int,
  note text,
  demo boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index if not exists cd_reservations_region_jour on public.cd_reservations(region, jour);

create table if not exists public.cd_consentements (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  donneur_id uuid not null references public.cd_donneurs(id) on delete cascade,
  reservation_id uuid references public.cd_reservations(id) on delete set null,
  version text not null,
  nom_signe text not null,
  signe_le timestamptz not null default now(),
  par text,
  empreinte text not null
);

create table if not exists public.cd_journal (
  id bigserial primary key,
  region text not null,
  quand timestamptz not null default now(),
  acteur text not null,
  action text not null,
  detail text,
  prev_hash text not null,
  hash text not null
);
create index if not exists cd_journal_region on public.cd_journal(region, id desc);

create table if not exists public.cd_evenements (
  id bigserial primary key,
  region text,
  type text not null,
  ref text,
  quand timestamptz not null default now()
);
create index if not exists cd_evenements_quand on public.cd_evenements(quand desc);

alter table public.cd_parametres enable row level security;
alter table public.cd_donneurs enable row level security;
alter table public.cd_reservations enable row level security;
alter table public.cd_consentements enable row level security;
alter table public.cd_journal enable row level security;
alter table public.cd_evenements enable row level security;

-- ---------- régions et liens de réservation en ligne (redirection vers l'outil officiel) ----------
insert into public.cd_parametres (region, nom, reservation_url, reservation_label) values
  ('geneve',   'Genève',    'https://www.onedoc.ch/fr/infirmier/geneve/pb5bt/centre-de-transfusion-sanguine-1', 'Réservation en ligne du CTS des HUG (OneDoc)'),
  ('vaud',     'Vaud',      'https://reservation.ichspendeblut.ch', 'Réservation Transfusion Interrégionale CRS'),
  ('valais',   'Valais',    'https://reservation.ichspendeblut.ch', 'Réservation Transfusion Interrégionale CRS'),
  ('fribourg', 'Fribourg',  'https://www.blutspende.ch/fr/dates-de-collecte-de-sang', 'Dates et réservation, Transfusion CRS Suisse'),
  ('neuchatel','Neuchâtel', 'https://www.blutspende.ch/fr/dates-de-collecte-de-sang', 'Dates et réservation, Transfusion CRS Suisse'),
  ('jura',     'Jura',      'https://www.blutspende.ch/fr/dates-de-collecte-de-sang', 'Dates et réservation, Transfusion CRS Suisse'),
  ('berne',    'Berne',     'https://reservation.ichspendeblut.ch', 'Réservation Transfusion Interrégionale CRS'),
  ('zurich',   'Zürich',    'https://www.blutspendezurich.ch', 'Réservation Blutspende Zürich'),
  ('tessin',   'Tessin',    'https://www.blutspende.ch/fr/dates-de-collecte-de-sang', 'Dates et réservation, Transfusion CRS Suisse')
on conflict (region) do nothing;

-- ---------- droits ----------
create or replace function public.cd_est_pro() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.est_admin()
      or exists (select 1 from public.acces where user_id = auth.uid() and (role in ('pro','admin') or 'pro' = any(coalesce(roles,'{}')) or 'developpeur' = any(coalesce(roles,'{}')) or 'admin' = any(coalesce(roles,'{}'))))
$$;

create or replace function public.cd_acteur() returns text
language sql stable as $$ select coalesce(nullif(public.bmb_email_courant(), ''), 'système') $$;

-- ---------- journal chaîné : chaque entrée porte l'empreinte de la précédente ----------
create or replace function public.cd_journal_ajouter(p_region text, p_action text, p_detail text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_prev text; v_hash text; v_quand timestamptz := now(); v_acteur text := public.cd_acteur(); v_id bigint;
begin
  select hash into v_prev from public.cd_journal where region = p_region order by id desc limit 1;
  v_prev := coalesce(v_prev, repeat('0', 64));
  v_hash := public.bmb_hash(v_prev || '|' || v_quand::text || '|' || v_acteur || '|' || p_action || '|' || coalesce(p_detail, ''));
  insert into public.cd_journal (region, quand, acteur, action, detail, prev_hash, hash)
  values (p_region, v_quand, v_acteur, left(p_action, 200), left(coalesce(p_detail,''), 1000), v_prev, v_hash) returning id into v_id;
  return jsonb_build_object('id', v_id, 'hash', v_hash);
end $$;

create or replace function public.cd_journaliser(p_region text, p_action text, p_detail text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  return public.cd_journal_ajouter(p_region, p_action, p_detail);
end $$;

-- ---------- jeu de démonstration semé à la première ouverture d'une région ----------
create or replace function public.cd_semer_demo(p_region text) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  prenoms text[] := array['Marc','Julie','Nadia','Luca','Sofia','Yann','Amina','Pierre','Chloé','Karim','Elena','Thomas','Fatou','Nicolas','Laure','Mehdi','Anna','David','Inès','Samuel','Léa','Omar','Camille','Hugo','Sara','Ismaël','Émilie','Jonas','Aïcha','Benoît','Zoé','Rafael','Mia','Adrien','Noor','Julien','Elif','Bastien','Mariam','Loïc'];
  noms text[] := array['Rossier','Favre','Martin','Bianchi','Keller','Da Silva','Müller','Nguyen','Roulet','Berset','Diallo','Schmid','Girard','Pittet','Mendes','Huber','Bonvin','Costa','Morel','Weber','Haddad','Rey','Zbinden','Perrin','Okafor','Baumann','Chevalley','Gomez','Vuille','Steiner'];
  groupes text[] := array['O+','O+','O+','O+','A+','A+','A+','A+','B+','AB+','O−','O−','A−','B−'];
  phenos text[] := array['CcDee K−','ccDEe K−','CCDee K−','ccdee K−','CcDEe K+','ccDee K−','Ccdee K−','ccDEE K−'];
  canaux text[] := array['courriel','courriel','courriel','SMS','push'];
  v_p public.cd_parametres; v_n int := 0; i int; v_sexe text; v_dernier date; v_id uuid; v_ids uuid[] := '{}';
  v_slots text[] := '{}'; v_h int; v_m int; v_slot text; v_lit int; v_statut text; v_now numeric; v_hh numeric; k int;
begin
  select * into v_p from public.cd_parametres where region = p_region;
  if v_p.region is null then raise exception 'region_inconnue'; end if;
  if v_p.demo_seme or exists (select 1 from public.cd_donneurs where region = p_region) then return 0; end if;
  perform setseed(0.42);
  for i in 1..42 loop
    v_sexe := case when random() < 0.52 then 'F' else 'H' end;
    v_dernier := current_date - floor(random()*420)::int;
    insert into public.cd_donneurs (region, prenom, nom, sexe, age, groupe, pheno, dons, dernier_don, consent_version, consent_le, canal, tel, hb, poids, voyage, medic, demo)
    values (p_region, prenoms[1+floor(random()*array_length(prenoms,1))::int], noms[1+floor(random()*array_length(noms,1))::int], v_sexe, 18+floor(random()*52)::int,
            groupes[1+floor(random()*array_length(groupes,1))::int], phenos[1+floor(random()*array_length(phenos,1))::int], 1+floor(random()*18)::int, v_dernier,
            case when random() < 0.8 then 'v2026-02' else 'v2025-06' end, v_dernier - floor(random()*30)::int,
            canaux[1+floor(random()*array_length(canaux,1))::int], '+41 7' || floor(random()*10)::int || ' ' || (100+floor(random()*900))::int || ' ' || (10+floor(random()*90))::int || ' ' || (10+floor(random()*90))::int,
            case when v_sexe = 'F' then 118+floor(random()*30)::int else 128+floor(random()*35)::int end, 48+floor(random()*50)::int, random() < 0.15, random() < 0.1, true)
    returning id into v_id;
    v_ids := v_ids || v_id; v_n := v_n + 1;
  end loop;
  -- créneaux du jour
  v_h := split_part(v_p.ouverture, ':', 1)::int; v_m := split_part(v_p.ouverture, ':', 2)::int;
  while (v_h*60+v_m) < (split_part(v_p.fermeture, ':', 1)::int*60 + split_part(v_p.fermeture, ':', 2)::int) loop
    v_slots := v_slots || (lpad(v_h::text, 2, '0') || ':' || lpad(v_m::text, 2, '0'));
    v_m := v_m + v_p.creneau_min; if v_m >= 60 then v_h := v_h + 1; v_m := v_m - 60; end if;
  end loop;
  v_now := extract(hour from (now() at time zone 'Europe/Zurich')) + extract(minute from (now() at time zone 'Europe/Zurich'))/60.0;
  for k in 1..40 loop
    v_slot := v_slots[1+floor(random()*array_length(v_slots,1))::int];
    select count(*) into v_lit from public.cd_reservations where region = p_region and jour = current_date and heure = v_slot;
    if v_lit >= v_p.lits then continue; end if;
    v_id := v_ids[1+floor(random()*array_length(v_ids,1))::int];
    if exists (select 1 from public.cd_reservations where donneur_id = v_id and jour = current_date) then continue; end if;
    v_hh := split_part(v_slot, ':', 1)::int + split_part(v_slot, ':', 2)::int/60.0;
    if v_hh + 0.5 < v_now then v_statut := case when random() < 0.9 then 'termine' else 'noshow' end;
    elsif v_hh <= v_now then v_statut := (array['arrive','questionnaire','prelevement'])[1+floor(random()*3)::int];
    else v_statut := case when random() < 0.75 then 'confirme' else 'reserve' end; end if;
    insert into public.cd_reservations (region, donneur_id, jour, heure, lit, statut, source, demo)
    values (p_region, v_id, current_date, v_slot, v_lit + 1, v_statut, 'interne', true);
  end loop;
  for k in 1..5 loop
    v_id := v_ids[1+floor(random()*array_length(v_ids,1))::int];
    if not exists (select 1 from public.cd_reservations where donneur_id = v_id and (jour = current_date or statut = 'attente')) then
      insert into public.cd_reservations (region, donneur_id, statut, source, demo) values (p_region, v_id, 'attente', 'interne', true);
    end if;
  end loop;
  update public.cd_parametres set demo_seme = true, maj_le = now() where region = p_region;
  perform public.cd_journal_ajouter(p_region, 'Jeu de démonstration semé', v_n || ' donneur·se·s fictifs et l’agenda du jour');
  return v_n;
end $$;

-- ---------- état complet d'une région, en un appel ----------
create or replace function public.cd_etat(p_region text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_p public.cd_parametres; v_out jsonb;
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  select * into v_p from public.cd_parametres where region = p_region;
  if v_p.region is null then raise exception 'region_inconnue'; end if;
  if not v_p.demo_seme and not exists (select 1 from public.cd_donneurs where region = p_region) then
    perform public.cd_semer_demo(p_region);
    select * into v_p from public.cd_parametres where region = p_region;
  end if;
  select jsonb_build_object(
    'region', p_region,
    'parametres', jsonb_build_object('nom', v_p.nom, 'lits', v_p.lits, 'creneau_min', v_p.creneau_min, 'ouverture', v_p.ouverture, 'fermeture', v_p.fermeture, 'reservation_url', v_p.reservation_url, 'reservation_label', v_p.reservation_label, 'rappels', v_p.rappels),
    'donneurs', (select coalesce(jsonb_agg(to_jsonb(d) order by d.nom, d.prenom), '[]'::jsonb) from public.cd_donneurs d where d.region = p_region),
    'reservations', (select coalesce(jsonb_agg(to_jsonb(r) order by r.heure nulls last, r.lit), '[]'::jsonb) from public.cd_reservations r where r.region = p_region and (r.jour = current_date or r.statut = 'attente')),
    'semaine', (select coalesce(jsonb_agg(jsonb_build_object('jour', j.d, 'n', (select count(*) from public.cd_reservations r where r.region = p_region and r.jour = j.d)) order by j.d), '[]'::jsonb) from (select current_date + g as d from generate_series(0, 6) g) j),
    'journal', (select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'quand', j.quand, 'acteur', j.acteur, 'action', j.action, 'detail', j.detail, 'hash', j.hash, 'prev', j.prev_hash) order by j.id desc), '[]'::jsonb) from (select * from public.cd_journal where region = p_region order by id desc limit 150) j),
    'evenements', jsonb_build_object(
      'clics_7j', (select count(*) from public.cd_evenements e where e.region = p_region and e.type = 'clic_reservation' and e.quand > now() - interval '7 days'),
      'clics_jour', (select count(*) from public.cd_evenements e where e.region = p_region and e.type = 'clic_reservation' and e.quand::date = current_date),
      'clics_30j', (select count(*) from public.cd_evenements e where e.region = p_region and e.type = 'clic_reservation' and e.quand > now() - interval '30 days')),
    'serveur', now()
  ) into v_out;
  return v_out;
end $$;

-- ---------- donneur·se ----------
create or replace function public.cd_donneur_enregistrer(p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := nullif(p->>'id','')::uuid; v_region text := p->>'region';
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  if length(trim(coalesce(p->>'nom',''))) < 1 or length(trim(coalesce(p->>'prenom',''))) < 1 then raise exception 'nom_manquant'; end if;
  if v_id is null then
    insert into public.cd_donneurs (region, prenom, nom, sexe, age, groupe, pheno, dons, dernier_don, consent_version, consent_le, canal, tel, email, hb, poids, voyage, medic)
    values (v_region, left(trim(p->>'prenom'),80), left(trim(p->>'nom'),80), coalesce(p->>'sexe','X'), (p->>'age')::int, p->>'groupe', p->>'pheno', coalesce((p->>'dons')::int,0), (p->>'dernier_don')::date, p->>'consent_version', (p->>'consent_le')::timestamptz, coalesce(p->>'canal','courriel'), p->>'tel', p->>'email', (p->>'hb')::int, (p->>'poids')::int, coalesce((p->>'voyage')::boolean,false), coalesce((p->>'medic')::boolean,false))
    returning id into v_id;
    perform public.cd_journal_ajouter(v_region, 'Nouveau dossier donneur·se', trim(p->>'prenom') || ' ' || trim(p->>'nom'));
  else
    update public.cd_donneurs set prenom = coalesce(left(trim(p->>'prenom'),80), prenom), nom = coalesce(left(trim(p->>'nom'),80), nom), sexe = coalesce(p->>'sexe', sexe), age = coalesce((p->>'age')::int, age), groupe = coalesce(p->>'groupe', groupe), pheno = coalesce(p->>'pheno', pheno), canal = coalesce(p->>'canal', canal), tel = coalesce(p->>'tel', tel), email = coalesce(p->>'email', email), hb = coalesce((p->>'hb')::int, hb), poids = coalesce((p->>'poids')::int, poids), voyage = coalesce((p->>'voyage')::boolean, voyage), medic = coalesce((p->>'medic')::boolean, medic), maj_le = now()
    where id = v_id returning region into v_region;
    perform public.cd_journal_ajouter(v_region, 'Dossier donneur·se mis à jour', trim(coalesce(p->>'prenom','')) || ' ' || trim(coalesce(p->>'nom','')));
  end if;
  return v_id;
end $$;

-- ---------- réservations et liste d'attente ----------
create or replace function public.cd_reservation_creer(p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_region text := p->>'region'; v_d uuid := (p->>'donneur_id')::uuid; v_jour date := (p->>'jour')::date; v_heure text := p->>'heure'; v_lits int; v_n int; v_id uuid; v_nom text;
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  select prenom || ' ' || nom into v_nom from public.cd_donneurs where id = v_d and region = v_region;
  if v_nom is null then raise exception 'donneur_inconnu'; end if;
  if v_jour is null then
    if exists (select 1 from public.cd_reservations where donneur_id = v_d and statut = 'attente') then raise exception 'deja_en_attente'; end if;
    insert into public.cd_reservations (region, donneur_id, statut, source) values (v_region, v_d, 'attente', coalesce(p->>'source','interne')) returning id into v_id;
    perform public.cd_journal_ajouter(v_region, 'Ajout à la liste d’attente', v_nom);
    return v_id;
  end if;
  if exists (select 1 from public.cd_reservations where donneur_id = v_d and jour = v_jour and statut not in ('noshow','ajourne')) then raise exception 'deja_reserve'; end if;
  select lits into v_lits from public.cd_parametres where region = v_region;
  select count(*) into v_n from public.cd_reservations where region = v_region and jour = v_jour and heure = v_heure and statut not in ('noshow','ajourne','attente');
  if v_n >= coalesce(v_lits, 4) then raise exception 'creneau_complet'; end if;
  insert into public.cd_reservations (region, donneur_id, jour, heure, lit, statut, source, note)
  values (v_region, v_d, v_jour, v_heure, v_n + 1, 'reserve', coalesce(p->>'source','interne'), left(coalesce(p->>'note',''), 300)) returning id into v_id;
  perform public.cd_journal_ajouter(v_region, 'Nouvelle réservation', v_nom || ' le ' || to_char(v_jour, 'DD.MM.YYYY') || ' à ' || v_heure);
  return v_id;
end $$;

create or replace function public.cd_attente_placer(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r public.cd_reservations; v_p public.cd_parametres; v_h int; v_m int; v_slot text; v_n int; v_now numeric; v_nom text;
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  select * into r from public.cd_reservations where id = p_id and statut = 'attente';
  if r.id is null then raise exception 'attente_introuvable'; end if;
  select * into v_p from public.cd_parametres where region = r.region;
  select prenom || ' ' || nom into v_nom from public.cd_donneurs where id = r.donneur_id;
  v_now := extract(hour from (now() at time zone 'Europe/Zurich')) + extract(minute from (now() at time zone 'Europe/Zurich'))/60.0;
  v_h := split_part(v_p.ouverture, ':', 1)::int; v_m := split_part(v_p.ouverture, ':', 2)::int;
  while (v_h*60+v_m) < (split_part(v_p.fermeture, ':', 1)::int*60 + split_part(v_p.fermeture, ':', 2)::int) loop
    v_slot := lpad(v_h::text, 2, '0') || ':' || lpad(v_m::text, 2, '0');
    if (v_h + v_m/60.0) > v_now then
      select count(*) into v_n from public.cd_reservations where region = r.region and jour = current_date and heure = v_slot and statut not in ('noshow','ajourne','attente');
      if v_n < v_p.lits then
        update public.cd_reservations set jour = current_date, heure = v_slot, lit = v_n + 1, statut = 'reserve', maj_le = now() where id = p_id;
        perform public.cd_journal_ajouter(r.region, 'Réservation depuis la liste d’attente', v_nom || ' à ' || v_slot);
        return jsonb_build_object('heure', v_slot, 'lit', v_n + 1);
      end if;
    end if;
    v_m := v_m + v_p.creneau_min; if v_m >= 60 then v_h := v_h + 1; v_m := v_m - 60; end if;
  end loop;
  raise exception 'aucun_creneau';
end $$;

create or replace function public.cd_reservation_statut(p_id uuid, p_statut text, p_extra jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r public.cd_reservations; v_nom text; v_lib text;
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  if p_statut not in ('reserve','confirme','arrive','questionnaire','prelevement','termine','noshow','ajourne') then raise exception 'statut_invalide'; end if;
  select * into r from public.cd_reservations where id = p_id;
  if r.id is null then raise exception 'reservation_introuvable'; end if;
  update public.cd_reservations set statut = p_statut, hb = coalesce((p_extra->>'hb')::int, hb), poids = coalesce((p_extra->>'poids')::int, poids), note = coalesce(left(p_extra->>'note', 300), note), maj_le = now() where id = p_id;
  select prenom || ' ' || nom into v_nom from public.cd_donneurs where id = r.donneur_id;
  if p_statut = 'termine' and r.statut <> 'termine' then
    update public.cd_donneurs set dons = dons + 1, dernier_don = coalesce(r.jour, current_date), hb = coalesce((p_extra->>'hb')::int, hb), poids = coalesce((p_extra->>'poids')::int, poids), maj_le = now() where id = r.donneur_id;
  end if;
  v_lib := case p_statut when 'reserve' then 'Réservé' when 'confirme' then 'Confirmé' when 'arrive' then 'Arrivée enregistrée' when 'questionnaire' then 'Questionnaire vérifié' when 'prelevement' then 'Admission au prélèvement' when 'termine' then 'Don terminé' when 'noshow' then 'Absence constatée' else 'Ajournement' end;
  perform public.cd_journal_ajouter(r.region, v_lib || ' — ' || v_nom, 'Réservation ' || left(p_id::text, 8) || coalesce(' de ' || r.heure, '') || coalesce(' · ' || (p_extra->>'detail'), ''));
end $$;

-- ---------- consentement électronique ----------
create or replace function public.cd_consentement_signer(p jsonb) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_d uuid := (p->>'donneur_id')::uuid; v_r uuid := nullif(p->>'reservation_id','')::uuid; v_version text := coalesce(p->>'version','v2026-02'); v_nom text := trim(coalesce(p->>'nom_signe','')); v_region text; v_emp text;
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  if length(v_nom) < 3 then raise exception 'nom_manquant'; end if;
  select region into v_region from public.cd_donneurs where id = v_d;
  if v_region is null then raise exception 'donneur_inconnu'; end if;
  v_emp := public.bmb_hash(v_d::text || '|' || v_version || '|' || v_nom || '|' || now()::text);
  insert into public.cd_consentements (region, donneur_id, reservation_id, version, nom_signe, par, empreinte) values (v_region, v_d, v_r, v_version, left(v_nom, 120), public.cd_acteur(), v_emp);
  update public.cd_donneurs set consent_version = v_version, consent_le = now(), maj_le = now() where id = v_d;
  if v_r is not null then update public.cd_reservations set statut = 'questionnaire', maj_le = now() where id = v_r and statut = 'arrive'; end if;
  perform public.cd_journal_ajouter(v_region, 'Consentement signé', v_nom || ' — ' || v_version || ', code à usage unique vérifié, empreinte ' || left(v_emp, 16));
  return v_emp;
end $$;

-- ---------- réglages ----------
create or replace function public.cd_rappels_regler(p_region text, p_rappels jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  update public.cd_parametres set rappels = p_rappels, maj_le = now() where region = p_region;
end $$;

create or replace function public.cd_parametres_regler(p_region text, p jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cd_est_pro() then raise exception 'non_pro'; end if;
  update public.cd_parametres set lits = coalesce((p->>'lits')::int, lits), creneau_min = coalesce((p->>'creneau_min')::int, creneau_min), ouverture = coalesce(p->>'ouverture', ouverture), fermeture = coalesce(p->>'fermeture', fermeture), reservation_url = coalesce(p->>'reservation_url', reservation_url), reservation_label = coalesce(p->>'reservation_label', reservation_label), maj_le = now() where region = p_region;
  perform public.cd_journal_ajouter(p_region, 'Paramètres du centre modifiés', p::text);
end $$;

-- ---------- événements de parcours, anonymes (espace donneur : clic vers la réservation officielle) ----------
create or replace function public.cd_evenement(p jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_type text := p->>'type';
begin
  if v_type not in ('clic_reservation','clic_agenda','clic_collecte') then return; end if;
  if (select count(*) from public.cd_evenements where quand > now() - interval '1 minute') > 300 then return; end if;
  insert into public.cd_evenements (region, type, ref) values (left(coalesce(p->>'region','inconnue'), 40), v_type, left(coalesce(p->>'ref',''), 200));
end $$;

-- ---------- export d'une période ----------
create or replace function public.cd_exporter(p_region text, p_du date, p_au date) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select case when public.cd_est_pro() then coalesce(jsonb_agg(jsonb_build_object('jour', r.jour, 'heure', r.heure, 'lit', r.lit, 'statut', r.statut, 'source', r.source, 'prenom', d.prenom, 'nom', d.nom, 'groupe', d.groupe, 'sexe', d.sexe, 'hb', r.hb, 'poids', r.poids) order by r.jour, r.heure), '[]'::jsonb) else null end
  from public.cd_reservations r join public.cd_donneurs d on d.id = r.donneur_id
  where r.region = p_region and r.jour between p_du and p_au
$$;

grant execute on function public.cd_etat(text), public.cd_donneur_enregistrer(jsonb), public.cd_reservation_creer(jsonb), public.cd_attente_placer(uuid), public.cd_reservation_statut(uuid, text, jsonb), public.cd_consentement_signer(jsonb), public.cd_rappels_regler(text, jsonb), public.cd_parametres_regler(text, jsonb), public.cd_journaliser(text, text, text), public.cd_exporter(text, date, date), public.cd_est_pro() to authenticated;
grant execute on function public.cd_evenement(jsonb) to anon, authenticated;
