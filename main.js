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

// **ADDED: Pan Variables for Mac-style dragging**
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

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

// RESTORED: Your original precise country coordinates
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

// INTEGRATED: Your exact original university data with precise names and logos
let europeContent = [{
    university: "University of Passau",
    logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg",
    programName: "Degree-Seeking"
}, {
    university: "University of Passau",
    logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg",
    programName: "Exchange"
}, null, null, {
    university: "ICES",
    logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png",
    programName: "Full Degree"
}, {
    university: "ICES",
    logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png",
    programName: "Mobility"
}, null, null, {
    university: "Université Catholique de Lille",
    logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png",
    programName: "Exchange"
}, {
    university: "Université Catholique de Lille",
    logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png",
    programName: "Summer Program"
}, null, null, {
    university: "IRCOM",
    logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg",
    programName: "Master\nHumanitarian"
}, {
    university: "IRCOM",
    logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg",
    programName: "Mobility"
}, null, null, {
    university: "KATHO-NRW",
    logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg",
    programName: "Int'l Studies"
}, {
    university: "KATHO-NRW",
    logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg",
    programName: "Study Abroad"
}, null, null, {
    university: "TSI",
    logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg",
    programName: "Int'l Students"
}, {
    university: "TSI",
    logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg",
    programName: "Innovation"
}, null, null, {
    university: "INSEEC",
    logo: "https://static.wixstatic.com/media/d77f36_66d4c88c4ebb4b7da6cacaed57178165~mv2.webp",
    programName: "Exchanges"
}, null, null];

