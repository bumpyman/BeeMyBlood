-- ============================================================================
-- BeeMyBlood — activation automatique des invitations (remplace le code BMB-XXXX-XXXX)
-- À coller dans Supabase > SQL Editor après schema.sql. Rejouable.
-- Une demande approuvée pour un courriel donne l'accès dès la première connexion
-- avec ce courriel : plus de second code à saisir.
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
