-- ============================================================================
-- BeeMyBlood — retrait d'un accès par l'administration
-- À coller dans Supabase > SQL Editor. Rejouable.
-- Supprime le compte d'accès lié à un courriel et passe ses demandes en « refusée ».
-- La signature de l'accord et le journal d'accès sont conservés (traçabilité).
-- La personne peut ensuite redéposer une demande depuis le site.
-- ============================================================================

create or replace function public.admin_retirer_acces(p_email text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); v_acces int; v_demandes int;
begin
  if not public.est_admin() then raise exception 'non_admin'; end if;
  if v_email = '' then raise exception 'courriel_invalide'; end if;
  if v_email = public.bmb_email_courant() then raise exception 'auto_retrait'; end if;
  delete from public.acces where lower(email) = v_email;
  get diagnostics v_acces = row_count;
  update public.demandes_acces
     set statut = 'refusee', traitee_le = now(), traitee_par = public.bmb_email_courant(),
         note_admin = left(coalesce(nullif(trim(p_note), ''), 'Accès retiré'), 500)
   where lower(email) = v_email and statut in ('en_attente', 'approuvee', 'activee');
  get diagnostics v_demandes = row_count;
  return jsonb_build_object('email', v_email, 'acces_supprimes', v_acces, 'demandes_refusees', v_demandes);
end $$;

grant execute on function public.admin_retirer_acces(text, text) to authenticated;
