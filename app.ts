import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import healthRouter from "./routes/health";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// PUBLIC, UNAUTHENTICATED liveness check for Render. Mounted BEFORE the Clerk
// middleware on purpose: it needs no login, no database and no API keys, and it
// only confirms the process is alive. Every other /api route stays behind Clerk.
app.use("/api", healthRouter);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Hosting outside Replit: set SERVE_STATIC=1 and this one server also serves the
// two websites (main store at "/" and the jewelry designer at "/tuzakai/").
// Static files need no authentication, so they are served before the Clerk middleware.
if (process.env.SERVE_STATIC === "1") {
  app.set("trust proxy", 1); // real visitor IPs behind the host's proxy (rate limits)
  const root = process.env.STATIC_ROOT ?? process.cwd();
  const studioDir = path.resolve(root, "artifacts/sztuzk-jewelry-studio/dist/public");
  const designerDir = path.resolve(root, "artifacts/tuzakai-jewelry-designer/dist/public");
  const isPageRequest = (req: express.Request) =>
    (req.method === "GET" || req.method === "HEAD") && !req.path.startsWith("/api");

  if (fs.existsSync(designerDir)) {
    app.use("/tuzakai", express.static(designerDir, { index: false }));
    app.use("/tuzakai", (req, res, next) => {
      if (!isPageRequest(req)) return next();
      res.sendFile(path.join(designerDir, "index.html"));
    });
  }
  if (fs.existsSync(studioDir)) {
    app.use(express.static(studioDir, { index: false }));
    app.use((req, res, next) => {
      if (!isPageRequest(req)) return next();
      res.sendFile(path.join(studioDir, "index.html"));
    });
  }
}

// Browser clients use the same-origin /api route. Do not grant arbitrary origins
// credentialed access to administrator endpoints.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
