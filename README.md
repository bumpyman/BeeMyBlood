# 🐝 BeeMyBlood™

**Transfusion medicine, augmented.** An open-source platform that connects blood **donors**, **recipients** and **transfusion professionals** in Switzerland, from the donor's arm to the patient's vein.

> 🚧 Alpha release — a research prototype from [Convivens Lab](https://www.convivens.ch), HEG Geneva (HES-SO), built with the Geneva University Hospitals transfusion centre (CTS HUG), SIMED (UNIGE) and Transfusion Interrégionale CRS. Not a medical device.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22667009.svg)](https://doi.org/10.5281/zenodo.22667009)

Live demo: **https://beemyblood.ch**

## Why BeeMyBlood

Most digital tools in the blood sector stop at the donor: booking, reminders, retention. That is necessary, but it is only the first link of the chain. BeeMyBlood covers the whole chain.

| | Booking apps / centre management suites | BeeMyBlood |
|---|---|---|
| Donors: eligibility, booking, retention | ✔ | ✔ plus gamification, HémoRush™ game, referral |
| Recipients / patients | — | ✔ dedicated portal: transfusions, iron chelation, rights |
| Professionals: stocks, maps, mobile-unit routing | partial | ✔ real-time dashboard, 9 Swiss regions |
| Transfusion-specialised AI assistant | — | ✔ three BeeBots aligned with Swiss Red Cross (CRS) directives |
| Rare phenotypes and European network (EBA) | — | ✔ labile blood product search, Switzerland + EBA |
| Centre operations: agenda and bookings, reception, e-consent, reminders, audit trail, reporting | ✔ | ✔ in the professional portal, chained audit journal, CRS and SoHO exports |
| Digital twin and crisis scenarios | — | ✔ discrete-event engine, replications with 95 % confidence intervals, eight episodes, two-run comparison, replayable regulation desk |
| Equity-of-access indicators | — | ✔ per region and per district |
| Model | proprietary SaaS | open source AGPL-3.0, hosted in Switzerland, HL7 FHIR |

## Digital twin (pro/jumeau.js)

The professional portal ships a browser-only digital twin of the regional blood chain, transposed from the HEG Geneva Bachelor thesis *Digital Twin des urgences pédiatriques des HUG* (Morsch, Poupard-Kuimi, Gonçalves Silva, 2026): discrete-event engine with an event heap, one seeded random stream per source of randomness, replications aggregated with Student 95 % intervals, Little's law checked at every replication, declarative scenario with cumulative episodes (pandemic, summer, heatwave, campaign, major accident, group shortage, laboratory outage, extra mobile collection), five screens (Scenario with a pre-run judgement, Results, two-run Comparison with a five-state rule, Regulation desk replaying the first replication hour by hour, Phenotypes). The starting stock reads the official barometer through api/donnees.php; everything else is demonstration data.

## Centre operations (pro/cycle.js)

An « Opérer » tab group covers the daily donation cycle. Data lives in Supabase (supabase/2026-09-09-cycle-du-don.sql: donors, bookings and waiting list, e-consents, server-side chained audit journal, per-region parameters, anonymous journey events), behind security-definer functions restricted to professional accounts; a demonstration set is seeded the first time a region is opened, and the module falls back to a local demonstration when the server is unreachable. Two large-display pages complete it: « Flux donneurs » (pro/salle/) shows the waiting queue with call codes only, and « Flux CTS » (pro/flux/) shows the official stock barometer, the day's activity, the next collections and the news (RPC cd_flux returns counts and codes, never names). Real bookings are made by redirection to the official tool of each centre (OneDoc for the HUG, Transfusion Interrégionale CRS, blutspende.ch), and the « Réserver » clicks made in the donor space are counted anonymously (cd_evenement) and shown in the agenda. Modules: agenda and bookings (4 beds, 30-minute slots, waiting list, no-show estimate), donor file (eligibility interval per Transfusion CRS rules, consent version, preferred channel), reception (pre-filled questionnaire, e-consent with one-time code, vitals, aptitude decision), reminders (confirmation, next eligibility, lapsed donors, targeted call on groups under tension), chained audit journal with daily closing and CSV exports.

## Alpha access (invitation, email login, NDA)

The three spaces are behind a shared access module, `acces.js`, backed by Supabase (email-only one-time codes, no passwords). A visitor requests access on `/acces`, an administrator approves it on `/admin` and sends the invitation code, the tester logs in with their email, activates the code and signs the confidentiality agreement on screen. Everything is stored in the Supabase project through security-definer functions defined in `supabase/schema.sql` (run once in the SQL editor). The anon key embedded in the pages is public by design; all tables are closed by row-level security.

## The three spaces

- **Donor space** (`/donor`) — eligibility check against CRS criteria, pre-donation questionnaire, centre map with schedules, video guides, gamified journey, BeeBot donor assistant.
- **Professional portal** (`/pro`, demo login) — dashboard, interactive cartography with heatmaps, labile blood product (PSL) search across Switzerland and the EBA network, mobile-unit routing, collection planning, equity indicators, stocks, campaigns, CRS protocols, BeeBot Pro, and the **digital twin** tab (phenotype search and scenario planning).
- **Recipient space** (`/receiver`) — patient portal for people receiving red cells, platelets or plasma: transfusion journey, iron overload and chelation, blood compatibility, rights, patient associations, BeeBot Receveur.

The standalone digital-twin prototype lives in `/digitaltwin` and has been integrated into the professional portal.

## Repository layout

```
beemyblood_project/sites/beemyblood.ch/   # deployable web root (upload as-is to the server)
├── index.html                 # landing page
├── projet/index.html          # project description page
├── donor/                     # donor space + BeeBot proxy (api.php)
├── pro/                       # professional portal + BeeBot Pro proxy (api.php)
├── receiver/                  # recipient space + BeeBot proxy (api_receiver.php)
├── digitaltwin/index.html     # standalone digital twin prototype (Vue + Leaflet)
├── hackathon/                 # Hackathon HUG #9 edition
├── api.php                    # BeeBot proxy for the landing/alpha pages
├── lexique.js                 # shared glossary: acronyms explained on hover/tap + full list
├── acces.js                   # shared alpha access: email code, invitation, NDA (Supabase)
├── acces/index.html           # public access request form (1 to 3 spaces)
├── connexion/index.html       # single login page, then choice of space
├── admin/index.html           # admin: approve requests, spaces, signatures, journal
├── api/donnees.php            # daily data: official stock barometer, collection dates per canton, HUG list, Swiss news (cached 1 h)
├── config.example.php         # copy to config.php and add your Anthropic API key
└── alpha_index.html, old_index.html, index_landing_classic.html   # earlier versions
```

## Tech stack

- **Frontend** — single-file HTML/CSS/JS pages, Leaflet + leaflet.heat for maps, Vue 3 in the standalone digital twin.
- **AI** — Claude (Anthropic) through small PHP proxies. One shared `config.php` holds the API key and the model alias (`claude-opus-5` by default).
- **Hosting** — everything in Switzerland: the site at Infomaniak (Geneva), the access database (accounts, requests, NDA signatures, access log) at Supabase (Zurich region). The demo content of the spaces is local to the pages; daily real data (stocks, collections, news) comes from `api/donnees.php`.

## Deployment

1. Clone the repository.
2. Copy `config.example.php` to `config.php` next to `index.html` and set your [Anthropic API key](https://console.anthropic.com/). `config.php` is git-ignored: never commit a real key.
3. Upload the contents of `beemyblood_project/sites/beemyblood.ch/` (including `config.php`) to a PHP-enabled web server.
4. Check a BeeBot proxy, for example:

```bash
curl -s -X POST https://your-domain/api.php -H "Content-Type: application/json" -d '{"message":"Bonjour"}'
```

For local frontend work you can open the HTML files directly or serve the folder with any static server. The BeeBots need PHP.

### Email notification of access requests

Each new row in demandes_acces triggers (via pg_net, see supabase/2026-09-09-notification-demandes.sql) a POST to api/notif.php, which emails the request to admin_email from config.php. The trigger sends the header X-BMB-Secret; it must equal notif_secret in config.php, otherwise the call is refused. Sending goes through SMTP when smtp_user and smtp_pass are set in config.php (a mailbox of the domain, mail.infomaniak.com, port 465), otherwise through PHP mail(), which Infomaniak disables by default (Manager > Web hosting > PHP). The recent calls and their HTTP status are visible in Supabase with `select * from net._http_response order by id desc limit 5;`.

### Daily data cache

`api/donnees.php` fetches the official stock barometer, the HUG collection calendar and the news feed, and keeps the result for 1 hour in `api/cache/donnees.json` (created by PHP, git-ignored). After uploading a new `donnees.php`, or whenever you want fresh data right away, open once:

```bash
curl -s "https://beemyblood.ch/api/donnees.php?force=1" | head -c 300
```

Otherwise the change shows up at the latest 1 hour later. If the cache folder is not writable on the server, everything still works, just without caching.

## Data and privacy

The spaces show demo data only. The pages send to a server: the BeeBot questions (PHP proxy to the Anthropic API), the access requests and logins (Supabase, Zurich), and nothing else. Hosted in Switzerland, designed for nLPD/GDPR compliance and HL7 FHIR interoperability.

## Author and context

**David-Zacharie Issom, PhD** — Assistant Professor HES, Head of Convivens Lab, HEG Geneva (HES-SO). davidzac.issom@hes-so.ch

BeeMyBlood is part of research on digital health infrastructures for equitable and participatory health systems.

### How to cite

Every release is archived on Zenodo. The concept DOI [10.5281/zenodo.22667009](https://doi.org/10.5281/zenodo.22667009) always resolves to the latest version; each release also has its own DOI (v0.5.0: [10.5281/zenodo.22667010](https://doi.org/10.5281/zenodo.22667010)). Citation metadata is in [CITATION.cff](CITATION.cff).

> Issom, D.-Z. (2026). *BeeMyBlood: an open platform connecting blood donors, recipients and transfusion professionals in Switzerland* (software). Convivens Lab, HEG Genève (HES-SO). https://doi.org/10.5281/zenodo.22667009

## License

GNU Affero General Public License v3.0, see [LICENSE](LICENSE). You may use, modify and distribute this software, provided that modified versions made available over a network also share their source under the same license.
