# ImageIT3D + LaunchIT3D

An idea-to-listing pipeline for non-technical 3D print sellers. Southeast Missouri State University capstone.

- **ImageIT3D** turns a plain-language description into a printable 3D model: built-in product templates, raised letters, Meshy AI generation, or an imported STL, OBJ or GLB file.
- **LaunchIT3D** checks printability, suggests a price, writes the marketplace listing, and exports a seller package.

## Quick start

You need [Node.js](https://nodejs.org) 18.18 or newer.

```powershell
git clone https://github.com/<your-account>/ImageIT3D.git
cd ImageIT3D
npm install
Copy-Item .env.example .env     # macOS/Linux: cp .env.example .env
npm start
```

Open http://localhost:3000. The app works with no keys at all. Keys turn on the optional features:

| Key in `.env` | Turns on | Without it |
| --- | --- | --- |
| `MESHY_API_KEY` | "Generate with Meshy" in Design | Panel hidden; file import still works |
| `ANTHROPIC_API_KEY` | Claude writes the design chat and listing copy | Built-in designer and listing templates |

Each teammate uses their own `.env`. It's in `.gitignore`; never commit it. If a key is ever pushed, revoke it right away and make a new one.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Runs the server at http://localhost:3000 |
| `npm run dev` | Same, but restarts when server files change |
| `npm test` | Geometry, printability, pricing and API tests (also runs on every pull request) |
| `npm run mock:meshy` | Fake Meshy server for testing generation and colors without spending credits (see `tests/mocks/meshy-mock.js` for how to point the app at it) |
| `npm run stress` | API load and rate-limit test plus geometry performance benchmark (slower; run before demos) |
| `python tests/e2e/smoke_test.py` | End-to-end browser test with screenshots. Needs `npm start` running and `pip install playwright` then `python -m playwright install chromium` once |

## Project layout

```
public/                 The web app (plain HTML, CSS and ES modules, no build step)
  index.html            Page markup
  css/styles.css        All styles; colors are tokens at the top
  assets/fonts/         Font used for raised letters
  js/
    app.js              Entry point: wires everything together
    config/catalog.js   Templates, presets, printers, materials, marketplaces
    core/               State, spec validation, helpers
    geometry/           Builds meshes from a spec (shapes/, text.js, build.js)
    analysis/           Printability checks and pricing
    viewer/             three.js 3D preview
    services/           Talks to the server, imports files, exports packages
    ui/                 One module per panel (design, check, price, listing, export)
server/                 Node + Express
  index.js              Entry point (npm start)
  app.js                Builds the Express app and mounts routes
  config.js             Reads .env
  routes/               /api/meshy, /api/assistant, /api/projects
  services/             Meshy and Claude API clients
  prompts/              Assistant prompts
  db/projectStore.js    Project storage (JSON file today; swap for a real database)
tests/                  node:test suites, stress/ (load + performance), e2e/ (browser)
docs/ARCHITECTURE.md    How the pieces fit and how to extend them
```

## Working on it as a team

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first pull request, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how to add templates, checks, routes and panels. The code is split so each area of work lives in its own folders:

| Area | Main folders |
| --- | --- |
| Front-end UI and design | `public/index.html`, `public/css/`, `public/js/ui/`, `public/js/viewer/` |
| Database and accounts | `server/db/`, `server/routes/projects.js`, `public/js/services/projects.js` |
| AI and Meshy | `server/routes/meshy.js`, `server/routes/assistant.js`, `server/services/`, `server/prompts/`, `public/js/services/meshy.js`, `public/js/services/assistant.js` |
| Printability, pricing and geometry | `public/js/analysis/`, `public/js/geometry/`, `public/js/config/catalog.js` |
| QA, docs and integration | `tests/`, `docs/`, `.github/`, `public/js/app.js` |

## Known limits

- Print time and filament are estimates from volume and surface area. A slicer gives exact numbers.
- Marketplace fees in `catalog.js` are estimates and change over time.
- Letters are raised, not engraved (engraving needs a 3D boolean library).
- The chat sends anything the built-in templates can't make (animals, figures, sculptures) to Meshy, so that needs a Meshy key. Blocked content is filtered by keyword lists in `public/js/config/content-rules.js` and then by Meshy's own moderation; keyword lists can't catch every wording.
- Imported meshes are kept in the browser, not in the project library.
- Rate limits are in memory and reset when the server restarts.
