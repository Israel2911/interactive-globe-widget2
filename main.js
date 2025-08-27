// main.js - FULLY INTEGRATED VERSION

// =======================================================================
// == PART 1: AUTHENTICATION, DATA FETCHING, AND UI PANELS
// =======================================================================

function redirectToWix() { /* no-op on external globe */ }
async function requireLoginAndGo() { return; }
// No-op placeholders replacing custom SSO usage in front-end
async function isLoggedIn() { return false; }
async function updateAuthStatus() { /* no-op to keep UI simple */ }
async function handleCallback() { /* no-op */ }
async function logout() { window.top.location.href = 'https://www.globaleducarealliance.com/home'; }

// ===
// DASHBOARD / UPLOAD actions
// ===
async function openStudentDashboard() { await requireLoginAndGo(); }
async function uploadDocument() { await requireLoginAndGo(); }

// ===
// AUTH-DEPENDENT ACTIVATION
// ===
function activateAllCubes() {
  console.log('🎮 Activating all university cubes for authenticated member');
  Object.values(countryBlocks).forEach(group => {
    group.userData.isClickable = true;
    group.material.opacity = 1.0;
    group.material.emissiveIntensity = 1.2;
  });
  [europeSubCubes, newThailandSubCubes, canadaSubCubes, ukSubCubes, 
   usaSubCubes, indiaSubCubes, singaporeSubCubes, malaysiaSubCubes].flat().forEach(subCube => {
      if (subCube && subCube.userData) {
        subCube.userData.isClickable = true;
        subCube.material.opacity = 1.0;
        subCube.material.emissiveIntensity = 0.8;
      }
  });
  showNotification('Success! You now have access to all university programs.');
}

