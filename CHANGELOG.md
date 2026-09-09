# Changelog

## v0.6.1 — 2026-09-09 — HUG questionnaire flow

### Donor space
- Eligibility result: the « Générer mon formulaire pré-rempli » button, which produced a document with the demonstration identity, is replaced by « Remplir mon questionnaire HUG », which opens the real three-step questionnaire (information, consent, medical questions) and prefills only the connected person's name.
- The PDF is generated only when the six consent statements are ticked and every medical question is answered.

## v0.6.0 — 2026-09-09 — centre operations backend, display screens, real booking by redirection

### Centre operations backend
- Supabase schema for the donation cycle (supabase/2026-09-09-cycle-du-don.sql): cd_donneurs, cd_reservations (incl. waiting list), cd_consentements, cd_journal (chained hashes computed server-side), cd_parametres (beds, slots, online booking link per region), cd_evenements; RPCs cd_etat, cd_donneur_enregistrer, cd_reservation_creer, cd_attente_placer, cd_reservation_statut, cd_consentement_signer, cd_rappels_regler, cd_parametres_regler, cd_journaliser, cd_exporter, cd_evenement (anon). Demonstration set seeded per region on first use.
- pro/cycle.js now reads and writes through these functions, with a local demonstration fallback and a « enregistré / démonstration locale » badge.
- Agenda: clicking a booking opens explicit action buttons (confirm, arrived, questionnaire checked, admit, done, absent, defer, reopen) instead of a silent step-forward; donor file and waiting list stay visible while scrolling.
- Real booking by redirection: « Réserver » on every published collection in the donor space and on the OneDoc links, with anonymous click counting shown in the professional agenda.

### Flux donneurs (waiting-room screen)
- New page pro/salle/ for a large screen or a second workstation: queue positions, estimated wait and bed occupancy, refreshed every 20 s. People are shown only by the four-character call code handed at reception; the screen receives codes and statuses only (RPC cd_flux), never names. The reception screen displays the call code to hand over.

### Flux CTS (centre screen)
- New page pro/flux/ and a « Flux CTS » tab in the professional portal (embedded preview plus full-screen opening): official stock barometer per group, today's activity (completed donations, beds, waiting people, donations per hour, from cd_flux counts only), next mobile collections and Swiss news, refreshed every 30 s.
- Flux donneurs: call code shown alone in a framed badge, entrance animation and pulse on the person called, beds grid sized to the centre (10 beds at the HUG in the seed).

### Display screens
- Flux CTS alternates between the dashboard and the animated flow map of the donor space (collections, centre, laboratory, hospitals), with a toggle; titles reduced to the centre name; the two screens are tabs of the Piloter group with an embedded preview that follows its content height and a full-screen button.
- Session badge reduced to a round icon everywhere, with the menu on click; hidden on the display screens.

### Digital twin wording
- All screens rewritten in plain professional French: numbered steps (Scénario, Résultats, Comparaison, Poste de régulation), an introduction and a guide per screen, « numéro de tirage », « nombre de simulations », « marge d’incertitude », « précautions de lecture »; glossary entries added (marge d’incertitude, mise en régime, événement simulé, poste de régulation, substitution ABO, jours de couverture).

### Landing page
- Mission block rewritten (« Numériser la chaîne du sang, du donneur au patient ») and displayed as a full-width banner above the four squares.
- « Soutenir le projet » link in the header, pointing to the donation block of the project page.

## v0.5.3 — 2026-09-09 — digital twin v2, centre operations, ideas from the Bachelor theses

### Professional portal
- Digital twin v2 (pro/jumeau.js): discrete-event engine, seeded streams, replications with 95 % intervals, Little check, eight cumulative episodes, screens Scenario / Results / Comparison / Regulation desk / Phenotypes, real barometer as starting stock, JSON export. Transposed from the HUG paediatric emergency digital twin thesis (HEG Genève 2026).
- New « Opérer » tab group (pro/cycle.js): agenda and bookings, donor file, reception and e-consent, reminders, audit journal and reports, with CSV exports.

### From the Bachelor theses (Leal, Albadri, Bouzo, Stankov, HEG Genève 2025-2026)
- Twin episodes « Fêtes de fin d’année » and « Relais communautaire »; cost of missing units at 267 CHF per unit (CTS HUG figure).
- Donor space: « add to my calendar » (.ics with reminder) on every published mobile collection (HUG and Transfusion CRS dates).
- Donor file: first-time donors returning within 12 months.

