-- ============================================================================
-- BeeMyBlood — demandes et accès multi-espaces (donneur, receveur, pro)
-- À coller dans Supabase > SQL Editor après les fichiers précédents. Rejouable.
-- Une demande porte sur un ou plusieurs espaces ; l'admin approuve tout ou partie.
-- ============================================================================

alter table public.demandes_acces add column if not exists roles text[] not null default '{}';
alter table public.demandes_acces add column if not exists roles_approuves text[];
update public.demandes_acces set roles = array[role] where roles = '{}' and role is not null;
update public.demandes_acces set roles_approuves = roles where statut in ('approuvee','activee') and roles_approuves is null;
alter table public.demandes_acces drop constraint if exists demandes_acces_role_check;

alter table public.acces add column if not exists roles text[] not null default '{}';
update public.acces set roles = case when role = 'admin' then array['donneur','receveur','pro','admin'] else array[role] end where roles = '{}';
alter table public.acces drop constraint if exists acces_role_check;

create or replace function public.bmb_roles_valides(p text[]) returns text[]
language sql immutable as $$
  select coalesce(array_agg(x order by array_position(array['donneur','receveur','pro'], x)), '{}')
  from unnest(coalesce(p, '{}')) as x where x in ('donneur','receveur','pro')
$$;

-- ---------- Demande : un ou plusieurs espaces ----------
create or replace function public.demander_acces(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_email text := lower(trim(coalesce(p->>'email',''))); v_roles text[];
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'courriel_invalide'; end if;
  if length(trim(coalesce(p->>'nom',''))) < 2 then raise exception 'nom_manquant'; end if;
  select public.bmb_roles_valides(array(select jsonb_array_elements_text(coalesce(p->'roles', '[]'::jsonb)))) into v_roles;
  if coalesce(array_length(v_roles,1),0) = 0 and coalesce(p->>'role','') in ('donneur','receveur','pro') then v_roles := array[p->>'role']; end if;
  if coalesce(array_length(v_roles,1),0) = 0 then raise exception 'role_invalide'; end if;
  if exists (select 1 from public.demandes_acces where lower(email) = v_email and statut in ('en_attente','approuvee')) then
    return jsonb_build_object('ok', true, 'deja', true);
  end if;
  insert into public.demandes_acces (nom, email, organisation, role, roles, motif)
  values (left(trim(p->>'nom'), 120), v_email, left(trim(coalesce(p->>'organisation','')), 160), v_roles[1], v_roles, left(coalesce(p->>'motif',''), 1000));
  return jsonb_build_object('ok', true, 'deja', false, 'roles', to_jsonb(v_roles));
end $$;

-- ---------- Approbation : tout ou partie des espaces demandés ----------
drop function if exists public.admin_approuver(uuid, int);
create or replace function public.admin_approuver(p_id uuid, p_roles text[] default null, p_jours int default 30) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_code text := public.bmb_nouveau_code(); d public.demandes_acces; v_roles text[];
begin
  if not public.est_admin() then raise exception 'non_admin'; end if;
  select * into d from public.demandes_acces where id = p_id;
  if d.id is null then raise exception 'demande_introuvable'; end if;
  v_roles := public.bmb_roles_valides(coalesce(p_roles, d.roles));
  if coalesce(array_length(v_roles,1),0) = 0 then raise exception 'role_invalide'; end if;
  update public.demandes_acces
     set statut = 'approuvee', roles_approuves = v_roles, role = v_roles[1],
         code_hash = public.bmb_hash(v_code), code_expire_le = now() + make_interval(days => greatest(1, p_jours)),
         traitee_le = now(), traitee_par = public.bmb_email_courant()
   where id = p_id returning * into d;
  -- compte déjà actif pour ce courriel : on met ses espaces à jour tout de suite
  update public.acces set roles = v_roles, role = v_roles[1] where lower(email) = lower(d.email) and role <> 'admin';
  return jsonb_build_object('email', d.email, 'nom', d.nom, 'roles', to_jsonb(v_roles), 'expire_le', d.code_expire_le);
end $$;

-- ---------- Liste admin : inclut les tableaux d'espaces ----------
create or replace function public.admin_lister_demandes() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select case when public.est_admin() then coalesce(jsonb_agg(to_jsonb(d) - 'code_hash' order by d.cree_le desc), '[]'::jsonb)
              else null end
  from public.demandes_acces d
$$;

-- ---------- État : activation automatique avec les espaces approuvés ----------
create or replace function public.mon_etat() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_email text := public.bmb_email_courant(); v_acces public.acces; v_version text; v_signe boolean; d public.demandes_acces; v_demande text;
begin
  if v_uid is null then return jsonb_build_object('connecte', false); end if;
  if public.est_admin() and not exists (select 1 from public.acces where user_id = v_uid) then
    insert into public.acces (user_id, email, nom, role, roles) values (v_uid, v_email, 'Administrateur', 'admin', array['donneur','receveur','pro','admin']);
  end if;
  if not exists (select 1 from public.acces where user_id = v_uid) then
    select * into d from public.demandes_acces
     where lower(email) = v_email and statut = 'approuvee' and coalesce(code_expire_le, now() + interval '1 day') > now()
     order by traitee_le desc nulls last limit 1;
    if d.id is not null then
      insert into public.acces (user_id, email, nom, role, roles, demande_id)
      values (v_uid, v_email, d.nom, coalesce(d.roles_approuves[1], d.role), coalesce(d.roles_approuves, array[d.role]), d.id);
      update public.demandes_acces set statut = 'activee' where id = d.id;
    end if;
  end if;
  select * into v_acces from public.acces where user_id = v_uid;
  select statut into v_demande from public.demandes_acces where lower(email) = v_email order by cree_le desc limit 1;
  select version into v_version from public.nda_versions where courante limit 1;
  select exists (select 1 from public.signatures_nda where user_id = v_uid and version = v_version) into v_signe;
  return jsonb_build_object(
    'connecte', true, 'email', v_email, 'admin', public.est_admin(),
    'acces', v_acces.user_id is not null, 'role', v_acces.role, 'roles', to_jsonb(coalesce(v_acces.roles, '{}')), 'nom', v_acces.nom,
    'demande', v_demande,
    'nda_version', v_version, 'nda_signe', coalesce(v_signe, false));
end $$;

grant execute on function public.demander_acces(jsonb) to anon, authenticated;
grant execute on function public.mon_etat(), public.admin_lister_demandes(), public.admin_approuver(uuid, text[], int) to authenticated;
