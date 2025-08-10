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

// CLIENT-SIDE ONLY: University data with NO LINKS (server provides links)
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

// Combine all university content (filtering out nulls)
let allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent].filter(item => item !== null);
let countryPrograms = {};

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
  camera.position.set(0, 0, 5);
  
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
  
  // Setup transform controls
  if (typeof THREE.TransformControls !== 'undefined') {
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', (event) => {
      if (controls) controls.enabled = !event.value;
    });
    scene.add(transformControls);
  }
  
  // Setup lighting - BRIGHT lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 2.0);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0x336699, 1.0);
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
  controls.minDistance = 2;
  controls.maxDistance = 10;
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
    camera.position.z = Math.max(2, Math.min(10, camera.position.z));
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
  ctx.font = 'bold 24px Arial';
  
  const lines = text.split('\n');
  let startY = 128;
  if (lines.length > 1) startY = 100;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, 128, startY + (index * 30));
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
          material = createTexture('Available', null, '#666666');
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

// Create toggle functions
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
      if (transformControls) transformControls.attach(cube);
    } else {
      targetPosition.set(0, 0, 0);
      if (transformControls) transformControls.detach();
    }
    
    if (typeof TWEEN !== 'undefined') {
      new TWEEN.Tween(controls ? controls.target : camera.position).to(targetPosition, 800).easing(TWEEN.Easing.Cubic.InOut).start();
      if (transformControls) transformControls.visible = shouldBeExploded;
      
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

// Create globe and cubes
function createGlobeAndCubes() {
  console.log('Creating globe and cubes...');
  
  // Create basic globe sphere
  const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
  const globeMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x2244aa,
    transparent: true,
    opacity: 0.8,
    emissive: 0x112244,
    emissiveIntensity: 0.2
  });
  
  const globe = new THREE.Mesh(globeGeometry, globeMaterial);
  globeGroup.add(globe);
  console.log('Globe sphere created');
  
  // Create wireframe
  const wireframeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.05, 16, 16);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  globeGroup.add(wireframe);
  console.log('Wireframe created');
  
  // Create neural cubes
  const colors = ['#003366', '#A52A2A', '#006400', '#483D8B', '#B22234', '#FF9933', '#EE2536', '#FFD700'];
  const contents = [europeContent, newThailandContent, canadaContent, ukContent, usaContent, indiaContent, singaporeContent, malaysiaContent];
  const subCubeArrays = [europeSubCubes, newThailandSubCubes, canadaSubCubes, ukSubCubes, usaSubCubes, indiaSubCubes, singaporeSubCubes, malaysiaSubCubes];
  const explodedArrays = [explodedPositions, newThailandExplodedPositions, canadaExplodedPositions, ukExplodedPositions, usaExplodedPositions, indiaExplodedPositions, singaporeExplodedPositions, malaysiaExplodedPositions];
  const cubeNames = ['Europe', 'Thailand', 'Canada', 'UK', 'USA', 'India', 'Singapore', 'Malaysia'];
  
  for (let i = 0; i < 8; i++) {
    const cubeObject = createNeuralCube(contents[i], subCubeArrays[i], explodedArrays[i], colors[i]);
    cubeObject.userData.neuralName = cubeNames[i];
    
    const r = maxRadius * Math.random() * 0.8;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
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
  
  // Create country markers
  countryConfigs.forEach(config => {
    const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const material = new THREE.MeshBasicMaterial({ 
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.5
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.userData.countryName = config.name;
    
    const position = latLonToVector3(config.lat, config.lon, 1.1);
    marker.position.copy(position);
    
    globeGroup.add(marker);
    countryBlocks[config.name] = marker;
  });
  
  console.log('Neural cubes and country markers created');
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

// SERVER-SIDE: Show info panel - fetch data from server
async function showInfoPanel(data) {
  if (!userIsAuthenticated()) {
    showLoginPrompt('Please log in to view detailed university information and application links');
    return;
  }
  
  if (!data || !data.programId) return;
  
  try {
    // Fetch university details from server
    const response = await fetch('/api/university-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({
        programId: data.programId,
        university: data.university,
        programName: data.programName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch university details');
    }
    
    const universityDetails = await response.json();
    
    // Build info panel with server-provided data
    document.getElementById('infoPanelMainCard').innerHTML = `
      <div class="main-card-details">
        <img src="${data.logo}" alt="${data.university}">
        <h3>${data.university}</h3>
      </div>
      <div class="main-card-actions">
        ${universityDetails.erasmusAvailable ? `<button onclick="handleErasmusClick('${data.programId}')" class="partner-cta erasmus">Erasmus Info</button>` : ''}
      </div>
    `;
    
    document.getElementById('infoPanelSubcards').innerHTML = `
      <div class="subcard">
        <div class="subcard-info">
          <img src="${data.logo}" alt="">
          <h4>${data.programName.replace(/\n/g, ' ')}</h4>
        </div>
        <div class="subcard-buttons">
          <button onclick="handleInfoClick('${data.programId}')" class="partner-cta">Info</button>
          <button onclick="handleApplyClick('${data.programId}')" class="partner-cta apply">Apply</button>
        </div>
      </div>
    `;
    
    document.getElementById('infoPanelOverlay').style.display = 'flex';
    
  } catch (error) {
    console.error('Error loading university details:', error);
    alert('Unable to load university details. Please try again.');
  }
}

// SERVER-SIDE: Link handlers that communicate with backend
async function handleApplyClick(programId) {
  try {
    const response = await fetch('/api/apply-redirect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ 
        programId: programId,
        action: 'apply',
        timestamp: new Date().toISOString()
      })
    });
    
    const result = await response.json();
    
    if (result.redirectUrl) {
      window.open(result.redirectUrl, '_blank');
      console.log('Apply click tracked for:', programId);
    } else {
      alert('Application link not available. Please contact support.');
    }
  } catch (error) {
    console.error('Apply click error:', error);
    alert('Unable to process application request. Please try again.');
  }
}

