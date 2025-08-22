function redirectToWix() { /* no-op on external globe */ }
async function requireLoginAndGo() { return; }
// No-op placeholders replacing custom SSO usage in front-end
async function isLoggedIn() { return false; }
async function updateAuthStatus() { /* no-op to keep UI simple */ }
async function handleCallback() { /* no-op */ }
async function logout() { window.top.location.href = 'https://www.globaleducarealliance.com/home'; }

// ===
// DASHBOARD / UPLOAD actions — always require login, then go Home
// ===
async function openStudentDashboard() { await requireLoginAndGo(); }
async function uploadDocument() { await requireLoginAndGo(); }

// ===
// AUTH-DEPENDENT ACTIVATION (UI visual only — still allowed for engagement)
// ===
function activateAllCubes() {
  console.log('🎮 Activating all university cubes for authenticated member');
  Object.entries(countryBlocks).forEach(([country, group]) => {
    group.userData.isClickable = true;
    group.material.opacity = 1.0;
    group.material.emissiveIntensity = 1.2;
  });
  [europeSubCubes, newThailandSubCubes, canadaSubCubes, ukSubCubes, 
   usaSubCubes, indiaSubCubes, singaporeSubCubes, malaysiaSubCubes].forEach(subCubeArray => {
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

// ===
// SAFE FETCH WRAPPER - NEW ADDITION
// ===
async function safeFetch(url, options = {}) {
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
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

// Info panel — fully gated behind server auth status
let authStatus = { isAuthenticated: false, user: null };

// ===
// IMPROVED FETCH AUTH STATUS WITH ERROR HANDLING
// ===
async function fetchAuthStatus() {
  try {
    console.log('🔍 Fetching auth status...');
    const res = await fetch('/api/auth/status', { 
      credentials: 'include', 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
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

// ===
// ===
// AUTH STATUS POLLING - IMPROVED WITH SAFER FETCH
// ===
function startAuthStatusPolling() {
  setInterval(async () => {
    const oldStatus = authStatus.isAuthenticated;
    await fetchAuthStatus();
    
    // Check if user just logged in
    if (!oldStatus && authStatus.isAuthenticated) {
      console.log('🎉 User authentication detected - activating cubes!');
      activateAllCubes(); // This already shows the notification
      // REMOVED: showNotification('Congratulations! All university programs are now available.', true);
    }
    
    // Optional: Check if user logged out
    if (oldStatus && !authStatus.isAuthenticated) {
      console.log('👋 User logged out');
      showNotification('Logged out successfully', false);
    }
  }, 3000); // Check every 3 seconds
}


// ===
// IMPROVED SHOW INFO PANEL WITH SAFER AUTHENTICATION CHECK
async function showInfoPanel(data) {
  console.log('🎯 showInfoPanel called with:', data);
  console.log('🔗 University:', data?.university);
  console.log('🔗 Program Link:', data?.programLink);
  console.log('🔗 Apply Link:', data?.applyLink);
  
  if (!data || data.university === 'Unassigned') {
    console.log('❌ No valid university data');
    return;
  }

  // REMOVED: Redundant auth check - already checked in onCanvasMouseUp
  console.log('✅ User authenticated, opening program link');
  
  // Open the university/program link directly
  const linkToOpen = data.programLink || data.applyLink;
  if (linkToOpen && linkToOpen !== '#') {
    console.log(`🔗 Opening link: ${linkToOpen}`);
    window.open(linkToOpen, '_blank');
  } else {
    console.log('❌ No valid link found for this program');
    showNotification('No link available for this program', false);
  }
}


// ---------- If later you allow panel post-login, remove the return above and use builder below ----------
/*
const uniData = allUniversityContent.filter(item => item && item.university === data.university);
if (uniData.length === 0) {
  console.log('❌ No university content found');
  return;
}
const mainErasmusLink = uniData[0].erasmusLink;
document.getElementById('infoPanelMainCard').innerHTML = `
  <div class="main-card-details">
    <img src="${uniData.logo}" alt="${data.university}">
    <h3>${data.university}</h3>
  </div>
  <div class="main-card-actions">
    ${mainErasmusLink ? `<a href="${mainErasmusLink}" target="_blank" class="partner-cta erasmus">Erasmus Info</a>` : ''}
  </div>
`;
document.getElementById('infoPanelSubcards').innerHTML = '';
uniData.forEach(item => {
  if (!item) return;
  const infoEnabled = item.programLink && item.programLink !== '#';
  const applyEnabled = item.applyLink && item.applyLink !== '#';
  const subcardHTML = `
    <div class="subcard">
      <div class="subcard-info">
        <img src="${item.logo}" alt="">
        <h4>${item.programName.replace(/\\n/g, ' ')}</h4>
      </div>
      <div class="subcard-buttons">
        <button class="partner-cta info" ${infoEnabled ? '' : 'disabled'} data-href="${infoEnabled ? item.programLink : ''}">University Info</button>
        <button class="partner-cta apply" ${applyEnabled ? '' : 'disabled'} data-return="/members/home">Apply Now</button>
      </div>
    </div>
  `;
  document.getElementById('infoPanelSubcards').insertAdjacentHTML('beforeend', subcardHTML);
});
const container = document.getElementById('infoPanelSubcards');
container.querySelectorAll('.partner-cta.info').forEach(btn => {
  btn.addEventListener('click', e => {
    const href = e.currentTarget.getAttribute('data-href');
    if (href) window.open(href, '_blank');
  });
});
container.querySelectorAll('.partner-cta.apply').forEach(btn => {
  btn.addEventListener('click', e => {
    window.top.location.href = 'https://www.globaleducarealliance.com/home?promptLogin=1';
  });
});
document.getElementById('infoPanelOverlay').style.display = 'flex';
console.log('✅ Info panel displayed with both university and application links');
*/

function hideInfoPanel() {
  document.getElementById('infoPanelOverlay').style.display = 'none';
}

// Add info panel styles and HTML (kept in case you re-enable the panel)
function addInfoPanelStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #infoPanelOverlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      justify-content: center;
      align-items: center;
    }
    .info-panel {
      background: white;
      padding: 20px;
      border-radius: 10px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .partner-cta {
      padding: 8px 16px;
      margin: 5px;
      border: none;
      border-radius: 5px;
      background: #007bff;
      color: white;
      cursor: pointer;
    }
    .partner-cta.disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .partner-cta:hover:not(.disabled) {
      background: #0056b3;
    }
    .subcard {
      border: 1px solid #ddd;
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .subcard-info img {
      width: 40px;
      height: 40px;
      margin-right: 10px;
    }
    .main-card-details img {
      width: 60px;
      height: 60px;
      margin-right: 15px;
    }
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

// Initialize info panel scaffolding on load (safe to keep)
document.addEventListener('DOMContentLoaded', addInfoPanelStyles);



// =======
// GLOBE WIDGET LOGIC (Client-Side UI Only) — unchanged foundation
// =======
let scene, camera, renderer, controls, globeGroup, transformControls;
let GLOBE_RADIUS = 1.0;
let isPanMode = false;
let isRotationPaused = false;
let isCubeMovementPaused = false;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let europeCube, newThailandCube, canadaCube, ukCube, usaCube, indiaCube, singaporeCube, malaysiaCube;
const europeSubCubes = [], newThailandSubCubes = [], canadaSubCubes = [], ukSubCubes = [], usaSubCubes = [], indiaSubCubes = [], singaporeSubCubes = [], malaysiaSubCubes = [];
const explodedPositions = [], newThailandExplodedPositions = [], canadaExplodedPositions = [], ukExplodedPositions = [], usaExplodedPositions = [], indiaExplodedPositions = [], singaporeExplodedPositions = [], malaysiaExplodedPositions = [];
const explodedSpacing = 0.1;
let isEuropeCubeExploded = false, isNewThailandCubeExploded = false, isCanadaCubeExploded = false, isUkCubeExploded = false, isUsaCubeExploded = false, isIndiaCubeExploded = false, isSingaporeCubeExploded = false, isMalaysiaCubeExploded = false;
const neuronGroup = new THREE.Group();
const count = 150, maxRadius = 1.5, vortexCubeSize = 0.01, microGap = 0.002;
const velocities = [], cubes = [], dummyDataSet = [];
const neuralCubeMap = {};
let neuralNetworkLines;
const countryBlocks = {};
let arcPaths = [];
let countryLabels = [];
const fontLoader = new THREE.FontLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const mouseDownPos = new THREE.Vector2();
const clock = new THREE.Clock();
let countryConfigs = [];
let europeContent = [];
let newThailandContent = [];
let canadaContent = [];
let ukContent = [];
let usaContent = [];
let indiaContent = [];
let singaporeContent = [];
let malaysiaContent = [];
let allUniversityContent = [];
let countryPrograms = {};
let globalContentMap = {};
let carouselData = [];
let isInteracting = false, hoverTimeout;
let clickedSubCube = null;

// =======
// PUBLIC DATA FETCH
// =======
async function fetchCarouselData() {
  try {
    const response = await fetch('/api/carousel/data');
    if (response.ok) {
      carouselData = await response.json();
      console.log('📊 Carousel data loaded:', carouselData);
      return true;
    }
  } catch (error) {
    console.log('Using fallback carousel data');
    carouselData = [
      { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
      { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced ." },
      { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
      { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
      { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
      { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
    ];
    return false;
  }
}
async function fetchDataFromBackend() {
  try {
    console.log('🔄 Fetching data from server...');
    const response = await fetch('/api/globe-data');
    if (response.ok) {
      const data = await response.json();
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
      allUniversityContent = [
        ...europeContent, ...newThailandContent, ...canadaContent, ...ukContent,
        ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent
      ];
      console.log('✅ Data loaded successfully!');
      return true;
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    // Fallback: minimal scaffolding
    countryConfigs = [
      {"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933}, {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF},
      {"name": "UK", "lat": 53, "lon": -0.1276, "color": 0x191970}, {"name": "Singapore", "lat": 1.35, "lon": 103.8, "color": 0xff0000},
      {"name": "Malaysia", "lat": 4, "lon": 102, "color": 0x0000ff}, {"name": "Thailand", "lat": 13.7563, "lon": 100.5018, "color": 0xffcc00},
      {"name": "Canada", "lat": 56.1304, "lon": -106.3468, "color": 0xff0000}, {"name": "USA", "lat": 39.8283, "lon": -98.5795, "color": 0x003366}
    ];
    europeContent = Array(27).fill(null); newThailandContent = Array(27).fill(null); canadaContent = Array(27).fill(null);
    ukContent = Array(27).fill(null); usaContent = Array(27).fill(null); indiaContent = Array(27).fill(null);
    singaporeContent = Array(27).fill(null); malaysiaContent = Array(27).fill(null);
  }
  return false;
}

// =======
// PROGRAM FILTERING / HIGHLIGHTING (unchanged)
// =======
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

// =======
// CAROUSEL
// =======
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
  const cardWidth = card.offsetWidth + 16;
  container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
}

// =======
// CONTROL TOGGLES
// =======
function togglePanMode() {
  isPanMode = !isPanMode;
  const panButton = document.getElementById('btn-pan');
  const canvas = renderer.domElement;
  if (isPanMode) {
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;
    if (panButton) {
      panButton.classList.add('pan-mode');
      panButton.style.background = '#ffa500';
      panButton.style.color = '#222';
      panButton.title = 'Exit Pan Mode (Click to switch to Rotate)';
      panButton.style.outline = '2px solid #ffa500';
      panButton.setAttribute('data-active', 'true');
    }
    canvas.style.cursor = 'grab';
    if (transformControls) { transformControls.enabled = false; transformControls.visible = false; }
  } else {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    if (panButton) {
      panButton.classList.remove('pan-mode');
      panButton.style.background = '#223366';
      panButton.style.color = '#fff';
      panButton.title = 'Enter Pan Mode (Click to enable panning)';
      panButton.style.outline = 'none';
      panButton.removeAttribute('data-active');
    }
    canvas.style.cursor = 'default';
    if (transformControls) { transformControls.enabled = true; }
  }
  console.log(isPanMode ? '🖐️ Pan mode enabled - left click drags to move globe' : '🔄 Pan mode disabled - normal rotation enabled');
}
function toggleGlobeRotation() {
  if (controls) {
    controls.autoRotate = !controls.autoRotate;
    const rotateBtn = document.getElementById('btn-rotate');
    if (rotateBtn) { rotateBtn.style.background = controls.autoRotate ? '#a46bfd' : 'rgba(0,0,0,0.8)'; }
  }
}

// =======
// Three.js initialization
// =======
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
  renderer.domElement.addEventListener('mousedown', () => { isInteracting = true; clearTimeout(hoverTimeout); if (isPanMode) renderer.domElement.style.cursor = 'grabbing'; });
  renderer.domElement.addEventListener('mouseup', () => { hoverTimeout = setTimeout(() => { isInteracting = false; }, 200); if (isPanMode) renderer.domElement.style.cursor = 'grab'; });
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

// =======
// UTILITIES
// =======
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
    const lines = text.split('\n');
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

// =======
// TOGGLE FUNCTION CREATION
// =======
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

// =======
// CUBE CREATION
// =======
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
        microcube.userData = { ...userData, isSubCube: true, initialPosition: pos.clone() };
        subCubeArray.push(microcube);
        explodedPositionArray.push(new THREE.Vector3(
          xi * explodedSpacing, yi * explodedSpacing, zi * explodedSpacing
        ));
        cubeObject.add(microcube);
        contentIdx++;
      }
  return cubeObject;
}
function createNeuralNetwork() {
  const vertices = [];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x00BFFF, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.35 });
  neuralNetworkLines = new THREE.LineSegments(geometry, material);
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
function createConnectionPath(fromGroup, toGroup, color = 0xffff00) {
  const start = new THREE.Vector3(); fromGroup.getWorldPosition(start);
  const end = new THREE.Vector3(); toGroup.getWorldPosition(end);
  const globeRadius = 1.0; const arcOffset = 0.05;
  const distance = start.distanceTo(end); const arcElevation = distance * 0.4;
  const offsetStart = start.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const offsetEnd = end.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const mid = offsetStart.clone().add(offsetEnd).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + arcOffset + arcElevation);
  const curve = new THREE.QuadraticBezierCurve3(offsetStart, mid, offsetEnd);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.005, 8, false);
  const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const fragmentShader = `varying vec2 vUv; uniform float time; uniform vec3 color; void main() { float stripe1 = step(0.1, fract(vUv.x * 4.0 + time * 0.2)) - step(0.2, fract(vUv.x * 4.0 + time * 0.2)); float stripe2 = step(0.1, fract(vUv.x * 4.0 - time * 0.2)) - step(0.2, fract(vUv.x * 4.0 - time * 0.2)); float combinedStripes = max(stripe1, stripe2); float glow = (1.0 - abs(vUv.y - 0.5) * 2.0); if (combinedStripes > 0.0) { gl_FragColor = vec4(color, combinedStripes * glow); } else { discard; } }`;
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const path = new THREE.Mesh(geometry, material);
  path.renderOrder = 1;
  globeGroup.add(path);
  return path;
}

function drawAllConnections() {
  // Rainbow colors array
  const rainbowColors = [
    0xff0000, // Red
    0xff7f00, // Orange
    0xffff00, // Yellow
    0x00ff00, // Green
    0x0000ff, // Blue
    0x4b0082, // Indigo
    0x9400d3  // Violet
  ];
  
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  
  // Create pairs with colors
  const pairs = countryNames.map((country, index) => [
    "Thailand", 
    country, 
    rainbowColors[index % rainbowColors.length]
  ]);
  
  arcPaths = pairs.map(([from, to, color]) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    if (fromBlock && toBlock) {
      return createConnectionPath(fromBlock, toBlock, color);
    }
  }).filter(Boolean);
}


// =======
// MOUSE EVENT HANDLERS
// =======
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

// THE KEY CLICK HANDLER — keep exploration public; gate subcube details
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
  if (intersects.length === 0) { closeAllExploded(); return; }
  const clickedObject = intersects[0].object;
  // COUNTRY BLOCK CLICKED — explode (no auth)
  if (clickedObject.userData.countryName) {
    const countryName = clickedObject.userData.countryName;
    const correspondingNeuralCube = neuralCubeMap[countryName];
    const toggleFunc = toggleFunctionMap[countryName];
    if (correspondingNeuralCube && toggleFunc) {
      const explosionStateMap = {
        'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,
        'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,
        'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded
      };
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      if (typeof TWEEN !== 'undefined') {
        new TWEEN.Tween(correspondingNeuralCube.scale).to({ x: 1.5, y: 1.5, z: 1.5 }, 200).yoyo(true).repeat(1).start();
      }
      setTimeout(() => { toggleFunc(); }, anyExploded ? 810 : 400);
    }
    return;
  }
  // SUBCUBE or child clicked
  let parent = clickedObject;
  let neuralName = null;
  let clickedSubCubeLocal = clickedObject.userData.isSubCube ? clickedObject : null;
  while (parent) {
    if (parent.userData.neuralName) { neuralName = parent.userData.neuralName; break; }
    parent = parent.parent;
  }
  const explosionStateMap = {
    'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,
    'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,
    'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded
  };
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
      // Just explode/collapse
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      setTimeout(() => toggleFunc(), anyExploded ? 810 : 0);
    }
  } else { 
    closeAllExploded(); 
  }
}

// Pan mode wrappers
function onCanvasMouseDownPan(event) {
  mouseDownPos.set(event.clientX, event.clientY);
  if (isPanMode) {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
    renderer.domElement.style.cursor = 'grabbing';
    event.preventDefault(); event.stopPropagation();
  }
}
function onCanvasMouseMovePan(event) {
  if (isPanMode && isDragging) {
    const deltaMove = { x: event.clientX - previousMousePosition.x, y: event.clientY - previousMousePosition.y };
    const panSpeed = 0.001;
    const deltaX = deltaMove.x * panSpeed;
    const deltaY = deltaMove.y * panSpeed;
    controls.target.x -= deltaX;
    controls.target.y += deltaY;
    const maxPan = 2.0;
    controls.target.x = Math.max(-maxPan, Math.min(maxPan, controls.target.x));
    controls.target.y = Math.max(-maxPan, Math.min(maxPan, controls.target.y));
    controls.update();
    previousMousePosition = { x: event.clientX, y: event.clientY };
    event.preventDefault(); event.stopPropagation();
  }
}
function onCanvasMouseUpPan(event) {
  if (isPanMode) {
    isDragging = false;
    renderer.domElement.style.cursor = isPanMode ? 'grab' : 'default';
    event.preventDefault(); event.stopPropagation();
  }
  onCanvasMouseUp(event);
}

// =======
// EVENT LISTENERS SETUP
// =======
function setupEventListeners() {
  renderer.domElement.addEventListener('mousedown', onCanvasMouseDownPan);
  renderer.domElement.addEventListener('mousemove', onCanvasMouseMovePan);
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUpPan);
  renderer.domElement.addEventListener('mouseenter', () => { if (isPanMode) { renderer.domElement.style.cursor = 'grab'; } });
  const panSpeed = 0.1;
  const btnUp = document.getElementById('btn-up'); if (btnUp) { btnUp.addEventListener('click', () => { controls.target.y += panSpeed; controls.update(); }); }
  const btnDown = document.getElementById('btn-down'); if (btnDown) { btnDown.addEventListener('click', () => { controls.target.y -= panSpeed; controls.update(); }); }
  const btnLeft = document.getElementById('btn-left'); if (btnLeft) { btnLeft.addEventListener('click', () => { controls.target.x -= panSpeed; controls.update(); }); }
  const btnRight = document.getElementById('btn-right'); if (btnRight) { btnRight.addEventListener('click', () => { controls.target.x += panSpeed; controls.update(); }); }
  const btnZoomIn = document.getElementById('btn-zoom-in'); if (btnZoomIn) { btnZoomIn.addEventListener('click', () => { camera.position.multiplyScalar(0.9); controls.update(); }); }
  const btnZoomOut = document.getElementById('btn-zoom-out'); if (btnZoomOut) { btnZoomOut.addEventListener('click', () => { camera.position.multiplyScalar(1.1); controls.update(); }); }
  const btnRotate = document.getElementById('btn-rotate'); if (btnRotate) { btnRotate.addEventListener('click', toggleGlobeRotation); }
  const btnPan = document.getElementById('btn-pan'); if (btnPan) { btnPan.addEventListener('click', togglePanMode); }
  // Additional UI controls
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
      arcPaths.forEach((p, i) => { if (i === 0) { visible = !p.visible; } p.visible = visible; });
    });
  }
  const toggleNodesButton = document.getElementById('toggleNodesButton');
  if (toggleNodesButton) {
    toggleNodesButton.addEventListener('click', () => {
      const neuralNodes = cubes.filter(cube => cube.userData.isSmallNode);
      const areVisible = neuralNodes.length > 0 && neuralNodes[0].visible;
      const newVisibility = !areVisible;
      neuralNodes.forEach(node => { node.visible = newVisibility; });
      if (neuralNetworkLines) { neuralNetworkLines.visible = newVisibility; }
      toggleNodesButton.textContent = newVisibility ? "Hide Neural Nodes" : "Show Neural Nodes";
    });
  }
  const scrollLockButton = document.getElementById('scrollLockBtn');
  if (scrollLockButton) {
    function setGlobeInteraction(isInteractive) {
      if (controls) { controls.enabled = isInteractive; }
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
    scrollLockButton.addEventListener('click', () => { setGlobeInteraction(!controls.enabled); });
  }
  // Keyboard controls
  document.addEventListener('keydown', (event) => {
    if (!controls) return;
    switch(event.code) {
      case 'ArrowUp': case 'KeyW': event.preventDefault(); controls.target.y += 0.1; controls.update(); break;
      case 'ArrowDown': case 'KeyS': event.preventDefault(); controls.target.y -= 0.1; controls.update(); break;
      case 'ArrowLeft': case 'KeyA': event.preventDefault(); controls.target.x -= 0.1; controls.update(); break;
      case 'ArrowRight': case 'KeyD': event.preventDefault(); controls.target.x += 0.1; controls.update(); break;
      case 'Equal': case 'NumpadAdd': event.preventDefault(); camera.position.multiplyScalar(0.9); controls.update(); break;
      case 'Minus': case 'NumpadSubtract': event.preventDefault(); camera.position.multiplyScalar(1.1); controls.update(); break;
      case 'Space': event.preventDefault(); toggleGlobeRotation(); break;
    }
  });
  window.addEventListener('resize', () => { updateCanvasSize(); });
}

// =======
// GLOBE AND CUBES CREATION
// =======
async function createGlobeAndCubes() {
  console.log('🔄 Creating globe and cubes...');
  createNeuralNetwork();
  for (let i = 0; i < count; i++) {
    const r = maxRadius * Math.random();
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    let cubeObject;
    if (i === 0) { cubeObject = createNeuralCube(europeContent, europeSubCubes, explodedPositions, '#003366'); cubeObject.userData.neuralName = 'Europe'; europeCube = cubeObject; }
    else if (i === 1) { cubeObject = createNeuralCube(newThailandContent, newThailandSubCubes, newThailandExplodedPositions, '#A52A2A'); cubeObject.userData.neuralName = 'Thailand'; newThailandCube = cubeObject; }
    else if (i === 2) { cubeObject = createNeuralCube(canadaContent, canadaSubCubes, canadaExplodedPositions, '#006400'); cubeObject.userData.neuralName = 'Canada'; canadaCube = cubeObject; }
    else if (i === 3) { cubeObject = createNeuralCube(ukContent, ukSubCubes, ukExplodedPositions, '#483D8B'); cubeObject.userData.neuralName = 'UK'; ukCube = cubeObject; }
    else if (i === 4) { cubeObject = createNeuralCube(usaContent, usaSubCubes, usaExplodedPositions, '#B22234'); cubeObject.userData.neuralName = 'USA'; usaCube = cubeObject; }
    else if (i === 5) { cubeObject = createNeuralCube(indiaContent, indiaSubCubes, indiaExplodedPositions, '#FF9933'); cubeObject.userData.neuralName = 'India'; indiaCube = cubeObject; }
    else if (i === 6) { cubeObject = createNeuralCube(singaporeContent, singaporeSubCubes, singaporeExplodedPositions, '#EE2536'); cubeObject.userData.neuralName = 'Singapore'; singaporeCube = cubeObject; }
    else if (i === 7) { cubeObject = createNeuralCube(malaysiaContent, malaysiaSubCubes, malaysiaExplodedPositions, '#FFD700'); cubeObject.userData.neuralName = 'Malaysia'; malaysiaCube = cubeObject; }
    else {
      cubeObject = new THREE.Group();
      const data = { domain: i % 12, engagement: Math.random(), age: Math.random(), risk: Math.random(), confidence: 0.7 + Math.random() * 0.3 };
      dummyDataSet.push(data);
      const color = getColorByData(data);
      const subCubeMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 1.0 });
      const microcube = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), subCubeMaterial);
      cubeObject.add(microcube);
      cubeObject.userData.isSmallNode = true;
    }
    cubeObject.position.set(x, y, z);
    neuronGroup.add(cubeObject);
    cubes.push(cubeObject);
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002));
    if (cubeObject.userData.neuralName) { neuralCubeMap[cubeObject.userData.neuralName] = cubeObject; }
  }
  new THREE.TextureLoader().load("https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg", (tex) => {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64), new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.28 }));
    globeGroup.add(globe);
  });
  let wireframeMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + 0.05, 64, 64), new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.12 }));
  globeGroup.add(wireframeMesh);
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    countryConfigs.forEach(config => {
      const size = 0.03;
      const blockGeometry = new THREE.BoxGeometry(size, size, size);
      const blockMaterial = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.95 });
      const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
      blockMesh.userData.countryName = config.name;
      const position = latLonToVector3(config.lat, config.lon, 1.1);
      blockMesh.position.copy(position);
      blockMesh.lookAt(0, 0, 0);
      globeGroup.add(blockMesh);
      countryBlocks[config.name] = blockMesh;
      const lG = new THREE.TextGeometry(config.name, { font: font, size: 0.018, height: 0.0001, curveSegments: 8 });
      lG.center();
      const lM = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lMesh = new THREE.Mesh(lG, lM);
      countryLabels.push({ label: lMesh, block: blockMesh, offset: 0.06 });
      globeGroup.add(lMesh);
    });
    drawAllConnections();
    setTimeout(() => { highlightCountriesByProgram("UG"); }, 500);
  });
  console.log('✅ Globe and cubes created successfully');
}

