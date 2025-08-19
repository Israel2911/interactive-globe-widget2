// ====================================================================
//            FINAL AND COMPLETE main.js SCRIPT
// ====================================================================


// --- NEW HELPER FUNCTION to check auth status with your Render backend ---
async function checkUserIsAuthenticatedOnRender() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include', // Important for sending session cookies
            cache: 'no-store'       // Always get the latest status
        });
        const data = await response.json();
        return data.isAuthenticated; // Returns true or false
    } catch (error) {
        console.error('Auth status check failed:', error);
        return false; // Assume not authenticated if the check fails
    }
}


// ===
// AUTHENTICATION & UI PLACEHOLDERS
// ===
function redirectToWix() { /* no-op on external globe */ }
async function requireLoginAndGo() { return; }
async function isLoggedIn() { return false; }
async function updateAuthStatus() { /* no-op to keep UI simple */ }
async function handleCallback() { /* no-op */ }
async function logout() { window.top.location.href = 'https://www.globaleducarealliance.com/home'; }

async function openStudentDashboard() { await requireLoginAndGo(); }
async function uploadDocument() { await requireLoginAndGo(); }

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
  showNotification('🎮 All university programs are now accessible!');
}

let authStatus = { isAuthenticated: false, user: null };
async function fetchAuthStatus() {
  try {
    const res = await fetch('/api/auth/status', { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    authStatus = { isAuthenticated: !!data.isAuthenticated, user: data.user || null };
  } catch (e) {
    authStatus = { isAuthenticated: false, user: null };
  }
}

// --- UPDATED showInfoPanel function with real-time auth check ---
async function showInfoPanel(data) {
  console.log('🎯 showInfoPanel called with:', data);
  if (!data || data.university === 'Unassigned') {
    console.log('❌ No valid university data');
    return;
  }
  
  const isAuthenticated = await checkUserIsAuthenticatedOnRender();

  if (isAuthenticated) {
    console.log('✅ User is authenticated on Render. Access granted.');
    if (data.programLink && data.programLink !== '#') {
        window.open(data.programLink, '_blank');
    } else if (data.applyLink && data.applyLink !== '#') {
        window.open(data.applyLink, '_blank');
    } else {
        console.log('No actionable link found for this sub-cube.');
    }
  } else {
    console.log('User is not authenticated. Requesting login from Wix parent.');
    if (window.parent && typeof window.parent.handleSubcubeClick === 'function') {
        window.parent.handleSubcubeClick(data);
    } else {
        alert('Please return to the main site to log in.');
    }
  }
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
    .subcard { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .subcard-info img { width: 40px; height: 40px; margin-right: 10px; }
    .main-card-details img { width: 60px; height: 60px; margin-right: 15px; }
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

// ===
// GLOBE WIDGET CORE LOGIC
// ===
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
let europeContent = [], newThailandContent = [], canadaContent = [], ukContent = [], usaContent = [], indiaContent = [], singaporeContent = [], malaysiaContent = [];
let allUniversityContent = [];
let countryPrograms = {};
let globalContentMap = {};
let carouselData = [];
let isInteracting = false, hoverTimeout;
let clickedSubCube = null;

// ===
// PUBLIC DATA FETCH
// ===
async function fetchCarouselData() {
  try {
    const response = await fetch('/api/carousel/data');
    if (response.ok) {
      carouselData = await response.json();
    }
  } catch (error) {
    carouselData = [
      { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
      { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced programs." },
      { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
      { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
      { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
      { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
    ];
  }
}
async function fetchDataFromBackend() {
  try {
    const response = await fetch('/api/globe-data');
    if (response.ok) {
      const data = await response.json();
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
      return true;
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error);
  }
  return false;
}

// ===
// PROGRAM FILTERING / HIGHLIGHTING
// ===
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
  const matchingCountries = getMatchingCountries(level);
  Object.entries(countryBlocks).forEach(([country, group]) => {
    const isActive = matchingCountries.includes(country);
    group.material.emissiveIntensity = isActive ? 1.8 : 0.4;
    group.material.opacity = isActive ? 1.0 : 0.7;
    group.scale.setScalar(isActive ? 1.2 : 1.0);
  });
}
function highlightNeuralCubesByProgram(selectedCategory) {
  const category = selectedCategory.toLowerCase();
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
}

// ===
// CAROUSEL
// ===
async function populateCarousel() {
  await fetchCarouselData();
  const container = document.getElementById('carouselContainer');
  if (!container) return;
  container.innerHTML = '';
  carouselData.forEach(item => {
    container.insertAdjacentHTML('beforeend', `<a href="#" class="carousel-card" data-category="${item.category}"><img src="${item.img}" alt="${item.title}"/><div class="carousel-card-content"><div class="carousel-card-title">${item.title}</div><div class="carousel-card-text">${item.text}</div></div></a>`);
  });
  document.querySelectorAll('.carousel-card').forEach(card => {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      const category = this.dataset.category;
      highlightCountriesByProgram(category);
      highlightNeuralCubesByProgram(category);
    });
  });
}
function scrollCarousel(direction) {
  const container = document.getElementById('carouselContainer');
  const cardWidth = container.querySelector('.carousel-card')?.offsetWidth + 16 || 0;
  container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
}

// ===
// Three.js initialization
// ===
function initializeThreeJS() {
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
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.minDistance = 0.01;
  controls.maxDistance = 15.0;
  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  scene.add(transformControls);
  scene.add(new THREE.AmbientLight(0x88ccff, 1.5));
  const pointLight = new THREE.PointLight(0xffffff, 1.5);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);
}
function updateCanvasSize() {
  const headerHeight = document.querySelector('.header-ui-bar')?.offsetHeight || 0;
  const footerHeight = document.querySelector('.footer-ui-bar')?.offsetHeight || 0;
  const newHeight = window.innerHeight - headerHeight - footerHeight;
  renderer.domElement.style.top = `${headerHeight}px`;
  renderer.domElement.style.height = `${newHeight}px`;
  renderer.setSize(window.innerWidth, newHeight);
  camera.aspect = window.innerWidth / newHeight;
  camera.updateProjectionMatrix();
}

// ===
// UTILITIES
// ===
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
  canvas.width = 256; canvas.height = 256;
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

// ===
// TOGGLE FUNCTION CREATION
// ===
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

// ===
// CUBE CREATION
// ===
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  let contentIdx = 0;
  const cubeObject = new THREE.Group();
  for (let xi = -1; xi <= 1; xi++)
    for (let yi = -1; yi <= 1; yi++)
      for (let zi = -1; zi <= 1; zi++) {
        const item = content[contentIdx];
        const material = item ? createTexture(item.programName, item.logo, color) : createTexture('Unassigned', null, '#333333');
        const microcube = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), material);
        const pos = new THREE.Vector3(xi * (vortexCubeSize + microGap), yi * (vortexCubeSize + microGap), zi * (vortexCubeSize + microGap));
        microcube.position.copy(pos);
        microcube.userData = { ...(item || { university: "Unassigned" }), isSubCube: true, initialPosition: pos.clone() };
        subCubeArray.push(microcube);
        explodedPositionArray.push(new THREE.Vector3(xi * explodedSpacing, yi * explodedSpacing, zi * explodedSpacing));
        cubeObject.add(microcube);
        contentIdx++;
      }
  return cubeObject;
}
function createNeuralNetwork() {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.35 });
  neuralNetworkLines = new THREE.LineSegments(geometry, material);
  globeGroup.add(neuralNetworkLines);
}
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(-(radius * Math.sin(phi) * Math.cos(theta)), (radius * Math.cos(phi)), (radius * Math.sin(phi) * Math.sin(theta)));
}
function createConnectionPath(fromGroup, toGroup, color = 0xffff00) {
  const start = new THREE.Vector3(); fromGroup.getWorldPosition(start);
  const end = new THREE.Vector3(); toGroup.getWorldPosition(end);
  const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1.0 + 0.2);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const geometry = new THREE.TubeGeometry(curve, 20, 0.002, 8, false);
  const material = new THREE.MeshBasicMaterial({ color: color });
  return new THREE.Mesh(geometry, material);
}
function drawAllConnections() {
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  const pairs = countryNames.map(country => ["Thailand", country]);
  arcPaths = pairs.map(([from, to]) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    if (fromBlock && toBlock) return createConnectionPath(fromBlock, toBlock);
  }).filter(Boolean);
  arcPaths.forEach(path => globeGroup.add(path));
}