let newThailandContent = [{
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Undergraduate Business (BBA)"
}, {
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Master of Business Administration (MBA)"
}, {
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Study Abroad / Exchange"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Innovative Media Production"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Media & Communication"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Innovation Management (MBA)"
}, {
    university: "Siam University",
    logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png",
    programName: "Bachelor of Business Admin. (BBA)"
}, {
    university: "Siam University",
    logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png",
    programName: "Master of Business Admin. (MBA)"
}, {
    university: "Siam University",
    logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png",
    programName: "Semester Abroad / Exchange"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

let canadaContent = [{
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "BSN"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MSN"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "Biotechnology"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "Computing Science"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MA in Leadership"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MBA"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "BBA"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "Cyber Security"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "Data Analytics"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "Full Stack Dev"
}, {
    university: "Wawiwa Tech Training",
    logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp",
    programName: "UX/UI Design"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

let ukContent = [{
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Business & Management"
}, {
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Healthcare & Nursing"
}, {
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Public Policy"
}, {
    university: "Liverpool Hope University",
    logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg",
    programName: "Education"
}, {
    university: "Liverpool Hope University",
    logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg",
    programName: "Business"
}, {
    university: "Nottingham Trent University",
    logo: "https://static.wixstatic.com/media/d77f36_86cb424c04934227905daf03395fc3b1~mv2.png",
    programName: "Global\nPartnerships"
}, {
    university: "University of Exeter",
    logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg",
    programName: "Medicine"
}, {
    university: "University of Exeter",
    logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg",
    programName: "Law"
}, {
    university: "UK Students Abroad",
    logo: "https://static.wixstatic.com/media/d77f36_0be7efbfceee4b359a597935c2851fd3~mv2.jpg",
    programName: "Study in SG"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

let usaContent = [{
    university: "John Cabot University",
    logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png",
    programName: "Degree\nPrograms"
}, {
    university: "John Cabot University",
    logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png",
    programName: "Study Abroad"
}, {
    university: "St. Mary's University",
    logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png",
    programName: "STEM\nPrograms"
}, {
    university: "St. Mary's University",
    logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png",
    programName: "Int'l Services"
}, {
    university: "California Baptist University",
    logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg",
    programName: "STEM\nDegrees"
}, {
    university: "California Baptist University",
    logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg",
    programName: "Int'l Exchange"
}, {
    university: "LeTourneau University",
    logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png",
    programName: "Aviation"
}, {
    university: "LeTourneau University",
    logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png",
    programName: "Engineering"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

let indiaContent = [{
    university: "Asia College of Journalism",
    logo: "https://static.wixstatic.com/media/d77f36_2cd674a2255f4d3f83d8b00721d6f477~mv2.png",
    programName: "Journalism"
}, {
    university: "Women's Christian College",
    logo: "https://static.wixstatic.com/media/d77f36_2c637647ae7145749c1a7d3f74ec6f2e~mv2.jpg",
    programName: "Academic\nPrograms"
}, {
    university: "Stella Maris College",
    logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png",
    programName: "PG Prospectus"
}, {
    university: "Stella Maris College",
    logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png",
    programName: "Exchange"
}, {
    university: "Symbiosis International University",
    logo: "https://static.wixstatic.com/media/d77f36_f89cf22ecc514a78b0dd8b34c656d4d9~mv2.png",
    programName: "Int'l\nAdmissions"
}, {
    university: "Fergusson College",
    logo: "https://static.wixstatic.com/media/d77f36_60066c9c2c0242d39e0107a2f25eb185~mv2.png",
    programName: "Nursing"
}, {
    university: "Bishop Heber College",
    logo: "https://static.wixstatic.com/media/d77f36_21e0208f1bc248e5953eff9a0410bad8~mv2.jpeg",
    programName: "Int'l\nAdmissions"
}, {
    university: "St. Stephen's College",
    logo: "https://static.wixstatic.com/media/d77f36_e4e8e1e417874b01b46adf1aadc894be~mv2.png",
    programName: "Courses\nOffered"
}, {
    university: "Christ University",
    logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp",
    programName: "Int'l\nAdmissions"
}, {
    university: "Christ University",
    logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp",
    programName: "Study Abroad"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

let singaporeContent = [{
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Business\nSchool"
}, {
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Nursing &\nMedicine"
}, {
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Public Policy"
}, {
    university: "SIM",
    logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif",
    programName: "IT &\nCompSci"
}, {
    university: "SIM",
    logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif",
    programName: "Nursing"
}, {
    university: "Nanyang Institute of Management",
    logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png",
    programName: "Business"
}, {
    university: "Nanyang Institute of Management",
    logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png",
    programName: "Hospitality"
}, {
    university: "Nanyang Institute of Management",
    logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png",
    programName: "Digital Media\nDiploma"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

let malaysiaContent = [{
    university: "Limkokwing University",
    logo: "https://static.wixstatic.com/media/d77f36_38c855c3d47448009fc7123812183cc0~mv2.png",
    programName: "Creative\nTech"
}, {
    university: "Binary University",
    logo: "https://static.wixstatic.com/media/d77f36_38969a51e38148f294cade091aa0cbd8~mv2.png",
    programName: "MyBIG Grant"
}, {
    university: "Study in Malaysia Guide",
    logo: "https://static.wixstatic.com/media/d77f36_e6a24c71b7a14548beca3dafbb8e797b~mv2.jpg",
    programName: "Student\nGuide"
}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

// Combine all university content
let allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent];
let countryPrograms = {};

// **GLOBAL CAROUSEL FILTERING FUNCTIONS**
const carouselData = [{
    category: "UG",
    img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png",
    title: "Undergraduate",
    text: "Bachelor-level opportunities."
}, {
    category: "PG", 
    img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png",
    title: "Postgraduate",
    text: "Master's & advanced programs."
}, {
    category: "Diploma",
    img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", 
    title: "Diploma",
    text: "Professional & foundation."
}, {
    category: "Mobility",
    img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png",
    title: "Semester Abroad", 
    text: "Exchange & mobility."
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

const globalContentMap = {
  'Europe': europeContent,
  'Thailand': newThailandContent, 
  'Canada': canadaContent,
  'UK': ukContent,
  'USA': usaContent,
  'India': indiaContent,
  'Singapore': singaporeContent,
  'Malaysia': malaysiaContent
};

function getMatchingCountries(category) {
  const matcherMap = {
    'ug': content => content.some(p => p && /bachelor|bba|undergraduate|bsn|degree/i.test(p.programName)),
    'pg': content => content.some(p => p && /master|mba|postgraduate|ms|msn/i.test(p.programName)),
    'mobility': content => content.some(p => p && /exchange|abroad|mobility|study/i.test(p.programName)),  
    'diploma': content => content.some(p => p && /diploma/i.test(p.programName)),
    'upskilling': content => content.some(p => p && /cyber|data|tech|ux|upskill/i.test(p.programName)),
    'research': content => content.some(p => p && /research|phd|doctor/i.test(p.programName))
  };
  
  const matcher = matcherMap[category.toLowerCase()] || (() => false);
  return Object.keys(globalContentMap).filter(country => matcher(globalContentMap[country]));
}

function highlightNeuralCubesByProgram(category) {
  console.log(`🌍 Global neural cube filtering for: ${category}`);
  
  const matchingCountries = getMatchingCountries(category);
  
  // Reset all neural cubes first
  Object.keys(neuralCubeMap).forEach(countryName => {
    const cube = neuralCubeMap[countryName];
    if (cube && typeof TWEEN !== 'undefined') {
      new TWEEN.Tween(cube.scale)
        .to({ x: 1.0, y: 1.0, z: 1.0 }, 300)
        .start();
    }
  });
  
  // Scale up matching neural cubes
  matchingCountries.forEach(countryName => {
    const cube = neuralCubeMap[countryName];
    if (cube && typeof TWEEN !== 'undefined') {
      new TWEEN.Tween(cube.scale)
        .to({ x: 1.3, y: 1.3, z: 1.3 }, 500)
        .start();
    }
  });
  
  console.log(`✨ Scaled ${matchingCountries.length} neural cubes:`, matchingCountries);
}

function highlightMatchingSubCubes(category) {
  console.log(`🎯 Global subcube filtering for: ${category}`);
  
  const matcherMap = {
    'ug': p => p && /bachelor|bba|undergraduate|bsn|degree/i.test(p.programName),
    'pg': p => p && /master|mba|postgraduate|ms|msn/i.test(p.programName), 
    'mobility': p => p && /exchange|abroad|mobility|study/i.test(p.programName),
    'diploma': p => p && /diploma/i.test(p.programName),
    'upskilling': p => p && /cyber|data|tech|ux|upskill/i.test(p.programName),
    'research': p => p && /research|phd|doctor/i.test(p.programName)
  };
  
  const matcher = matcherMap[category.toLowerCase()] || (() => false);
  let totalMatches = 0;
  
  // Reset ALL subcubes in ALL countries first
  Object.values(neuralCubeMap).forEach(cube => {
    cube.children.forEach(subCube => {
      if (subCube.userData.isSubCube) {
        subCube.material.emissiveIntensity = 0.6; // Normal intensity
        new TWEEN.Tween(subCube.scale).to({ x: 1.0, y: 1.0, z: 1.0 }, 200).start();
      }
    });
  });
  
  // Highlight matching subcubes across ALL countries
  Object.entries(globalContentMap).forEach(([countryName, content]) => {
    const neuralCube = neuralCubeMap[countryName];
    if (!neuralCube) return;
    
    content.forEach((program, index) => {
      if (matcher(program)) {
        const subCube = neuralCube.children[index];
        if (subCube && subCube.userData.isSubCube) {
          // Bright highlight for matching programs
          subCube.material.emissiveIntensity = 2.5;
          new TWEEN.Tween(subCube.scale)
            .to({ x: 1.4, y: 1.4, z: 1.4 }, 400)
            .start();
          totalMatches++;
        }
      }
    });
  });
  
  console.log(`🎯 Highlighted ${totalMatches} individual program subcubes for ${category}`);
}

function populateCarousel() {
    const container = document.getElementById('carouselContainer');
    if (!container) return;
    container.innerHTML = '';
    
    carouselData.forEach(item => {
        container.insertAdjacentHTML('beforeend', `
            <a href="#" class="carousel-card" data-category="${item.category}">
                <img src="${item.img}" alt="${item.title}"/>
                <div class="carousel-card-content">
                    <div class="carousel-card-title">${item.title}</div>
                    <div class="carousel-card-text">${item.text}</div>
                </div>
            </a>`);
    });
    
    // Global filtering click handlers
    document.querySelectorAll('.carousel-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update visual selection
            document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            const category = this.dataset.category;
            console.log(`🌍 Global filtering activated for: ${category}`);
            
            // Triple global highlighting
            highlightCountriesByProgram(category);     // Country surface markers
            highlightNeuralCubesByProgram(category);   // Neural cubes scaling  
            highlightMatchingSubCubes(category);       // Individual program subcubes
        });
    });
    
    // Set default selection to UG
    const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
    if (defaultCard) {
        defaultCard.classList.add('selected');
        // Apply default filtering
        highlightCountriesByProgram('UG');
        highlightNeuralCubesByProgram('UG');
        highlightMatchingSubCubes('UG');
    }
}

function scrollCarousel(direction) {
    const container = document.getElementById('carouselContainer');
    if (!container) return;
    
    const card = container.querySelector('.carousel-card');
    if (!card) return;
    
    const cardWidth = card.offsetWidth + 16; // Include gap
    container.scrollBy({
        left: direction * cardWidth,
        behavior: 'smooth'
    });
}

// **INTEGRATED NAVIGATION FUNCTIONS FOR GLOBE CONTROL**
function moveGlobeUp() {
  if (controls) {
    const panSpeed = 0.05;
    controls.object.position.y += panSpeed;
    controls.target.y += panSpeed;
    controls.update();
  }
}

function moveGlobeDown() {
  if (controls) {
    const panSpeed = 0.05;
    controls.object.position.y -= panSpeed;
    controls.target.y -= panSpeed;
    controls.update();
  }
}

function moveGlobeLeft() {
  if (controls) {
    const panSpeed = 0.05;
    controls.object.position.x -= panSpeed;
    controls.target.x -= panSpeed;
    controls.update();
  }
}

function moveGlobeRight() {
  if (controls) {
    const panSpeed = 0.05;
    controls.object.position.x += panSpeed;
    controls.target.x += panSpeed;
    controls.update();
  }
}

// **FIXED ZOOM FUNCTIONS - SIMULATE WHEEL EVENTS LIKE TRACKPAD**
function zoomGlobeIn() {
  if (!controls || !renderer) {
    console.error('Controls or renderer not initialized yet');
    return;
  }
  
  console.log('Zooming in with + button...');
  
  // Create and dispatch wheel event (same as trackpad zoom)
  const wheelEvent = new WheelEvent('wheel', {
    deltaY: -120, // Negative deltaY = zoom in
    bubbles: true,
    cancelable: true,
    clientX: renderer.domElement.width / 2,
    clientY: renderer.domElement.height / 2
  });
  
  renderer.domElement.dispatchEvent(wheelEvent);
}

function zoomGlobeOut() {
  if (!controls || !renderer) {
    console.error('Controls or renderer not initialized yet');
    return;
  }
  
  console.log('Zooming out with - button...');
  
  // Create and dispatch wheel event (same as trackpad zoom)
  const wheelEvent = new WheelEvent('wheel', {
    deltaY: 120, // Positive deltaY = zoom out
    bubbles: true,
    cancelable: true,
    clientX: renderer.domElement.width / 2,
    clientY: renderer.domElement.height / 2
  });
  
  renderer.domElement.dispatchEvent(wheelEvent);
}


// **IMPROVED TOGGLE FUNCTIONS WITH MUTUAL EXCLUSIVITY**
function toggleGlobeRotation() {
  if (controls) {
    controls.autoRotate = !controls.autoRotate;
    
    const rotateBtn = document.getElementById('btn-rotate');
    const panBtn = document.getElementById('btn-pan');
    
    if (controls.autoRotate) {
      // Enable rotation - disable pan mode
      isPanMode = false;
      controls.enableRotate = true;
      controls.enablePan = true;
      
      // Update rotate button to active
      if (rotateBtn) {
        rotateBtn.style.background = '#ffa500';
        rotateBtn.style.color = '#222';
      }
      
      // Turn off pan button
      if (panBtn) {
        panBtn.style.background = '#223366';
        panBtn.style.color = '#fff';
        panBtn.title = 'Enter Pan Mode';
      }
    } else {
      // Disable rotation
      if (rotateBtn) {
        rotateBtn.style.background = '#223366';
        rotateBtn.style.color = '#fff';
      }
    }
  }
}

function togglePanMode() {
  if (controls) {
    isPanMode = !isPanMode;
    
    const panBtn = document.getElementById('btn-pan');
    const rotateBtn = document.getElementById('btn-rotate');
    
    if (isPanMode) {
      // Enable pan mode - disable auto rotation
      controls.autoRotate = false;
      controls.enableRotate = false; // Disable mouse rotation
      controls.enablePan = true;
      
      // Update pan button to active
      if (panBtn) {
        panBtn.style.background = '#ffa500';
        panBtn.style.color = '#222';
        panBtn.title = 'Exit Pan Mode (Drag to Move)';
      }
      
      // Turn off rotate button
      if (rotateBtn) {
        rotateBtn.style.background = '#223366';
        rotateBtn.style.color = '#fff';
      }
    } else {
      // Disable pan mode - restore rotation
      controls.enableRotate = true;
      controls.enablePan = true;
      
      // Update pan button to inactive
      if (panBtn) {
        panBtn.style.background = '#223366';
        panBtn.style.color = '#fff';
        panBtn.title = 'Enter Pan Mode';
      }
    }
    
    console.log(isPanMode ? '🖐️ Pan mode enabled - drag to move globe' : '🔄 Pan mode disabled - normal rotation enabled');
  }
}

// MODIFIED: Fetch data - allow basic globe without auth
async function fetchDataFromBackend() {
  try {
    let headers = {};
    if (userIsAuthenticated()) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('userToken')}`;
    }
    
    const response = await fetch('/api/globe-data', { headers });
    
    if (!response.ok) {
      console.log('Using basic globe data - login required for full features');
      return;
    }
    
    const data = await response.json();
    
    // Update data arrays if server provides them
    if (data.europeContent && data.europeContent.length > 0) {
      europeContent = data.europeContent;
    }
    if (data.newThailandContent && data.newThailandContent.length > 0) {
      newThailandContent = data.newThailandContent;
    }
    if (data.canadaContent && data.canadaContent.length > 0) {
      canadaContent = data.canadaContent;
    }
    if (data.ukContent && data.ukContent.length > 0) {
      ukContent = data.ukContent;
    }
    if (data.usaContent && data.usaContent.length > 0) {
      usaContent = data.usaContent;
    }
    if (data.indiaContent && data.indiaContent.length > 0) {
      indiaContent = data.indiaContent;
    }
    if (data.singaporeContent && data.singaporeContent.length > 0) {
      singaporeContent = data.singaporeContent;
    }
    if (data.malaysiaContent && data.malaysiaContent.length > 0) {
      malaysiaContent = data.malaysiaContent;
    }
    
    countryPrograms = data.countryPrograms || {};
    
    // Update country configs if provided
    if (data.countryConfigs && data.countryConfigs.length > 0) {
      countryConfigs = data.countryConfigs;
    }
    
    allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent];
    
    console.log('Data loaded successfully!');
    
  } catch (error) {
    console.log('Globe running in preview mode - login for full access');
  }
}

// Initialize Three.js scene
function initializeThreeJS() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);
  
  globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeGroup.add(neuronGroup);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  
  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
  });
  scene.add(transformControls);
  
  // BRIGHTER LIGHTING
  const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // ADD EXTRA LIGHT for globe visibility
  const backLight = new THREE.DirectionalLight(0x336699, 0.5);
  backLight.position.set(-5, -5, -5);
  scene.add(backLight);
  
  camera.position.z = 5;
}

// Color calculation function
function getColorByData(data) {
  const baseHue = data.domain * 30 % 360;
  const lightness = 50 + data.engagement * 25;
  const saturation = 70;
  const riskShift = data.risk > 0.5 ? 0 : 120;
  const hue = (baseHue + riskShift) % 360;
  const color = new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  color.multiplyScalar(data.confidence);
  return color;
}

// RESTORED: Your original texture creation with proper logos
function createTexture(text, logoUrl, bgColor = '#003366') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  const texture = new THREE.CanvasTexture(canvas);

  function drawText() {
    const lines = text.split('\n');
    const fontSize = lines.length > 1 ? 28 : 32;
    ctx.font = `bold ${fontSize}px Arial`;
    let y = 128 + (lines.length > 1 ? 0 : 10);
    lines.forEach(line => {
      ctx.fillText(line, 128, y);
      y += (fontSize + 6);
    });
    texture.needsUpdate = true;
  }
  
  // RESTORED: Your original logo handling
  if (logoUrl) {
    const logoImg = new Image();
    logoImg.crossOrigin = "Anonymous";
    logoImg.src = logoUrl;
    logoImg.onload = () => {
      ctx.drawImage(logoImg, 16, 16, 64, 64); // Logo in top-left
      drawText(); // Text below logo
    };
    logoImg.onerror = () => {
      drawText(); // Fallback to text only
    }
  } else {
    drawText();
  }
  
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissive: new THREE.Color(bgColor),
    emissiveIntensity: 0.6
  });
}

// Create toggle function for cube explosions
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
      transformControls.attach(cube);
    } else {
      targetPosition.set(0, 0, 0);
      transformControls.detach();
    }
    
    new TWEEN.Tween(controls.target).to(targetPosition, 800).easing(TWEEN.Easing.Cubic.InOut).start();
    transformControls.visible = shouldBeExploded;
    
    subCubes.forEach((subCube, i) => {
      const targetPos = shouldBeExploded ? explodedPos[i] : subCube.userData.initialPosition;
      new TWEEN.Tween(subCube.position).to(targetPos, 800).easing(TWEEN.Easing.Exponential.InOut).start();
    });
  }
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

// RESTORED: Your original neural cube creation with proper university data
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  let contentIdx = 0;
  const cubeObject = new THREE.Group();
  
  for (let xi = -1; xi <= 1; xi++) {
    for (let yi = -1; yi <= 1; yi++) {
      for (let zi = -1; zi <= 1; zi++) {
        const item = content[contentIdx];
        let material, userData;
        
        if (item) {
          // RESTORED: Your original university data structure
          material = createTexture(item.programName, item.logo, color);
          userData = item; // Full university data with logo, links, etc.
        } else {
          // RESTORED: Your original fallback for empty slots
          material = createTexture('Unassigned', null, '#333333');
          userData = { university: "Unassigned" };
        }
        
        const microcube = new THREE.Mesh(
          new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize),
          material
        );
        
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

// Create neural network
function createNeuralNetwork() {
  const vertices = [];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const material = new THREE.LineBasicMaterial({
    color: 0x00BFFF,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.35
  });
  
  neuralNetworkLines = new THREE.LineSegments(geometry, material);
  globeGroup.add(neuralNetworkLines);
}

// RESTORED: Your original lat/lon to 3D conversion
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
}

// Create connection path
function createConnectionPath(fromGroup, toGroup, color = 0xffff00) {
  const start = new THREE.Vector3();
  fromGroup.getWorldPosition(start);
  const end = new THREE.Vector3();
  toGroup.getWorldPosition(end);
  
  const globeRadius = 1.0;
  const arcOffset = 0.05;
  const distance = start.distanceTo(end);
  const arcElevation = distance * 0.4;
  
  const offsetStart = start.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const offsetEnd = end.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const mid = offsetStart.clone().add(offsetEnd).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + arcOffset + arcElevation);
  
  const curve = new THREE.QuadraticBezierCurve3(offsetStart, mid, offsetEnd);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.005, 8, false);
  
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    varying vec2 vUv;
    uniform float time;
    uniform vec3 color;
    void main() {
      float stripe1 = step(0.1, fract(vUv.x * 4.0 + time * 0.2)) - step(0.2, fract(vUv.x * 4.0 + time * 0.2));
      float stripe2 = step(0.1, fract(vUv.x * 4.0 - time * 0.2)) - step(0.2, fract(vUv.x * 4.0 - time * 0.2));
      float combinedStripes = max(stripe1, stripe2);
      float glow = (1.0 - abs(vUv.y - 0.5) * 2.0);
      if (combinedStripes > 0.0) {
        gl_FragColor = vec4(color, combinedStripes * glow);
      } else {
        discard;
      }
    }
  `;
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(color) }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const path = new THREE.Mesh(geometry, material);
  path.renderOrder = 1;
  globeGroup.add(path);
  return path;
}

// Draw all connections
function drawAllConnections() {
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  const pairs = countryNames.map(country => ["Thailand", country]);
  arcPaths = pairs.map(([from, to]) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    if (fromBlock && toBlock) return createConnectionPath(fromBlock, toBlock);
  }).filter(Boolean);
}

// MODIFIED: Show info panel - require auth
function showInfoPanel(data) {
  if (!userIsAuthenticated()) {
    showLoginPrompt('Please log in to view detailed university information and application links');
    return;
  }
  
  if (!data || data.university === "Unassigned") return;
  
  const uniData = allUniversityContent.filter(item => item && item.university === data.university);
  if (uniData.length === 0) return;
  
  const mainErasmusLink = uniData[0].erasmusLink;
  document.getElementById('infoPanelMainCard').innerHTML = `
    <div class="main-card-details">
      <img src="${uniData[0].logo}" alt="${uniData.university}">
      <h3>${uniData.university}</h3>
    </div>
    <div class="main-card-actions">
      ${mainErasmusLink ? `<a href="${mainErasmusLink}" target="_blank" class="partner-cta erasmus">Erasmus Info</a>` : ''}
    </div>
  `;
  
  document.getElementById('infoPanelSubcards').innerHTML = '';
  
  uniData.forEach(item => {
    if (!item) return;
    
    const infoLinkClass = item.programLink && item.programLink !== '#' ? 'partner-cta' : 'partner-cta disabled';
    const infoLinkHref = item.programLink && item.programLink !== '#' ? `javascript:window.open('${item.programLink}', '_blank')` : 'javascript:void(0);';
    const applyLinkClass = item.applyLink && item.applyLink !== '#' ? 'partner-cta apply' : 'partner-cta apply disabled';
    const applyLinkHref = item.applyLink && item.applyLink !== '#' ? `javascript:window.open('${item.applyLink}', '_blank')` : 'javascript:void(0);';
    
    const subcardHTML = `
      <div class="subcard">
        <div class="subcard-info">
          <img src="${item.logo}" alt="">
          <h4>${item.programName.replace(/\n/g, ' ')}</h4>
        </div>
        <div class="subcard-buttons">
          <a href="${infoLinkHref}" class="${infoLinkClass}">Info</a>
          <a href="${applyLinkHref}" class="${applyLinkClass}">Apply</a>
        </div>
      </div>
    `;
    
    document.getElementById('infoPanelSubcards').insertAdjacentHTML('beforeend', subcardHTML);
  });
  
  document.getElementById('infoPanelOverlay').style.display = 'flex';
}

// Hide info panel
function hideInfoPanel() {
  document.getElementById('infoPanelOverlay').style.display = 'none';
}

// Mouse interaction handlers
function onCanvasMouseDown(event) {
  mouseDownPos.set(event.clientX, event.clientY);
}

function closeAllExploded() {
  if (isEuropeCubeExploded) toggleFunctionMap['Europe']();
  if (isNewThailandCubeExploded) toggleFunctionMap['Thailand']();
  if (isCanadaCubeExploded) toggleFunctionMap['Canada']();
  if (isUkCubeExploded) toggleFunctionMap['UK']();
  if (isUsaCubeExploded) toggleFunctionMap['USA']();
  if (isIndiaCubeExploded) toggleFunctionMap['India']();
  if (isSingaporeCubeExploded) toggleFunctionMap['Singapore']();
  if (isMalaysiaCubeExploded) toggleFunctionMap['Malaysia']();
}

// MODIFIED: Mouse interaction - allow globe interaction, require auth for details
function onCanvasMouseUp(event) {
  if (transformControls.dragging) return;
  
  const deltaX = Math.abs(event.clientX - mouseDownPos.x);
  const deltaY = Math.abs(event.clientY - mouseDownPos.y);
  if (deltaX > 5 || deltaY > 5) return;
  
  if (event.target.closest('.info-panel')) return;
  
  const canvasRect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const allClickableObjects = [...Object.values(countryBlocks), ...neuronGroup.children];
  const intersects = raycaster.intersectObjects(allClickableObjects, true);
  
  if (intersects.length === 0) {
    closeAllExploded();
    return;
  }
  
  const clickedObject = intersects[0].object;
  
  if (clickedObject.userData.countryName) {
    const countryName = clickedObject.userData.countryName;
    const correspondingNeuralCube = neuralCubeMap[countryName];
    const toggleFunc = toggleFunctionMap[countryName];
    
    if (correspondingNeuralCube && toggleFunc) {
      const explosionStateMap = {
        'Europe': isEuropeCubeExploded,
        'Thailand': isNewThailandCubeExploded,
        'Canada': isCanadaCubeExploded,
        'UK': isUkCubeExploded,
        'USA': isUsaCubeExploded,
        'India': isIndiaCubeExploded,
        'Singapore': isSingaporeCubeExploded,
        'Malaysia': isMalaysiaCubeExploded
      };
      
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      
      // ALLOW cube animation without auth
      new TWEEN.Tween(correspondingNeuralCube.scale)
        .to({ x: 1.5, y: 1.5, z: 1.5 }, 200)
        .yoyo(true)
        .repeat(1)
        .start();
      
      setTimeout(() => {
        toggleFunc();
      }, anyExploded ? 810 : 400);
    }
    return;
  }
  
  let parent = clickedObject;
  let neuralName = null;
  let clickedSubCube = clickedObject.userData.isSubCube ? clickedObject : null;
  
  while (parent) {
    if (parent.userData.neuralName) {
      neuralName = parent.userData.neuralName;
      break;
    }
    parent = parent.parent;
  }
  
  const explosionStateMap = {
    'Europe': isEuropeCubeExploded,
    'Thailand': isNewThailandCubeExploded,
    'Canada': isCanadaCubeExploded,
    'UK': isUkCubeExploded,
    'USA': isUsaCubeExploded,
    'India': isIndiaCubeExploded,
    'Singapore': isSingaporeCubeExploded,
    'Malaysia': isMalaysiaCubeExploded
  };
  
  if (neuralName) {
    const isExploded = explosionStateMap[neuralName];
    const toggleFunc = toggleFunctionMap[neuralName];
    
    if (isExploded && clickedSubCube && clickedSubCube.userData.university !== "Unassigned") {
      // THIS requires auth - viewing detailed university info
      if (!userIsAuthenticated()) {
        showLoginPrompt('Please log in to view detailed university programs and application links');
        return;
      }
      showInfoPanel(clickedSubCube.userData);
    } else {
      // ALLOW basic cube explosion/interaction without auth
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      setTimeout(() => toggleFunc(), anyExploded ? 810 : 0);
    }
  } else {
    closeAllExploded();
  }
}

// **ENHANCED MOUSE INTERACTION FOR PAN MODE**
function onCanvasMouseDownPan(event) {
  mouseDownPos.set(event.clientX, event.clientY);
  
  if (isPanMode) {
    isDragging = true;
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    renderer.domElement.style.cursor = 'grabbing';
  }
}

function onCanvasMouseMovePan(event) {
  if (isPanMode && isDragging) {
    const deltaMove = {
      x: event.clientX - previousMousePosition.x,
      y: event.clientY - previousMousePosition.y
    };
    
    // Convert mouse movement to world space pan
    const panSpeed = 0.002;
    const deltaX = deltaMove.x * panSpeed;
    const deltaY = deltaMove.y * panSpeed;
    
    // Apply pan movement to camera and target
    controls.object.position.x -= deltaX;
    controls.target.x -= deltaX;
    controls.object.position.y += deltaY;
    controls.target.y += deltaY;
    
    controls.update();
    
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
}

function onCanvasMouseUpPan(event) {
  if (isPanMode) {
    isDragging = false;
    renderer.domElement.style.cursor = isPanMode ? 'grab' : 'default';
  }
  
  // Continue with your existing mouse up logic
  onCanvasMouseUp(event);
}

// **UPDATED SETUP EVENT LISTENERS WITH NAVIGATION AND PAN FUNCTIONS**
function setupEventListeners() {
  // **UPDATED MOUSE EVENT LISTENERS WITH PAN FUNCTIONALITY**
  renderer.domElement.addEventListener('mousedown', onCanvasMouseDownPan);
  renderer.domElement.addEventListener('mousemove', onCanvasMouseMovePan);
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUpPan);
  
  // **ADD CURSOR STYLE CHANGES FOR PAN MODE**
  renderer.domElement.addEventListener('mouseenter', () => {
    if (isPanMode) {
      renderer.domElement.style.cursor = 'grab';
    }
  });
  
  // **UPDATED NAVIGATION CONTROLS - WORKING GLOBE MOVEMENT**
  const btnUp = document.getElementById('btn-up');
  if (btnUp) {
    btnUp.addEventListener('click', moveGlobeUp);
  }
  
  const btnDown = document.getElementById('btn-down');
  if (btnDown) {
    btnDown.addEventListener('click', moveGlobeDown);
  }
  
  const btnLeft = document.getElementById('btn-left');
  if (btnLeft) {
    btnLeft.addEventListener('click', moveGlobeLeft);
  }
  
  const btnRight = document.getElementById('btn-right');
  if (btnRight) {
    btnRight.addEventListener('click', moveGlobeRight);
  }
  
  // **ENSURE ZOOM BUTTONS ARE CORRECTLY CONNECTED**
  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', zoomGlobeIn);
  }
  
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', zoomGlobeOut);
  }
  
  const btnRotate = document.getElementById('btn-rotate');
  if (btnRotate) {
    btnRotate.addEventListener('click', toggleGlobeRotation);
  }
  
  const btnPan = document.getElementById('btn-pan');
  if (btnPan) {
    btnPan.addEventListener('click', togglePanMode);
  }
  
  // **REST OF YOUR EXISTING EVENT LISTENERS**
  const pauseButton = document.getElementById("pauseButton");
  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      isRotationPaused = !isRotationPaused;
      controls.autoRotate = !isRotationPaused;
      pauseButton.textContent = isRotationPaused ? "Resume Rotation" : "Pause Rotation";
    });
  }
  
  const pauseCubesButton = document.getElementById("pauseCubesButton");
  if (pauseCubesButton) {
    pauseCubesButton.addEventListener("click", () => {
      isCubeMovementPaused = !isCubeMovementPaused;
      pauseCubesButton.textContent = isCubeMovementPaused ? "Resume Cube Motion" : "Pause Cube Motion";
    });
  }
  
  const toggleMeshButton = document.getElementById("toggleMeshButton");
  if (toggleMeshButton) {
    toggleMeshButton.addEventListener("click", () => {
      const wireframeMesh = globeGroup.children.find(child => child.material && child.material.wireframe);
      if (wireframeMesh) {
        wireframeMesh.visible = !wireframeMesh.visible;
        toggleMeshButton.textContent = wireframeMesh.visible ? "Hide Globe Mesh" : "Show Globe Mesh";
      }
    });
  }
  
  const arcToggleBtn = document.getElementById("arcToggleBtn");
  if (arcToggleBtn) {
    arcToggleBtn.addEventListener("click", () => {
      let visible = false;
      arcPaths.forEach((p, i) => {
        if (i === 0) {
          visible = !p.visible;
        }
        p.visible = visible;
      });
    });
  }
  
  const toggleNodesButton = document.getElementById('toggleNodesButton');
  if (toggleNodesButton) {
    toggleNodesButton.addEventListener('click', () => {
      const neuralNodes = cubes.filter(cube => cube.userData.isSmallNode);
      const areVisible = neuralNodes.length > 0 && neuralNodes[0].visible;
      const newVisibility = !areVisible;
      
      neuralNodes.forEach(node => {
        node.visible = newVisibility;
      });
      
      if (neuralNetworkLines) {
        neuralNetworkLines.visible = newVisibility;
      }
      
      toggleNodesButton.textContent = newVisibility ? "Hide Neural Nodes" : "Show Neural Nodes";
    });
  }
  
  const scrollLockButton = document.getElementById('scrollLockBtn');
  if (scrollLockButton) {
    function setGlobeInteraction(isInteractive) {
      if (controls) {
        controls.enabled = isInteractive;
      }
      
      const scrollInstruction = document.getElementById('scrollLockInstruction');
      if (isInteractive) {
        scrollLockButton.textContent = 'Unlock Scroll';
        scrollLockButton.classList.remove('unlocked');
        if (scrollInstruction) scrollInstruction.textContent = 'Globe is active.';
      } else {
        scrollLockButton.textContent = 'Lock Globe';
        scrollLockButton.classList.add('unlocked');
        if (scrollInstruction) scrollInstruction.textContent = 'Page scroll is active.';
      }
    }
    
    scrollLockButton.addEventListener('click', () => {
      setGlobeInteraction(!controls.enabled);
    });
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Create globe and cubes
function createGlobeAndCubes() {
  createNeuralNetwork();
  
  for (let i = 0; i < count; i++) {
    const r = maxRadius * Math.random();
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    let cubeObject;
    
    if (i === 0) {
      cubeObject = createNeuralCube(europeContent, europeSubCubes, explodedPositions, '#003366');
      cubeObject.userData.neuralName = 'Europe';
      europeCube = cubeObject;
    } else if (i === 1) {
      cubeObject = createNeuralCube(newThailandContent, newThailandSubCubes, newThailandExplodedPositions, '#A52A2A');
      cubeObject.userData.neuralName = 'Thailand';
      newThailandCube = cubeObject;
    } else if (i === 2) {
      cubeObject = createNeuralCube(canadaContent, canadaSubCubes, canadaExplodedPositions, '#006400');
      cubeObject.userData.neuralName = 'Canada';
      canadaCube = cubeObject;
    } else if (i === 3) {
      cubeObject = createNeuralCube(ukContent, ukSubCubes, ukExplodedPositions, '#483D8B');
      cubeObject.userData.neuralName = 'UK';
      ukCube = cubeObject;
    } else if (i === 4) {
      cubeObject = createNeuralCube(usaContent, usaSubCubes, usaExplodedPositions, '#B22234');
      cubeObject.userData.neuralName = 'USA';
      usaCube = cubeObject;
    } else if (i === 5) {
      cubeObject = createNeuralCube(indiaContent, indiaSubCubes, indiaExplodedPositions, '#FF9933');
      cubeObject.userData.neuralName = 'India';
      indiaCube = cubeObject;
    } else if (i === 6) {
      cubeObject = createNeuralCube(singaporeContent, singaporeSubCubes, singaporeExplodedPositions, '#EE2536');
      cubeObject.userData.neuralName = 'Singapore';
      singaporeCube = cubeObject;
    } else if (i === 7) {
      cubeObject = createNeuralCube(malaysiaContent, malaysiaSubCubes, malaysiaExplodedPositions, '#FFD700');
      cubeObject.userData.neuralName = 'Malaysia';
      malaysiaCube = cubeObject;
    } else {
      cubeObject = new THREE.Group();
      const data = {
        domain: i % 12,
        engagement: Math.random(),
        age: Math.random(),
        risk: Math.random(),
        confidence: 0.7 + Math.random() * 0.3
      };
      dummyDataSet.push(data);
      
      const color = getColorByData(data);
      const subCubeMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 1.0
      });
      
      const microcube = new THREE.Mesh(
        new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize),
        subCubeMaterial
      );
      
      cubeObject.add(microcube);
      cubeObject.userData.isSmallNode = true;
    }
    
    cubeObject.position.set(x, y, z);
    neuronGroup.add(cubeObject);
    cubes.push(cubeObject);
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.002,
      (Math.random() - 0.5) * 0.002,
      (Math.random() - 0.5) * 0.002
    ));
    
    if (cubeObject.userData.neuralName) {
      neuralCubeMap[cubeObject.userData.neuralName] = cubeObject;
    }
  }
  
  // Create globe texture - BRIGHTENED
  new THREE.TextureLoader().load("https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg", (tex) => {
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({
        map: tex,
        transparent: true,
        opacity: 0.75,
        emissive: 0x112244,
        emissiveIntensity: 0.2
      })
    );
    globeGroup.add(globe);
  });
  
  // Create wireframe
  let wireframeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS + 0.05, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    })
  );
  globeGroup.add(wireframeMesh);
  
  // FIXED: Create country blocks with your EXACT original coordinates
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    countryConfigs.forEach(config => {
      const size = 0.03;
      const blockGeometry = new THREE.BoxGeometry(size, size, size);
      const blockMaterial = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.95
      });
      
      const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
      blockMesh.userData.countryName = config.name;
      
      const position = latLonToVector3(config.lat, config.lon, 1.1);
      blockMesh.position.copy(position);
      blockMesh.lookAt(0, 0, 0);
      
      globeGroup.add(blockMesh);
      countryBlocks[config.name] = blockMesh;
      
      const lG = new THREE.TextGeometry(config.name, {
        font: font,
        size: 0.018,
        height: 0.0001,
        curveSegments: 8
      });
      lG.center();
      
      const lM = new THREE.MeshBasicMaterial({
        color: 0xffffff
      });
      const lMesh = new THREE.Mesh(lG, lM);
      
      countryLabels.push({
        label: lMesh,
        block: blockMesh,
        offset: 0.06
      });
      
      globeGroup.add(lMesh);
    });
    
    drawAllConnections();
    highlightCountriesByProgram("UG");
  });
  
  // Initialize carousel immediately with default data
  setTimeout(() => {
    populateCarousel();
  }, 100);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const elapsedTime = clock.getElapsedTime();
  
  if (controls && controls.enabled) {
    controls.update();
  }
  
  TWEEN.update();
  
  arcPaths.forEach(path => {
    if (path.material.isShaderMaterial) {
      path.material.uniforms.time.value = elapsedTime;
    }
  });
  
  countryLabels.forEach(item => {
    const worldPosition = new THREE.Vector3();
    item.block.getWorldPosition(worldPosition);
    const offsetDirection = worldPosition.clone().normalize();
    const labelPosition = worldPosition.clone().add(offsetDirection.multiplyScalar(item.offset));
    item.label.position.copy(labelPosition);
    item.label.lookAt(camera.position);
  });
  
  const explosionStateMap = {
    'Europe': isEuropeCubeExploded,
    'Thailand': isNewThailandCubeExploded,
    'Canada': isCanadaCubeExploded,
    'UK': isUkCubeExploded,
    'USA': isUsaCubeExploded,
    'India': isIndiaCubeExploded,
    'Singapore': isSingaporeCubeExploded,
    'Malaysia': isMalaysiaCubeExploded
  };
  
  const boundaryRadius = 1.0;
  const buffer = 0.02;
  
  if (!isCubeMovementPaused) {
    cubes.forEach((cube, i) => {
      const isExploded = cube.userData.neuralName && explosionStateMap[cube.userData.neuralName];
      if (!isExploded) {
        cube.position.add(velocities[i]);
        if (cube.position.length() > boundaryRadius - buffer) {
          cube.position.normalize().multiplyScalar(boundaryRadius - buffer);
          velocities[i].reflect(cube.position.clone().normalize());
        }
      }
    });
    
    if (neuralNetworkLines) {
      const vertices = [];
      const maxDist = 0.6;
      const connectionsPerCube = 4;
      
      for (let i = 0; i < cubes.length; i++) {
        if (!cubes[i].visible || cubes[i].userData.neuralName) continue;
        
        let neighbors = [];
        for (let j = 0; j < cubes.length; j++) {
          if (i === j || !cubes[j].visible || cubes[j].userData.neuralName) continue;
          const dist = cubes[i].position.distanceTo(cubes[j].position);
          if (dist < maxDist) {
            neighbors.push({
              dist: dist,
              cube: cubes[j]
            });
          }
        }
        
        neighbors.sort((a, b) => a.dist - b.dist);
        const closest = neighbors.slice(0, connectionsPerCube);
        
        closest.forEach(n => {
          vertices.push(cubes[i].position.x, cubes[i].position.y, cubes[i].position.z);
          vertices.push(n.cube.position.x, n.cube.position.y, n.cube.position.z);
        });
      }
      
      if (neuralNetworkLines.visible) {
        neuralNetworkLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      }
    }
  }
  
  renderer.render(scene, camera);
}

