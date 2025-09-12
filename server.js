const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const url = require('url');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;
const pendingNotifications = {};

const wixAccountId = fs.readFileSync('/etc/secrets/WIX_ACCOUNT_ID', 'utf-8').trim();
const wixApiKey = fs.readFileSync('/etc/secrets/WIX_API_KEY', 'utf-8').trim();

// === CRITICAL FIX: Trust proxy for Render.com deployment ===
app.set('trust proxy', 1);

// === UPDATED CORS - Enable credentials for cookies ===
app.use(cors({ 
    origin: [
        'https://www.globaleducarealliance.com',
        'https://globaleducarealliance-com.filesusr.com'
    ],
    credentials: true 
}));

// === MIDDLEWARE SETUP (CORRECT ORDER!) ===
app.use(express.json());
app.use(cookieParser());

// === FIXED SESSION CONFIGURATION (FOR CROSS-SITE IFRAME/PROD) ===
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-new-super-strong-secret-for-sso',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,        // MUST be true in production (HTTPS required)
        httpOnly: true,
        sameSite: 'none',    // 'none' permits third-party (iframe) cookies
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));


// ===
// EMAIL-BASED AUTHENTICATION MIDDLEWARE (BEFORE STATIC FILES!)
// ===
app.use((req, res, next) => {
  try {
    console.log('📧 Checking for userEmail in URL...');
    console.log('🔍 Current session ID:', req.sessionID);
    console.log('🔍 Session before processing:', req.session);
    
    // Skip if we've already processed authentication for this request
    if (req.authProcessed) {
      return next();
    }
    
    const parsed = url.parse(req.url, true);
    const email = parsed.query?.userEmail;
    
    if (email) {
      console.log('✅ Processing email authentication:', decodeURIComponent(email));
      
      // Mark this request as having processed authentication
      req.authProcessed = true;
      
      // Set session data using email
      req.session.isLoggedIn = true;
      req.session.wixUserId = 'user-' + Date.now();
      req.session.userEmail = decodeURIComponent(email);
      req.session.userName = email.split('@')[0];
      req.session.authMethod = 'email_auth';
      
      console.log('💾 Session AFTER setting:', req.session);
      console.log(`✅ Session created for ${req.session.userEmail}`);
      
      // CRITICAL: Force session save before redirect
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          return next();
        } else {
          console.log('💾 Session saved successfully');
        }
        
        // Create clean URL without userEmail
        const cleanQuery = { ...parsed.query };
        delete cleanQuery.userEmail;
        const cleanUrl = url.format({ pathname: parsed.pathname, query: cleanQuery });
        
        // Only redirect if the clean URL is different from current URL
        if (req.originalUrl !== cleanUrl) {
          console.log('🔄 Redirecting to clean URL:', cleanUrl);
          return res.redirect(cleanUrl || '/');
        } else {
          console.log('✅ Already on clean URL, continuing...');
          return next();
        }
      });
      return; // Important: return here to prevent double response
    }
    
  
    next();
  } catch (e) {
    console.error('❌ Email processing error:', e.message);
    next();
  }
});

// ===
// STATIC FILES MIDDLEWARE (AFTER EMAIL PROCESSING!)
// ===
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) { res.setHeader('Content-Type', 'application/javascript'); }
        res.setHeader('Cache-Control', 'no-cache');
    }
}));

// ===
// Middleware to disable caching for specific routes
// ===
const noCache = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
};

// ===
// URL ENCRYPTION HELPERS (NEW ADDITION!)
// ===
function encryptUrl(realUrl, additionalData = {}) {
    if (!realUrl || realUrl === '#') return realUrl;
    
    const token = jwt.sign({
        realUrl: realUrl,
        ...additionalData,
        timestamp: Date.now()
    }, process.env.JWT_SECRET || 'a-new-super-strong-secret-for-sso', { expiresIn: '1h' });
    
    return `/api/link/${token}`;
}

