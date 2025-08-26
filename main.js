// =============
// ==  PART 1: SETUP, AUTH, AND DATA
// =============

// === Authentication & Redirection (No-Op for Standalone) ===
function redirectToWix() { /* no-op on external globe */ }
async function requireLoginAndGo() { return; }
async function isLoggedIn() { return false; }
async function updateAuthStatus() { /* no-op */ }
async function handleCallback() { /* no-op */ }
async function logout() { window.top.location.href = 'https://www.globaleducarealliance.com/home'; }

// === Dashboard / Upload actions ===
async function openStudentDashboard() { await requireLoginAndGo(); }
async function uploadDocument() { await requireLoginAndGo(); }

// === AUTH-DEPENDENT ACTIVATION ===
function activateAllCubes() {
  console.log('🎮 Activating all university cubes for authenticated member');
  Object.values(countryBlocks).forEach(group => {
    group.userData.isClickable = true;
    group.material.opacity = 1.0;
    group.material.emissiveIntensity = 1.2;
  });
  [europeSubCubes, newThailandSubCubes, canadaSubCubes, ukSubCubes, usaSubCubes, indiaSubCubes, singaporeSubCubes, malaysiaSubCubes].forEach(subCubeArray => {
      subCubeArray.forEach(subCube => {
        if (subCube && subCube.userData) {
          subCube.userData.isClickable = true;
          subCube.material.opacity = 1.0;
          subCube.material.emissiveIntensity = 0.8;
        }
      });
  });
  showNotification('Success! You now have access to all university programs.');
}

