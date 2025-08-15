const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware Setup
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

// OAuth Configuration - UPDATED for Option 2
const config = {
    wixClientId: process.env.WIX_CLIENT_ID || 'fbee306e-6797-40c2-8a51-70f052b8dde4',
    redirectUri: process.env.REDIRECT_URI || 'https://interactive-globe-widget2.onrender.com/oauth/callback',
    wixTokenUrl: 'https://www.wix.com/oauth2/token',
    wixUserUrl: 'https://www.wixapis.com/identity/v1/identity',
    wixAuthUrl: 'https://www.wix.com/oauth/authorize'
};

const activeSessions = new Map();

// All your complete data arrays (unchanged)
const europeContent = [ { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", erasmusLink: "https://www.uni-passau.de/en/incoming-exchange-students", programName: "Degree-Seeking", programLink: "https://www.uni-passau.de/en/international/coming-to-passau/coming-to-passau-as-degree-seeking-student", applyLink: "https://www.globaleducarealliance.com/6?partner=Passau", researchLink: "https://www.uni-passau.de/en/international/going-abroad/research-and-teaching-sta" }, { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", erasmusLink: "https://www.uni-passau.de/en/incoming-exchange-students", programName: "Exchange", programLink: "https://www.uni-passau.de/en/incoming-exchange-students", applyLink: "https://www.globaleducarealliance.com/6?partner=Passau", researchLink: "https://www.uni-passau.de/en/international/going-abroad/research-and-teaching-sta" }, null, null, { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", erasmusLink: "https://ices.fr/linternational/erasmus/", programName: "Full Degree", programLink: "https://ices-university.com/studies/", applyLink: "https://www.globaleducarealliance.com/6?partner=ICES" }, { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", erasmusLink: "https://ices.fr/linternational/erasmus/", programName: "Mobility", programLink: "https://ices-university.com/mobility/incoming/", applyLink: "https://www.globaleducarealliance.com/6?partner=ICES" }, null, null, { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", erasmusLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", programName: "Exchange", programLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", applyLink: "https://www.globaleducarealliance.com/6?partner=Lille", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", erasmusLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", programName: "Summer Program", programLink: "https://www.univ-catholille.fr/en/lille-programs/lille-european-summer-program/", applyLink: "https://www.globaleducarealliance.com/6?partner=Lille", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, null, null, { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", erasmusLink: "https://www.ircom.fr/partir/", programName: "Master\nHumanitarian", programLink: "https://www.ircom.fr/formations/master-humanitaire/", applyLink: "https://www.globaleducarealliance.com/6?partner=IRCOM", researchLink: "https://www.ircom.fr/laborem/" }, { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", erasmusLink: "https://www.ircom.fr/partir/", programName: "Mobility", programLink: "https://www.ircom.fr/partir/", applyLink: "https://www.globaleducarealliance.com/6?partner=IRCOM", researchLink: "https://www.ircom.fr/laborem/" }, null, null, { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", erasmusLink: "https://katho-nrw.de/en/international/erasmus", programName: "Int'l Studies", programLink: "https://katho-nrw.de/en/international/international-studies", applyLink: "https://www.globaleducarealliance.com/6?partner=KATHO-NRW", researchLink: "https://katho-nrw.de/en/international/international-research" }, { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", erasmusLink: "https://katho-nrw.de/en/international/erasmus", programName: "Study Abroad", programLink: "https://katho-nrw.de/en/international/international-studies/students-at-the-catholic-university-of-applied-sciences-studying-abroad", applyLink: "https://www.globaleducarealliance.com/6?partner=KATHO-NRW", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, null, null, { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", erasmusLink: "https://tsi.lv/future-students/international/", programName: "Int'l Students", programLink: "https://tsi.lv/future-students/international/", applyLink: "https://www.globaleducarealliance.com/6?partner=TSI" }, { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", erasmusLink: "https://tsi.lv/future-students/international/", programName: "Innovation", programLink: "https://tsi.lv/research/innovation-knowledge-transfer/", applyLink: "https://www.globaleducarealliance.com/6?partner=TSI" }, null, null, { university: "INSEEC", logo: "https://static.wixstatic.com/media/d77f36_66d4c88c4ebb4b7da6cacaed57178165~mv2.webp", erasmusLink: "https://www.inseec.com/en/erasmus/", programName: "Exchanges", programLink: "https://www.inseec.com/en/academic-exchanges/", applyLink: "https://www.globaleducarealliance.com/6?partner=INSEEC" }, null, null];

// Include all your other data arrays: newThailandContent, canadaContent, ukContent, usaContent, indiaContent, singaporeContent, malaysiaContent, countryPrograms, countryConfigs

// NEW: OAuth callback handler for Option 2
app.get('/oauth/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
        console.error('OAuth callback: Authorization code missing');
        return res.redirect('/?auth=error&reason=no_code');
    }
    
    try {
        console.log('OAuth callback received with code:', code.substring(0, 8) + '...');
        
        // Redirect to main app with success indicator
        res.redirect('/?auth=success');
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/?auth=error&reason=processing_failed');
    }
});

// UPDATED: OAuth login URL endpoint with scope parameter
app.post('/auth/login-url', (req, res) => {
    const { challenge } = req.body;
    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
        client_id: config.wixClientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: state,
        scope: 'offline_access' // THIS IS THE MISSING REQUIRED PARAMETER
    });
    res.json({ loginUrl: `${config.wixAuthUrl}?${params.toString()}` });
});

// Rest of your endpoints remain unchanged
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

// All your other endpoints remain the same (auth/status, auth/logout, requireAuth, student endpoints, API endpoints)

app.get('/health', (req, res) => {
    res.json({ status: 'Secure Globe Widget backend running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Secure server running on port ${PORT}`);
    console.log(`OAuth Client ID: ${config.wixClientId.substring(0, 8)}...`);
});
