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

// Complete data arrays
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

app.post('/auth/login-url', (req, res) => {
    const { challenge } = req.body;
    const state = Math.random().toString(36).substring(2, 15); // Generate random state
    const params = new URLSearchParams({
        client_id: config.wixClientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: state // Add this line
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