// === SAFE FETCH WRAPPER ===
async function safeFetch(url, options = {}) {
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status}: ${response.statusText} for ${url}`);
      return null;
    }
    const data = await response.json();
    console.log(`✅ Success fetching: ${url}`);
    return data;
  } catch (error) {
    console.error(`❌ Network Error fetching ${url}:`, error);
    return null;
  }
}

// === AUTH STATUS LOGIC ===
let authStatus = { isAuthenticated: false, user: null };
async function fetchAuthStatus() {
  try {
    console.log('🔍 Fetching auth status...');
    const res = await fetch('/api/auth/status', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      console.error(`❌ Auth status fetch failed: ${res.status} ${res.statusText}`);
      authStatus = { isAuthenticated: false, user: null };
      return;
    }
    const data = await res.json();
    authStatus = { isAuthenticated: !!data.isAuthenticated, user: data.user || null };
    console.log('✅ Auth status updated:', authStatus);
  } catch (e) {
    console.error('❌ Auth status fetch error:', e);
    authStatus = { isAuthenticated: false, user: null };
  }
}

function startAuthStatusPolling() {
  setInterval(async () => {
    const oldStatus = authStatus.isAuthenticated;
    await fetchAuthStatus();
    if (!oldStatus && authStatus.isAuthenticated) {
      console.log('🎉 User authentication detected - activating cubes!');
      activateAllCubes();
    }
    if (oldStatus && !authStatus.isAuthenticated) {
      console.log('👋 User logged out');
      showNotification('Logged out successfully', false);
    }
  }, 3000);
}

// === INFO PANEL SYSTEM ===
async function showInfoPanel(data) {
  const universityName = data.university;
  if (!universityName || universityName === 'Unassigned') {
    console.log('❌ Clicked on an unassigned cube.');
    return;
  }
  const uniData = allUniversityContent.filter(item => item && item.university === universityName);
  if (uniData.length === 0) {
    console.log(`❌ No content found for ${universityName}`);
    const linkToOpen = data.programLink || data.applyLink;
    if (linkToOpen && linkToOpen !== '#') window.open(linkToOpen, '_blank');
    return;
  }
  const mainProgram = uniData[0];
  document.getElementById('infoPanelMainCard').innerHTML = `
    <div class="main-card-details">
      <img src="${mainProgram.logo}" alt="${mainProgram.university} Logo">
      <h3>${mainProgram.university}</h3>
    </div>
    <div class="main-card-actions">
      ${mainProgram.erasmusLink && mainProgram.erasmusLink !== '#' ? `<button class="partner-cta erasmus" onclick="window.open('${mainProgram.erasmusLink}', '_blank')">Erasmus Info</button>` : ''}
    </div>
  `;
  const subcardsContainer = document.getElementById('infoPanelSubcards');
  subcardsContainer.innerHTML = '';
  uniData.forEach(item => {
    const infoEnabled = item.programLink && item.programLink !== '#';
    const applyEnabled = item.applyLink && item.applyLink !== '#';
    const subcardHTML = `
      <div class="subcard">
        <div class="subcard-info">
          <h4>${item.programName.replace(/\\n/g, ' ')}</h4>
        </div>
        <div class="subcard-buttons">
          <button class="partner-cta info" ${infoEnabled ? '' : `disabled title="No info link available"`} 
                  onclick="if(${infoEnabled}) window.open('${item.programLink}', '_blank')">
            University Info
          </button>
          <button class="partner-cta apply" ${applyEnabled ? '' : `disabled title="No apply link available"`} 
                  onclick="if(${applyEnabled}) window.open('${item.applyLink}', '_blank')">
            Apply Now
          </button>
        </div>
      </div>
    `;
    subcardsContainer.insertAdjacentHTML('beforeend', subcardHTML);
  });
  document.getElementById('infoPanelOverlay').style.display = 'flex';
  console.log(`✅ Info panel displayed for ${universityName}`);
}

function hideInfoPanel() {
  document.getElementById('infoPanelOverlay').style.display = 'none';
}

function addInfoPanelStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #infoPanelOverlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center; }
    .info-panel { background: white; padding: 20px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto; }
    .partner-cta { padding: 8px 16px; margin: 5px; border: none; border-radius: 5px; background: #007bff; color: white; cursor: pointer; }
    .partner-cta.disabled { background: #ccc; cursor: not-allowed; }
    .partner-cta:hover:not(.disabled) { background: #0056b3; }
    .subcard { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
    .subcard-info h4 { margin: 0; }
    .main-card-details { display: flex; align-items: center; margin-bottom: 15px; }
    .main-card-details img { width: 60px; height: 60px; margin-right: 15px; border-radius: 5px; }
    .main-card-details h3 { margin: 0; font-size: 24px; }
  `;
  document.head.appendChild(style);
  const overlay = document.createElement('div');
  overlay.id = 'infoPanelOverlay';
  overlay.onclick = hideInfoPanel;
  overlay.innerHTML = `
    <div class="info-panel" onclick="event.stopPropagation()">
      <div id="infoPanelMainCard"></div>
      <div id="infoPanelSubcards"></div>
      <button onclick="hideInfoPanel()" style="margin-top: 20px; padding: 10px 20px;">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// === GLOBE WIDGET LOGIC (Global Variables & Definitions) ===
let scene, camera, renderer, controls, globeGroup, transformControls;
let GLOBE_RADIUS = 1.0;
let isPanMode = false, isRotationPaused = false, isCubeMovementPaused = false, isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let europeCube, newThailandCube, canadaCube, ukCube, usaCube, indiaCube, singaporeCube, malaysiaCube;
const europeSubCubes = [], newThailandSubCubes = [], canadaSubCubes = [], ukSubCubes = [], usaSubCubes = [], indiaSubCubes = [], singaporeSubCubes = [], malaysiaSubCubes = [];
const explodedPositions = [], newThailandExplodedPositions = [], canadaExplodedPositions = [], ukExplodedPositions = [], usaExplodedPositions = [], indiaExplodedPositions = [], singaporeExplodedPositions = [], malaysiaExplodedPositions = [];
const explodedSpacing = 0.1;
let isEuropeCubeExploded = false, isNewThailandCubeExploded = false, isCanadaCubeExploded = false, isUkCubeExploded = false, isUsaCubeExploded = false, isIndiaCubeExploded = false, isSingaporeCubeExploded = false, isMalaysiaCubeExploded = false;
const neuronGroup = new THREE.Group();
const count = 150, maxRadius = 1.5, vortexCubeSize = 0.01, microGap = 0.002;
const velocities = [], cubes = [], dummyDataSet = [];
const neuralCubeMap = {}, countryBlocks = {}, countryPrograms = {}, globalContentMap = {};
let arcPaths = [], arcParticles = [], countryLabels = [];
let fontLoader, raycaster, mouse, clock;
let countryConfigs = [], allUniversityContent = [], carouselData = [];
let isInteracting = false;
let clickedSubCube = null;

// --- Hover Card Variables ---
let currentlyHovered = null;
let hoverCard; 
let hoverTimeout; 

// === PUBLIC DATA FETCH ===
async function fetchCarouselData() {
    try {
        const response = await safeFetch('/api/carousel/data');
        if (response) {
            carouselData = response;
            console.log('📊 Carousel data loaded:', carouselData);
        } else {
            throw new Error("Fallback triggered");
        }
    } catch (error) {
        console.log('Using fallback carousel data');
        carouselData = [
          { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
          { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced." },
          { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
          { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
          { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
          { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
        ];
    }
}
async function fetchDataFromBackend() {
  try {
    console.log('🔄 Fetching data from server...');
    const data = await safeFetch('/api/globe-data');
    if (data) {
      console.log('✅ Server data received:', data);
      europeContent = data.europeContent || [];
      newThailandContent = data.newThailandContent || [];
      canadaContent = data.canadaContent || [];
      ukContent = data.ukContent || [];
      usaContent = data.usaContent || [];
      indiaContent = data.indiaContent || [];
      singaporeContent = data.singaporeContent || [];
      malaysiaContent = data.malaysiaContent || [];
      countryPrograms = data.countryPrograms || {};
      countryConfigs = data.countryConfigs || [];
      globalContentMap = {
        'Europe': europeContent, 'Thailand': newThailandContent, 'Canada': canadaContent, 'UK': ukContent,
        'USA': usaContent, 'India': indiaContent, 'Singapore': singaporeContent, 'Malaysia': malaysiaContent
      };
      allUniversityContent = Object.values(globalContentMap).flat();
      console.log('✅ Data loaded successfully!');
    } else {
        throw new Error("Fallback triggered");
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    countryConfigs = [
      {"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933}, {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF},
      {"name": "UK", "lat": 53, "lon": -0.1276, "color": 0x191970}, {"name": "Singapore", "lat": 1.35, "lon": 103.8, "color": 0xff0000},
      {"name": "Malaysia", "lat": 4, "lon": 102, "color": 0x0000ff}, {"name": "Thailand", "lat": 13.7563, "lon": 100.5018, "color": 0xffcc00},
      {"name": "Canada", "lat": 56.1304, "lon": -106.3468, "color": 0xff0000}, {"name": "USA", "lat": 39.8283, "lon": -98.5795, "color": 0x003366}
    ];
  }
}

// === PROGRAM FILTERING / HIGHLIGHTING ===
function getMatchingCountries(category) {
  if (!globalContentMap || Object.keys(globalContentMap).length === 0) { return []; }
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
function highlightCountriesByProgram(level) {
  console.log('🌍 Highlighting countries for program:', level);
  const matchingCountries = getMatchingCountries(level);
  Object.entries(countryBlocks).forEach(([country, group]) => {
    const isActive = matchingCountries.includes(country);
    group.material.emissiveIntensity = isActive ? 1.8 : 0.4;
    group.material.opacity = isActive ? 1.0 : 0.7;
    group.scale.setScalar(isActive ? 1.2 : 1.0);
    const labelItem = countryLabels.find(item => item.block === group);
    if (labelItem) { labelItem.label.material.color.set(isActive ? 0xffff00 : 0xffffff); }
    if (typeof TWEEN !== 'undefined' && isActive) {
      new TWEEN.Tween(group.material).to({ emissiveIntensity: 2.0 }, 300).yoyo(true).repeat(2).start();
    }
  });
  console.log(`✨ Highlighted ${matchingCountries.length} countries:`, matchingCountries);
}
function highlightNeuralCubesByProgram(selectedCategory) {
  console.log(`🌍 Global neural cube filtering for: ${selectedCategory}`);
  const category = selectedCategory.toLowerCase();
  const matchingCountries = getMatchingCountries(category);
  Object.keys(neuralCubeMap).forEach(countryName => {
    const cube = neuralCubeMap[countryName];
    if (cube && typeof TWEEN !== 'undefined') { new TWEEN.Tween(cube.scale).to({ x: 1.0, y: 1.0, z: 1.0 }, 300).start(); }
  });
  matchingCountries.forEach(countryName => {
    const cube = neuralCubeMap[countryName];
    if (cube && typeof TWEEN !== 'undefined') { new TWEEN.Tween(cube.scale).to({ x: 1.3, y: 1.3, z: 1.3 }, 500).start(); }
  });
  cubes.forEach(cube => {
    if (cube.children && cube.children.length > 10) {
      cube.children.forEach(subCube => {
        if (!subCube.userData || !subCube.userData.programName) return;
        const prog = subCube.userData.programName.toLowerCase();
        let shouldHighlight = false;
        if (category === "ug") { shouldHighlight = /ug|undergraduate|degree|bachelor|bsn|bba|business school|academic/i.test(prog); }
        else if (category === "pg") { shouldHighlight = /pg|postgraduate|master|msc|ma|msn|mba|phd|public policy|journalism|prospectus/i.test(prog); }
        else if (category === "diploma") { shouldHighlight = /diploma/i.test(prog); }
        else if (category === "mobility") { shouldHighlight = /exchange|mobility|semester|abroad|short|global/i.test(prog); }
        else if (category === "upskilling") { shouldHighlight = /upskill|certificat|short|cyber|data|stack|design/i.test(prog); }
        else if (category === "research") { shouldHighlight = !!subCube.userData.researchLink; }
        else if (category === "language") { shouldHighlight = /lang/i.test(prog); }
        if (shouldHighlight) { subCube.material.emissiveIntensity = 1.5; subCube.material.opacity = 1.0; subCube.scale.setScalar(1.3); }
        else { subCube.material.emissiveIntensity = 0.2; subCube.material.opacity = 0.25; subCube.scale.setScalar(1.0); }
      });
    }
  });
  console.log(`✨ Scaled ${matchingCountries.length} neural cubes for ${selectedCategory}`);
}

// === CAROUSEL ===
async function populateCarousel() {
  await fetchCarouselData();
  const container = document.getElementById('carouselContainer');
  if (!container) { console.log('❌ Carousel container not found'); return; }
  container.innerHTML = '';
  carouselData.forEach(item => {
    container.insertAdjacentHTML(
      'beforeend',
      `<a href="#" class="carousel-card" data-category="${item.category}">
         <img src="${item.img}" alt="${item.title}"/>
         <div class="carousel-card-content">
           <div class="carousel-card-title">${item.title}</div>
           <div class="carousel-card-text">${item.text}</div>
         </div>
       </a>`
    );
  });
  document.querySelectorAll('.carousel-card').forEach(card => {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      const category = this.dataset.category;
      console.log(`🌍 Global filtering activated for: ${category}`);
      highlightCountriesByProgram(category);
      highlightNeuralCubesByProgram(category);
    });
  });
  const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
  if (defaultCard) {
    defaultCard.classList.add('selected');
    setTimeout(() => { highlightCountriesByProgram('UG'); highlightNeuralCubesByProgram('UG'); }, 1000);
  }
  console.log('✅ Carousel populated successfully');
}

function scrollCarousel(direction) {
  const container = document.getElementById('carouselContainer');
  const card = container ? container.querySelector('.carousel-card') : null;
  if (!card) return;
  const cardWidth = card.offsetWidth + 16; // card width + gap
  container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
}

// === CONTROL TOGGLES ===
function setInteractionMode(mode) {
  if (!controls) return;
  const rotateBtn = document.getElementById('btn-rotate');
  const panBtn = document.getElementById('btn-pan');
  const canvas = renderer.domElement;
  if (mode === 'ROTATE') {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    if (rotateBtn) rotateBtn.style.background = '#a46bfd';
    if (panBtn) panBtn.style.background = 'rgba(0,0,0,0.8)';
    canvas.style.cursor = 'default';
  } else if (mode === 'PAN') {
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;
    if (rotateBtn) rotateBtn.style.background = 'rgba(0,0,0,0.8)';
    if (panBtn) panBtn.style.background = '#ffa500';
    canvas.style.cursor = 'grab';
  }
}

// === Three.js Initialization ===
function initializeThreeJS() {
  console.log('🔄 Initializing Three.js...');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 1000);
  camera.position.z = 3.5;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.domElement.id = 'threejs-canvas';
  globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeGroup.add(neuronGroup);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.minDistance = 0.01;
  controls.maxDistance = 15.0;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.setMode('translate');
  transformControls.addEventListener('dragging-changed', event => { if (controls) controls.enabled = !event.value; });
  transformControls.visible = false;
  scene.add(transformControls);
  scene.add(new THREE.AmbientLight(0x88ccff, 1.5));
  const pointLight = new THREE.PointLight(0xffffff, 1.5);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);
  
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  clock = new THREE.Clock();
  fontLoader = new THREE.FontLoader();

  renderer.domElement.addEventListener('mousedown', () => { isInteracting = true; clearTimeout(hoverTimeout); if (isPanMode) renderer.domElement.style.cursor = 'grabbing'; });
  renderer.domElement.addEventListener('mouseup', () => { hoverTimeout = setTimeout(() => { isInteracting = false; }, 200); if (isPanMode) renderer.domElement.style.cursor = 'grab'; });
  
  addInfoPanelStyles();
  
  console.log('✅ Three.js initialized successfully');
}

function updateCanvasSize() {
  const headerHeight = document.querySelector('.header-ui-bar')?.offsetHeight || 0;
  const footerHeight = document.querySelector('.footer-ui-bar')?.offsetHeight || 0;
  const canvas = renderer.domElement;
  const newHeight = window.innerHeight - headerHeight - footerHeight;
  canvas.style.top = `${headerHeight}px`;
  canvas.style.height = `${newHeight}px`;
  renderer.setSize(window.innerWidth, newHeight);
  camera.aspect = window.innerWidth / newHeight;
  camera.updateProjectionMatrix();
}

// === UTILITIES ===
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
    const lines = text.split('\\n');
    const fontSize = lines.length > 1 ? 28 : 32;
    ctx.font = `bold ${fontSize}px Arial`;
    let y = 128 + (lines.length > 1 ? 0 : 10);
    lines.forEach(line => { ctx.fillText(line, 128, y); y += (fontSize + 6); });
    texture.needsUpdate = true;
  }
  if (logoUrl) {
    const logoImg = new Image();
    logoImg.crossOrigin = "Anonymous";
    logoImg.src = logoUrl;
    logoImg.onload = () => { ctx.drawImage(logoImg, 16, 16, 64, 64); drawText(); };
    logoImg.onerror = () => { drawText(); }
  } else { drawText(); }
  return new THREE.MeshStandardMaterial({ map: texture, emissive: new THREE.Color(bgColor), emissiveIntensity: 0.6 });
}

// === TOGGLE FUNCTION CREATION ===
function createToggleFunction(cubeName) {
  return function() {
    const explosionStateMap = {
      'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,
      'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,
      'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded
    };
    const setExplosionStateMap = {
      'Europe': (v) => isEuropeCubeExploded = v, 'Thailand': (v) => isNewThailandCubeExploded = v,
      'Canada': (v) => isCanadaCubeExploded = v, 'UK': (v) => isUkCubeExploded = v,
      'USA': (v) => isUsaCubeExploded = v, 'India': (v) => isIndiaCubeExploded = v,
      'Singapore': (v) => isSingaporeCubeExploded = v, 'Malaysia': (v) => isMalaysiaCubeExploded = v
    };
    const cubeMap = {
      'Europe': europeCube, 'Thailand': newThailandCube, 'Canada': canadaCube,
      'UK': ukCube, 'USA': usaCube, 'India': indiaCube, 'Singapore': singaporeCube, 'Malaysia': malaysiaCube
    };
    const subCubeMap = {
      'Europe': europeSubCubes, 'Thailand': newThailandSubCubes, 'Canada': canadaSubCubes,
      'UK': ukSubCubes, 'USA': usaSubCubes, 'India': indiaSubCubes, 'Singapore': singaporeSubCubes, 'Malaysia': malaysiaSubCubes
    };
    const explodedPosMap = {
      'Europe': explodedPositions, 'Thailand': newThailandExplodedPositions, 'Canada': canadaExplodedPositions,
      'UK': ukExplodedPositions, 'USA': usaExplodedPositions, 'India': indiaExplodedPositions,
      'Singapore': singaporeExplodedPositions, 'Malaysia': malaysiaExplodedPositions
    };
    const isExploded = explosionStateMap[cubeName];
    const setExploded = setExplosionStateMap[cubeName];
    const cube = cubeMap[cubeName];
    const subCubes = subCubeMap[cubeName];
    const explodedPos = explodedPosMap[cubeName];
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
const toggleFunctionMap = {
  'Europe': createToggleFunction('Europe'), 'Thailand': createToggleFunction('Thailand'),
  'Canada': createToggleFunction('Canada'), 'UK': createToggleFunction('UK'),
  'USA': createToggleFunction('USA'), 'India': createToggleFunction('India'),
  'Singapore': createToggleFunction('Singapore'), 'Malaysia': createToggleFunction('Malaysia')
};
// =============
// == PART 2: 3D OBJECTS & ANIMATION LOOP
// =============

// === CUBE AND SCENE OBJECT CREATION ===
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  let contentIdx = 0;
  const cubeObject = new THREE.Group();
  for (let xi = -1; xi <= 1; xi++)
    for (let yi = -1; yi <= 1; yi++)
      for (let zi = -1; zi <= 1; zi++) {
        const item = content[contentIdx];
        let material, userData;
        if (item) {
          material = createTexture(item.programName, item.logo, color);
          userData = item;
        } else {
          material = createTexture('Unassigned', null, '#333333');
          userData = { university: "Unassigned" };
        }
        const microcube = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), material);
        const pos = new THREE.Vector3(xi * (vortexCubeSize + microGap), yi * (vortexCubeSize + microGap), zi * (vortexCubeSize + microGap));
        microcube.position.copy(pos);
        microcube.userData = { ...userData, isSubCube: true, initialPosition: pos.clone() };
        subCubeArray.push(microcube);
        explodedPositionArray.push(new THREE.Vector3(xi * explodedSpacing, yi * explodedSpacing, zi * explodedSpacing));
        cubeObject.add(microcube);
        contentIdx++;
      }
  return cubeObject;
}

function createNeuralNetwork() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  const material = new THREE.MeshBasicMaterial({ color: 0x00BFFF, side: THREE.DoubleSide, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false });
  neuralNetworkLines = new THREE.Mesh(geometry, material);
  globeGroup.add(neuralNetworkLines);
}

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
}

function createConnectionPath(fromGroup, toGroup, arcIndex = 0) {
  const rainbowExtendedColors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x8a2be2, 0x9400d3, 0x7f00ff];
  const color = rainbowExtendedColors[arcIndex % rainbowExtendedColors.length];
  const start = new THREE.Vector3(); fromGroup.getWorldPosition(start);
  const end = new THREE.Vector3(); toGroup.getWorldPosition(end);
  const globeRadius = 1.0, arcOffset = 0.05;
  const distance = start.distanceTo(end);
  const arcElevation = distance * 0.4;
  const offsetStart = start.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const offsetEnd = end.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const mid = offsetStart.clone().add(offsetEnd).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + arcOffset + arcElevation);
  const curve = new THREE.QuadraticBezierCurve3(offsetStart, mid, offsetEnd);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.008, 24, false);
  const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const fragmentShader = `varying vec2 vUv; uniform float time; uniform vec3 color; void main() { float glow = sin(time * 2.0 + vUv.x * 10.0) * 0.5 + 0.5; float intensity = (1.0 - abs(vUv.y - 0.5) * 2.0) * glow; gl_FragColor = vec4(color, intensity * 0.8); }`;
  const material = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } }, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const path = new THREE.Mesh(geometry, material);
  path.renderOrder = 1;
  path.userData.curve = curve;
  globeGroup.add(path);
  return path;
}

function animateArcParticles(arc) {
  const curve = arc.userData.curve;
  if (!curve) return;
  for (let i = 0; i < 5; i++) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    particle.userData = { t: Math.random(), speed: 0.5 * (0.8 + Math.random() * 0.4), curve };
    scene.add(particle);
    arcParticles.push(particle);
  }
}

function drawAllConnections() {
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  const originalPairs = countryNames.map(country => ["Thailand", country]);
  const additionalPairs = [["India", "Canada"], ["India", "Europe"], ["Canada", "USA"]];
  arcPaths = [...originalPairs, ...additionalPairs].map(([from, to], index) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    return fromBlock && toBlock ? createConnectionPath(fromBlock, toBlock, index) : null;
  }).filter(Boolean);
  arcPaths.forEach(animateArcParticles);
}

// === MOUSE EVENT HANDLERS ===
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

function onCanvasMouseUp(event) {
  if (transformControls.dragging) return;
  if (Math.abs(event.clientX - mouseDownPos.x) > 5 || Math.abs(event.clientY - mouseDownPos.y) > 5) return;
  if (event.target.closest('.info-panel') || event.target.closest('#hover-card')) return;

  const canvasRect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const allClickableObjects = [...Object.values(countryBlocks), ...neuronGroup.children];
  const intersects = raycaster.intersectObjects(allClickableObjects, true);

  if (intersects.length === 0) { closeAllExploded(); return; }

  const clickedObject = intersects[0].object;
  if (clickedObject.userData.countryName) {
    const countryName = clickedObject.userData.countryName;
    const correspondingNeuralCube = neuralCubeMap[countryName];
    const toggleFunc = toggleFunctionMap[countryName];
    if (correspondingNeuralCube && toggleFunc) {
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      if (typeof TWEEN !== 'undefined') { new TWEEN.Tween(correspondingNeuralCube.scale).to({ x: 1.5, y: 1.5, z: 1.5 }, 200).yoyo(true).repeat(1).start(); }
      setTimeout(() => toggleFunc(), anyExploded ? 810 : 400);
    }
    return;
  }

  let parent = clickedObject, neuralName = null, clickedSubCubeLocal = clickedObject.userData.isSubCube ? clickedObject : null;
  while (parent) {
    if (parent.userData.neuralName) { neuralName = parent.userData.neuralName; break; }
    parent = parent.parent;
  }

  if (neuralName) {
    const isExploded = explosionStateMap[neuralName];
    const toggleFunc = toggleFunctionMap[neuralName];
    if (isExploded && clickedSubCubeLocal && clickedSubCubeLocal.userData.university !== "Unassigned") {
      if (authStatus.isAuthenticated) {
        showInfoPanel(clickedSubCubeLocal.userData);
      } else {
        window.open('https://www.globaleducarealliance.com/home?promptLogin=1', '_blank');
      }
    } else {
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      setTimeout(() => toggleFunc(), anyExploded ? 810 : 0);
    }
  } else {
    closeAllExploded();
  }
}

// === EVENT LISTENERS SETUP ===
function setupEventListeners() {
    renderer.domElement.addEventListener('mousedown', onCanvasMouseDown);
    
    // Mouse move listener for raycaster
    window.addEventListener('mousemove', (event) => {
        const canvasRect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    }, false);

    // Other listeners
    const panSpeed = 0.1;
    document.getElementById('btn-up')?.addEventListener('click', () => { controls.target.y += panSpeed; controls.update(); });
    document.getElementById('btn-down')?.addEventListener('click', () => { controls.target.y -= panSpeed; controls.update(); });
    document.getElementById('btn-left')?.addEventListener('click', () => { controls.target.x -= panSpeed; controls.update(); });
    document.getElementById('btn-right')?.addEventListener('click', () => { controls.target.x += panSpeed; controls.update(); });
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => { camera.position.multiplyScalar(0.9); controls.update(); });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => { camera.position.multiplyScalar(1.1); controls.update(); });
    document.getElementById('btn-rotate')?.addEventListener('click', () => setInteractionMode('ROTATE'));
    document.getElementById('btn-pan')?.addEventListener('click', () => setInteractionMode('PAN'));
    setInteractionMode('ROTATE');
    
    // DOMContentLoaded at the end to initialize everything
    document.addEventListener('DOMContentLoaded', async () => {
        hoverCard = document.getElementById('hover-card');
        console.log('🚀 Loading Interactive Globe Widget...');
        try {
            await fetchAuthStatus();
            await fetchDataFromBackend();
            initializeThreeJS();
            setupEventListeners();
            await createGlobeAndCubes();
            if (authStatus.isAuthenticated) {
                setTimeout(() => activateAllCubes(), 500);
            }
            await populateCarousel();
            animate();
            startAuthStatusPolling();
            document.getElementById('carouselScrollLeft')?.addEventListener('click', () => scrollCarousel(-1));
            document.getElementById('carouselScrollRight')?.addEventListener('click', () => scrollCarousel(1));
            updateCanvasSize();
            console.log('✅ Globe Widget loaded successfully!');
        } catch (error) {
            console.error('❌ Error during initialization:', error);
        }
    });
    
    window.addEventListener('resize', updateCanvasSize);
}

// === ANIMATION LOOP ===
function animate() {
  requestAnimationFrame(animate);

  // --- START: IMPROVED HOVER LOGIC ---
  if (hoverCard) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(neuronGroup.children, true);

    let foundValidSubCube = false;
    if (intersects.length > 0) {
      const firstIntersect = intersects[0].object;

      if (firstIntersect.userData.isSubCube && firstIntersect.userData.university !== "Unassigned") {
        foundValidSubCube = true;
        clearTimeout(hoverTimeout);
        hoverCard.classList.remove('hover-card-hidden');

        if (currentlyHovered !== firstIntersect) {
          currentlyHovered = firstIntersect;
          const data = firstIntersect.userData;
          document.getElementById('hover-card-title').textContent = data.university;
          document.getElementById('hover-card-program').textContent = data.programName.replace(/\\n/g, ' ');
          const infoBtn = document.getElementById('hover-card-info-btn');
          const applyBtn = document.getElementById('hover-card-apply-btn');

          infoBtn.onclick = () => { if (!infoBtn.disabled) window.open(data.programLink, '_blank'); };
          applyBtn.onclick = () => { if (!applyBtn.disabled) window.open(data.applyLink, '_blank'); };
          
          infoBtn.disabled = !data.programLink || data.programLink === '#';
          applyBtn.disabled = !data.applyLink || data.applyLink === '#';
        }

        if (currentlyHovered) {
          const vector = new THREE.Vector3();
          currentlyHovered.getWorldPosition(vector);
          vector.project(camera);
          const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
          const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
          hoverCard.style.left = `${x + 15}px`;
          hoverCard.style.top = `${y}px`;
        }
      }
    }

    if (!foundValidSubCube && currentlyHovered) {
      hoverTimeout = setTimeout(() => {
        hoverCard.classList.add('hover-card-hidden');
        currentlyHovered = null;
      }, 3000); 
    }
  }
  // --- END: IMPROVED HOVER LOGIC ---

  const elapsedTime = clock.getElapsedTime();
  if (controls && controls.enabled) { controls.update(); }
  if (typeof TWEEN !== 'undefined') { TWEEN.update(); }

  arcPaths.forEach(path => { if (path.material.isShaderMaterial) { path.material.uniforms.time.value = elapsedTime; } });

  countryLabels.forEach(item => {
    const worldPosition = new THREE.Vector3();
    item.block.getWorldPosition(worldPosition);
    const offsetDirection = worldPosition.clone().normalize();
    const labelPosition = worldPosition.clone().add(offsetDirection.multiplyScalar(item.offset));
    item.label.position.copy(labelPosition);
    item.label.lookAt(camera.position);
  });

  const explosionStateMap = {
    'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,
    'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,
    'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded
  };

  if (!isCubeMovementPaused) {
    cubes.forEach((cube, i) => {
      const isExploded = cube.userData.neuralName && explosionStateMap[cube.userData.neuralName];
      if (!isExploded) {
        cube.position.add(velocities[i]);
        if (cube.position.length() > 1.0 - 0.02) {
          cube.position.normalize().multiplyScalar(1.0 - 0.02);
          velocities[i].reflect(cube.position.clone().normalize());
        }
      }
    });

    if (neuralNetworkLines && neuralNetworkLines.visible) {
        const vertices = [];
        const maxDist = 0.6;
        for (let i = 0; i < cubes.length; i++) {
            if (!cubes[i].visible || cubes[i].userData.neuralName) continue;
            let neighbors = [];
            for (let j = i + 1; j < cubes.length; j++) {
                if (!cubes[j].visible || cubes[j].userData.neuralName) continue;
                const dist = cubes[i].position.distanceTo(cubes[j].position);
                if (dist < maxDist) neighbors.push({ dist, cube: cubes[j] });
            }
            neighbors.sort((a, b) => a.dist - b.dist).slice(0, 3).forEach(n => {
                vertices.push(cubes[i].position.x, cubes[i].position.y, cubes[i].position.z);
                vertices.push(n.cube.position.x, n.cube.position.y, n.cube.position.z);
            });
        }
        neuralNetworkLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        neuralNetworkLines.geometry.attributes.position.needsUpdate = true;
    }
  }

  renderer.render(scene, camera);
}