function encryptLinksInObject(obj) {
    if (!obj) return obj;
    
    const encrypted = { ...obj };
    
    // Automatically encrypt any URL fields
    if (encrypted.programLink) {
        encrypted.programLink = encryptUrl(encrypted.programLink, {
            university: encrypted.university,
            programName: encrypted.programName,
            type: 'program'
        });
    }
    if (encrypted.applyLink) {
        encrypted.applyLink = encryptUrl(encrypted.applyLink, {
            university: encrypted.university,
            type: 'apply'
        });
    }
    if (encrypted.erasmusLink) {
        encrypted.erasmusLink = encryptUrl(encrypted.erasmusLink, {
            university: encrypted.university,
            type: 'erasmus'
        });
    }
    if (encrypted.researchLink) {
        encrypted.researchLink = encryptUrl(encrypted.researchLink, {
            university: encrypted.university,
            type: 'research'
        });
    }
    
    return encrypted;
}

// ===
// DATA ARRAYS (keeping all your existing data - NO CHANGES!)
// ===
const europeContent = [ { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", erasmusLink: "https://www.uni-passau.de/en/incoming-exchange-students", programName: "Degree-Seeking", programLink: "https://www.uni-passau.de/en/international/coming-to-passau/coming-to-passau-as-degree-seeking-student", applyLink: "https://www.globaleducarealliance.com/6?partner=Passau", researchLink: "https://www.uni-passau.de/en/international/going-abroad/research-and-teaching-sta" }, { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", erasmusLink: "https://www.uni-passau.de/en/incoming-exchange-students", programName: "Exchange", programLink: "https://www.uni-passau.de/en/incoming-exchange-students", applyLink: "https://www.globaleducarealliance.com/6?partner=Passau", researchLink: "https://www.uni-passau.de/en/international/going-abroad/research-and-teaching-sta" }, null, null, { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", erasmusLink: "https://ices.fr/linternational/erasmus/", programName: "Full Degree", programLink: "https://ices-university.com/studies/", applyLink: "https://www.globaleducarealliance.com/6?partner=ICES" }, { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", erasmusLink: "https://ices.fr/linternational/erasmus/", programName: "Mobility", programLink: "https://ices-university.com/mobility/incoming/", applyLink: "https://www.globaleducarealliance.com/6?partner=ICES" }, null, null, { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", erasmusLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", programName: "Exchange", programLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", applyLink: "https://www.globaleducarealliance.com/6?partner=Lille", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", erasmusLink: "https://www.univ-catholille.fr/en/exchange-programs-academic-calendars", programName: "Summer Program", programLink: "https://www.univ-catholille.fr/en/lille-programs/lille-european-summer-program/", applyLink: "https://www.globaleducarealliance.com/6?partner=Lille", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, null, null, { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", erasmusLink: "https://www.ircom.fr/partir/", programName: "Master\nHumanitarian", programLink: "https://www.ircom.fr/formations/master-humanitaire/", applyLink: "https://www.globaleducarealliance.com/6?partner=IRCOM", researchLink: "https://www.ircom.fr/laborem/" }, { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", erasmusLink: "https://www.ircom.fr/partir/", programName: "Mobility", programLink: "https://www.ircom.fr/partir/", applyLink: "https://www.globaleducarealliance.com/6?partner=IRCOM", researchLink: "https://www.ircom.fr/laborem/" }, null, null, { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", erasmusLink: "https://katho-nrw.de/en/international/erasmus", programName: "Int'l Studies", programLink: "https://katho-nrw.de/en/international/international-studies", applyLink: "https://www.globaleducarealliance.com/6?partner=KATHO-NRW", researchLink: "https://katho-nrw.de/en/international/international-research" }, { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", erasmusLink: "https://katho-nrw.de/en/international/erasmus", programName: "Study Abroad", programLink: "https://katho-nrw.de/en/international/international-studies/students-at-the-catholic-university-of-applied-sciences-studying-abroad", applyLink: "https://www.globaleducarealliance.com/6?partner=KATHO-NRW", researchLink: "https://www.univ-catholille.fr/en/research-presentation/" }, null, null, { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", erasmusLink: "https://tsi.lv/future-students/international/", programName: "Int'l Students", programLink: "https://tsi.lv/future-students/international/", applyLink: "https://www.globaleducarealliance.com/6?partner=TSI" }, { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", erasmusLink: "https://tsi.lv/future-students/international/", programName: "Innovation", programLink: "https://tsi.lv/research/innovation-knowledge-transfer/", applyLink: "https://www.globaleducarealliance.com/6?partner=TSI" }, null, null, { university: "INSEEC", logo: "https://static.wixstatic.com/media/d77f36_66d4c88c4ebb4b7da6cacaed57178165~mv2.webp", erasmusLink: "https://www.inseec.com/en/erasmus/", programName: "Exchanges", programLink: "https://www.inseec.com/en/academic-exchanges/", applyLink: "https://www.globaleducarealliance.com/6?partner=INSEEC" }, null, null];

const newThailandContent = [ { university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Undergraduate Business (BBA)", programLink: "https://simba.au.edu/", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=AssumptionUniversity" }, { university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Master of Business Administration (MBA)", programLink: "https://simba.au.edu/", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=AssumptionUniversity" }, { university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Study Abroad / Exchange", programLink: "https://oia.au.edu/comingtoau", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=AssumptionUniversity" }, { university: "Bangkok University", logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg", programName: "Innovative Media Production", programLink: "https://www.bu.ac.th/en/international-programs/innovative-media-production", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=BangkokUniversity" }, { university: "Bangkok University", logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg", programName: "Media & Communication", programLink: "https://www.bu.ac.th/en/international-programs/media-communication", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=BangkokUniversity" }, { university: "Bangkok University", logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg", programName: "Innovation Management (MBA)", programLink: "https://www.bu.ac.th/en/international-programs/mba-i", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=BangkokUniversity" }, { university: "Siam University", logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png", programName: "Bachelor of Business Admin. (BBA)", programLink: "https://inter.siam.edu/international-business-administration/", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=SiamUniversity" }, { university: "Siam University", logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png", programName: "Master of Business Admin. (MBA)", programLink: "https://inter.siam.edu/international-masters-in-business-administration/", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=SiamUniversity" }, { university: "Siam University", logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png", programName: "Semester Abroad / Exchange", programLink: "https://inter.siam.edu/international-masters-in-business-administration/", applyLink: "https://www.globaleducarealliance.com/blank-9?partner=SiamUniversity" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const canadaContent = [ { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "BSN", programLink: "https://www.twu.ca/academics/school-nursing/nursing-bsn", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MSN", programLink: "https://www.twu.ca/academics/school-nursing/nursing-msn", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "Biotechnology", programLink: "https://www.twu.ca/academics/faculty-natural-applied-sciences/biotechnology", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "Computing Science", programLink: "https://www.twu.ca/academics/faculty-natural-applied-sciences/computing-science", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MA in Leadership", programLink: "https://www.twu.ca/academics/graduate-studies/leadership-ma", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MBA", programLink: "https://www.twu.ca/academics/school-business/master-business-administration", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "BBA", programLink: "https://www.twu.ca/academics/school-business/bachelor-business-administration", applyLink: "https://www.globaleducarealliance.com/blank-8?partner=TWU" }, { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "Cyber Security", programLink: "#", applyLink: "/login" }, { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "Data Analytics", programLink: "#", applyLink: "/login" }, { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "Full Stack Dev", programLink: "#", applyLink: "/login" }, { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "UX/UI Design", programLink: "#", applyLink: "/login" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const ukContent = [ { university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Business & Management", programLink: "https://www.cardiff.ac.uk/study/postgraduate/taught/courses", applyLink: "https://www.globaleducarealliance.com/6?partner=Cardiff" }, { university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Healthcare & Nursing", programLink: "https://www.cardiff.ac.uk/study/postgraduate/taught/courses", applyLink: "https://www.globaleducarealliance.com/6?partner=Cardiff" }, { university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Public Policy", programLink: "https://www.cardiff.ac.uk/study/postgraduate/taught/courses", applyLink: "https://www.globaleducarealliance.com/6?partner=Cardiff" }, { university: "Liverpool Hope University", logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg", programName: "Education", programLink: "https://www.hope.ac.uk/postgraduate/postgraduatecourses/", applyLink: "https://www.globaleducarealliance.com/6?partner=LiverpoolHope" }, { university: "Liverpool Hope University", logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg", programName: "Business", programLink: "https://www.hope.ac.uk/postgraduate/postgraduatecourses/", applyLink: "https://www.globaleducarealliance.com/6?partner=LiverpoolHope" }, { university: "Nottingham Trent University", logo: "https://static.wixstatic.com/media/d77f36_86cb424c04934227905daf03395fc3b1~mv2.png", programName: "Global\nPartnerships", programLink: "https://www.ntu.ac.uk/", applyLink: "https://www.globaleducarealliance.com/6?partner=NTU" }, { university: "University of Exeter", logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg", programName: "Medicine", programLink: "https://www.exeter.ac.uk/undergraduate/courses/medicine/", applyLink: "https://www.globaleducarealliance.com/6?partner=Exeter" }, { university: "University of Exeter", logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg", programName: "Law", programLink: "https://www.exeter.ac.uk/undergraduate/courses/law/", applyLink: "https://www.globaleducarealliance.com/6?partner=Exeter" }, { university: "UK Students Abroad", logo: "https://static.wixstatic.com/media/d77f36_0be7efbfceee4b359a597935c2851fd3~mv2.jpg", programName: "Study in SG", programLink: "https://www.globaleducarealliance.com/blank-16", applyLink: "https://www.globaleducarealliance.com/blank-26" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const usaContent = [ { university: "John Cabot University", logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png", programName: "Degree\nPrograms", programLink: "https://www.jcu.edu/program-finder", applyLink: "https://www.globaleducarealliance.com/6?partner=JohnCabotUniversity" }, { university: "John Cabot University", logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png", programName: "Study Abroad", programLink: "https://www.jcu.edu/academics/global-experiences", applyLink: "https://www.globaleducarealliance.com/6?partner=JohnCabotUniversity" }, { university: "St. Mary's University", logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png", programName: "STEM\nPrograms", programLink: "https://www.stmarytx.edu/academics/programs/computer-science/", applyLink: "https://www.globaleducarealliance.com/6?partner=StMarysUniversity" }, { university: "St. Mary's University", logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png", programName: "Int'l Services", programLink: "https://www.stmarytx.edu/campuslife/international/", applyLink: "https://www.globaleducarealliance.com/6?partner=StMarysUniversity" }, { university: "California Baptist University", logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg", programName: "STEM\nDegrees", programLink: "https://calbaptist.edu/admissions-aid/international/stem", applyLink: "https://www.globaleducarealliance.com/6?partner=CaliforniaBaptistUniversity" }, { university: "California Baptist University", logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg", programName: "Int'l Exchange", programLink: "https://calbaptist.edu/admissions-aid/international/international-programs/", applyLink: "https://www.globaleducarealliance.com/6?partner=CaliforniaBaptistUniversity" }, { university: "LeTourneau University", logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png", programName: "Aviation", programLink: "https://www.letu.edu/academics/aviation/index.html", applyLink: "https://www.globaleducarealliance.com/6?partner=LeTourneauUniversity" }, { university: "LeTourneau University", logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png", programName: "Engineering", programLink: "https://www.letu.edu/academics/engineering/index.html", applyLink: "https://www.globaleducarealliance.com/6?partner=LeTourneauUniversity" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const indiaContent = [ { university: "Asia College of Journalism", logo: "https://static.wixstatic.com/media/d77f36_2cd674a2255f4d3f83d8b00721d6f477~mv2.png", programName: "Journalism", programLink: "https://www.asianmedia.org.in/bloomberg/", applyLink: "https://www.globaleducarealliance.com/6?partner=ACJ" }, { university: "Women's Christian College", logo: "https://static.wixstatic.com/media/d77f36_2c637647ae7145749c1a7d3f74ec6f2e~mv2.jpg", programName: "Academic\nPrograms", programLink: "https://wcc.edu.in/programmes-offered/", applyLink: "https://www.globaleducarealliance.com/6?partner=WCC" }, { university: "Stella Maris College", logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png", programName: "PG Prospectus", programLink: "https://stellamariscollege.edu.in/assets/documents/StellaMarisCollegeProspectus-PG_2025-2026.pdf", applyLink: "https://www.globaleducarealliance.com/6?partner=StellaMaris" }, { university: "Stella Maris College", logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png", programName: "Exchange", programLink: "https://networkdemo.in/educationwp/", applyLink: "https://www.globaleducarealliance.com/6?partner=StellaMaris" }, { university: "Symbiosis International University", logo: "https://static.wixstatic.com/media/d77f36_f89cf22ecc514a78b0dd8b34c656d4d9~mv2.png", programName: "Int'l\nAdmissions", programLink: "https://scie.ac.in/", applyLink: "https://www.globaleducarealliance.com/6?partner=Symbiosis" }, { university: "Fergusson College", logo: "https://static.wixstatic.com/media/d77f36_60066c9c2c0242d39e0107a2f25eb185~mv2.png", programName: "Nursing", programLink: "https://desnursingcollege.edu.in/index.php", applyLink: "https://www.globaleducarealliance.com/6?partner=Fergusson" }, { university: "Bishop Heber College", logo: "https://static.wixstatic.com/media/d77f36_21e0208f1bc248e5953eff9a0410bad8~mv2.jpeg", programName: "Int'l\nAdmissions", programLink: "https://bhc.edu.in/bhc/int_admisssion.php", applyLink: "https://www.globaleducarealliance.com/6?partner=BishopHeber" }, { university: "St. Stephen's College", logo: "https://static.wixstatic.com/media/d77f36_e4e8e1e417874b01b46adf1aadc894be~mv2.png", programName: "Courses\nOffered", programLink: "https://www.ststephens.edu/courses-offered/", applyLink: "https://www.globaleducarealliance.com/6?partner=StStephens" }, { university: "Christ University", logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp", programName: "Int'l\nAdmissions", programLink: "https://christuniversity.in/international-student-category", applyLink: "https://www.globaleducarealliance.com/6?partner=ChristUniversity" }, { university: "Christ University", logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp", programName: "Study Abroad", programLink: "https://christuniversity.in/international-relations", applyLink: "https://www.globaleducarealliance.com/6?partner=ChristUniversity" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const singaporeContent = [ { university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Business\nSchool", programLink: "https://bschool.nus.edu.sg/", applyLink: "https://www.globaleducarealliance.com/6?partner=NUS" }, { university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Nursing &\nMedicine", programLink: "https://medicine.nus.edu.sg/our-programmes/", applyLink: "https://www.globaleducarealliance.com/6?partner=NUS" }, { university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Public Policy", programLink: "https://lkyspp.nus.edu.sg/", applyLink: "https://www.globaleducarealliance.com/6?partner=NUS" }, { university: "SIM", logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif", programName: "IT &\nCompSci", programLink: "https://www.sim.edu.sg/degrees-diplomas/programmes/disciplines/it-computer-science", applyLink: "https://www.globaleducarealliance.com/6?partner=SIM" }, { university: "SIM", logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif", programName: "Nursing", programLink: "https://www.sim.edu.sg/degrees-diplomas/programmes/disciplines/nursing", applyLink: "https://www.globaleducarealliance.com/6?partner=SIM" }, { university: "Nanyang Institute of Management", logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png", programName: "Business", programLink: "https://nanyang.edu.sg/course/school-of-business/", applyLink: "https://www.globaleducarealliance.com/6?partner=NIM" }, { university: "Nanyang Institute of Management", logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png", programName: "Hospitality", programLink: "https://nanyang.edu.sg/course/school-of-business/", applyLink: "https://www.globaleducarealliance.com/6?partner=NIM" }, { university: "Nanyang Institute of Management", logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png", programName: "Digital Media\nDiploma", programLink: "https://nanyang.edu.sg/courses/advanced-diploma-in-digital-media-design-and-communication/", applyLink: "https://www.globaleducarealliance.com/6?partner=NIM" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const malaysiaContent = [ { university: "Limkokwing University", logo: "https://static.wixstatic.com/media/d77f36_38c855c3d47448009fc7123812183cc0~mv2.png", programName: "Creative\nTech", programLink: "https://www.limkokwing.net/malaysia/academic/courses", applyLink: "https://www.globaleducarealliance.com/6?partner=Limkokwing" }, { university: "Binary University", logo: "https://static.wixstatic.com/media/d77f36_38969a51e38148f294cade091aa0cbd8~mv2.png", programName: "MyBIG Grant", programLink: "https://binary.edu.my/big_main/", applyLink: "https://www.globaleducarealliance.com/6?partner=Binary" }, { university: "Study in Malaysia Guide", logo: "https://static.wixstatic.com/media/d77f36_e6a24c71b7a14548beca3dafbb8e797b~mv2.jpg", programName: "Student\nGuide", programLink: "#", applyLink: "#" }, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const countryPrograms = { "India": ["UG", "PG", "Mobility", "Research"], "Europe": ["UG", "PG", "Mobility", "Language", "Research"], "UK": ["UG", "PG", "Mobility"], "Singapore": ["UG", "PG", "Mobility", "Upskilling", "Diploma"], "Malaysia": ["UG", "PG", "Diploma", "Mobility"], "Canada": ["UG", "PG", "Diploma", "Mobility", "Upskilling"], "Thailand": ["UG", "PG", "Diploma", "Mobility"], "USA": ["UG", "PG", "Mobility"] };

const countryConfigs = [{"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933}, {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF}, {"name": "UK", "lat": 53, "lon": -0.1276, "color": 0x191970}, {"name": "Singapore", "lat": 1.35, "lon": 103.8, "color": 0xff0000}, {"name": "Malaysia", "lat": 4, "lon": 102, "color": 0x0000ff}, {"name": "Thailand", "lat": 13.7563, "lon": 100.5018, "color": 0xffcc00}, {"name": "Canada", "lat": 56.1304, "lon": -106.3468, "color": 0xff0000}, {"name": "USA", "lat": 39.8283, "lon": -98.5795, "color": 0x003366}];

app.post('/api/unlock-user-links', (req, res) => {
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'Missing email' });
    req.session.isLoggedIn = true;
    req.session.userEmail = userEmail;
    req.session.userName = userEmail.split('@')[0];
    req.session.authMethod = 'client_unlock';
    res.json({ success: true, userEmail });
});

// ===
// AUTHENTICATION ENDPOINTS (SSO FLOW) - Keep existing endpoints
// ===
app.post('/api/verify-sso-token', noCache, async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'SSO Token is missing.' });
    }
    
    try {
        const wixVerificationUrl = 'https://www.globaleducarealliance.com/_functions/verifySsoToken';
        const response = await axios.post(wixVerificationUrl, { token });
        if (response.data.verified) {
            const { member } = response.data;
            req.session.isLoggedIn = true;
            req.session.wixUserId = member.id;
            req.session.userEmail = member.email;
            req.session.userName = member.name;
            req.session.authMethod = 'wix_sso';
            
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



// === JWT/Fallback Token Generation (CRITICAL for SSO unlock) ===
app.get('/api/generate-token', noCache, (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }
    const jwtSecret = process.env.JWT_SECRET || 'a-new-super-strong-secret-for-sso';
    const token = jwt.sign(
        { email },
        jwtSecret,
        { expiresIn: '1h' }
    );
    res.json({ token });
});

// ===
// UPDATED: Auth status endpoint with enhanced debug logs
app.get('/api/auth/status', noCache, (req, res) => {
    // Enhanced debug logs
    console.log('📊 Auth status check - Session ID:', req.sessionID);
    console.log('📊 Auth status check - Session:', req.session);
    console.log('📊 isLoggedIn:', req.session?.isLoggedIn);
    console.log('📊 userEmail:', req.session?.userEmail);

    // 1. Session (classic) method
    if (req.session && req.session.isLoggedIn) {
        return res.json({
            isAuthenticated: true,
            user: { 
                id: req.session.wixUserId, 
                email: req.session.userEmail, 
                name: req.session.userName 
            }
        });
    }
    // 2. JWT (SSO_TOKEN) fallback for Safari/Firefox/strict browsers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.slice(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a-new-super-strong-secret-for-sso');
            return res.json({
                isAuthenticated: true,
                user: { id: decoded.email, email: decoded.email, name: (decoded.email || '').split('@')[0] }
            });
        } catch (err) {
            console.error('[SSO status check] JWT error:', err);
            // JWT invalid or expired, will fall through to unauthenticated
        }
    }
    // 3. Not authenticated
    res.json({ isAuthenticated: false, user: null });
});


// ===
// DATA & PROTECTED ENDPOINTS - Keep all your existing endpoints
// ===

function requireAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        console.log("[AUTH] Session authenticated:", req.session.userEmail);
        return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.slice(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a-new-super-strong-secret-for-sso');
            req.session = req.session || {};
            req.session.isLoggedIn = true;
            req.session.userEmail = decoded.email || decoded.userEmail;
            req.session.userName = (decoded.email || '').split('@')[0];
            req.session.authMethod = 'jwt';
            console.log("[AUTH] JWT authenticated:", req.session.userEmail);
            return next();
        } catch (err) {
            console.error('[AUTH] JWT error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    console.log("[AUTH] Not authenticated");
    res.status(401).json({ error: 'Authentication required' });
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

// ===
// UPDATED: Globe data endpoint with automatic URL encryption!
// ===
app.get('/api/globe-data', (req, res) => {
    // Automatically encrypt ALL URLs in ALL content arrays
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
        countryConfigs
    };
    
    res.json(encryptedData);
});

// ===
// NEW: Link decryption and redirect endpoint
// ===
app.get('/api/link/:token', requireAuth, (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET || 'a-new-super-strong-secret-for-sso');
        
        // Log access for security monitoring (optional)
        console.log(`🔗 Link access: ${decoded.type || 'unknown'} for ${decoded.university || 'unknown university'} by ${req.session.userEmail}`);
        
        // Redirect to the real URL
        res.redirect(decoded.realUrl);
        
    } catch (error) {
        console.error('🚫 Invalid link token:', error.message);
        res.status(401).send('Link expired or invalid. Please try again.');
    }
});

