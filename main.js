// Add test token for initial globe rendering
localStorage.setItem('userToken', 'guest-viewer');

// Authentication helpers
function userIsAuthenticated() {
  const token = localStorage.getItem('userToken');
  return token && token !== 'guest-viewer';
}

function showLoginPrompt(message = 'Please log in to interact with universities and programs') {
  alert(message + '\n\nThe globe is free to explore, but login is required for university details and applications.');
}

// Global Three.js variables
let scene, camera, renderer, controls, globeGroup, transformControls;
let GLOBE_RADIUS = 1.0;
let isPanMode = false;
let isRotationPaused = false;
let isCubeMovementPaused = false;

// Cube state variables
let europeCube, newThailandCube, canadaCube, ukCube, usaCube, indiaCube, singaporeCube, malaysiaCube;
const europeSubCubes = [], newThailandSubCubes = [], canadaSubCubes = [], ukSubCubes = [], usaSubCubes = [], indiaSubCubes = [], singaporeSubCubes = [], malaysiaSubCubes = [];
const explodedPositions = [], newThailandExplodedPositions = [], canadaExplodedPositions = [], ukExplodedPositions = [], usaExplodedPositions = [], indiaExplodedPositions = [], singaporeExplodedPositions = [], malaysiaExplodedPositions = [];
const explodedSpacing = 0.1;
let isEuropeCubeExploded = false, isNewThailandCubeExploded = false, isCanadaCubeExploded = false, isUkCubeExploded = false, isUsaCubeExploded = false, isIndiaCubeExploded = false, isSingaporeCubeExploded = false, isMalaysiaCubeExploded = false;

// Neural network variables
const neuronGroup = new THREE.Group();
const count = 150, maxRadius = 1.5, vortexCubeSize = 0.01, microGap = 0.002;
const velocities = [], cubes = [], dummyDataSet = [];
const neuralCubeMap = {};
let neuralNetworkLines;

// Country variables
const countryBlocks = {};
let arcPaths = [];
let countryLabels = [];
const fontLoader = new THREE.FontLoader();

// Interaction variables
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const mouseDownPos = new THREE.Vector2();
const clock = new THREE.Clock();

