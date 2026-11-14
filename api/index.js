let connectDB;
let createApp;
let app;
let dbPromise;

export default async function handler(req, res) {
  try {
    if (!connectDB || !createApp) {
      const [dbModule, appModule] = await Promise.all([
        import('../server/src/config/db.js'),
        import('../server/src/app.js'),
      ]);

      connectDB = dbModule.connectDB;
      createApp = appModule.createApp;
    }

    if (!dbPromise) {
      dbPromise = connectDB();
    }

    await dbPromise;

    if (!app) {
      app = createApp();
    }

    return app(req, res);
  } catch (error) {
    console.error('Titanium API error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server connection error',
    });
  }
}
