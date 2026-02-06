const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  logger.info("Globe API health check", { structuredData: true });
  res.status(200).send("Globe API is up");
});

// TODO: move your existing server.js routes into this app

exports.globeApi = onRequest(app);