// Country coordinates
let countryConfigs = [
  {"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933},
  {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF},
  {"name": "UK", "lat": 53, "lon": -0.1276, "color": 0x191970},
  {"name": "Singapore", "lat": 1.35, "lon": 103.8, "color": 0xff0000},
  {"name": "Malaysia", "lat": 4, "lon": 102, "color": 0x0000ff},
  {"name": "Thailand", "lat": 13.7563, "lon": 100.5018, "color": 0xffcc00},
  {"name": "Canada", "lat": 56.1304, "lon": -106.3468, "color": 0xff0000},
  {"name": "USA", "lat": 39.8283, "lon": -98.5795, "color": 0x003366}
];

// University content arrays
const europeContent = [{
    university: "University of Passau",
    logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg",
    programName: "Degree-Seeking",
    programId: "passau_degree_seeking"
}, {
    university: "University of Passau",
    logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg",
    programName: "Exchange",
    programId: "passau_exchange"
}, null, null, {
    university: "ICES",
    logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png",
    programName: "Full Degree",
    programId: "ices_full_degree"
}, {
    university: "ICES",
    logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png",
    programName: "Mobility",
    programId: "ices_mobility"
}, null, null, {
    university: "Université Catholique de Lille",
    logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png",
    programName: "Exchange",
    programId: "lille_exchange"
}, {
    university: "Université Catholique de Lille",
    logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png",
    programName: "Summer Program",
    programId: "lille_summer"
}, null, null, {
    university: "IRCOM",
    logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg",
    programName: "Master\nHumanitarian",
    programId: "ircom_master_humanitarian"
}, {
    university: "IRCOM",
    logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg",
    programName: "Mobility",
    programId: "ircom_mobility"
}, null, null, {
    university: "KATHO-NRW",
    logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg",
    programName: "Int'l Studies",
    programId: "katho_intl_studies"
}, {
    university: "KATHO-NRW",
    logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg",
    programName: "Study Abroad",
    programId: "katho_study_abroad"
}, null, null, {
    university: "TSI",
    logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg",
    programName: "Int'l Students",
    programId: "tsi_intl_students"
}, {
    university: "TSI",
    logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg",
    programName: "Innovation",
    programId: "tsi_innovation"
}, null, null, {
    university: "INSEEC",
    logo: "https://static.wixstatic.com/media/d77f36_66d4c88c4ebb4b7da6cacaed57178165~mv2.webp",
    programName: "Exchanges",
    programId: "inseec_exchanges"
}, null, null];

const newThailandContent = [{
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Undergraduate Business (BBA)",
    programId: "assumption_bba"
}, {
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Master of Business Administration (MBA)",
    programId: "assumption_mba"
}, {
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Study Abroad / Exchange",
    programId: "assumption_exchange"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Innovative Media Production",
    programId: "bangkok_media_production"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Media & Communication",
    programId: "bangkok_media_communication"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Innovation Management (MBA)",
    programId: "bangkok_innovation_mba"
}, {
    university: "Siam University",
    logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png",
    programName: "Bachelor of Business Admin. (BBA)",
    programId: "siam_bba"
}, {
    university: "Siam University",
    logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png",
    programName: "Master of Business Admin. (MBA)",
    programId: "siam_mba"
}, {
    university: "Siam University",
    logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png",
    programName: "Semester Abroad / Exchange",
    programId: "siam_exchange"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const canadaContent = [{
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "BSN",
    programId: "twu_bsn"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MSN",
    programId: "twu_msn"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "Biotechnology",
    programId: "twu_biotech"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "Computing Science",
    programId: "twu_computing"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MA in Leadership",
    programId: "twu_leadership"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MBA",
    programId: "twu_mba"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "BBA",
    programId: "twu_bba"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "Cyber Security",
    programId: "wawiwa_cyber"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "Data Analytics",
    programId: "wawiwa_data"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "Full Stack Dev",
    programId: "wawiwa_fullstack"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "UX/UI Design",
    programId: "wawiwa_ux"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const ukContent = [{
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Business & Management",
    programId: "cardiff_business"
}, {
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Healthcare & Nursing",
    programId: "cardiff_healthcare"
}, {
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Public Policy",
    programId: "cardiff_policy"
}, {
    university: "Liverpool Hope University",
    logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg",
    programName: "Education",
    programId: "liverpool_education"
}, {
    university: "Liverpool Hope University",
    logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg",
    programName: "Business",
    programId: "liverpool_business"
}, {
    university: "Nottingham Trent University",
    logo: "https://static.wixstatic.com/media/d77f36_86cb424c04934227905daf03395fc3b1~mv2.png",
    programName: "Global\nPartnerships",
    programId: "ntu_global"
}, {
    university: "University of Exeter",
    logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg",
    programName: "Medicine",
    programId: "exeter_medicine"
}, {
    university: "University of Exeter",
    logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg",
    programName: "Law",
    programId: "exeter_law"
}, {
    university: "UK Students Abroad",
    logo: "https://static.wixstatic.com/media/d77f36_0be7efbfceee4b359a597935c2851fd3~mv2.jpg",
    programName: "Study in SG",
    programId: "uk_singapore"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const usaContent = [{
    university: "John Cabot University",
    logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png",
    programName: "Degree\nPrograms",
    programId: "jcu_degree"
}, {
    university: "John Cabot University",
    logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png",
    programName: "Study Abroad",
    programId: "jcu_abroad"
}, {
    university: "St. Mary's University",
    logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png",
    programName: "STEM\nPrograms",
    programId: "stmarys_stem"
}, {
    university: "St. Mary's University",
    logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png",
    programName: "Int'l Services",
    programId: "stmarys_intl"
}, {
    university: "California Baptist University",
    logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg",
    programName: "STEM\nDegrees",
    programId: "cbu_stem"
}, {
    university: "California Baptist University",
    logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg",
    programName: "Int'l Exchange",
    programId: "cbu_exchange"
}, {
    university: "LeTourneau University",
    logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png",
    programName: "Aviation",
    programId: "letu_aviation"
}, {
    university: "LeTourneau University",
    logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png",
    programName: "Engineering",
    programId: "letu_engineering"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const indiaContent = [{
    university: "Asia College of Journalism",
    logo: "https://static.wixstatic.com/media/d77f36_2cd674a2255f4d3f83d8b00721d6f477~mv2.png",
    programName: "Journalism",
    programId: "acj_journalism"
}, {
    university: "Women's Christian College",
    logo: "https://static.wixstatic.com/media/d77f36_2c637647ae7145749c1a7d3f74ec6f2e~mv2.jpg",
    programName: "Academic\nPrograms",
    programId: "wcc_academic"
}, {
    university: "Stella Maris College",
    logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png",
    programName: "PG Prospectus",
    programId: "stellamaris_pg"
}, {
    university: "Stella Maris College",
    logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png",
    programName: "Exchange",
    programId: "stellamaris_exchange"
}, {
    university: "Symbiosis International University",
    logo: "https://static.wixstatic.com/media/d77f36_f89cf22ecc514a78b0dd8b34c656d4d9~mv2.png",
    programName: "Int'l\nAdmissions",
    programId: "symbiosis_intl"
}, {
    university: "Fergusson College",
    logo: "https://static.wixstatic.com/media/d77f36_60066c9c2c0242d39e0107a2f25eb185~mv2.png",
    programName: "Nursing",
    programId: "fergusson_nursing"
}, {
    university: "Bishop Heber College",
    logo: "https://static.wixstatic.com/media/d77f36_21e0208f1bc248e5953eff9a0410bad8~mv2.jpeg",
    programName: "Int'l\nAdmissions",
    programId: "bishopheber_intl"
}, {
    university: "St. Stephen's College",
    logo: "https://static.wixstatic.com/media/d77f36_e4e8e1e417874b01b46adf1aadc894be~mv2.png",
    programName: "Courses\nOffered",
    programId: "ststephens_courses"
}, {
    university: "Christ University",
    logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp",
    programName: "Int'l\nAdmissions",
    programId: "christ_intl"
}, {
    university: "Christ University",
    logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp",
    programName: "Study Abroad",
    programId: "christ_abroad"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const singaporeContent = [{
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Business\nSchool",
    programId: "nus_business"
}, {
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Nursing &\nMedicine",
    programId: "nus_medicine"
}, {
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Public Policy",
    programId: "nus_policy"
}, {
    university: "SIM",
    logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif",
    programName: "IT &\nCompSci",
    programId: "sim_it"
}, {
    university: "SIM",
    logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif",
    programName: "Nursing",
    programId: "sim_nursing"
}, {
    university: "Nanyang Institute of Management",
    logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png",
    programName: "Business",
    programId: "nim_business"
}, {
    university: "Nanyang Institute of Management",
    logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png",
    programName: "Hospitality",
    programId: "nim_hospitality"
}, {
    university: "Nanyang Institute of Management",
    logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png",
    programName: "Digital Media\nDiploma",
    programId: "nim_media"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const malaysiaContent = [{
    university: "Limkokwing University",
    logo: "https://static.wixstatic.com/media/d77f36_38c855c3d47448009fc7123812183cc0~mv2.png",
    programName: "Creative\nTech",
    programId: "limkokwing_creative"
}, {
    university: "Binary University",
    logo: "https://static.wixstatic.com/media/d77f36_38969a51e38148f294cade091aa0cbd8~mv2.png",
    programName: "MyBIG Grant",
    programId: "binary_grant"
}, {
    university: "Study in Malaysia Guide",
    logo: "https://static.wixstatic.com/media/d77f36_e6a24c71b7a14548beca3dafbb8e797b~mv2.jpg",
    programName: "Student\nGuide",
    programId: "malaysia_guide"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

// Carousel data with program types
const carouselData = [{
    category: "UG",
    img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png",
    title: "Undergraduate",
    text: "Bachelor-level opportunities."
}, {
    category: "PG",
    img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png",
    title: "Postgraduate",
    text: "Master's and advanced programs."
}, {
    category: "Diploma",
    img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png",
    title: "Diploma",
    text: "Professional and foundation."
}, {
    category: "Mobility",
    img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png",
    title: "Semester Abroad",
    text: "Exchange and mobility."
}, {
    category: "Upskilling",
    img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png",
    title: "Upskilling",
    text: "Short-term training."
}, {
    category: "Research",
    img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg",
    title: "Research",
    text: "Opportunities & links."
}];

// Generate neural network data
function generateNeuralNetworkData() {
  for (let i = 0; i < count; i++) {
    const r = Math.random() * maxRadius;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01
    );
    
    velocities.push(velocity);
    
    dummyDataSet.push({
      x: x, y: y, z: z,
      domain: Math.floor(Math.random() * 5),
      engagement: Math.random(),
      risk: Math.random(),
      confidence: 0.3 + Math.random() * 0.7,
      influence: Math.random()
    });
  }
}

// Create neural network connections
function createNeuralNetworkConnections() {
  const positions = [];
  const colors = [];
  
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.2) {
      const targetIndex = Math.floor(Math.random() * count);
      if (targetIndex !== i) {
        const start = dummyDataSet[i];
        const end = dummyDataSet[targetIndex];
        
        positions.push(start.x, start.y, start.z);
        positions.push(end.x, end.y, end.z);
        
        colors.push(0.2, 0.8, 1.0);
        colors.push(0.2, 0.8, 1.0);
      }
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3
  });
  
  neuralNetworkLines = new THREE.LineSegments(geometry, material);
  neuronGroup.add(neuralNetworkLines);
}

// Create background neural nodes
function createBackgroundNeuralNodes() {
  for (let i = 0; i < count; i++) {
    const data = dummyDataSet[i];
    
    const geometry = new THREE.SphereGeometry(0.003, 8, 8);
    const color = new THREE.Color().setHSL(data.domain * 0.2, 0.7, 0.5);
    const material = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.8
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(data.x, data.y, data.z);
    sphere.userData = { ...data, isNeuralNode: true };
    
    neuronGroup.add(sphere);
  }
}

// Create earth texture
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Create gradient for earth-like appearance
  const gradient = ctx.createRadialGradient(512, 256, 0, 512, 256, 512);
  gradient.addColorStop(0, '#1e3c72');
  gradient.addColorStop(0.3, '#2a5298');
  gradient.addColorStop(0.6, '#3d7eaa');
  gradient.addColorStop(1, '#1e3c72');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);
  
  // Add continent-like patterns
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const radius = Math.random() * 30 + 10;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100) + 100}, ${Math.floor(Math.random() * 150) + 100}, ${Math.floor(Math.random() * 50) + 50}, 0.4)`;
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

// Create country connection arcs
function createCountryArcs() {
  const arcPositions = [];
  const arcColors = [];
  
  for (let i = 0; i < countryConfigs.length; i++) {
    for (let j = i + 1; j < countryConfigs.length; j++) {
      if (Math.random() < 0.4) {
        const start = latLonToVector3(countryConfigs[i].lat, countryConfigs[i].lon, 1.15);
        const end = latLonToVector3(countryConfigs[j].lat, countryConfigs[j].lon, 1.15);
        
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(1.4);
        
        for (let t = 0; t <= 1; t += 0.05) {
          const point = new THREE.Vector3();
          point.addVectors(
            start.clone().multiplyScalar((1 - t) * (1 - t)),
            mid.clone().multiplyScalar(2 * (1 - t) * t)
          );
          point.add(end.clone().multiplyScalar(t * t));
          
          arcPositions.push(point.x, point.y, point.z);
          arcColors.push(0.0, 1.0, 1.0);
        }
      }
    }
  }
  
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute('position', new THREE.Float32BufferAttribute(arcPositions, 3));
  arcGeometry.setAttribute('color', new THREE.Float32BufferAttribute(arcColors, 3));
  
  const arcMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6
  });
  
  const arcs = new THREE.LineSegments(arcGeometry, arcMaterial);
  arcPaths.push(arcs);
  globeGroup.add(arcs);
}

// Wait for Three.js to load
function waitForThree() {
  return new Promise((resolve) => {
    if (typeof THREE !== 'undefined') {
      resolve();
    } else {
      setTimeout(() => waitForThree().then(resolve), 100);
    }
  });
}

// Initialize Three.js scene
function initializeThreeJS() {
  console.log('Initializing Three.js scene...');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 3);
  
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000011, 1.0);
  
  const container = document.getElementById('globe-container');
  if (container) {
    container.appendChild(renderer.domElement);
    console.log('Renderer added to container');
  } else {
    document.body.appendChild(renderer.domElement);
    console.log('Renderer added to body');
  }
  
  globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeGroup.add(neuronGroup);
  
  // Setup controls
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    setupControls();
  } else {
    console.log('OrbitControls not available, using basic controls');
    setupBasicControls();
  }
  
  // Setup lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0x336699, 0.8);
  backLight.position.set(-10, -10, -5);
  scene.add(backLight);
  
  console.log('Three.js initialization complete');
}

function setupControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.minDistance = 1.5;
  controls.maxDistance = 8;
}

function setupBasicControls() {
  let isMouseDown = false;
  let mouseX = 0, mouseY = 0;
  
  renderer.domElement.addEventListener('mousedown', (event) => {
    isMouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  
  renderer.domElement.addEventListener('mousemove', (event) => {
    if (!isMouseDown) return;
    
    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;
    
    globeGroup.rotation.y += deltaX * 0.01;
    globeGroup.rotation.x += deltaY * 0.01;
    
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  
  renderer.domElement.addEventListener('mouseup', () => {
    isMouseDown = false;
  });
  
  renderer.domElement.addEventListener('wheel', (event) => {
    camera.position.z += event.deltaY * 0.01;
    camera.position.z = Math.max(1.5, Math.min(8, camera.position.z));
  });
}

// Create texture with university logos
function createTexture(text, logoUrl, bgColor = '#003366') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Arial';
  
  const lines = text.split('\n');
  let startY = 128;
  if (lines.length > 1) startY = 100;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, 128, startY + (index * 25));
  });
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  if (logoUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 20, 20, 60, 60);
      texture.needsUpdate = true;
    };
    img.onerror = () => {
      console.log('Logo failed to load:', logoUrl);
    };
    img.src = logoUrl;
  }
  
  return new THREE.MeshBasicMaterial({ 
    map: texture,
    transparent: false
  });
}

// Create neural cube
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  const cubeObject = new THREE.Group();
  let contentIdx = 0;
  
  for (let xi = -1; xi <= 1; xi++) {
    for (let yi = -1; yi <= 1; yi++) {
      for (let zi = -1; zi <= 1; zi++) {
        const item = content[contentIdx];
        let material, userData;
        
        if (item && item.university) {
          material = createTexture(item.programName, item.logo, color);
          userData = { ...item };
        } else {
          material = createTexture('Available', null, '#444444');
          userData = { university: "Available", programName: "Program Slot" };
        }
        
        const geometry = new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize);
        const microcube = new THREE.Mesh(geometry, material);
        
        const pos = new THREE.Vector3(
          xi * (vortexCubeSize + microGap),
          yi * (vortexCubeSize + microGap),
          zi * (vortexCubeSize + microGap)
        );
        
        microcube.position.copy(pos);
        microcube.userData = { 
          ...userData,
          isSubCube: true,
          initialPosition: pos.clone()
        };
        
        subCubeArray.push(microcube);
        explodedPositionArray.push(new THREE.Vector3(
          xi * explodedSpacing,
          yi * explodedSpacing,
          zi * explodedSpacing
        ));
        
        cubeObject.add(microcube);
        contentIdx++;
      }
    }
  }
  
  return cubeObject;
}

// Toggle functions
function createToggleFunction(cubeName) {
  return function() {
    let isExploded, setExploded, cube, subCubes, explodedPos;
    
    switch (cubeName) {
      case 'Europe':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isEuropeCubeExploded, s => isEuropeCubeExploded = s, europeCube, europeSubCubes, explodedPositions];
        break;
      case 'Thailand':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isNewThailandCubeExploded, s => isNewThailandCubeExploded = s, newThailandCube, newThailandSubCubes, newThailandExplodedPositions];
        break;
      case 'Canada':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isCanadaCubeExploded, s => isCanadaCubeExploded = s, canadaCube, canadaSubCubes, canadaExplodedPositions];
        break;
      case 'UK':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isUkCubeExploded, s => isUkCubeExploded = s, ukCube, ukSubCubes, ukExplodedPositions];
        break;
      case 'USA':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isUsaCubeExploded, s => isUsaCubeExploded = s, usaCube, usaSubCubes, usaExplodedPositions];
        break;
      case 'India':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isIndiaCubeExploded, s => isIndiaCubeExploded = s, indiaCube, indiaSubCubes, indiaExplodedPositions];
        break;
      case 'Singapore':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isSingaporeCubeExploded, s => isSingaporeCubeExploded = s, singaporeCube, singaporeSubCubes, singaporeExplodedPositions];
        break;
      case 'Malaysia':
        [isExploded, setExploded, cube, subCubes, explodedPos] = [isMalaysiaCubeExploded, s => isMalaysiaCubeExploded = s, malaysiaCube, malaysiaSubCubes, malaysiaExplodedPositions];
        break;
      default:
        return;
    }
    
    const shouldBeExploded = !isExploded;
    setExploded(shouldBeExploded);
    if (!cube) return;
    
    const targetPosition = new THREE.Vector3();
    if (shouldBeExploded) {
      cube.getWorldPosition(targetPosition);
    } else {
      targetPosition.set(0, 0, 0);
    }
    
    if (typeof TWEEN !== 'undefined') {
      new TWEEN.Tween(controls ? controls.target : camera.position).to(targetPosition, 800).easing(TWEEN.Easing.Cubic.InOut).start();
      
      subCubes.forEach((subCube, i) => {
        const targetPos = shouldBeExploded ? explodedPos[i] : subCube.userData.initialPosition;
        new TWEEN.Tween(subCube.position).to(targetPos, 800).easing(TWEEN.Easing.Exponential.InOut).start();
      });
    }
  };
}

// Toggle function mapping
const toggleFunctionMap = {
  'Europe': createToggleFunction('Europe'),
  'Thailand': createToggleFunction('Thailand'),
  'Canada': createToggleFunction('Canada'),
  'UK': createToggleFunction('UK'),
  'USA': createToggleFunction('USA'),
  'India': createToggleFunction('India'),
  'Singapore': createToggleFunction('Singapore'),
  'Malaysia': createToggleFunction('Malaysia')
};

// Lat/Lon to 3D conversion
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
}

// Create globe and cubes - COMPLETE IMPLEMENTATION
function createGlobeAndCubes() {
  console.log('Creating complete globe with all elements...');
  
  // Generate neural network data first
  generateNeuralNetworkData();
  
  // Create globe with earth texture
  const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
  const earthTexture = createEarthTexture();
  const globeMaterial = new THREE.MeshPhongMaterial({ 
    map: earthTexture,
    transparent: true,
    opacity: 0.9
  });
  
  const globe = new THREE.Mesh(globeGeometry, globeMaterial);
  globeGroup.add(globe);
  console.log('🌍 Globe with earth texture created');
  
  // Create wireframe
  const wireframeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.01, 32, 32);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  globeGroup.add(wireframe);
  console.log('🔷 Globe wireframe created');
  
  // Create background neural nodes
  createBackgroundNeuralNodes();
  console.log('✨ Neural nodes created');
  
  // Create neural network connections
  createNeuralNetworkConnections();
  console.log('🔗 Neural connections created');
  
  // Create country connection arcs
  createCountryArcs();
  console.log('🌈 Country arcs created');
  
  // Create neural cubes
  const colors = ['#003366', '#A52A2A', '#006400', '#483D8B', '#B22234', '#FF9933', '#EE2536', '#FFD700'];
  const contents = [europeContent, newThailandContent, canadaContent, ukContent, usaContent, indiaContent, singaporeContent, malaysiaContent];
  const subCubeArrays = [europeSubCubes, newThailandSubCubes, canadaSubCubes, ukSubCubes, usaSubCubes, indiaSubCubes, singaporeSubCubes, malaysiaSubCubes];
  const explodedArrays = [explodedPositions, newThailandExplodedPositions, canadaExplodedPositions, ukExplodedPositions, usaExplodedPositions, indiaExplodedPositions, singaporeExplodedPositions, malaysiaExplodedPositions];
  const cubeNames = ['Europe', 'Thailand', 'Canada', 'UK', 'USA', 'India', 'Singapore', 'Malaysia'];
  
  for (let i = 0; i < 8; i++) {
    const cubeObject = createNeuralCube(contents[i], subCubeArrays[i], explodedArrays[i], colors[i]);
    cubeObject.userData.neuralName = cubeNames[i];
    
    // Position cubes around the globe
    const angle = (i / 8) * Math.PI * 2;
    const radius = 1.8;
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.3;
    const y = (Math.random() - 0.5) * 0.6;
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.3;
    
    cubeObject.position.set(x, y, z);
    neuronGroup.add(cubeObject);
    neuralCubeMap[cubeNames[i]] = cubeObject;
    cubes.push(cubeObject);
    
    // Store cube references
    if (cubeNames[i] === 'Europe') europeCube = cubeObject;
    if (cubeNames[i] === 'Thailand') newThailandCube = cubeObject;
    if (cubeNames[i] === 'Canada') canadaCube = cubeObject;
    if (cubeNames[i] === 'UK') ukCube = cubeObject;
    if (cubeNames[i] === 'USA') usaCube = cubeObject;
    if (cubeNames[i] === 'India') indiaCube = cubeObject;
    if (cubeNames[i] === 'Singapore') singaporeCube = cubeObject;
    if (cubeNames[i] === 'Malaysia') malaysiaCube = cubeObject;
  }
  console.log('🧊 Neural cubes created and positioned');
  
  // Create country markers on globe surface
  countryConfigs.forEach(config => {
    const geometry = new THREE.SphereGeometry(0.02, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.8
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.userData.countryName = config.name;
    
    const position = latLonToVector3(config.lat, config.lon, GLOBE_RADIUS + 0.02);
    marker.position.copy(position);
    
    globeGroup.add(marker);
    countryBlocks[config.name] = marker;
  });
  console.log('📍 Country markers created');
  
  console.log('🎉 Complete globe creation finished!');
}

// Animate neural nodes
function animateNeuralNodes() {
  if (!neuronGroup || isCubeMovementPaused) return;
  
  neuronGroup.children.forEach((child, index) => {
    if (child.userData && child.userData.isNeuralNode && velocities[index]) {
      child.position.add(velocities[index]);
      
      const distance = child.position.length();
      if (distance > maxRadius) {
        child.position.normalize().multiplyScalar(maxRadius * 0.9);
        velocities[index].multiplyScalar(-0.5);
      }
    }
  });
}

// Carousel functions
function populateCarousel() {
    const container = document.getElementById('carouselContainer');
    container.innerHTML = '';
    
    carouselData.forEach(item => {
        const cardHTML = `
            <a href="#" class="carousel-card" data-category="${item.category}">
                <img src="${item.img}" alt="${item.title}"/>
                <div class="carousel-card-content">
                    <div class="carousel-card-title">${item.title}</div>
                    <div class="carousel-card-text">${item.text}</div>
                </div>
            </a>`;
        container.innerHTML += cardHTML;
    });
}

function scrollCarousel(direction) {
    const container = document.getElementById('carouselContainer');
    const card = container.querySelector('.carousel-card');
    if (card) {
        let cardWidth = card.offsetWidth;
        container.scrollBy({
            left: direction * (cardWidth + 16),
            behavior: 'smooth'
        });
    }
}

function highlightCountriesByProgram(category) {
    console.log('Highlighting countries for category:', category);
    
    Object.keys(countryBlocks).forEach(countryName => {
        const countryBlock = countryBlocks[countryName];
        if (countryBlock && countryBlock.material) {
            countryBlock.material.emissiveIntensity = 0.5;
        }
    });
    
    const relevantCountries = getCountriesByCategory(category);
    relevantCountries.forEach(countryName => {
        const countryBlock = countryBlocks[countryName];
        if (countryBlock && countryBlock.material) {
            countryBlock.material.emissiveIntensity = 1.2;
        }
    });
}

function highlightNeuralCubesByProgram(category) {
    console.log('Highlighting neural cubes for category:', category);
    
    const relevantCountries = getCountriesByCategory(category);
    
    Object.keys(neuralCubeMap).forEach(countryName => {
        const cube = neuralCubeMap[countryName];
        if (cube) {
            cube.scale.set(1, 1, 1);
        }
    });
    
    relevantCountries.forEach(countryName => {
        const cube = neuralCubeMap[countryName];
        if (cube && typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(cube.scale)
                .to({ x: 1.3, y: 1.3, z: 1.3 }, 500)
                .yoyo(true)
                .repeat(1)
                .start();
        }
    });
}

function getCountriesByCategory(category) {
    const countryList = [];
    
    switch(category) {
        case 'UG':
            if (hasUndergraduatePrograms(europeContent)) countryList.push('Europe');
            if (hasUndergraduatePrograms(newThailandContent)) countryList.push('Thailand');
            if (hasUndergraduatePrograms(canadaContent)) countryList.push('Canada');
            if (hasUndergraduatePrograms(ukContent)) countryList.push('UK');
            if (hasUndergraduatePrograms(usaContent)) countryList.push('USA');
            if (hasUndergraduatePrograms(indiaContent)) countryList.push('India');
            if (hasUndergraduatePrograms(singaporeContent)) countryList.push('Singapore');
            if (hasUndergraduatePrograms(malaysiaContent)) countryList.push('Malaysia');
            break;
        case 'PG':
            if (hasPostgraduatePrograms(europeContent)) countryList.push('Europe');
            if (hasPostgraduatePrograms(newThailandContent)) countryList.push('Thailand');
            if (hasPostgraduatePrograms(canadaContent)) countryList.push('Canada');
            if (hasPostgraduatePrograms(ukContent)) countryList.push('UK');
            if (hasPostgraduatePrograms(usaContent)) countryList.push('USA');
            if (hasPostgraduatePrograms(indiaContent)) countryList.push('India');
            if (hasPostgraduatePrograms(singaporeContent)) countryList.push('Singapore');
            if (hasPostgraduatePrograms(malaysiaContent)) countryList.push('Malaysia');
            break;
        case 'Mobility':
            if (hasExchangePrograms(europeContent)) countryList.push('Europe');
            if (hasExchangePrograms(newThailandContent)) countryList.push('Thailand');
            if (hasExchangePrograms(canadaContent)) countryList.push('Canada');
            if (hasExchangePrograms(ukContent)) countryList.push('UK');
            if (hasExchangePrograms(usaContent)) countryList.push('USA');
            if (hasExchangePrograms(indiaContent)) countryList.push('India');
            if (hasExchangePrograms(singaporeContent)) countryList.push('Singapore');
            if (hasExchangePrograms(malaysiaContent)) countryList.push('Malaysia');
            break;
        case 'Diploma':
            if (hasDiplomaPrograms(singaporeContent)) countryList.push('Singapore');
            if (hasDiplomaPrograms(malaysiaContent)) countryList.push('Malaysia');
            break;
        case 'Upskilling':
            if (hasUpskillPrograms(canadaContent)) countryList.push('Canada');
            if (hasUpskillPrograms(singaporeContent)) countryList.push('Singapore');
            break;
        case 'Research':
            countryList.push('Europe', 'UK', 'USA', 'Singapore');
            break;
        default:
            countryList.push('Europe', 'Thailand', 'Canada', 'UK', 'USA', 'India', 'Singapore', 'Malaysia');
    }
    
    return countryList;
}

function hasUndergraduatePrograms(content) {
    return content.some(program => program && 
        (program.programName.toLowerCase().includes('bachelor') || 
         program.programName.toLowerCase().includes('bba') ||
         program.programName.toLowerCase().includes('bsn') ||
         program.programName.toLowerCase().includes('undergraduate')));
}

function hasPostgraduatePrograms(content) {
    return content.some(program => program && 
        (program.programName.toLowerCase().includes('master') || 
         program.programName.toLowerCase().includes('mba') ||
         program.programName.toLowerCase().includes('msn') ||
         program.programName.toLowerCase().includes('postgraduate') ||
         program.programName.toLowerCase().includes('pg')));
}

function hasExchangePrograms(content) {
    return content.some(program => program && 
        (program.programName.toLowerCase().includes('exchange') || 
         program.programName.toLowerCase().includes('abroad') ||
         program.programName.toLowerCase().includes('mobility')));
}

function hasDiplomaPrograms(content) {
    return content.some(program => program && 
        program.programName.toLowerCase().includes('diploma'));
}

function hasUpskillPrograms(content) {
    return content.some(program => program && 
        (program.programName.toLowerCase().includes('cyber') || 
         program.programName.toLowerCase().includes('data') ||
         program.programName.toLowerCase().includes('tech') ||
         program.programName.toLowerCase().includes('design')));
}

// Mouse interaction
function onCanvasMouseUp(event) {
  if (!userIsAuthenticated()) {
    showLoginPrompt('Please log in to view detailed university programs and application links');
    return;
  }
  
  const canvasRect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const allClickableObjects = [...Object.values(countryBlocks), ...neuronGroup.children];
  const intersects = raycaster.intersectObjects(allClickableObjects, true);
  
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    
    if (clickedObject.userData.countryName) {
      const countryName = clickedObject.userData.countryName;
      const toggleFunc = toggleFunctionMap[countryName];
      if (toggleFunc) toggleFunc();
    }
    
    if (clickedObject.userData.isSubCube && clickedObject.userData.programId) {
      showInfoPanel(clickedObject.userData);
    }
  }
}

// Server-side functions (placeholder - implement with your server)
async function showInfoPanel(data) {
  if (!userIsAuthenticated()) {
    showLoginPrompt('Please log in to view detailed university information and application links');
    return;
  }
  
  console.log('Would show info panel for:', data);
  // Implement server call here
}

// Setup event listeners
function setupEventListeners() {
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUp);
  
  const pauseButton = document.getElementById("pauseButton");
  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      isRotationPaused = !isRotationPaused;
      if (controls) controls.autoRotate = !isRotationPaused;
      pauseButton.textContent = isRotationPaused ? "Resume Rotation" : "Pause Rotation";
    });
  }
  
  const pauseCubesButton = document.getElementById("pauseCubesButton");
  if (pauseCubesButton) {
    pauseCubesButton.addEventListener("click", () => {
      isCubeMovementPaused = !isCubeMovementPaused;
      pauseCubesButton.textContent = isCubeMovementPaused ? "Resume Cubes" : "Pause Cubes";
    });
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  console.log('Event listeners setup complete');
}

// Animation loop - COMPLETE WITH ALL ANIMATIONS
function animate() {
  requestAnimationFrame(animate);
  
  if (controls && controls.update) {
    controls.update();
  }
  
  if (!controls && !isRotationPaused) {
    globeGroup.rotation.y += 0.003;
  }
  
  // Animate neural nodes
  animateNeuralNodes();
  
  if (typeof TWEEN !== 'undefined') {
    TWEEN.update();
  }
  
  if (scene && camera && renderer) {
    renderer.render(scene, camera);
  }
}

function hideLoadingAnimation() {
  const loadingElement = document.getElementById('loadingAnimation');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

function hideInfoPanel() {
  const panel = document.getElementById('infoPanelOverlay');
  if (panel) panel.style.display = 'none';
}

function simulateLogin() {
  localStorage.setItem('userToken', 'authenticated-user-token');
  alert('Logged in! You can now access detailed university information.');
}

function logout() {
  localStorage.setItem('userToken', 'guest-viewer');
  alert('Logged out. Basic globe features remain available.');
}

// MAIN INITIALIZATION - COMPLETE SETUP
async function initializeApp() {
  console.log('🚀 Starting complete globe initialization...');
  
  try {
    await waitForThree();
    console.log('✅ Three.js loaded successfully');
    
    initializeThreeJS();
    createGlobeAndCubes();
    setupEventListeners();
    
    setTimeout(() => {
      populateCarousel();
      
      // Setup carousel click handlers
      document.querySelectorAll('.carousel-card').forEach(card => {
        card.addEventListener('click', function(e) {
          e.preventDefault();
          document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('selected'));
          this.classList.add('selected');
          highlightCountriesByProgram(this.dataset.category);
          highlightNeuralCubesByProgram(this.dataset.category);
        });
      });
      
      // Set default selection
      const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
      if (defaultCard) {
        defaultCard.classList.add('selected');
        highlightCountriesByProgram('UG');
        highlightNeuralCubesByProgram('UG');
      }
      
      hideLoadingAnimation();
    }, 1000);
    
    animate();
    
    console.log('🎉 COMPLETE GLOBE READY - All elements visible!');
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    
    const container = document.getElementById('globe-container');
    if (container) {
      container.innerHTML = `
        <div style="color: white; text-align: center; padding: 50px;">
          <h2>Globe Loading Error</h2>
          <p>There was an issue loading the interactive globe.</p>
          <p>Please refresh the page to try again.</p>
          <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">Refresh Page</button>
        </div>
      `;
    }
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

console.log('🌍 Globe script loaded - Ready for complete visualization!');