### Wording
- Professional portal: tab groups shown as framed cards with gold labels.
- Landing and project pages state the digitalisation mission (open code, public standards, Swiss quality); comparison table covers centre operations and the new twin.

- Access requests: the team receives an email for each new request (Supabase trigger with pg_net calling api/notif.php, which sends the mail from the Infomaniak server). New config keys admin_email and notif_secret.
- Daily data cache reduced from 6 hours to 1 hour.
- Admin page: "Retirer l’accès" button on active accounts (new RPC admin_retirer_acces, supabase/2026-09-09-retirer-acces.sql) and "Annuler l’approbation" on approved requests.

## v0.5.2 — 2026-09-09 — project page, FAQ, privacy and legal pages

### Project page and information pages
- Project page: new section "Pourquoi BeeMyBlood ?" (the name: pollination, hive, sting, dance, sentinel, gold and black) and a "Contribuer" section (test, code, partnership, citation) with three buttons: FAQ, Confidentialité, Mentions légales. Navigation reduced to two links on mobile.
- New pages: projet/faq (15 questions about the site and the project), projet/confidentialite (nLPD privacy notice: no trackers, third-party resources, tester account data, BeeBot via Anthropic, rights) and projet/mentions-legales (publisher, hosting, licence, data sources, disclaimers, applicable law).
- Request form links to the privacy notice.
- Project page: donation block (HES-SO Genève bank details for the BeeMyBlood project) with an IBAN copy button.

## v0.5.1 — 2026-09-09 — clearer entry screens, Zenodo DOI

### Access
- One entry screen per space, in short French: "Espace réservé aux testeurs invités" (pro, recipient), "Fonction réservée aux testeurs invités" (donor, when a locked function or the login button is clicked). Two clear paths: already invited (email, code) or not yet (request access, with the space pre-selected on the request form).
- Shorter messages on the code, pending-request, space-choice and refusal screens; lighter footer.
- Request form: no more mention of an invitation code (access activates at the first login after approval).

### Landing page
- The "alpha on invitation / request / log in" line under the hero is removed; the spaces themselves open the entry screen.
- Luxe communal: one-line definition under the title; labels "Trop rare !", "Hyper précieux !", "Juste héroïque !".
- "Score de rareté" becomes "Le sang compatible, même rare"; project card wording adjusted.
- Glossary: new entry "Luxe communal" explaining the founding concept, underlined wherever the term appears.

### Citation
- Zenodo DOI (concept 10.5281/zenodo.22667009) in README and CITATION.cff.

## v0.5.0 — 2026-09-08 — first citable release

First regular (non pre-release) release, archived on Zenodo. Same content as v0.4.7 plus citation metadata (CITATION.cff, .zenodo.json with ORCID).

## v0.4.7 — 2026-09-08 — key rotation, history purge, workspace header

### Security
- The Anthropic API key committed in February was revoked and replaced; the whole git history was rewritten so that no commit contains it any more.
- The unused hackathon edition is removed from the repository.

### Changed
- The four BeeBot proxies accept an optional `anthropic_workspace_id` in `config.php` and send the `anthropic-workspace-id` header when set (required for keys created at organization level).
- Landing page: one-line footer with links to Convivens Lab and HEG Genève, stats strip removed, "1 don, 3 vies" card.

### Fixed
- The floating BeeBot of the donor space greeted visitors as Amine; it now greets without a name, or with the connected person's first name.

## v0.4.6 — 2026-09-08 — chatbots greet visitors without a persona

### Fixed
- Landing page: "Code source public" and the footer licence link now point to the GitHub repository.
- BeeBot donor and BeeBot receveur opened with "Salut Amine" / "Bonjour Eleonora" even for visitors. The greeting is now generic, and shows the connected person's first name once logged in. The unused client-side prompt no longer describes a fictional user. Fictional testimonials keep their own names.

## v0.4.5 — 2026-09-08 — your own name in the spaces

