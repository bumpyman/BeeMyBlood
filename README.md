# 🐝 BeeMyBlood™

**Transfusion medicine, augmented.** An open-source platform that connects blood **donors**, **recipients** and **transfusion professionals** in Switzerland, from the donor's arm to the patient's vein.

> 🚧 Alpha release — a research prototype from [Convivens Lab](https://www.convivens.ch), HEG Geneva (HES-SO), built with the Geneva University Hospitals transfusion centre (CTS HUG), SIMED (UNIGE) and Transfusion Interrégionale CRS. Not a medical device.

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
| Digital twin and crisis scenarios | — | ✔ stock simulation: pandemic, disaster, campaigns |
| Equity-of-access indicators | — | ✔ per region and per district |
| Model | proprietary SaaS | open source AGPL-3.0, hosted in Switzerland, HL7 FHIR |

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
├── config.example.php         # copy to config.php and add your Anthropic API key
└── alpha_index.html, old_index.html, index_landing_classic.html   # earlier versions
```

## Tech stack

- **Frontend** — single-file HTML/CSS/JS pages, Leaflet + leaflet.heat for maps, Vue 3 in the standalone digital twin.
- **AI** — Claude (Anthropic) through small PHP proxies. One shared `config.php` holds the API key and the model alias (`claude-opus-5` by default).
- **Hosting** — Infomaniak, Geneva, Switzerland. No database: all demo data is local to the pages.

## Deployment

1. Clone the repository.
2. Copy `config.example.php` to `config.php` next to `index.html` and set your [Anthropic API key](https://console.anthropic.com/). `config.php` is git-ignored: never commit a real key.
3. Upload the contents of `beemyblood_project/sites/beemyblood.ch/` (including `config.php`) to a PHP-enabled web server.
4. Check a BeeBot proxy, for example:

```bash
curl -s -X POST https://your-domain/api.php -H "Content-Type: application/json" -d '{"message":"Bonjour"}'
```

For local frontend work you can open the HTML files directly or serve the folder with any static server. The BeeBots need PHP.

## Data and privacy

Demo data only. The pages send nothing to a server except the BeeBot questions, which go through the PHP proxy to the Anthropic API. Hosted in Switzerland, designed for nLPD/GDPR compliance and HL7 FHIR interoperability.

## Author and context

**David-Zacharie Issom, PhD** — Assistant Professor HES, Head of Convivens Lab, HEG Geneva (HES-SO). davidzac.issom@hes-so.ch

BeeMyBlood is part of research on digital health infrastructures for equitable and participatory health systems. The hackathon edition was prepared for Hackathon HUG #9 (21 March 2026).

## License

GNU Affero General Public License v3.0, see [LICENSE](LICENSE). You may use, modify and distribute this software, provided that modified versions made available over a network also share their source under the same license.
