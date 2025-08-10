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

// Country configurations
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

// University data
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
}];

let newThailandContent = [{
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Undergraduate Business (BBA)"
}, {
    university: "Assumption University",
    logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png",
    programName: "Master of Business Administration (MBA)"
}, {
    university: "Bangkok University",
    logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg",
    programName: "Innovative Media Production"
}];

let canadaContent = [{
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "BSN"
}, {
    university: "Trinity Western University",
    logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png",
    programName: "MBA"
}];

let ukContent = [{
    university: "Cardiff University",
    logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif",
    programName: "Business & Management"
}];

let usaContent = [{
    university: "John Cabot University",
    logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png",
    programName: "Degree Programs"
}];

let indiaContent = [{
    university: "Asia College of Journalism",
    logo: "https://static.wixstatic.com/media/d77f36_2cd674a2255f4d3f83d8b00721d6f477~mv2.png",
    programName: "Journalism"
}];

let singaporeContent = [{
    university: "NUS",
    logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg",
    programName: "Business School"
}];

let malaysiaContent = [{
    university: "Limkokwing University",
    logo: "https://static.wixstatic.com/media/d77f36_38c855c3d47448009fc7123812183cc0~mv2.png",
    programName: "Creative Tech"
}];

// Combine all university content
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
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000011, 1.0);
  
  // Append to container
  const container = document.getElementById('globe-container');
  if (container) {
    container.appendChild(renderer.domElement);
    console.log('Renderer added to container');
  } else {
    document.body.appendChild(renderer.domElement);
    console.log('Renderer added to body');
  }
  
  // Create globe group
  globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeGroup.add(neuronGroup);
  
  // Setup controls - Wait for OrbitControls to be available
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    setupControls();
  } else {
    // Fallback - basic manual camera control
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
  
  // Setup lighting - BRIGHT lighting for visibility
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
  // Basic mouse controls without OrbitControls
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
  
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 256);
  
  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px Arial';
  
  const lines = text.split('\n');
  let startY = 128;
  if (lines.length > 1) startY = 100;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, 128, startY + (index * 30));
  });
  
  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Load logo if provided
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

// Create toggle function
function createToggleFunction(cubeName) {
  return function() {
    console.log('Toggling cube:', cubeName);
    // Toggle logic here
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
    
    // Position cube randomly in neural network
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
    
    // Store reference to main cubes
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
    
    carouselContainer.appendChild(programCard);
  });
  
  console.log('Carousel updated with', allUniversityContent.length, 'programs');
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
  // Control buttons
  const pauseButton = document.getElementById("pauseButton");
  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      isRotationPaused = !isRotationPaused;
      if (controls) controls.autoRotate = !isRotationPaused;
      pauseButton.textContent = isRotationPaused ? "Resume Rotation" : "Pause Rotation";
    });
  }
  
  // Window resize
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
  
  // Update controls
  if (controls && controls.update) {
    controls.update();
  }
  
  // Auto-rotate globe if no controls
  if (!controls && !isRotationPaused) {
    globeGroup.rotation.y += 0.005;
  }
  
  // Render scene
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

// Show info panel
function showInfoPanel(data) {
  console.log('Show info panel:', data);
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
    // Wait for Three.js to be available
    await waitForThree();
    console.log('Three.js loaded successfully');
    
    // Initialize Three.js
    initializeThreeJS();
    
    // Create globe and content
    createGlobeAndCubes();
    
    // Setup UI
    setupEventListeners();
    setupFilterButtons();
    setupCarouselNavigation();
    
    // Update carousel
    setTimeout(() => {
      updateCarousel();
      hideLoadingAnimation();
    }, 500);
    
    // Start animation
    animate();
    
    console.log('🌍 Globe initialization complete!');
    
  } catch (error) {
    console.error('Initialization error:', error);
    
    // Show error message
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