### Changed
- Once logged in, the spaces greet the connected person by their own name (from the access request) instead of the demo personas: "Salut Amine" and the AK avatar in the donor space, "Bonjour Eleonora" and the EM avatar in the recipient space, the demo address in the professional portal header. Initials and hover titles follow. The demo medical data stays demo data.
- Login screens: shorter wording ("Recevoir mon code", "Saisissez le code reçu").
- `api/donnees.php`: a newly uploaded script invalidates its own cache, so region labels and new fields show up right after upload without the manual `?force=1`.

## v0.4.4 — 2026-09-08 — real collection dates for every Romandie canton and Berne

### Added
- `api/donnees.php` now reads the national collection-date list of Transfusion CRS Suisse (blutspende.ch, one request per canton: Genève, Vaud, Valais, Berne, Fribourg, Neuchâtel, Jura): mobile collections first, then centre appointment slots, with weekday, date, locality, venue, hours and the official booking link. Cached 6 hours like the rest.
- Donor space, collections card: the region buttons now show real dates for each of these cantons; Genève keeps the detailed HUG list; "Ailleurs en Suisse" links to the official search.

### Fixed
- Eligibility view: the "Remplir le questionnaire HUG" button did nothing (nested double quotes broke its handler); it now opens the questionnaire section and scrolls to it.

## v0.4.3 — 2026-09-08 — no fictional collections for visitors, region choice

### Changed
- Donor space, public mode, collections view: visitors only see the header, the official collection list and the map of real permanent centres. The demo blocks (nearby collections list, weekly table, smart detection, AR guidance) and the fictional mobile-collection markers (Molard, HES-SO Battelle, Cornavin, Uni Dufour) are reserved to invited testers, where fictional data is acceptable because it is a demo.
- The collection card offers a region choice: Genève shows the HUG list read every day; Vaud · Valais · Berne, Fribourg, Neuchâtel · Jura and "Toute la Suisse" say clearly that the dates are not yet imported and link to the official calendar of the responsible service.
- Lock badges on the mobile bottom bar, mobile menu and home tiles now render (a regex had lost its backslashes).
- Label "Prochaines collectes près de toi" (was "près de chez toi") in the invited mode.

## v0.4.2 — 2026-09-08 — locks on mobile, no fictional toasts in public mode

### Changed
- Donor space, public mode: lock badges now also appear on reserved entries of the mobile bottom bar, the mobile menu and the home tiles, not only on the desktop tabs.
- The rotating "live" toasts (fictional messages such as "8 poches restantes") no longer run in public mode; the only toast shown to visitors is a real critical level from the official barometer, displayed once.
- Stock block and glossary name the cantons covered by Transfusion Interrégionale CRS (Berne, Vaud, Valais). README documents the data cache refresh.

## v0.4.1 — 2026-09-08 — HémoRush public, hosting facts

### Changed
- HémoRush™ is open to everyone in the donor space (it works and it is the attractive part).
- Hosting stated correctly everywhere: site at Infomaniak (Geneva), access database at Supabase (Zurich); no EU mention. README corrected (no more "no database" claim, hackathon sentence removed). NDA article 5 aligned (`supabase/2026-09-08-nda-hebergement.sql`).
- Glossary: SIMED is the Service des sciences de l'information médicale of the University of Geneva.

## v0.4.0 — 2026-09-08 — real daily data in the donor space, cleaner public mode

### Added
- `api/donnees.php`: server-side endpoint that fetches, every 6 hours, the official blood-group barometer of Transfusion CRS Suisse (public API, 7 regions: Geneva, Transfusion Interrégionale, Switzerland, Zurich, Basel, Central Switzerland, Grisons), the HUG mobile collection calendar (Geneva) and a Swiss French news feed on blood donation (Google News RSS, Swiss media first). Cached in `api/cache/`, last good copy served if a source is down.
- Donor space: the stock block shows the official barometer by region with the official date and levels (Élevé, Normal, Bas, Critique); the home news carousel and a "Dans la presse aujourd'hui" card in the news view show real articles; the collections view lists the next HUG mobile collections with address and hours and links to the official search for other cantons. The "live" toast only appears when a group is really critical in the selected region.

### Changed
- Public mode fixes: no "Prototype interactif" badge, visitor avatar with "Connexion" label instead of a fake profile, notifications reserved to invited testers, VR tab reserved (not functional yet), fictional counters hidden, old access screens hidden before load (no more flash).

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
