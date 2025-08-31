# Repository Guidelines

Personal website for Ricky Chilcott - entrepreneur and developer.

This is a bridgetown personal website.

## Project Structure & Module Organization

- `src/`: Content and templates — `_posts`, `_projects`, `_til`, `_layouts`, `_partials`, `_components`, images, pages.
- `frontend/`: Asset sources — `javascript/` (Stimulus, Turbo, entry: `index.js`), `styles/` (PostCSS entries).
- `plugins/`: Custom Bridgetown builders/converters (e.g., Obsidian sync, PurgeCSS, PDF generator).
- `output/`: Built site (deployment artifact). Do not edit by hand.
- Key config: `bridgetown.config.yml`, `Rakefile`, `package.json`, `postcss.config.js`, `esbuild.config.js`.

## Build, Test, and Development Commands

- Install: `bundle install && npm install` — Ruby gems + Node packages.
- Dev server: `bin/bridgetown start` — serves at `http://localhost:4000`.
- Build (prod): `bin/bridgetown deploy` — clean, bundle assets, and build site.
- Clean: `bin/bridgetown clean` — remove previous build artifacts.
- Test build: `bin/bridetown test` — build with `BRIDGETOWN_ENV=test`.

## Coding Style & Naming Conventions

- Ruby: follow StandardRB. Run `bin/standardrb --fix` before commits.
- JavaScript: ES modules, 2‑space indent, kebab-case Stimulus identifiers derived from filenames.
- CSS: PostCSS with nesting and custom media; keep selectors scoped to components where possible.
- Content: Markdown/CommonMark with front matter; use pretty permalinks and descriptive slugs.

## Testing Guidelines

- No formal test suite. Validate via `bin/bridgetown build` to trigger a full local build.
- Check critical pages render and links work; verify CSS is purged in `output/_bridgetown/static`.
- For plugin changes, prefer small, focused classes and manual smoke tests across a fresh build.

## Commit & Pull Request Guidelines

- Commits: concise, imperative subject (e.g., “Improve Turbo”), group related changes.
- PRs: clear description, linked issues, steps to reproduce, and before/after screenshots for visual changes.
- Pre‑PR checklist: pass `bin/standardrb`, build locally (`bin/bridgetown build`), and ensure no secrets are committed.

## Security & Configuration Tips

- Secrets: store in `.env` (e.g., `API2PDF_API_KEY` for PDF generation). Never commit `.env`.
- Obsidian sync: configured in `bridgetown.config.yml`; runs only outside production and uses `rsync`.
- PDF generation: outputs files defined under `generate_pdf` (e.g., `resume.pdf`).
