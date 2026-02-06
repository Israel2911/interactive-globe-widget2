// functions/index.js

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const express = require("express");
const axios = require("axios");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const url = require("url");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fs = require("fs");

// In‑memory notifications store
const pendingNotifications = {};

const wixAccountId = process.env.WIX_ACCOUNT_ID;
const wixApiKey = process.env.WIX_API_KEY;

const app = express();

// === CRITICAL FIX: Trust proxy for Functions / Cloud Run ===
app.set("trust proxy", 1);

// === CORS (same as server.js) ===
app.use(
  cors({
    origin: [
      "https://www.globaleducarealliance.com",
      "https://globaleducarealliance-com.filesusr.com",
    ],
    credentials: true,
  })
);

// === MIDDLEWARE SETUP ===
app.use(express.json());
app.use(cookieParser());

// === SESSION SETUP ===
app.use(
  session({
    secret: process.env.SESSION_SECRET || "a-new-super-strong-secret-for-sso",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// === EMAIL-BASED AUTH MIDDLEWARE ===
app.use((req, res, next) => {
  try {
    console.log("📧 Checking for userEmail in URL...");
    console.log("🔍 Current session ID:", req.sessionID);
    console.log("🔍 Session before processing:", req.session);

    if (req.authProcessed) {
      return next();
    }

    const parsed = url.parse(req.url, true);
    const email = parsed.query?.userEmail;

    if (email) {
      console.log("✅ Processing email authentication:", decodeURIComponent(email));

      req.authProcessed = true;

      req.session.isLoggedIn = true;
      req.session.wixUserId = "user-" + Date.now();
      req.session.userEmail = decodeURIComponent(email);
      req.session.userName = email.split("@")[0];
      req.session.authMethod = "email_auth";

      console.log("💾 Session AFTER setting:", req.session);
      console.log(`✅ Session created for ${req.session.userEmail}`);

      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return next();
        } else {
          console.log("💾 Session saved successfully");
        }

        const cleanQuery = { ...parsed.query };
        delete cleanQuery.userEmail;
        const cleanUrl = url.format({ pathname: parsed.pathname, query: cleanQuery });

        if (req.originalUrl !== cleanUrl) {
          console.log("🔄 Redirecting to clean URL:", cleanUrl);
          return res.redirect(cleanUrl || "/");
        } else {
          console.log("✅ Already on clean URL, continuing...");
          return next();
        }
      });
      return;
    }

    next();
  } catch (e) {
    console.error("❌ Email processing error:", e.message);
    next();
  }
});

