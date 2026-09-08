-- ============================================================================
-- BeeMyBlood — rôle « developpeur » : accès à tous les espaces et à l'administration
-- À coller dans Supabase > SQL Editor après les fichiers précédents. Rejouable.
-- Remplace l'accès rapide développeur codé en dur (identifiant / mot de passe), supprimé.
-- Un compte reçoit ce rôle par la page admin (case « Développeur »), il passe par
-- la même connexion par courriel et le même NDA que tout le monde.
-- ============================================================================

create or replace function public.bmb_roles_valides(p text[]) returns text[]
language sql immutable as $$
  select coalesce(array_agg(x order by array_position(array['donneur','receveur','pro','developpeur'], x)), '{}')
  from unnest(coalesce(p, '{}')) as x where x in ('donneur','receveur','pro','developpeur')
$$;

-- administrateur = courriel listé dans admins OU compte portant le rôle developpeur
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.admins where lower(email) = public.bmb_email_courant())
      or exists (select 1 from public.acces where user_id = auth.uid() and 'developpeur' = any(roles))
$$;

create or replace function public.mon_etat() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_email text := public.bmb_email_courant(); v_acces public.acces; v_version text; v_signe boolean; d public.demandes_acces; v_demande text; v_roles text[];
begin
  if v_uid is null then return jsonb_build_object('connecte', false); end if;
  if exists (select 1 from public.admins where lower(email) = v_email) and not exists (select 1 from public.acces where user_id = v_uid) then
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
  v_roles := coalesce(v_acces.roles, '{}');
  if 'developpeur' = any(v_roles) or v_acces.role = 'admin' then v_roles := array['donneur','receveur','pro','admin'] || v_roles; end if;
  select statut into v_demande from public.demandes_acces where lower(email) = v_email order by cree_le desc limit 1;
  select version into v_version from public.nda_versions where courante limit 1;
  select exists (select 1 from public.signatures_nda where user_id = v_uid and version = v_version) into v_signe;
  return jsonb_build_object(
    'connecte', true, 'email', v_email, 'admin', public.est_admin(),
    'acces', v_acces.user_id is not null, 'role', v_acces.role, 'roles', to_jsonb(v_roles), 'nom', v_acces.nom,
    'developpeur', 'developpeur' = any(coalesce(v_acces.roles, '{}')),
    'demande', v_demande,
    'nda_version', v_version, 'nda_signe', coalesce(v_signe, false));
end $$;

grant execute on function public.mon_etat(), public.est_admin() to authenticated;
