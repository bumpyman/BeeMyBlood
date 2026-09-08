# Changelog

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
