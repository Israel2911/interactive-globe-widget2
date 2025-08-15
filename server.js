const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_super_strong_and_secret_session_key_goes_here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        res.setHeader('Cache-Control', 'no-cache');
    }
}));

const config = {
    wixClientId: process.env.WIX_CLIENT_ID || 'fbee306e-6797-40c2-8a51-70f052b8dde4',
    redirectUri: process.env.REDIRECT_URI || 'https://interactive-globe-widget2.onrender.com/',
    wixTokenUrl: 'https://www.wix.com/oauth2/token',
    wixUserUrl: 'https://www.wixapis.com/identity/v1/identity',
    wixAuthUrl: 'https://www.wix.com/oauth/authorize'
};

const activeSessions = new Map();

const europeContent = [];
const newThailandContent = [];
const canadaContent = [];
const ukContent = [];
const usaContent = [];
const indiaContent = [];
const singaporeContent = [];
const malaysiaContent = [];
const countryPrograms = {};
const countryConfigs = [];

app.post('/auth/login-url', (req, res) => {
    const { challenge } = req.body;
    const params = new URLSearchParams({
        client_id: config.wixClientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid',
        code_challenge: challenge,
        code_challenge_method: 'S256'
    });
    res.json({ loginUrl: `${config.wixAuthUrl}?${params.toString()}` });
});

app.post('/auth/complete', async (req, res) => {
    const { code, verifier } = req.body;
    if (!code || !verifier) {
        return res.status(400).json({ error: 'Missing code or verifier' });
    }
    try {
        const tokenResponse = await axios.post(config.wixTokenUrl, {
            grant_type: 'authorization_code',
            client_id: config.wixClientId,
            code_verifier: verifier,
            code: code,
            redirect_uri: config.redirectUri
        });
        const userResponse = await axios.get(config.wixUserUrl, {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
        });
        const user = userResponse.data;
        const previousSession = activeSessions.get(user.id);
        if (previousSession && previousSession !== req.sessionID) {
            req.sessionStore.destroy(previousSession, () => {});
        }
        activeSessions.set(user.id, req.sessionID);
        req.session.isLoggedIn = true;
        req.session.wixUserId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name || user.displayName;
        req.session.accessToken = tokenResponse.data.access_token;
        console.log(`User ${user.email} logged in successfully`);
        res.json({ success: true });
    } catch (error) {
        console.error('OAuth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

app.get('/auth/status', (req, res) => {
    res.json({
        isAuthenticated: !!req.session.isLoggedIn,
        user: req.session.isLoggedIn ? {
            id: req.session.wixUserId,
            email: req.session.userEmail,
            name: req.session.userName
        } : null
    });
});

app.post('/auth/logout', (req, res) => {
    if (req.session.wixUserId) {
        activeSessions.delete(req.session.wixUserId);
    }
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

function requireAuth(req, res, next) {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.session.wixUserId;
    if (!activeSessions.has(userId) || activeSessions.get(userId) !== req.sessionID) {
        return res.status(401).json({ error: 'Session expired or superseded' });
    }
    next();
}

app.get('/api/student/profile', requireAuth, (req, res) => {
    res.json({
        id: req.session.wixUserId,
        email: req.session.userEmail,
        name: req.session.userName
    });
});

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        if (extname) return cb(null, true);
        cb(new Error('Only documents and images allowed'));
    }
});

app.post('/api/student/documents', requireAuth, upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const documentInfo = {
        userId: req.session.wixUserId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadDate: new Date()
    };
    console.log('Document uploaded:', documentInfo);
    res.json({ 
        success: true,
        document: {
            id: req.file.filename,
            name: req.file.originalname,
            size: req.file.size
        }
    });
});

app.get('/api/student/applications', requireAuth, (req, res) => {
    res.json({
        applications: [],
        availableForms: [
            'University Application',
            'Scholarship Application', 
            'Visa Documentation'
        ]
    });
});

app.get('/api/globe-data', (req, res) => {
    res.json({
        europeContent, newThailandContent, canadaContent, ukContent, usaContent,
        indiaContent, singaporeContent, malaysiaContent, countryPrograms, countryConfigs,
        isAuthenticated: !!req.session.isLoggedIn
    });
});

app.get('/api/carousel/data', (req, res) => {
    res.json([
        { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
        { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced programs." },
        { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
        { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
        { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
        { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
    ]);
});

app.get('/health', (req, res) => {
    res.json({ status: 'Secure Globe Widget backend running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Secure server running on port ${PORT}`);
    console.log(`OAuth Client ID: ${config.wixClientId.substring(0, 8)}...`);
});
