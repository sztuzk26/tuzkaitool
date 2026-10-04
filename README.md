# TuzkAI by Sztuzk

Storefront + jewelry tools (React/Vite), a jewelry designer at `/tuzakai/`, and an Express API with PostgreSQL (Drizzle) and Clerk login.
One Docker container serves everything: the API (`/api`), the main site (`/`) and the designer (`/tuzakai/`).

pnpm workspace layout: `artifacts/api-server`, `artifacts/sztuzk-jewelry-studio` (main site), `artifacts/tuzakai-jewelry-designer`, `artifacts/mockup-sandbox` (dev-only, never deployed), `lib/*` (shared packages), `scripts`.

## Local development
Requirements: Node 22.12+ (24 recommended, see `.nvmrc`), pnpm 10 (`npm i -g pnpm@10`), a PostgreSQL database.

```bash
pnpm install                       # install
cp .env.example .env               # then fill in the values (export them in your shell; the server does not read .env itself)
pnpm --filter @workspace/db run push   # create the database tables (first time / after schema changes)
pnpm dev                           # API (needs PORT, e.g. PORT=8080)
pnpm run typecheck                 # type-check all production packages
pnpm run build                     # typecheck + production build of site, designer and API
pnpm start                         # run the production build (serves API + both sites; PORT defaults to 3000)
sh scripts/verify-prod.sh          # starts the production build and checks /api/healthz, /, /tuzakai/
```
Frontend dev servers: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/sztuzk-jewelry-studio run dev` and `PORT=5174 BASE_PATH=/tuzakai/ pnpm --filter @workspace/tuzakai-jewelry-designer run dev`.

## Environment variables
See `.env.example`. Required on Render: `DATABASE_URL`, `SESSION_SECRET` (the Blueprint generates it), `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
Add later: `TUZAKAI_ADMIN_USER_IDS` (after you sign up once), and optionally `OPENAI_API_KEY`.
`VITE_*` values are public and baked into the website at build time. Everything else is server-only and never reaches the browser.

## Push to GitHub
```bash
git init
git add .
git commit -m "Prepare project for Render deployment"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```
`.env` files are git-ignored. Do not commit secrets.

## Deploy on Render (Docker)
1. Create a Render account and click **New > Web Service**, connect the GitHub repo. (Or **New > Blueprint** to use `render.yaml`.)
2. Language/Runtime: **Docker**. Dockerfile path `./Dockerfile`, root directory empty. No Build/Start command is needed (Docker handles both).
3. Instance type: **Starter** (always on). Health Check Path: `/api/healthz`.
4. Add the environment variables above, then **Create Web Service**.
5. Open `https://<your-service>.onrender.com/api/healthz` — it should return `{"status":"ok"}`. Then open `/`.
6. Settings > Custom Domains: add `tuzkai.com` and `www.tuzkai.com`, then add the DNS records Render shows.

### Database (PostgreSQL)
- **Neon (free tier available):** copy the connection string (it ends with `?sslmode=require`) into `DATABASE_URL`.
- **Render PostgreSQL:** use the **Internal Database URL** for `DATABASE_URL` when the service and database are in the same Render region.
  Use the External URL (add `?sslmode=require`) only from your own computer.
- **Creating tables (one time, and after future schema changes).** Deploys never touch the database schema. Run from your computer
  (or the Render Shell on a paid service) with the External/pooled URL:
  ```bash
  DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
  ```
  This is the non-forcing `drizzle-kit push`: it asks before any change that could delete data. Never use `push-force` on production.
  Take a database backup before schema changes.

### Login (Clerk)
Create an app at clerk.com. Put its Publishable key in `CLERK_PUBLISHABLE_KEY` **and** `VITE_CLERK_PUBLISHABLE_KEY`, and its Secret key in `CLERK_SECRET_KEY`.
For the live domain use Clerk **Production** keys and add the DNS records Clerk shows for tuzkai.com.
If the Docker build stops with "VITE_CLERK_PUBLISHABLE_KEY is not set", add that variable in Render > Environment and redeploy.

### Admin access
Sign up on your site, open `/account`, copy your user ID, set it as `TUZAKAI_ADMIN_USER_IDS` in Render, and redeploy. Then manage products at `/admin/store`
(add your Etsy / Gumroad / Redbubble / Zazzle links and publish).

## Notes
- Checkout/Whop is intentionally disabled; buy buttons link to your marketplaces. The Whop client only works on Replit and is not used in production.
- The AI jewelry assistant needs `OPENAI_API_KEY`; without it that one feature reports "unavailable" and the rest works.
- Docker builds target linux/amd64 (Render's default).
- GitHub Actions (`.github/workflows/ci.yml`) runs install, typecheck and build on every push.
