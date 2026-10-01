# Toolbox

Practical, local-first web tools. The interface is German by default, with English available in settings.

Kleine, lokale Web-Werkzeuge. Die Oberfläche ist standardmäßig Deutsch; Englisch gibt es in den Einstellungen.

Persistent development guidelines live in [`docs/arena-instructions.md`](docs/arena-instructions.md).

## Tools

- Random number (`/tools/random-number`)
- Timer (`/tools/timer`)
- Unit converter (`/tools/unit-converter`) — length, weight, and temperature

The existing Draußen-Tracker is intentionally not included yet. Integrate it later without rewriting its behavior.

## Privacy

Toolbox runs in the browser. There is no account, backend, analytics, advertising, or unnecessary external request. Language and theme choices are stored in `localStorage` on this device.

## Development

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Other checks:

```sh
npm test
npm run typecheck
npm run build
```

## Adding a tool

1. Create `src/tools/<id>/` with the tool component as the default export, plus pure logic and tests.
2. Register it in `src/tools/registry.ts` and `src/tools/modules.ts`.
3. Add every user-facing string to both `src/i18n/locales/de.json` and `src/i18n/locales/en.json`.

The route is `/tools/<id>`. Do not copy the global layout, theme, or navigation into the tool.

## Adding a language

1. Add `src/i18n/locales/<code>.json` with the same keys as the existing files.
2. Register the locale in `src/i18n/language.ts` (`supportedLanguages`) and `src/i18n/index.ts` (`resources`).
3. Add the language’s own name to every locale file under `languages`.

Components must not branch on language codes for copy.

## GitHub Pages

Pages is not enabled yet, and the deploy workflow is not active. The repository token cannot create files under `.github/workflows/`, so these steps are still manual:

1. Copy [`docs/ci/pages.yml`](docs/ci/pages.yml) to `.github/workflows/pages.yml`.
2. Optionally copy [`docs/ci/ci.yml`](docs/ci/ci.yml) to `.github/workflows/ci.yml` so pull requests run tests.
3. In the repository settings, open **Pages** and set the source to **GitHub Actions**.
4. Merge to `main`. The deploy workflow runs on pushes to `main` and on manual dispatch. It does not deploy this pull request by itself.

The workflow builds with `VITE_BASE_PATH=/<repository-name>/` and uploads `dist`. For this repository that prefix is `/Toolbox/`. A plain `npm run build` uses `/` and is not the Pages artifact. `npm run build:pages` reproduces the current project-site prefix.

GitHub Pages does not rewrite routes. It serves `404.html` at the requested URL. The generated file redirects `/Toolbox/tools/timer` to `/Toolbox/?/tools/timer`, and `src/main.tsx` restores the real path before React Router starts. That keeps `/tools/<tool-name>` without a hash route and without server rewrites. The same fallback covers `/settings`. Local `vite` and `vite preview` already fall back to `index.html`, so they do not need the redirect.

The visible line in `404.html` is bilingual on purpose. That file runs before the app and cannot use i18next.

Expected project URL after the first successful deploy: `https://hpmine42.github.io/Toolbox/`.

## Architecture

- Tool metadata lives in the registry. Tool UI is lazy-loaded from `src/tools/modules.ts`.
- Visible copy goes through i18next. German (`de`) is the default; English (`en`) is included. On the first visit, a supported browser language is used. A later manual choice in settings wins and is stored locally.
- Theme follows the system until a light or dark choice is stored locally.
- Routing uses the browser history API, with the Pages fallback above. Do not switch to hash routes.

## Limitations

- Leaving a tool page stops the timer. It is not kept running in the background.
