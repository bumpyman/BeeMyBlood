-- ============================================================================
-- BeeMyBlood — correction de l'article 5 du NDA v1 : hébergement en Suisse
-- (site chez Infomaniak à Genève, comptes chez Supabase à Zurich), plus d'UE.
-- À coller dans Supabase > SQL Editor. Rejouable.
-- ============================================================================
update public.nda_versions
   set texte = replace(texte,
     'Elles sont hébergées dans l’Union européenne (Supabase) et en Suisse (Infomaniak), conservées',
     'Elles sont hébergées en Suisse, chez Infomaniak à Genève pour le site et chez Supabase à Zurich pour les comptes, et conservées')
 where version = 'v1-2026-09';