// Country highlighting function for carousel
function highlightCountriesByProgram(programType) {
  console.log('Highlighting countries for program:', programType);
  
  const matchingCountries = getMatchingCountries(programType);
  
  // Reset all country blocks first
  Object.keys(countryBlocks).forEach(countryName => {
    const countryBlock = countryBlocks[countryName];
    if (countryBlock && countryBlock.material) {
      countryBlock.material.emissiveIntensity = 0.6; // Normal
    }
  });
  
  // Highlight matching countries
  matchingCountries.forEach(countryName => {
    const countryBlock = countryBlocks[countryName];
    if (countryBlock && countryBlock.material) {
      countryBlock.material.emissiveIntensity = 1.5; // Bright highlight
      
      // Pulse effect
      if (typeof TWEEN !== 'undefined') {
        new TWEEN.Tween(countryBlock.material)
          .to({ emissiveIntensity: 2.0 }, 300)
          .yoyo(true)
          .repeat(2)
          .start();
      }
    }
  });
  
  console.log(`✨ Highlighted ${matchingCountries.length} countries:`, matchingCountries);
}

// **OPTIONAL: ADD KEYBOARD CONTROLS FOR BETTER USER EXPERIENCE**
document.addEventListener('keydown', (event) => {
  if (!controls) return;
  
  switch(event.code) {
    case 'ArrowUp':
    case 'KeyW':
      event.preventDefault();
      moveGlobeUp();
      break;
    case 'ArrowDown':  
    case 'KeyS':
      event.preventDefault();
      moveGlobeDown();
      break;
    case 'ArrowLeft':
    case 'KeyA':
      event.preventDefault();
      moveGlobeLeft();
      break;
    case 'ArrowRight':
    case 'KeyD':
      event.preventDefault();
      moveGlobeRight();
      break;
    case 'Equal':
    case 'NumpadAdd':
      event.preventDefault();
      zoomGlobeIn();
      break;
    case 'Minus':
    case 'NumpadSubtract':
      event.preventDefault();
      zoomGlobeOut();
      break;
    case 'Space':
      event.preventDefault();
      toggleGlobeRotation();
      break;
  }
});

// Initialize application - ALWAYS show globe
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Loading Interactive Globe Widget...');
  
  // ALWAYS initialize and show the globe
  initializeThreeJS();
  setupEventListeners();
  createGlobeAndCubes();
  animate();
  
  // Wire up carousel scroll buttons
  const leftBtn = document.getElementById('carouselScrollLeft');
  const rightBtn = document.getElementById('carouselScrollRight');
  if (leftBtn) leftBtn.onclick = () => scrollCarousel(-1);
  if (rightBtn) rightBtn.onclick = () => scrollCarousel(1);
  
  // Try to fetch data in background (doesn't block globe)
  await fetchDataFromBackend();
  
  // Add subtle hint for users
  setTimeout(() => {
    console.log('🌍 Globe loaded! Click carousel cards to filter programs globally. Click countries and cubes to explore. Login required for detailed university information.');
  }, 2000);
});

// Login simulation function for testing
function simulateLogin() {
  localStorage.setItem('userToken', 'authenticated-user-token');
  alert('Logged in! You can now access detailed university information and application links.');
  location.reload();
}

// Logout function  
function logout() {
  localStorage.setItem('userToken', 'guest-viewer');
  alert('Logged out. Globe exploration continues, but detailed features require login.');
  location.reload();
}