// =======
// ANIMATION
// =======
function animate() {
  requestAnimationFrame(animate);
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
          if (dist < maxDist) { neighbors.push({ dist: dist, cube: cubes[j] }); }
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

// =======
function togglePrivacySection() {
  const privacy = document.querySelector('.privacy-assurance');
  const trust = document.querySelector('.trust-indicators');
  privacy.classList.toggle('active');
  trust.classList.toggle('active');
  if (privacy.classList.contains('active')) {
    privacy.scrollIntoView({ behavior: 'smooth' });
  }
}
// Show trust indicators after load
window.addEventListener('load', () => {
  setTimeout(() => {
    const trustElement = document.querySelector('.trust-indicators');
    if (trustElement) {
      trustElement.classList.add('active');
    }
  }, 2000);
});
// Notification helpers
// Centered notification helper
function showNotification(message, isSuccess = true) {
  const div = document.createElement('div');
  const icon = isSuccess ? '✅' : '❌';
  const cssClass = isSuccess ? 'notification' : 'notification error';
  
  div.innerHTML = `
    <div class="${cssClass}" onclick="this.remove()">
      ${icon} ${message}
    </div>
  `;
  
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}


// ===
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Loading Interactive Globe Widget...');
  try {
    console.log('🔍 Checking authentication status...');
    await fetchAuthStatus();
    
    // IMPORTANT: Initialize immediately if authenticated
    if (authStatus.isAuthenticated) {
      console.log('✅ User is already authenticated on load!');
    }
    
    console.log('1️⃣ Fetching server data...');
    await fetchDataFromBackend();
    console.log('2️⃣ Initializing Three.js...');
    initializeThreeJS();
    console.log('3️⃣ Setting up event listeners...');
    setupEventListeners();
    console.log('4️⃣ Creating globe and cubes...');
    await createGlobeAndCubes();
    
    // CRITICAL: Activate cubes AFTER they're created
    if (authStatus.isAuthenticated) {
      console.log('🎮 Activating cubes for authenticated user!');
      setTimeout(() => {
        activateAllCubes(); // This already shows the notification
        // REMOVED: showNotification('🎮 University programs unlocked!', true);
      }, 500); // Small delay to ensure cubes are fully initialized
    }
    
    console.log('5️⃣ Populating carousel...');
    await populateCarousel();
    console.log('6️⃣ Starting animation...');
    animate();
    console.log('7️⃣ Starting auth monitoring...');
    startAuthStatusPolling();
    
    const leftBtn = document.getElementById('carouselScrollLeft');
    const rightBtn = document.getElementById('carouselScrollRight');
    if (leftBtn) leftBtn.onclick = () => scrollCarousel(-1);
    if (rightBtn) rightBtn.onclick = () => scrollCarousel(1);
    updateCanvasSize();
    console.log('✅ Globe Widget loaded successfully!');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});