// === STATIC FILES (will serve from functions dir; safe for now) ===
app.use(
  express.static(".", {
    setHeaders: (res, path) => {
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// === NO-CACHE MIDDLEWARE ===
const noCache = (req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
  next();
};

// === URL ENCRYPTION HELPERS ===
function encryptUrl(realUrl, additionalData = {}) {
  if (!realUrl || realUrl === "#") return realUrl;

  const token = jwt.sign(
    {
      realUrl: realUrl,
      ...additionalData,
      timestamp: Date.now(),
    },
    process.env.JWT_SECRET || "a-new-super-strong-secret-for-sso",
    { expiresIn: "1h" }
  );

  return `/api/link/${token}`;
}

function encryptLinksInObject(obj) {
  if (!obj) return obj;

  const encrypted = { ...obj };

  if (encrypted.programLink) {
    encrypted.programLink = encryptUrl(encrypted.programLink, {
      university: encrypted.university,
      programName: encrypted.programName,
      type: "program",
    });
  }
  if (encrypted.applyLink) {
    encrypted.applyLink = encryptUrl(encrypted.applyLink, {
      university: encrypted.university,
      type: "apply",
    });
  }
  if (encrypted.erasmusLink) {
    encrypted.erasmusLink = encryptUrl(encrypted.erasmusLink, {
      university: encrypted.university,
      type: "erasmus",
    });
  }
  if (encrypted.researchLink) {
    encrypted.researchLink = encryptUrl(encrypted.researchLink, {
      university: encrypted.university,
      type: "research",
    });
  }

  return encrypted;
}

// === DATA ARRAYS & CONFIGS (copied as-is) ===
// … keep **all** your europeContent, newThailandContent, canadaContent, ukContent,
// usaContent, indiaContent, singaporeContent, malaysiaContent, countryPrograms,
// countryConfigs exactly as in server.js above …
const europeContent = [/* ... your existing objects ... */];
const newThailandContent = [/* ... */];
const canadaContent = [/* ... */];
const ukContent = [/* ... */];
const usaContent = [/* ... */];
const indiaContent = [/* ... */];
const singaporeContent = [/* ... */];
const malaysiaContent = [/* ... */];

const countryPrograms = { /* ... as in server.js ... */ };
const countryConfigs = [ /* ... as in server.js ... */ ];

// === AUTH HELPERS ===
function requireAuth(req, res, next) {
  if (req.session && req.session.isLoggedIn) {
    console.log("[AUTH] Session authenticated:", req.session.userEmail);
    return next();
  }
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "a-new-super-strong-secret-for-sso"
      );
      req.session = req.session || {};
      req.session.isLoggedIn = true;
      req.session.userEmail = decoded.email || decoded.userEmail;
      req.session.userName = (decoded.email || "").split("@")[0];
      req.session.authMethod = "jwt";
      console.log("[AUTH] JWT authenticated:", req.session.userEmail);
      return next();
    } catch (err) {
      console.error("[AUTH] JWT error:", err);
      return res.status(401).json({ error: "Invalid token" });
    }
  }
  console.log("[AUTH] Not authenticated");
  res.status(401).json({ error: "Authentication required" });
}

// === HEALTH CHECK (root for cloud function) ===
app.get("/", (req, res) => {
  logger.info("Globe API health check", { structuredData: true });
  res.status(200).send("Globe API is up");
});

// === EXISTING AUTH/SSO ENDPOINTS ===
app.post("/api/unlock-user-links", (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail) return res.status(400).json({ error: "Missing email" });
  req.session.isLoggedIn = true;
  req.session.userEmail = userEmail;
  req.session.userName = userEmail.split("@")[0];
  req.session.authMethod = "client_unlock";
  res.json({ success: true, userEmail });
});

app.post("/api/verify-sso-token", noCache, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "SSO Token is missing." });
  }

  try {
    const wixVerificationUrl =
      "https://www.globaleducarealliance.com/_functions/verifySsoToken";
    const response = await axios.post(wixVerificationUrl, { token });
    if (response.data.verified) {
      const { member } = response.data;
      req.session.isLoggedIn = true;
      req.session.wixUserId = member.id;
      req.session.userEmail = member.email;
      req.session.userName = member.name;
      req.session.authMethod = "wix_sso";

      console.log(`SSO Success: Session created for ${member.email}`);
      return res.status(200).json({ isAuthenticated: true });
    } else {
      console.log("Wix rejected the SSO token.");
      return res.status(401).json({ error: "Invalid or expired SSO token." });
    }
  } catch (error) {
    console.error("SSO verification error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to verify SSO session." });
  }
});

app.get("/api/generate-token", noCache, (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }
  const jwtSecret =
    process.env.JWT_SECRET || "a-new-super-strong-secret-for-sso";
  const token = jwt.sign({ email }, jwtSecret, { expiresIn: "1h" });
  res.json({ token });
});

app.get("/api/auth/status", noCache, (req, res) => {
  console.log("📊 Auth status check - Session ID:", req.sessionID);
  console.log("📊 Auth status check - Session:", req.session);
  console.log("📊 isLoggedIn:", req.session?.isLoggedIn);
  console.log("📊 userEmail:", req.session?.userEmail);

  if (req.session && req.session.isLoggedIn) {
    return res.json({
      isAuthenticated: true,
      user: {
        id: req.session.wixUserId,
        email: req.session.userEmail,
        name: req.session.userName,
      },
    });
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "a-new-super-strong-secret-for-sso"
      );
      return res.json({
        isAuthenticated: true,
        user: {
          id: decoded.email,
          email: decoded.email,
          name: (decoded.email || "").split("@")[0],
        },
      });
    } catch (err) {
      console.error("[SSO status check] JWT error:", err);
    }
  }

  res.json({ isAuthenticated: false, user: null });
});

// === PROTECTED STUDENT ENDPOINTS ===
app.get("/api/student/profile", requireAuth, (req, res) => {
  res.json({
    id: req.session.wixUserId,
    email: req.session.userEmail,
    name: req.session.userName,
  });
});

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
    if (allowedTypes.test(file.originalname.toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error("Only documents and images are allowed"));
  },
});