// ===
// MOUSE EVENT HANDLERS
// ===
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
async function onCanvasMouseUp(event) {
  if (transformControls.dragging) return;
  const deltaX = Math.abs(event.clientX - mouseDownPos.x);
  const deltaY = Math.abs(event.clientY - mouseDownPos.y);
  if (deltaX > 5 || deltaY > 5) return;

  const canvasRect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const allClickableObjects = [...Object.values(countryBlocks), ...neuronGroup.children];
  const intersects = raycaster.intersectObjects(allClickableObjects, true);

  if (intersects.length === 0) { closeAllExploded(); return; }

  let parent = intersects[0].object;
  let clickedSubCubeLocal = parent.userData.isSubCube ? parent : null;
  while (parent && !clickedSubCubeLocal) {
      if(parent.parent && parent.parent.userData.isSubCube) {
          clickedSubCubeLocal = parent.parent;
          break;
      }
      parent = parent.parent;
  }
  
  if (clickedSubCubeLocal && clickedSubCubeLocal.userData.university !== "Unassigned") {
    await showInfoPanel(clickedSubCubeLocal.userData);
  } else {
    let countryCube = intersects.object;
    while(countryCube.parent && !countryCube.userData.neuralName) {
        countryCube = countryCube.parent;
    }
    if (countryCube.userData.neuralName && toggleFunctionMap[countryCube.userData.neuralName]) {
        toggleFunctionMap[countryCube.userData.neuralName]();
    } else {
        closeAllExploded();
    }
  }
}
function onCanvasMouseDownPan(event) {
  if (isPanMode) { isDragging = true; }
}
function onCanvasMouseMovePan(event) {
  if (isPanMode && isDragging) {
    // pan logic
  }
}
function onCanvasMouseUpPan(event) {
  if (isPanMode) { isDragging = false; }
  onCanvasMouseUp(event);
}

