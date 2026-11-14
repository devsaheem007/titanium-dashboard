import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { sanitize } from "./middleware/sanitize.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/error.js";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // correct client IPs behind a reverse proxy, needed for rate limiting
  app.disable("x-powered-by");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // allow the React app to show uploaded avatars
  app.use(cors({ origin: env.clientUrl, credentials: true })); // credentials: true lets the browser send the auth cookie
  if (!env.isProd) app.use(morgan("dev"));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(sanitize);

  app.use("/api", apiLimiter, routes);
  app.use("/api", notFound);

  // Optional: serve the built React app from the same server (npm run build in /client)
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) =>
      res.sendFile(path.join(clientDist, "index.html")),
    );
  }

  app.use(errorHandler);
  return app;
}
