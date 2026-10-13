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

## Running Locally

Because these utilities are client-side web applications with an optional lightweight PHP proxy for Movie Search:

- **Any static web server or browser**:
  Open `index.html` directly in your browser or run:
  ```bash
  python3 -m http.server 8000
  ```
- **With PHP (enables torrent proxy)**:
  ```bash
  php -S localhost:8000
  ```