app.post(
  "/api/student/documents",
  requireAuth,
  upload.single("document"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log(
      `Document uploaded for user ${req.session.wixUserId}: ${req.file.originalname}`
    );
    res.json({
      success: true,
      document: {
        id: req.file.filename,
        name: req.file.originalname,
        size: req.file.size,
      },
    });
  }
);

app.get("/api/student/applications", requireAuth, (req, res) => {
  res.json({
    applications: [],
    availableForms: [
      "University Application",
      "Scholarship Application",
      "Visa Documentation",
    ],
  });
});

// === GLOBE DATA ENDPOINT (CRITICAL FOR CUBE COLORS) ===
app.get("/api/globe-data", (req, res) => {
  const encryptedData = {
    europeContent: europeContent.map(encryptLinksInObject),
    newThailandContent: newThailandContent.map(encryptLinksInObject),
    canadaContent: canadaContent.map(encryptLinksInObject),
    ukContent: ukContent.map(encryptLinksInObject),
    usaContent: usaContent.map(encryptLinksInObject),
    indiaContent: indiaContent.map(encryptLinksInObject),
    singaporeContent: singaporeContent.map(encryptLinksInObject),
    malaysiaContent: malaysiaContent.map(encryptLinksInObject),
    countryPrograms,
    countryConfigs,
  };

  res.json(encryptedData);
});

// === LINK DECRYPTION / REDIRECT ===
app.get("/api/link/:token", requireAuth, (req, res) => {
  try {
    const decoded = jwt.verify(
      req.params.token,
      process.env.JWT_SECRET || "a-new-super-strong-secret-for-sso"
    );
    console.log(
      `🔗 Link access: ${
        decoded.type || "unknown"
      } for ${decoded.university || "unknown university"} by ${
        req.session.userEmail
      }`
    );
    res.redirect(decoded.realUrl);
  } catch (error) {
    console.error("🚫 Invalid link token:", error.message);
    res.status(401).send("Link expired or invalid. Please try again.");
  }
});

// === CAROUSEL DATA ===
app.get("/api/carousel/data", (req, res) => {
  res.json([
    {
      category: "UG",
      img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png",
      title: "Undergraduate",
      text: "Bachelor-level opportunities.",
    },
    {
      category: "PG",
      img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png",
      title: "Postgraduate",
      text: "Master's & advanced.",
    },
    {
      category: "Diploma",
      img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png",
      title: "Diploma",
      text: "Professional & foundation.",
    },
    {
      category: "Mobility",
      img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png",
      title: "Semester Abroad",
      text: "Exchange & mobility.",
    },
    {
      category: "Upskilling",
      img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png",
      title: "Upskilling",
      text: "Short-term training.",
    },
    {
      category: "Research",
      img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg",
      title: "Research",
      text: "Opportunities & links.",
    },
  ]);
});

// === APPLICATION SUBMISSION / NOTIFICATIONS ===
app.post("/api/application-submitted", (req, res) => {
  const { userId, universityName } = req.body;
  if (!userId || !universityName) {
    return res.status(400).send("Missing required fields.");
  }
  if (!pendingNotifications[userId]) {
    pendingNotifications[userId] = [];
  }
  pendingNotifications[userId].push({ universityName });
  console.log(`✅ Stored notification for user ${userId} for ${universityName}.`);
  res.status(200).send("Notification received.");
});

app.get("/api/applications/notifications", requireAuth, (req, res) => {
  const userId = req.session.wixUserId;
  if (pendingNotifications[userId] && pendingNotifications[userId].length > 0) {
    console.log(
      `📬 Delivering ${pendingNotifications[userId].length} notifications to user ${userId}.`
    );
    const notifications = pendingNotifications[userId];
    delete pendingNotifications[userId];
    res.status(200).json({ notifications });
  } else {
    res.status(200).json({ notifications: [] });
  }
});

// === EXTRA HEALTH ROUTE (optional) ===
app.get("/health", (req, res) => {
  res.json({
    status: "Secure Globe Widget backend running",
    timestamp: new Date().toISOString(),
  });
});

// Wrap Express app in Firebase HTTPS function
exports.globeApi = onRequest(app);
