# Toolbox — Developer & Web Utilities Suite

An all-in-one suite of browser-based utilities with an integrated navigation directory.

## Included Tools

1. **Phone Validator** (`/phone-validator/`)
   - Advanced filterable batch processor for international phone numbers.
   - Cleans raw input, validates international phone formats, categorizes by country/carrier.
   - Export filtered results directly to CSV.

2. **MailForge** (`/mailforge/`)
   - Email permutation and list generator with domain-specific column headers.
   - Multi-provider support (Gmail, Yahoo, Outlook, custom domains).
   - One-click copy to clipboard and SheetJS Excel (`.xlsx`) export.

3. **Movie & TV Search** (`/moviesearch/`)
   - Media explorer powered by TMDB and YTS endpoints.
   - Movie search, trending TV series catalog, trailers, and torrent magnets.
   - Built-in PHP proxy (`torrent_proxy.php`) for seamless downloads.

## Directory Structure

```text
toolbox/
├── index.html                   # Directory Navigation Hub
├── README.md                    # Documentation
├── phone-validator/
│   └── index.html               # Phone Validator utility
├── mailforge/
│   └── index.html               # MailForge utility
└── moviesearch/
    ├── index.html               # Movie & Series browser UI
    ├── movies.js                # Movie catalog scripts
    ├── series.js                # TV series catalog scripts
    ├── torrent_proxy.php        # Optional PHP torrent proxy
    └── js/
        └── dashboard.js         # Navigation and state persistence
```

## Running Locally with Docker

Docker Desktop with Compose is required. From this folder, start the single Toolbox
container:

```bash
docker compose up -d --build
```

Open the hub at <http://localhost:8119>. The utilities are available at:

- Phone Validator: <http://localhost:8119/phone-validator/>
- MailForge: <http://localhost:8119/mailforge/>
- Movie & TV Search: <http://localhost:8119/moviesearch/>

The container runs PHP's development web server as a non-root user. This serves the
static pages and enables `moviesearch/torrent_proxy.php`. No database or application
secrets are configured. Movie and TV data, posters, and downloads still rely on their
existing external APIs; external API availability and browser-side API restrictions
are not verified by the local health check.

```bash
# Check status and health
docker compose ps

# Follow logs
docker compose logs -f web

# Stop the Toolbox container
docker compose stop
```
