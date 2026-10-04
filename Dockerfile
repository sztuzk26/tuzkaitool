# TuzkAI production image: builds the API + both websites and serves everything from one Node process.
FROM node:24-slim

# pnpm 10 (the lockfile and pnpm-workspace.yaml need pnpm >= 10.16)
RUN npm install -g pnpm@10

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Build args: ONLY public values. The Clerk PUBLISHABLE key (pk_...) is public by design and is
# baked into the website at build time. Never pass secrets (sk_..., DATABASE_URL, ...) as build args.
# On Render, service environment variables are made available to the Docker build for declared ARGs.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL

# Fail early with a clear message instead of shipping a site whose login cannot work.
RUN if [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ]; then \
      echo "ERROR: VITE_CLERK_PUBLISHABLE_KEY is not set. In Render open Environment, add VITE_CLERK_PUBLISHABLE_KEY (your Clerk publishable key, starts with pk_), then redeploy." >&2; exit 1; \
    fi

# Main site (/), jewelry designer (/tuzakai/) and API. mockup-sandbox is a dev-only tool and is not built.
RUN pnpm run build:prod

ENV NODE_ENV=production \
    SERVE_STATIC=1 \
    PORT=3000
EXPOSE 3000

# Straight to node (no pnpm) for fast, signal-friendly startup. Binds 0.0.0.0 and uses $PORT (Render sets it).
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
