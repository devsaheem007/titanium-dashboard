import { connectDB } from "../server/src/config/db.js";
import { createApp } from "../server/src/app.js";

let app;
let dbPromise;

export default async function handler(req, res) {
  try {
    if (!dbPromise) {
      dbPromise = connectDB();
    }

    await dbPromise;

    if (!app) {
      app = createApp();
    }

    return app(req, res);
  } catch (error) {
    console.error("Titanium API error:", error);

    return res.status(500).json({
      success: false,
      message: "Server connection error",
    });
  }
}
