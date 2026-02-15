# 🩸 BeeMyBlood

**Guide du donneur de sang en Suisse — Blood Donor Guide for Switzerland**

BeeMyBlood is an open-source digital platform designed to facilitate and promote blood donation in Switzerland. It provides eligibility testing, validated medical questionnaires, AI-powered assistance, and real-time information about blood collection centres — all aligned with Swiss Red Cross (CRS) criteria.

> 🚧 **Work in progress** — This project is under active development.

## Features

- **Eligibility checker** — Verify your eligibility to donate blood based on official CRS criteria
- **Medical questionnaire** — Pre-donation questionnaire validated against Swiss transfusion standards
- **AI chatbot** — Powered by Claude (Anthropic) to answer donor questions in context
- **Collection centre locator** — Interactive map of Swiss blood collection centres with schedules
- **Multilingual** — French (primary), with Swiss multilingual context
- **Professional portal** — Dedicated interface for healthcare professionals (`/pro`)
- **Hackathon edition** — Extended version with 17 views, news feed, VR demo, and gamification (`/hackathon`)

## Project Structure

```
beemyblood_project/
└── sites/
    └── beemyblood.ch/
        ├── index.html          # Main donor application (v1)
        ├── alpha_index.html    # Alpha version
        ├── api.php             # Claude API proxy (Anthropic)
        ├── hackathon/
        │   ├── index.html      # Hackathon HUG #9 edition (17 views)
        │   ├── api.php         # Claude API proxy (Hackathon)
        │   ├── Guide_5_Steps.mp4
        │   └── Demo_VR_pour_le_don_de_sang.mp4
        └── pro/
            └── index.html      # Professional portal
```

## Tech Stack

- **Frontend** — Single-file HTML/CSS/JS with React 18, Tailwind CSS, Leaflet.js
- **AI** — Claude API (Anthropic) via PHP proxy
- **Hosting** — Infomaniak (Geneva, Switzerland 🇨🇭)
- **Maps** — Leaflet / OpenStreetMap

## Getting Started

### Prerequisites

- A web server with PHP support (for `api.php`)
- An [Anthropic API key](https://console.anthropic.com/) for the chatbot feature

### Deployment

1. Clone this repository:
   ```bash
   git clone https://github.com/bumpyman/BeeMyBlood.git
   ```
2. Configure your API key in `api.php`:
   ```php
   define('ANTHROPIC_API_KEY', 'your-key-here');
   ```
   ⚠️ **Never commit your real API key.** Use environment variables or a `.env` file (excluded via `.gitignore`).
3. Upload the contents of `beemyblood_project/sites/beemyblood.ch/` to your web server.

### Local Development

You can open `index.html` directly in a browser for frontend development. The AI chatbot requires the PHP backend to be running.

## Context

BeeMyBlood was developed at [Convivens Lab](https://convivens.ch), HEG Geneva (HES-SO), as part of research on digital health infrastructures for equitable and participatory health systems. The hackathon edition was prepared for **Hackathon HUG #9 (21 mars 2026)**.

## Author

**David-Zacharie Issom, PhD**
Assistant Professor HES & Head of Convivens Lab
HEG Geneva, HES-SO
📧 davidzac.issom@hes-so.ch

## License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

This means you are free to use, modify, and distribute this software, provided that any modified versions made available over a network also share their source code under the same license.
