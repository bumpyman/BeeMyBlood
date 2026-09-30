-- BeeMyBlood — Profil des personnes (espaces donneur et receveur)
-- À exécuter une fois dans l'éditeur SQL de Supabase (projet uyrpozgbfklqfltnduvv).
-- Le profil est d'abord enregistré dans le navigateur. Ces fonctions le rendent disponible sur les autres appareils d'une personne connectée.
-- Données de santé : chaque personne lit et modifie uniquement son propre profil.

create table if not exists public.profils (
  user_id uuid not null references auth.users(id) on delete cascade,
  espace  text not null check (espace in ('donneur','receveur')),
  donnees jsonb not null default '{}'::jsonb,
  maj     timestamptz not null default now(),
  primary key (user_id, espace)
);

alter table public.profils enable row level security;
revoke all on public.profils from anon, authenticated;

create or replace function public.profil_lire(p_espace text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select donnees from public.profils where user_id = auth.uid() and espace = p_espace;
$$;

create or replace function public.profil_enregistrer(p_espace text, p_donnees jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_espace not in ('donneur','receveur') then
    raise exception 'espace inconnu';
  end if;
  if pg_column_size(p_donnees) > 8192 then
    raise exception 'profil trop volumineux';
  end if;
  if p_donnees is null or p_donnees = '{}'::jsonb then
    delete from public.profils where user_id = auth.uid() and espace = p_espace;
    return '{}'::jsonb;
  end if;
  insert into public.profils (user_id, espace, donnees, maj)
  values (auth.uid(), p_espace, p_donnees, now())
  on conflict (user_id, espace) do update set donnees = excluded.donnees, maj = now();
  return p_donnees;
end;
$$;

revoke all on function public.profil_lire(text) from public, anon;
revoke all on function public.profil_enregistrer(text, jsonb) from public, anon;
grant execute on function public.profil_lire(text) to authenticated;
grant execute on function public.profil_enregistrer(text, jsonb) to authenticated;