async function handleInfoClick(programId) {
  try {
    const response = await fetch('/api/info-redirect', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ 
        programId: programId,
        action: 'info',
        timestamp: new Date().toISOString()
      })
    });
    
    const result = await response.json();
    
    if (result.redirectUrl) {
      window.open(result.redirectUrl, '_blank');
      console.log('Info click tracked for:', programId);
    } else {
      alert('Program information not available. Please contact support.');
    }
  } catch (error) {
    console.error('Info click error:', error);
    alert('Unable to load program information. Please try again.');
  }
}

async function handleErasmusClick(programId) {
  try {
    const response = await fetch('/api/erasmus-redirect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ 
        programId: programId,
        action: 'erasmus',
        timestamp: new Date().toISOString()
      })
    });
    
    const result = await response.json();
    
    if (result.redirectUrl) {
      window.open(result.redirectUrl, '_blank');
      console.log('Erasmus click tracked for:', programId);
    } else {
      alert('Erasmus information not available. Please contact support.');
    }
  } catch (error) {
    console.error('Erasmus click error:', error);
    alert('Unable to load Erasmus information. Please try again.');
  }
}

// Update carousel
function updateCarousel() {
  const carouselContainer = document.getElementById('carouselContainer');
  if (!carouselContainer) {
    console.log('Carousel container not found');
    return;
  }
  
  carouselContainer.innerHTML = '';
  
  allUniversityContent.forEach(program => {
    if (!program) return;
    
    const programCard = document.createElement('div');
    programCard.className = 'program-card';
    
    programCard.innerHTML = `
      <img src="${program.logo}" alt="${program.university}" onerror="this.style.display='none'">
      <h4>${program.university}</h4>
      <div class="program-name">${program.programName.replace(/\n/g, ' ')}</div>
    `;
    
    // Click handler for carousel cards
    programCard.addEventListener('click', () => {
      handleProgramCardClick(program);
    });
    
    carouselContainer.appendChild(programCard);
  });
  
  console.log('Carousel updated with', allUniversityContent.length, 'programs');
}

