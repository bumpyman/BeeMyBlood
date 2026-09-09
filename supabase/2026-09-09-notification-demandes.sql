-- ============================================================================
-- BeeMyBlood — courriel à l'équipe à chaque nouvelle demande d'accès
-- À coller dans Supabase > SQL Editor. Rejouable.
-- Chaque insertion dans demandes_acces appelle https://beemyblood.ch/api/notif.php
-- (pg_net, appel asynchrone) ; le script PHP envoie le courriel à 'admin_email'
-- de config.php. Remplacez __SECRET__ par la valeur de 'notif_secret' dans config.php.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.bmb_notifier_demande() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://beemyblood.ch/api/notif.php',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-BMB-Secret', '__SECRET__'),
    body    := jsonb_build_object(
      'type', 'demande', 'id', new.id, 'nom', new.nom, 'email', new.email,
      'organisation', new.organisation, 'roles', to_jsonb(coalesce(new.roles, array[new.role])),
      'motif', new.motif, 'cree_le', new.cree_le),
    timeout_milliseconds := 8000
  );
  return new;
end $$;

drop trigger if exists trg_bmb_notifier_demande on public.demandes_acces;
create trigger trg_bmb_notifier_demande
  after insert on public.demandes_acces
  for each row execute function public.bmb_notifier_demande();

-- Vérification après un test : les appels et leurs réponses sont visibles pendant quelques heures
-- select id, created, status_code, content from net._http_response order by id desc limit 5;
