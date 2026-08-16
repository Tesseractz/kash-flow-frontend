# KashPoint Frontend

React and Vite single-page application for KashPoint, a point-of-sale platform
for South African small businesses.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- `curl` and `cmp` for cPanel deployment

## Local development

Copy the development environment template, configure the backend and Supabase
values, then install dependencies and start Vite:

```bash
cp env.example.txt .env
npm install
npm run dev
```

The development server listens on `http://localhost:5000`.

## Tests and production build

```bash
npm run test:run
npm run build
npm run preview
```

Vite writes the production SPA to `dist/`. The build includes `public/.htaccess`
so an Apache/cPanel host serves `index.html` for client-side routes such as
`/auth`, `/dashboard`, and `/products`, while existing assets are served
normally.

## Deploy to cPanel

Create the local deployment configuration:

```bash
cp .env.deploy.example .env.deploy
${EDITOR:-vi} .env.deploy
```

`VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` are
compiled into the browser bundle. Variables prefixed with `VITE_` are public;
never store server-side secrets in them. `.env.deploy` is ignored by Git and
must not be committed.

Preview the build and ordered upload list with `CPANEL_DRY_RUN=true`:

```bash
./deploy.sh
```

Set `CPANEL_DRY_RUN=false` and run the command again for a live deployment. The
script builds with Vite's `deploy` mode, recursively uploads `dist/` to `/` (the
FTP account root), uploads `index.html` last, and downloads every remote file
for byte-for-byte verification. It never deletes existing remote files.

Password-based explicit FTPS on port 21 is required by default. If the server
does not support TLS, setting `CPANEL_ALLOW_PLAIN_FTP=true` enables ordinary
FTP and prints a warning. Plain FTP exposes the account password and files in
transit and should be used only after that risk is explicitly accepted.