// ===
// EVENT LISTENERS SETUP
// ===
function setupEventListeners() {
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUp);
  window.addEventListener('resize', updateCanvasSize);
  // ... all other button and keyboard listeners
}

// ===
// GLOBE AND CUBES CREATION
// ===
async function createGlobeAndCubes() {
  createNeuralNetwork();
  for (let i = 0; i < count; i++) {
    const r = maxRadius * Math.random();
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    let cubeObject;
    if (i === 0) { cubeObject = createNeuralCube(europeContent, europeSubCubes, explodedPositions, '#003366'); cubeObject.userData.neuralName = 'Europe'; }
    else if (i === 1) { cubeObject = createNeuralCube(newThailandContent, newThailandSubCubes, newThailandExplodedPositions, '#A52A2A'); cubeObject.userData.neuralName = 'Thailand'; }
    else if (i === 2) { cubeObject = createNeuralCube(canadaContent, canadaSubCubes, canadaExplodedPositions, '#006400'); cubeObject.userData.neuralName = 'Canada'; }
    else if (i === 3) { cubeObject = createNeuralCube(ukContent, ukSubCubes, ukExplodedPositions, '#483D8B'); cubeObject.userData.neuralName = 'UK'; }
    else if (i === 4) { cubeObject = createNeuralCube(usaContent, usaSubCubes, usaExplodedPositions, '#B22234'); cubeObject.userData.neuralName = 'USA'; }
    else if (i === 5) { cubeObject = createNeuralCube(indiaContent, indiaSubCubes, indiaExplodedPositions, '#FF9933'); cubeObject.userData.neuralName = 'India'; }
    else if (i === 6) { cubeObject = createNeuralCube(singaporeContent, singaporeSubCubes, singaporeExplodedPositions, '#EE2536'); cubeObject.userData.neuralName = 'Singapore'; }
    else if (i === 7) { cubeObject = createNeuralCube(malaysiaContent, malaysiaSubCubes, malaysiaExplodedPositions, '#FFD700'); cubeObject.userData.neuralName = 'Malaysia'; }
    else {
      cubeObject = new THREE.Group();
      cubeObject.userData.isSmallNode = true;
      const microcube = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize));
      cubeObject.add(microcube);
    }
    cubeObject.position.set(x, y, z);
    neuronGroup.add(cubeObject);
    cubes.push(cubeObject);
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002));
  }
}

// ===
// ANIMATION LOOP
// ===
function animate() {
    requestAnimationFrame(animate);
    if(controls) controls.update();
    if(typeof TWEEN !== 'undefined') TWEEN.update();
    if (!isCubeMovementPaused) {
        cubes.forEach((cube, i) => {
            const isExploded = cube.userData.neuralName && (isEuropeCubeExploded || isNewThailandCubeExploded || isCanadaCubeExploded || isUkCubeExploded || isUsaCubeExploded || isIndiaCubeExploded || isSingaporeCubeExploded || isMalaysiaCubeExploded);
            if (!isExploded) {
                cube.position.add(velocities[i]);
                if (cube.position.length() > 1.0) {
                    velocities[i].reflect(cube.position.clone().normalize());
                }
            }
        });
    }
    renderer.render(scene, camera);
}

// ===
// UI HELPERS
// ===
function togglePrivacySection() {
  const privacy = document.querySelector('.privacy-assurance');
  const trust = document.querySelector('.trust-indicators');
  privacy.classList.toggle('active');
  trust.classList.toggle('active');
}
function showNotification(message, isSuccess = true) {
  const div = document.createElement('div');
  const bgColor = isSuccess ? '#4CAF50' : '#ff4444';
  const icon = isSuccess ? '✅' : '❌';
  div.innerHTML = `<div style="position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: white; padding: 15px; border-radius: 8px; z-index: 3000;">${icon} ${message}</div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ===
// STARTUP SEQUENCE
// ===
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Loading Interactive Globe Widget...');
  try {
    await fetchAuthStatus();
    await fetchDataFromBackend();
    initializeThreeJS();
    setupEventListeners();
    await createGlobeAndCubes();
    await populateCarousel();
    animate();
    console.log('✅ Globe Widget loaded successfully!');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});
