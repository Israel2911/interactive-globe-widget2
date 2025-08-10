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
const count = 80; // Reduced for better performance
const maxRadius = 1.5;
const vortexCubeSize = 0.02; // Slightly larger for visibility
const microGap = 0.003;
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

// University content arrays (keeping your original data)
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

// Other content arrays (keeping your original data)
const newThailandContent = [{university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Undergraduate Business (BBA)", programId: "assumption_bba"}, {university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Master of Business Administration (MBA)", programId: "assumption_mba"}, {university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Study Abroad / Exchange", programId: "assumption_exchange"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const canadaContent = [{university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "BSN", programId: "twu_bsn"}, {university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MSN", programId: "twu_msn"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const ukContent = [{university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Business & Management", programId: "cardiff_business"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const usaContent = [{university: "John Cabot University", logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png", programName: "Degree Programs", programId: "jcu_degree"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const indiaContent = [{university: "Asia College of Journalism", logo: "https://static.wixstatic.com/media/d77f36_2cd674a2255f4d3f83d8b00721d6f477~mv2.png", programName: "Journalism", programId: "acj_journalism"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const singaporeContent = [{university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Business School", programId: "nus_business"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

const malaysiaContent = [{university: "Limkokwing University", logo: "https://static.wixstatic.com/media/d77f36_38c855c3d47448009fc7123812183cc0~mv2.png", programName: "Creative Tech", programId: "limkokwing_creative"}, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

// Carousel data
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

// Initialize Three.js scene - CLEANED UP
function initializeThreeJS() {
  console.log('Initializing high-quality Three.js scene...');
  
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
  
  // CLEAN LIGHTING - no excessive effects
  const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);
  
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

// FIXED: Create proper earth texture
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Create proper earth colors - blues and greens
  ctx.fillStyle = '#1e3a5f'; // Ocean blue
  ctx.fillRect(0, 0, 512, 256);
  
  // Add continental landmasses in earth tones
  ctx.fillStyle = '#2d5a3d'; // Forest green
  ctx.fillRect(50, 80, 80, 40); // Europe
  ctx.fillRect(300, 90, 100, 50); // Asia
  ctx.fillRect(150, 120, 120, 60); // Africa
  ctx.fillRect(400, 60, 60, 30); // North America
  ctx.fillRect(380, 150, 40, 25); // South America
  
  // Add some texture variation
  ctx.fillStyle = '#4a7c4a';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const w = Math.random() * 20 + 5;
    const h = Math.random() * 15 + 5;
    ctx.fillRect(x, y, w, h);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

// Create texture with university logos
function createTexture(text, logoUrl, bgColor = '#003366') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 128, 128);
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 128, 128);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px Arial';
  
  const lines = text.split('\n');
  let startY = 64;
  if (lines.length > 1) startY = 50;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, 64, startY + (index * 15));
  });
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  if (logoUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 10, 10, 30, 30);
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

// FIXED: Create proper neural cube structure
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
          material = createTexture('Available', null, '#333333');
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

// CLEANED UP: Create globe and cubes - HIGH QUALITY
function createGlobeAndCubes() {
  console.log('Creating high-quality globe and cubes...');
  
  // Create globe with proper earth texture
  const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
  const earthTexture = createEarthTexture();
  const globeMaterial = new THREE.MeshPhongMaterial({ 
    map: earthTexture,
    transparent: false,
    shininess: 10
  });
  
  const globe = new THREE.Mesh(globeGeometry, globeMaterial);
  globeGroup.add(globe);
  console.log('🌍 High-quality earth globe created');
  
  // Create subtle wireframe
  const wireframeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.005, 24, 24);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  globeGroup.add(wireframe);
  console.log('🔷 Clean wireframe created');
  
  // Create neural cubes - PROPERLY POSITIONED
  const colors = ['#003366', '#8B0000', '#006400', '#4B0082', '#B22234', '#FF8C00', '#DC143C', '#FFD700'];
  const contents = [europeContent, newThailandContent, canadaContent, ukContent, usaContent, indiaContent, singaporeContent, malaysiaContent];
  const subCubeArrays = [europeSubCubes, newThailandSubCubes, canadaSubCubes, ukSubCubes, usaSubCubes, indiaSubCubes, singaporeSubCubes, malaysiaSubCubes];
  const explodedArrays = [explodedPositions, newThailandExplodedPositions, canadaExplodedPositions, ukExplodedPositions, usaExplodedPositions, indiaExplodedPositions, singaporeExplodedPositions, malaysiaExplodedPositions];
  const cubeNames = ['Europe', 'Thailand', 'Canada', 'UK', 'USA', 'India', 'Singapore', 'Malaysia'];
  
  for (let i = 0; i < 8; i++) {
    const cubeObject = createNeuralCube(contents[i], subCubeArrays[i], explodedArrays[i], colors[i]);
    cubeObject.userData.neuralName = cubeNames[i];
    
    // Position cubes in organized pattern around globe
    const angle = (i / 8) * Math.PI * 2;
    const radius = 1.8;
    const x = Math.cos(angle) * radius;
    const y = (i % 2 === 0 ? 0.3 : -0.3); // Alternating height
    const z = Math.sin(angle) * radius;
    
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
  console.log('🧊 Neural cubes created and properly positioned');
  
  // FIXED: Create proper country markers - NOT SPHERES, BUT CUBES
  countryConfigs.forEach(config => {
    const geometry = new THREE.BoxGeometry(0.03, 0.03, 0.03); // CUBES not spheres
    const material = new THREE.MeshBasicMaterial({ 
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.6
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.userData.countryName = config.name;
    
    const position = latLonToVector3(config.lat, config.lon, GLOBE_RADIUS + 0.02);
    marker.position.copy(position);
    
    globeGroup.add(marker);
    countryBlocks[config.name] = marker;
  });
  console.log('📍 Country cube markers created (not spheres)');
  
  console.log('✅ High-quality globe creation complete!');
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
    // Your existing highlight logic
}

function highlightNeuralCubesByProgram(category) {
    console.log('Highlighting neural cubes for category:', category);
    // Your existing highlight logic
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
      console.log('Clicked program:', clickedObject.userData);
    }
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

// CLEAN Animation loop - no excessive effects
function animate() {
  requestAnimationFrame(animate);
  
  if (controls && controls.update) {
    controls.update();
  }
  
  if (!controls && !isRotationPaused) {
    globeGroup.rotation.y += 0.003;
  }
  
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

function simulateLogin() {
  localStorage.setItem('userToken', 'authenticated-user-token');
  alert('Logged in! You can now access detailed university information.');
}

function logout() {
  localStorage.setItem('userToken', 'guest-viewer');
  alert('Logged out. Basic globe features remain available.');
}

// MAIN INITIALIZATION - CLEAN AND HIGH QUALITY
async function initializeApp() {
  console.log('🚀 Starting HIGH-QUALITY globe initialization...');
  
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
    
    console.log('🎉 HIGH-QUALITY GLOBE READY!');
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

console.log('🌍 High-quality globe script loaded');
