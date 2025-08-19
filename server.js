const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const url = require('url');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3001;

// ===
// MIDDLEWARE SETUP
// ===
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-new-super-strong-secret-for-sso',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) { res.setHeader('Content-Type', 'application/javascript'); }
        res.setHeader('Cache-Control', 'no-cache');
    }
}));

// ===
// NEW: Middleware to disable caching for specific routes
// ===
const noCache = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',  // Corrected from invalid 'Pr那时'
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
};

// ===
// SSO TOKEN CONSUMPTION MIDDLEWARE (Consumes mToken, verifies, sets session, cleans URL)
// ===
const SSO_SECRET = process.env.WIX_SSO_SECRET || 'REPLACE_WITH_STRONG_SECRET';
app.use((req, res, next) => {
  try {
    const parsed = url.parse(req.url, true);
    const token = parsed.query?.mToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, SSO_SECRET, {
          algorithms: ['HS256'],
          audience: 'gea-render',
          issuer: 'gea-wix'
        });
        req.session.isLoggedIn = true;
        req.session.wixUserId = decoded.sub;
        req.session.userEmail = decoded.email || null;
        req.session.userName = decoded.name || null;
        req.session.authMethod = 'wix_sso';
        console.log(`SSO session set for ${req.session.userEmail || req.session.wixUserId}`);
      } catch (e) {
        console.error('JWT verify failed:', e.message);
      }
      const cleanQuery = { ...parsed.query };
      delete cleanQuery.mToken;
      const cleanUrl = url.format({ pathname: parsed.pathname, query: cleanQuery });
      return res.redirect(cleanUrl || '/');
    }
    next();
  } catch (e) {
    console.error('mToken middleware error:', e.message);
    next();
  }
});