// Handle program card clicks
function handleProgramCardClick(program) {
  let targetCountry = null;
  let targetNeuralCube = null;
  
  if (europeContent.includes(program)) {
    targetCountry = 'Europe';
    targetNeuralCube = neuralCubeMap['Europe'];
  } else if (newThailandContent.includes(program)) {
    targetCountry = 'Thailand'; 
    targetNeuralCube = neuralCubeMap['Thailand'];
  } else if (canadaContent.includes(program)) {
    targetCountry = 'Canada';
    targetNeuralCube = neuralCubeMap['Canada'];
  } else if (ukContent.includes(program)) {
    targetCountry = 'UK';
    targetNeuralCube = neuralCubeMap['UK'];
  } else if (usaContent.includes(program)) {
    targetCountry = 'USA';
    targetNeuralCube = neuralCubeMap['USA'];
  } else if (indiaContent.includes(program)) {
    targetCountry = 'India';
    targetNeuralCube = neuralCubeMap['India'];
  } else if (singaporeContent.includes(program)) {
    targetCountry = 'Singapore';
    targetNeuralCube = neuralCubeMap['Singapore'];
  } else if (malaysiaContent.includes(program)) {
    targetCountry = 'Malaysia';
    targetNeuralCube = neuralCubeMap['Malaysia'];
  }
  
  if (targetCountry && targetNeuralCube) {
    const toggleFunc = toggleFunctionMap[targetCountry];
    if (toggleFunc) toggleFunc();
  }
}

// Setup filter buttons
function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      console.log('Filter applied:', btn.dataset.filter);
    });
  });
}

// Setup carousel navigation
function setupCarouselNavigation() {
  const leftBtn = document.getElementById('carouselScrollLeft');
  const rightBtn = document.getElementById('carouselScrollRight');
  
  if (leftBtn) {
    leftBtn.addEventListener('click', () => {
      const container = document.getElementById('carouselContainer');
      if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
    });
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('click', () => {
      const container = document.getElementById('carouselContainer');
      if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }
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
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  console.log('Event listeners setup complete');
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  if (controls && controls.update) {
    controls.update();
  }
  
  if (!controls && !isRotationPaused) {
    globeGroup.rotation.y += 0.005;
  }
  
  if (typeof TWEEN !== 'undefined') {
    TWEEN.update();
  }
  
  if (scene && camera && renderer) {
    renderer.render(scene, camera);
  }
}

// Hide loading animation
function hideLoadingAnimation() {
  const loadingElement = document.getElementById('loadingAnimation');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

// Hide info panel
function hideInfoPanel() {
  const panel = document.getElementById('infoPanelOverlay');
  if (panel) panel.style.display = 'none';
}

// Login simulation
function simulateLogin() {
  localStorage.setItem('userToken', 'authenticated-user-token');
  alert('Logged in! You can now access detailed university information.');
}

// Logout
function logout() {
  localStorage.setItem('userToken', 'guest-viewer');
  alert('Logged out. Basic globe features remain available.');
}

// Main initialization
async function initializeApp() {
  console.log('Starting application initialization...');
  
  try {
    await waitForThree();
    console.log('Three.js loaded successfully');
    
    initializeThreeJS();
    createGlobeAndCubes();
    setupEventListeners();
    setupFilterButtons();
    setupCarouselNavigation();
    
    setTimeout(() => {
      updateCarousel();
      hideLoadingAnimation();
    }, 500);
    
    animate();
    
    console.log('🌍 Globe initialization complete!');
    
  } catch (error) {
    console.error('Initialization error:', error);
    
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

console.log('Globe script loaded');
