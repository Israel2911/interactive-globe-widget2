// functions/index.js
const functions = require('firebase-functions');
const { createApp } = require('./server');

const app = createApp();

exports.globeApi = functions.https.onRequest(app);