// ===
// DATA ARRAYS
// ===
const europeContent = [ { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", erasmusLink: "https://www.uni-passau.de/en/incoming-exchange-students", programName: "Degree-Seeking", programLink: "https://www.uni-passau.de/en/international/coming-to-passau/coming-to-passau-as-degree-seeking-student", applyLink: "https://www.globaleducarealliance.com/6?partner=Passau", researchLink: "https://www.uni-passau.de/en/international/going-abroad/research-and-teaching-sta" }, { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", erasmusLink: "https://www.uni-passau.de/en/incoming-exchange-students", programName: "Exchange", programLink: "https://www.uni-passau.de/en/incoming-exchange-students", applyLink: "https://www.globaleducarealliance.com/6?partner=Passau", researchLink: "https://www.uni-passau.de/en/international/going-abroad/research-and-teaching-sta" }, null, null, { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", erasmusLink: "https://ices.fr/linternational/erasmus/", programName: "Full Degree", programLink: "https://ices-university.com/studies/", applyLink: "https://www.globaleducarealliance.com/6?partner=ICES" }, { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", erasmusLink: "https://ices.fr/linternational/erasmus/", programName: "Mobility", programLink: "https://ices-university.com/mobility/incoming/", applyLink: "https://www.globaleducarealliance.com/6?partner=ICES" }, null, null, { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", erasmusLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", programName: "Exchange", programLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", applyLink: "https://www.globaleducarealliance.com/6?partner=Lille", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", erasmusLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", programName: "Summer Program", programLink: "https://www.univ-catholille.fr/en/lille-programs/lille-european-summer-program/", applyLink: "https://www.globaleducarealliance.com/6?partner=Lille", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, null, null, { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", erasmusLink: "https://www.ircom.fr/partir/", programName: "Master\nHumanitarian", programLink: "https://www.ircom.fr/formations/master-humanitaire/", applyLink: "https://www.globaleducarealliance.com/6?partner=IRCOM", researchLink: "https://www.ircom.fr/laborem/" }, { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", erasmusLink: "https://www.ircom.fr/partir/", programName: "Mobility", programLink: "https://www.ircom.fr/partir/", applyLink: "https://www.globaleducarealliance.com/6?partner=IRCOM", researchLink: "https://www.ircom.fr/laborem/" }, null, null, { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", erasmusLink: "https://katho-nrw.de/en/international/erasmus", programName: "Int'l Studies", programLink: "https://katho-nrw.de/en/international/international-studies", applyLink: "https://www.globaleducarealliance.com/6?partner=KATHO-NRW", researchLink: "https://katho-nrw.de/en/international/international-research" }, { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", erasmusLink: "https://katho-nrw.de/en/international/erasmus", programName: "Study Abroad", programLink: "https://katho-nrw.de/en/international/international-studies/students-at-the-catholic-university-of-applied-sciences-studying-abroad", applyLink: "https://www.globaleducarealliance.com/6?partner=KATHO-NRW", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, null, null, { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", erasmusLink: "https://tsi.lv/future-students/international/", programName: "Int'l Students", programLink: "https://tsi.lv/future-students/international/", applyLink: "https://www.globaleducarealliance.com/6?partner=TSI" }, { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", erasmusLink: "https://tsi.lv/future-students/international/", programName: "Innovation", programLink: "https://tsi.lv/research/innovation-knowledge-transfer/", applyLink: "https://www.globaleducarealliance.com/6?partner=TSI" }, null, null, { university: "INSEEC", logo: "https://static.wixstatic.com/media/d77f36_66d4c88c4ebb4b7da6cacaed57178165~mv2.webp", erasmusLink: "https://www.inseec.com/en/erasmus/", programName: "Exchanges", programLink: "https://www.inseec.com/en/academic-exchanges/", applyLink: "https://www.globaleducarealliance.com/6?partner=INSEEC" }, null, null];

// ===
// NEW: Token Generation Endpoint (consolidated on Render)
// ===
app.post('/api/generate-token', noCache, async (req, res) => {
  const { email } = req.body; // Sent from Wix frontend (current user's email)

  if (!email) {
    return res.status(400).json({ error: 'Email required for token generation' });
  }

  try {
    // Optional: Verify with Wix if needed (e.g., check if email is valid member)
    // const wixVerifyUrl = 'https://www.globaleducarealliance.com/_functions/verifyMember'; // If you have this
    // await axios.post(wixVerifyUrl, { email });

    const payload = {
      sub: 'user-id-placeholder', // Replace with actual user ID from Wix if sent
      email: email,
      iss: 'gea-render', // Updated issuer to Render
      aud: 'gea-globe',
      exp: Math.floor(Date.now() / 1000) + (60 * 5) // Expires in 5 minutes
    };

    const token = jwt.sign(payload, SSO_SECRET, { algorithm: 'HS256' });

    return res.json({ token });
  } catch (error) {
    console.error('Token generation error:', error.message);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ===
// AUTHENTICATION ENDPOINTS (SSO FLOW)
// ===
app.post('/api/verify-sso-token', noCache, async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'SSO Token is missing.' });
    }
    
    try {
        const wixVerificationUrl = 'https://www.globaleducarealliance.com/\_functions/verifySsoToken';
        const response = await axios.post(wixVerificationUrl, { token });
        if (response.data.verified) {
            const { member } = response.data;
            req.session.isLoggedIn = true;
            req.session.wixUserId = member.id;
            req.session.userEmail = member.email;
            req.session.userName = member.name;
            req.session.authMethod = 'wix\_sso';
            
            console.log(`SSO Success: Session created for ${member.email}`);
            return res.status(200).json({ isAuthenticated: true });
        } else {
            console.log('Wix rejected the SSO token.');
            return res.status(401).json({ error: 'Invalid or expired SSO token.' });
        }
    } catch (error) {
        console.error('SSO verification error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Failed to verify SSO session.' });
    }
});
app.get('/api/auth/status', noCache, (req, res) => {
    if (req.session && req.session.isLoggedIn) {
        return res.json({
            isAuthenticated: true,
            user: { id: req.session.wixUserId, email: req.session.userEmail, name: req.session.userName }
        });
    }
    res.json({ isAuthenticated: false, user: null });
});
app.post('/api/auth/logout', noCache, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Session destroyed.' });
    });
});
// ===
// DATA & PROTECTED ENDPOINTS
// ===
function requireAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}
app.get('/api/student/profile', requireAuth, (req, res) => {
    res.json({ id: req.session.wixUserId, email: req.session.userEmail, name: req.session.userName });
});
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
        if (allowedTypes.test(file.originalname.toLowerCase())) { return cb(null, true); }
        cb(new Error('Only documents and images are allowed'));
    }
});
app.post('/api/student/documents', requireAuth, upload.single('document'), (req, res) => {
    if (!req.file) { return res.status(400).json({ error: 'No file uploaded' }); }
    console.log(`Document uploaded for user ${req.session.wixUserId}: ${req.file.originalname}`);
    res.json({ success: true, document: { id: req.file.filename, name: req.file.originalname, size: req.file.size }});
});
app.get('/api/student/applications', requireAuth, (req, res) => {
    res.json({
        applications: [],
        availableForms: ['University Application', 'Scholarship Application', 'Visa Documentation']
    });
});
app.get('/api/globe-data', (req, res) => {
    res.json({ europeContent, newThailandContent, canadaContent, ukContent, usaContent, indiaContent, singaporeContent, malaysiaContent, countryPrograms, countryConfigs });
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
// == SERVER START ==
app.get('/health', (req, res) => {
    res.json({ status: 'Secure Globe Widget backend running', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Secure server running on port ${PORT}`);
});
