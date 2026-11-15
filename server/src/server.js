import mongoose from "mongoose";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

async function start() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Titanium API running on port ${env.port}`);
  });

  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async (err) => {
      if (err) {
        console.error("HTTP server shutdown error:", err.message);
        process.exitCode = 1;
      }

      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
      } catch (dbError) {
        console.error("MongoDB shutdown error:", dbError.message);
        process.exitCode = 1;
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
