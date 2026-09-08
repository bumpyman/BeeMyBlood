# Changelog

## v0.3.0 — 2026-09-08 — public donor space, developer role, mobile floating controls

### Added
- Donor space public mode: the page opens without an account. Eligibility test, centre map, guide, videos, FAQ, news, contact and BeeBot are open to everyone; dashboard, challenges, live feed, HémoRush, impact, profile and settings ask for the invited-tester login at the moment they are opened (lock mark on their tabs), with a "Continuer sans compte" way out. The fictional hero counters are hidden in public mode. `acces.js` gained `data-public`, `BeeAcces.exiger(fn)` and `BeeAcces.deverrouille()`.
- Role "developpeur" (SQL `supabase/2026-09-08-role-developpeur.sql`): granted from the admin page like any space, it opens the three spaces and the administration page; the account still logs in by email and signs the NDA.

### Changed
- The hard-coded developer bypass (identifier and password in the page source) is removed.
- On phones the glossary button and the session badge become two small round buttons at the bottom-left, above the page's bottom bar; the badge opens a small menu (name, change space, sign out). Nothing overlaps the bottom-right buttons any more.

## v0.2.2 — 2026-09-08 — single login page, multi-space requests, no invitation code

### Added
- `connexion/`: one login page for everyone. After the email code and the NDA, it lists the spaces the account may open, or redirects directly when there is only one. Linked from the landing page, the request form and the session badge ("Espaces").
- Access requests can target one, two or three spaces (checkboxes); the administrator approves any subset, can change it later ("Mettre à jour"), and the prefilled confirmation email lists the opened spaces and the ones left closed. SQL: `supabase/2026-09-08-multi-espaces.sql` (columns `roles`, `roles_approuves` on requests and `roles` on accounts; updated functions).

### Changed
- No more invitation code: an approved request activates by itself at the first login with the approved email (`supabase/2026-09-08-activation-automatique.sql`). The status screen explains pending, refused or missing requests.
- Login wording says "code de connexion à chiffres" everywhere and accepts 6 to 8 digits; codes of never-confirmed accounts are accepted too; www.beemyblood.ch redirects to beemyblood.ch so the remembered session is shared.
- Session badge moved to the bottom-left above the glossary button, off the page menus.

### Operations
- Email templates (Magic Link and Confirm signup) must contain only `{{ .Token }}`, no link: the Infomaniak SMTP quoted-printable wrap corrupts the token inside links.

## v0.2.1 — 2026-09-08 — developer quick access

### Added
- "Accès développeur" link on the login screen: hard-coded identifier `developer` / password `teambmb` opens the space directly as admin, without email, invitation or NDA. Valid for the current browser tab only (sessionStorage), nothing is written to Supabase, no access is logged. The admin page still requires an email login with an administrator address.

## v0.2.0 — 2026-09-08 — invitation, email login and NDA on Supabase

### Added
- `supabase/schema.sql`: tables for access requests, activated accounts, NDA versions and signatures, access journal, and an admin list; everything is closed by row-level security and exposed only through security-definer functions (request, current NDA, my state, activate invitation, sign NDA, log access, admin list/approve/refuse/dashboard). Includes NDA v1-2026-09 in French.
- `acces.js`: shared access overlay for the three spaces. Email-only login with a 6-digit code or magic link (Supabase Auth, no password), invitation code `BMB-XXXX-XXXX` tied to the requester's email and valid 30 days, NDA that must be scrolled to the end and signed with a typed name, role-based entry (admin > pro > receveur > donneur), session badge with sign-out, per-space access log.
- `acces/`: public request form (name, email, organisation, role, motive) with a three-step explanation.
- `admin/`: admin page (login as an address listed in `admins`): pending requests, approve with a one-time displayed code and a prefilled invitation email, refuse with note, activated accounts, signed agreements, last 200 accesses.
- Landing and project pages link to the request form.

### Changed
- The hard-coded gates (`teambmb`, demo password on the professional portal) no longer open anything; the pages keep their markup but `acces.js` is the only entrance.

### Operations
- Run `supabase/schema.sql` once in the Supabase SQL editor; set Site URL and redirect allowlist to https://beemyblood.ch; add `{{ .Token }}` to the Magic Link email template; configure a custom SMTP (Infomaniak mailbox) to avoid the built-in email rate limit.

## v0.1.3 — 2026-09-08 — digital twin in plain words, mobile navigation