app.get('/api/carousel/data', (req, res) => {
    res.json([
        { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
        { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced." },
        { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
        { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
        { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
        { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
    ]);
});
// ===


// Endpoint to RECEIVE real-time submission events from Wix
app.post('/api/application-submitted', (req, res) => {
    // SECURITY NOTE: Add middleware to verify 'Authorization' header
    const { userId, universityName } = req.body;
    if (!userId || !universityName) {
        return res.status(400).send('Missing required fields.');
    }
    if (!pendingNotifications[userId]) {
        pendingNotifications[userId] = [];
    }
    pendingNotifications[userId].push({ universityName });
    console.log(`✅ Stored notification for user ${userId} for ${universityName}.`);
    res.status(200).send('Notification received.');
});

// Endpoint for the globe to POLL for notifications
app.get('/api/applications/notifications', requireAuth, (req, res) => {
    const userId = req.session.wixUserId;
    if (pendingNotifications[userId] && pendingNotifications[userId].length > 0) {
        console.log(`📬 Delivering ${pendingNotifications[userId].length} notifications to user ${userId}.`);
        const notifications = pendingNotifications[userId];
        delete pendingNotifications[userId]; 
        res.status(200).json({ notifications });
    } else {
        res.status(200).json({ notifications: [] });
    }
});


// == SERVER START ==
app.get('/health', (req, res) => {
    res.json({ status: 'Secure Globe Widget backend running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Secure server running on port ${PORT}`);
});