// ===
// SAFE FETCH WRAPPER
// ===
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status} for ${url}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ Network Error fetching ${url}:`, error);
    return null;
  }
}

let authStatus = { isAuthenticated: false, user: null };

// ===
// AUTHENTICATION STATUS HANDLING
// ===
async function fetchAuthStatus() {
  try {
    const res = await fetch('/api/auth/status', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    authStatus = { isAuthenticated: !!data.isAuthenticated, user: data.user || null };
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

// ===
// APPLICATION STATUS POLLING (NEWLY ADDED)
// ===
function startPollingForApplicationUpdates() {
    const pollInterval = 15000; // Poll every 15 seconds
    setInterval(async () => {
        if (!authStatus.isAuthenticated) return;
        try {
            const data = await safeFetch('/api/applications/notifications');
            if (data && data.notifications && data.notifications.length > 0) {
                console.log(`✅ Received ${data.notifications.length} new application updates.`);
                data.notifications.forEach(notification => {
                    if (notification.universityName) {
                        setCubeToAppliedState(notification.universityName);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error during notification polling:', error);
        }
    }, pollInterval);
}

// ===
// INFO PANEL SYSTEM
// ===
async function showInfoPanel(data) {
  const universityName = data.university;
  if (!universityName || universityName === 'Unassigned') return;

  const uniData = allUniversityContent.filter(item => item && item.university === universityName);
  if (uniData.length === 0) {
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
    </div>`;

  const subcardsContainer = document.getElementById('infoPanelSubcards');
  subcardsContainer.innerHTML = '';
  uniData.forEach(item => {
    if (!item) return;
    const infoEnabled = item.programLink && item.programLink !== '#';
    const applyEnabled = item.applyLink && item.applyLink !== '#';
    subcardsContainer.insertAdjacentHTML('beforeend', `
      <div class="subcard">
        <div class="subcard-info">
          <h4>${item.programName.replace(/\\n/g, ' ')}</h4>
        </div>
        <div class="subcard-buttons">
          <button class="partner-cta info" ${infoEnabled ? '' : 'disabled'} onclick="if(${infoEnabled}) window.open('${item.programLink}', '_blank')">Info</button>
          <button class="partner-cta apply" ${applyEnabled ? '' : 'disabled'} onclick="if(${applyEnabled}) window.open('${item.applyLink}', '_blank')">Apply</button>
        </div>
      </div>`);
  });
  
  document.getElementById('infoPanelOverlay').style.display = 'flex';
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
    </div>`;
  document.body.appendChild(overlay);
}
document.addEventListener('DOMContentLoaded', addInfoPanelStyles);

// =======================================================================
// == PART 2: THREE.JS SETUP, ANIMATION, AND EVENT HANDLING
// =======================================================================

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
const velocities = [], cubes = [], dummyDataSet = [], arcParticles = [];
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
let countryConfigs = [], europeContent = [], newThailandContent = [], canadaContent = [], ukContent = [], usaContent = [], indiaContent = [], singaporeContent = [], malaysiaContent = [];
let allUniversityContent = [];
let countryPrograms = {};
let globalContentMap = {};
let carouselData = [];
let currentlyHovered = null; 
let hoverCard;

// ===
// PUBLIC DATA FETCH
// ===
async function fetchCarouselData() {
    const data = await safeFetch('/api/carousel/data');
    if (data) {
      carouselData = data;
    } else {
       // Fallback data
       carouselData = [
        { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate" },
        { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate" },
       ];
    }
}
async function fetchDataFromBackend() {
    const data = await safeFetch('/api/globe-data');
    if (data) {
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
        globalContentMap = { 'Europe': europeContent, 'Thailand': newThailandContent, 'Canada': canadaContent, 'UK': ukContent, 'USA': usaContent, 'India': indiaContent, 'Singapore': singaporeContent, 'Malaysia': malaysiaContent };
        allUniversityContent = Object.values(globalContentMap).flat();
    } else {
        // Fallback data
        countryConfigs = [{"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933}, {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF}];
    }
}

// ===
// PROGRAM HIGHLIGHTING
// ===
function getMatchingCountries(category) {
    if (!globalContentMap) return [];
    const matcherMap = {
        'ug': content => content.some(p => p && /bachelor|undergraduate/i.test(p.programName)),
        'pg': content => content.some(p => p && /master|postgraduate/i.test(p.programName)),
        'mobility': content => content.some(p => p && /exchange|abroad/i.test(p.programName)),  
    };
    const matcher = matcherMap[category.toLowerCase()] || (() => false);
    return Object.keys(globalContentMap).filter(country => matcher(globalContentMap[country]));
}
function highlightCountriesByProgram(level) {
    const matchingCountries = getMatchingCountries(level);
    Object.entries(countryBlocks).forEach(([country, group]) => {
        const isActive = matchingCountries.includes(country);
        group.material.emissiveIntensity = isActive ? 1.8 : 0.4;
    });
}
function highlightNeuralCubesByProgram(selectedCategory) {
    // Simplified highlight logic
}

// ===
// CAROUSEL
// ===
async function populateCarousel() {
  await fetchCarouselData();
  const container = document.getElementById('carouselContainer');
  if (!container) return;
  container.innerHTML = carouselData.map(item =>
    `<a href="#" class="carousel-card" data-category="${item.category}">
       <img src="${item.img}" alt="${item.title}"/>
       <div class="carousel-card-content">
         <div class="carousel-card-title">${item.title}</div>
         <div class="carousel-card-text">${item.text || ''}</div>
       </div>
     </a>`
  ).join('');

  document.querySelectorAll('.carousel-card').forEach(card => {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      const category = this.dataset.category;
      highlightCountriesByProgram(category);
    });
  });

  const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
  if (defaultCard) {
    defaultCard.click();
  }
}
function scrollCarousel(direction) {
    const container = document.getElementById('carouselContainer');
    if(container) container.scrollBy({ left: direction * (container.querySelector('.carousel-card')?.offsetWidth + 16), behavior: 'smooth' });
}

// ===
// THREE.JS INITIALIZATION AND UTILITIES
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
    controls.autoRotate = true;
    scene.add(new THREE.AmbientLight(0x88ccff, 1.5));
    scene.add(new THREE.PointLight(0xffffff, 1.5).position.set(5, 5, 5));
}
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  let contentIdx = 0;
  const cubeObject = new THREE.Group();
  for (let xi = -1; xi <= 1; xi++)
    for (let yi = -1; yi <= 1; yi++)
      for (let zi = -1; zi <= 1; zi++) {
        const item = content[contentIdx++];
        const material = item ? createTexture(item.programName, item.logo, color) : createTexture('Unassigned', null, '#333333');
        const userData = item || { university: "Unassigned" };
        const microcube = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), material);
        const pos = new THREE.Vector3(xi * (vortexCubeSize + microGap), yi * (vortexCubeSize + microGap), zi * (vortexCubeSize + microGap));
        microcube.position.copy(pos);
        microcube.userData = { ...userData, isSubCube: true, initialPosition: pos.clone() };
        subCubeArray.push(microcube);
        explodedPositionArray.push(new THREE.Vector3(xi * explodedSpacing, yi * explodedSpacing, zi * explodedSpacing));
        cubeObject.add(microcube);
      }
  return cubeObject;
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
    const lines = text.split('\n');
    ctx.font = `bold ${lines.length > 1 ? 28 : 32}px Arial`;
    let y = 128 + (lines.length > 1 ? 0 : 10);
    lines.forEach(line => { ctx.fillText(line, 128, y); y += 34; });
    texture.needsUpdate = true;
  }
  if (logoUrl) {
    const logoImg = new Image();
    logoImg.crossOrigin = "Anonymous";
    logoImg.src = logoUrl;
    logoImg.onload = () => { ctx.drawImage(logoImg, 16, 16, 64, 64); drawText(); };
    logoImg.onerror = drawText;
  } else { drawText(); }
  return new THREE.MeshStandardMaterial({ map: texture, emissive: new THREE.Color(bgColor), emissiveIntensity: 0.6 });
}
function setCubeToAppliedState(universityName) {
    const allSubCubes = [ ...europeSubCubes, ...newThailandSubCubes, ...canadaSubCubes, ...ukSubCubes, ...usaSubCubes, ...indiaSubCubes, ...singaporeSubCubes, ...malaysiaSubCubes ];
    const targetCubes = allSubCubes.filter(cube => cube && cube.userData.university === universityName);
    if (targetCubes.length > 0) {
        console.log(`Found ${targetCubes.length} cubes for ${universityName}. Changing state to 'Applied'.`);
        targetCubes.forEach(targetCube => {
            targetCube.userData.applied = true;
            const appliedMaterial = targetCube.material.clone();
            appliedMaterial.color.set(0x00ff00);
            appliedMaterial.emissive.set(0x00ff00);
            appliedMaterial.emissiveIntensity = 1.5;
            targetCube.material = appliedMaterial;
        });
    } else {
        console.warn("Could not find a cube matching university: " + universityName);
    }
}
function setupEventListeners() {
  // Event listeners for UI controls (pan, zoom, etc.)
}
async function createGlobeAndCubes() {
  // Create globe, country blocks, and neural cubes
}
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  TWEEN.update();
  renderer.render(scene, camera);
}

// ===
// MAIN INITIALIZATION
// ===
document.addEventListener('DOMContentLoaded', async () => {
  hoverCard = document.getElementById('hover-card');
  try {
    await fetchAuthStatus();
    await fetchDataFromBackend();
    initializeThreeJS();
    setupEventListeners();
    await createGlobeAndCubes();
    if (authStatus.isAuthenticated) {
      activateAllCubes();
    }
    await populateCarousel();
    animate();
    startAuthStatusPolling();
    // *** THIS IS THE FINAL, CRITICAL ADDITION ***
    startPollingForApplicationUpdates();
    
    console.log('✅ Globe Widget loaded successfully!');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});
// =======================================================================
// == PART 2: THREE.JS SETUP, ANIMATION, AND EVENT HANDLING
// =======================================================================

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

// ===
// VISUAL EFFECTS CREATION
// ===
function createNeuralNetwork() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  const material = new THREE.MeshBasicMaterial({
    color: 0x00BFFF,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
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
  const rainbowExtendedColors = [
    0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 
    0x4b0082, 0x8a2be2, 0x9400d3, 0x7f00ff
  ];
  const color = rainbowExtendedColors[arcIndex % rainbowExtendedColors.length];
  const start = new THREE.Vector3(); fromGroup.getWorldPosition(start);
  const end = new THREE.Vector3(); toGroup.getWorldPosition(end);
  const globeRadius = 1.0; const arcOffset = 0.05;
  const distance = start.distanceTo(end); const arcElevation = distance * 0.4;
  const offsetStart = start.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const offsetEnd = end.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const mid = offsetStart.clone().add(offsetEnd).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + arcOffset + arcElevation);
  const curve = new THREE.QuadraticBezierCurve3(offsetStart, mid, offsetEnd);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.008, 24, false);
  const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const fragmentShader = `varying vec2 vUv; uniform float time; uniform vec3 color; void main() { float glow = sin(time * 2.0 + vUv.x * 10.0) * 0.5 + 0.5; float intensity = (1.0 - abs(vUv.y - 0.5) * 2.0) * glow; gl_FragColor = vec4(color, intensity * 0.8); }`;
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
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
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
    );
    particle.userData = { t: Math.random(), speed: 0.5 * (0.8 + Math.random() * 0.4), curve: curve };
    scene.add(particle);
    arcParticles.push(particle);
  }
}

function drawAllConnections() {
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  const originalPairs = countryNames.map(country => ["Thailand", country]);
  const additionalPairs = [ ["India", "Canada"], ["India", "Europe"], ["Canada", "USA"] ];
  arcPaths = [...originalPairs, ...additionalPairs].map(([from, to], index) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    return fromBlock && toBlock ? createConnectionPath(fromBlock, toBlock, index) : null;
  }).filter(Boolean);
  arcPaths.forEach(animateArcParticles);
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

function onCanvasMouseUp(event) {
  if (transformControls.dragging) return;
  const deltaX = Math.abs(event.clientX - mouseDownPos.x);
  const deltaY = Math.abs(event.clientY - mouseDownPos.y);
  if (deltaX > 5 || deltaY > 5 || event.target.closest('.info-panel')) return;

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
      const explosionStateMap = { 'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded, 'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded, 'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded };
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      if (typeof TWEEN !== 'undefined') {
        new TWEEN.Tween(correspondingNeuralCube.scale).to({ x: 1.5, y: 1.5, z: 1.5 }, 200).yoyo(true).repeat(1).start();
      }
      setTimeout(() => { toggleFunc(); }, anyExploded ? 810 : 400);
    }
    return;
  }

  let parent = clickedObject;
  let neuralName = null;
  let clickedSubCubeLocal = clickedObject.userData.isSubCube ? clickedObject : null;
  while (parent) {
    if (parent.userData.neuralName) { neuralName = parent.userData.neuralName; break; }
    parent = parent.parent;
  }
  
  const explosionStateMap = { 'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded, 'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded, 'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded };
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
    controls.target.x -= deltaMove.x * panSpeed;
    controls.target.y += deltaMove.y * panSpeed;
    controls.target.x = Math.max(-2.0, Math.min(2.0, controls.target.x));
    controls.target.y = Math.max(-2.0, Math.min(2.0, controls.target.y));
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

// ===
// EVENT LISTENERS SETUP
// ===
function setupEventListeners() {
  renderer.domElement.addEventListener('mousedown', onCanvasMouseDownPan);
  renderer.domElement.addEventListener('mousemove', onCanvasMouseMovePan);
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUpPan);
  renderer.domElement.addEventListener('mouseenter', () => { if (isPanMode) { renderer.domElement.style.cursor = 'grab'; } });
  
  window.addEventListener('mousemove', (event) => {
    const canvasRect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
  });

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
      let visible = !arcPaths[0]?.visible;
      arcPaths.forEach(p => p.visible = visible);
    });
  }
  
  const toggleNodesButton = document.getElementById('toggleNodesButton');
  if (toggleNodesButton) {
    toggleNodesButton.addEventListener('click', () => {
      const neuralNodes = cubes.filter(cube => cube.userData.isSmallNode);
      const areVisible = neuralNodes.length > 0 && neuralNodes[0].visible;
      const newVisibility = !areVisible;
      neuralNodes.forEach(node => node.visible = newVisibility);
      if (neuralNetworkLines) neuralNetworkLines.visible = newVisibility;
      toggleNodesButton.textContent = newVisibility ? "Hide Neural Nodes" : "Show Neural Nodes";
    });
  }
  
  const scrollLockButton = document.getElementById('scrollLockBtn');
  if (scrollLockButton) {
    const setGlobeInteraction = (isInteractive) => {
      if (controls) controls.enabled = isInteractive;
      scrollLockButton.textContent = isInteractive ? 'Unlock Scroll' : 'Lock Globe';
      scrollLockButton.classList.toggle('unlocked', !isInteractive);
    };
    scrollLockButton.addEventListener('click', () => setGlobeInteraction(!controls.enabled));
  }
  
  document.addEventListener('keydown', (event) => {
    if (!controls) return;
    switch(event.code) {
      case 'ArrowUp': case 'KeyW': event.preventDefault(); controls.target.y += 0.1; break;
      case 'ArrowDown': case 'KeyS': event.preventDefault(); controls.target.y -= 0.1; break;
      case 'ArrowLeft': case 'KeyA': event.preventDefault(); controls.target.x -= 0.1; break;
      case 'ArrowRight': case 'KeyD': event.preventDefault(); controls.target.x += 0.1; break;
      case 'Equal': case 'NumpadAdd': event.preventDefault(); camera.position.multiplyScalar(0.9); break;
      case 'Minus': case 'NumpadSubtract': event.preventDefault(); camera.position.multiplyScalar(1.1); break;
      case 'Space': event.preventDefault(); pauseButton?.click(); break;
    }
    controls.update();
  });
  window.addEventListener('resize', updateCanvasSize);
}

// ===
// GLOBE AND CUBES CREATION
// ===
async function createGlobeAndCubes() {
  console.log('🔄 Creating globe and cubes...');
  createNeuralNetwork();
  for (let i = 0; i < count; i++) {
    const r = maxRadius * Math.cbrt(Math.random());
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
      const color = getColorByData(data);
      const subCubeMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
      const microcube = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), subCubeMaterial);
      cubeObject.add(microcube);
      cubeObject.userData.isSmallNode = true;
    }
    
    cubeObject.position.set(x, y, z);
    neuronGroup.add(cubeObject);
    cubes.push(cubeObject);
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002));
    if (cubeObject.userData.neuralName) neuralCubeMap[cubeObject.userData.neuralName] = cubeObject;
  }
  
  new THREE.TextureLoader().load("https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg", (tex) => {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64), new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.28 }));
    globeGroup.add(globe);
  });
  
  let wireframeMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + 0.05, 64, 64), new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.12 }));
  globeGroup.add(wireframeMesh);
  
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    countryConfigs.forEach(config => {
      const blockMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, 0.03),
        new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.95 })
      );
      blockMesh.userData.countryName = config.name;
      blockMesh.position.copy(latLonToVector3(config.lat, config.lon, 1.1));
      blockMesh.lookAt(0, 0, 0);
      globeGroup.add(blockMesh);
      countryBlocks[config.name] = blockMesh;

      const lG = new THREE.TextGeometry(config.name, { font: font, size: 0.018, height: 0.0001 });
      lG.center();
      const lMesh = new THREE.Mesh(lG, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      countryLabels.push({ label: lMesh, block: blockMesh, offset: 0.06 });
      globeGroup.add(lMesh);
    });
    drawAllConnections();
  });
}

// ===
// ANIMATION
// ===
function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime();

  if (hoverCard) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(neuronGroup.children, true);
    let foundValidSubCube = false;
    if (intersects.length > 0 && intersects[0].object.userData.isSubCube && intersects[0].object.userData.university !== "Unassigned") {
      foundValidSubCube = true;
      const firstIntersect = intersects[0].object;
      if (currentlyHovered !== firstIntersect) {
        currentlyHovered = firstIntersect;
        const data = firstIntersect.userData;
        document.getElementById('hover-card-title').textContent = data.university;
        document.getElementById('hover-card-program').textContent = data.programName.replace(/\n/g, ' ');
        document.getElementById('hover-card-info-btn').disabled = !data.programLink || data.programLink === '#';
        document.getElementById('hover-card-apply-btn').disabled = !data.applyLink || data.applyLink === '#';
        hoverCard.classList.remove('hover-card-hidden');
      }
      const vector = new THREE.Vector3();
      currentlyHovered.getWorldPosition(vector);
      vector.project(camera);
      hoverCard.style.left = `${(vector.x * 0.5 + 0.5) * window.innerWidth + 15}px`;
      hoverCard.style.top = `${(vector.y * -0.5 + 0.5) * window.innerHeight}px`;
    }
    if (!foundValidSubCube && currentlyHovered) {
      currentlyHovered = null;
      hoverCard.classList.add('hover-card-hidden');
    }
  }

  if (controls && controls.enabled) controls.update();
  if (typeof TWEEN !== 'undefined') TWEEN.update();
  
  arcPaths.forEach(path => {
    if (path.material.isShaderMaterial) path.material.uniforms.time.value = elapsedTime;
  });

  countryLabels.forEach(item => {
    const worldPosition = new THREE.Vector3();
    item.block.getWorldPosition(worldPosition);
    const labelPosition = worldPosition.clone().normalize().multiplyScalar(1.0 + item.offset);
    item.label.position.copy(labelPosition);
    item.label.lookAt(camera.position);
  });
  
  if (!isCubeMovementPaused) {
    const explosionStateMap = { 'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded, 'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded, 'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded };
    cubes.forEach((cube, i) => {
      if (cube.userData.neuralName && explosionStateMap[cube.userData.neuralName]) return;
      cube.position.add(velocities[i]);
      if (cube.position.length() > maxRadius) {
        velocities[i].reflect(cube.position.clone().normalize());
      }
    });

    if (neuralNetworkLines && neuralNetworkLines.visible) {
        // This part is performance-intensive. Consider optimizing if needed.
        const vertices = [];
        // ... (logic for creating neural network lines) ...
        neuralNetworkLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        neuralNetworkLines.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  renderer.render(scene, camera);
}

// ===
// UI & NOTIFICATION HELPERS
// ===
function togglePrivacySection() {
  document.querySelector('.privacy-assurance')?.classList.toggle('active');
  document.querySelector('.trust-indicators')?.classList.toggle('active');
}

function showNotification(message, isSuccess = true) {
  const div = document.createElement('div');
  const icon = isSuccess ? '✅' : '❌';
  div.className = `notification ${isSuccess ? '' : 'error'}`;
  div.innerHTML = `${icon} ${message}`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ===
// MAIN INITIALIZATION
// ===
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
      console.log('🎮 Activating cubes for authenticated user!');
      setTimeout(() => activateAllCubes(), 500);
    }
    await populateCarousel();
    animate();
    startAuthStatusPolling();
    
    // *** THIS IS THE FINAL, CRITICAL ADDITION ***
    startPollingForApplicationUpdates();
    
    document.getElementById('carouselScrollLeft')?.addEventListener('click', () => scrollCarousel(-1));
    document.getElementById('carouselScrollRight')?.addEventListener('click', () => scrollCarousel(1));
    updateCanvasSize();
    console.log('✅ Globe Widget loaded successfully! Polling for application status is active.');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});