### Changed
- Digital twin rewritten for non-specialists: "Comment ça marche" intro, steps renamed (Choisir, Simuler, Lire les résultats), "graine aléatoire" becomes "numéro de tirage" and "tirages" becomes "nombre de simulations" with inline help, P10–P90 shown as "8 fois sur 10 entre x et y", median as "valeur la plus probable", the reference scenario is "Situation normale", "non distinguable" becomes "différence trop faible pour être sûre"; the glossary gains nine simulation terms.
- Professional portal: the tab bar no longer scrolls horizontally; groups wrap on desktop and collapse into a "Menu · onglet courant" button on phones, with labels visible in the open menu.
- Landing page on phones: compact portal cards and tighter hero.
- Glossary button stays at the bottom edge unless the page has a fixed bottom bar, in which case it moves above it.

### Fixed
- v0.1.2 donor page: the glossary script tag had been injected inside a JavaScript string (print template), which broke the page's scripts. The tag is now at the real end of the page.

## v0.1.2 — 2026-09-08 — plain language and shared glossary

### Added
- `lexique.js`, a shared glossary loaded by the five main pages: 45 acronyms and medical terms (CRS, CTS, PSL, RAI, phénotype, chélation, EBA, ISBT, nLPD, HL7 FHIR, SoHO, AGPL-3.0, BeeOS…) explained in plain French. Recognised terms get a dotted underline with a tooltip on hover and a popover on click or tap; a floating "Lexique" button opens the searchable full list. Dynamic content (tabs, chats) is covered too.

### Changed
- Landing page and project page rewritten in plainer language: acronyms expanded or replaced on first sight (products, standards, licence, data protection, European blood regulation), "prototype confidentiel" replaced by "prototype de recherche".

## v0.1.1 — 2026-09-08 — maps, digital twin v2, positioning

### Added
- Digital twin rebuilt as a functional twin (configure → simulate → analyse): reproducible seeded runs with common random numbers between a scenario and its reference, results as median with P10–P90 interval, KPI tiles with targets and thresholds, comparison to the reference scenario flagged as "not distinguishable" when intervals overlap, a "what this panel does not say" disclosure, and a lever card that carries no figure until a run has produced one. Inspired by the HEG bachelor thesis "Digital Twin des urgences pédiatriques des HUG" (Morsch, Poupard-Kuimi, Gonçalves Silva, 2026).
- Professional portal tab bar grouped into four families: Piloter, Cartographier, Anticiper, Agir.
- Landing page: "Le luxe communal" section (blood donation as rare, precious and heroic), clearer hero with three verbs (je donne, je reçois, je soigne), positioning aligned with the strategy (14-day prediction, rarity score, companion system, BeeOS, SoHO 2027).
- Project page: comparison rows on rarity score, 14-day prediction and companion-system integration.

### Changed
- Digital twin heatmap now uses the same blurred-circle style and colour ramp as the Cartography tab; the leaflet.heat dependency was removed.
- All maps use OpenStreetMap tiles with a CSS dark filter instead of CARTO basemaps, which now require an API key and watermarked the maps.

## v0.1.0 — 2026-09-08 — first alpha release

### Added
- **Digital twin** tab in the professional portal: phenotype search (ABO + MNS, Rh, Kell, Duffy antigen systems with population frequencies) and scenario planning (pandemic, disaster, holidays, campaigns, emergency appeal) rendered as a heatmap over the collection sites of the selected region, with a per-site summary table.
- Standalone digital twin prototype (`/digitaltwin`, Vue 3 + Leaflet).
- Landing page: "beyond appointment booking" positioning block and key figures.
- Project page: "What sets us apart" comparison with booking apps and centre management suites.
- `config.example.php`: single server-side configuration for the Anthropic API key and model.
- `CHANGELOG.md`, `.gitattributes`.

### Changed
- All BeeBot proxies read the API key from a git-ignored `config.php` instead of hardcoding it.
- BeeBots migrated from the retired `claude-sonnet-4-20250514` model to the `claude-opus-5` alias, with low effort and a higher token ceiling.
- BeeBot Pro keeps its "thinking" indicator visible until the answer arrives.
- BeeBot Receveur renders Markdown answers (bold, lists) and shows an animated thinking indicator.
- README rewritten with the project pitch, the three spaces and deployment steps.

### Fixed
- BeeBots were down: the model had been retired by Anthropic (HTTP 404).
- Proxies now concatenate text blocks, since the model may return a thinking block first.
- Recipient space called a non-existent `api.php`; it now calls `api_receiver.php`.

### Removed
- Server access and error logs that had been committed by mistake.
