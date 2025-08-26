// =============
// ==  PART 1: SETUP, AUTH, AND DATA
// =============

// === Authentication & Redirection ===
function redirectToWix() { /* no-op */ }
async function requireLoginAndGo() { return; }
async function isLoggedIn() { return false; }
async function updateAuthStatus() { /* no-op */ }
async function handleCallback() { /* no-op */ }
async function logout() { window.top.location.href = 'https://www.globaleducarealliance.com/home'; }
async function openStudentDashboard() { await requireLoginAndGo(); }
async function uploadDocument() { await requireLoginAndGo(); }

// === Global Variables & Constants ===
let scene, camera, renderer, controls, globeGroup, transformControls;
let isPanMode = false, isRotationPaused = false, isCubeMovementPaused = false;
let europeCube, newThailandCube, canadaCube, ukCube, usaCube, indiaCube, singaporeCube, malaysiaCube;
const europeSubCubes = [], newThailandSubCubes = [], canadaSubCubes = [], ukSubCubes = [], usaSubCubes = [], indiaSubCubes = [], singaporeSubCubes = [], malaysiaSubCubes = [];
const explodedPositions = [], newThailandExplodedPositions = [], canadaExplodedPositions = [], ukExplodedPositions = [], usaExplodedPositions = [], indiaExplodedPositions = [], singaporeExplodedPositions = [], malaysiaExplodedPositions = [];
let isEuropeCubeExploded = false, isNewThailandCubeExploded = false, isCanadaCubeExploded = false, isUkCubeExploded = false, isUsaCubeExploded = false, isIndiaCubeExploded = false, isSingaporeCubeExploded = false, isMalaysiaCubeExploded = false;
const neuronGroup = new THREE.Group();
const velocities = [], cubes = [];
const neuralCubeMap = {}, countryBlocks = {}, globalContentMap = {};
let arcPaths = [], countryLabels = [];
const fontLoader = new THREE.FontLoader(), raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(), clock = new THREE.Clock(), mouseDownPos = new THREE.Vector2();
let allUniversityContent = [], countryConfigs = [], carouselData = [];
let currentlyHovered = null, hoverCard, hoverTimeout;
let authStatus = { isAuthenticated: false, user: null };
const explodedSpacing = 0.1, vortexCubeSize = 0.01, microGap = 0.002, maxRadius = 1.5, count = 150, GLOBE_RADIUS = 1.0;

// === Auth & Data Fetching ===
async function fetchAuthStatus() {
    try {
        const res = await fetch('/api/auth/status', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error('Auth status fetch failed');
        const data = await res.json();
        authStatus = { isAuthenticated: !!data.isAuthenticated, user: data.user || null };
    } catch (e) {
        console.error(e.message);
        authStatus = { isAuthenticated: false, user: null };
    }
}

function startAuthStatusPolling() {
    setInterval(async () => {
        const oldStatus = authStatus.isAuthenticated;
        await fetchAuthStatus();
        if (!oldStatus && authStatus.isAuthenticated) activateAllCubes();
        if (oldStatus && !authStatus.isAuthenticated) showNotification('Logged out.', false);
    }, 5000);
}

async function fetchDataFromBackend() {
    try {
        const response = await fetch('/api/globe-data');
        if (!response.ok) throw new Error('Globe data fetch failed');
        const data = await response.json();
        europeContent = data.europeContent || [];
        newThailandContent = data.newThailandContent || [];
        canadaContent = data.canadaContent || [];
        ukContent = data.ukContent || [];
        usaContent = data.usaContent || [];
        indiaContent = data.indiaContent || [];
        singaporeContent = data.singaporeContent || [];
        malaysiaContent = data.malaysiaContent || [];
        countryConfigs = data.countryConfigs || [];
        Object.assign(globalContentMap, {
            'Europe': europeContent, 'Thailand': newThailandContent, 'Canada': canadaContent, 'UK': ukContent,
            'USA': usaContent, 'India': indiaContent, 'Singapore': singaporeContent, 'Malaysia': malaysiaContent
        });
        allUniversityContent = Object.values(globalContentMap).flat();
    } catch (error) {
        console.error('Using fallback globe data:', error.message);
        countryConfigs = [{name: "India", lat: 22, lon: 78, color: 0xFF9933}, {name: "Europe", lat: 48.8566, lon: 2.3522, color: 0x0000FF}];
    }
}

async function fetchCarouselData() {
    try {
        const response = await fetch('/api/carousel/data');
        if (!response.ok) throw new Error('Carousel data fetch failed');
        carouselData = await response.json();
    } catch (error) {
        console.log('Using fallback carousel data:', error.message);
        carouselData = [
          { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level programs." },
          { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's and advanced degrees." }
        ];
    }
}

// === Program Filtering / Highlighting & UI ===
function getMatchingCountries(category) {
    if (!globalContentMap) return [];
    const matcherMap = {
        'ug': /bachelor|bba|undergraduate|bsn|degree/i,
        'pg': /master|mba|postgraduate|ms|msn/i,
    };
    const matcher = matcherMap[category.toLowerCase()];
    if (!matcher) return [];
    return Object.keys(globalContentMap).filter(country => 
        globalContentMap[country].some(p => p && matcher.test(p.programName))
    );
}

function highlightCountriesByProgram(level) {
    const matchingCountries = getMatchingCountries(level);
    Object.entries(countryBlocks).forEach(([countryName, block]) => {
        const isActive = matchingCountries.includes(countryName);
        new TWEEN.Tween(block.material).to({ emissiveIntensity: isActive ? 1.8 : 0.4, opacity: isActive ? 1.0 : 0.7 }, 300).start();
        new TWEEN.Tween(block.scale).to({ x: isActive ? 1.2 : 1.0, y: isActive ? 1.2 : 1.0, z: isActive ? 1.2 : 1.0 }, 300).start();
        const labelItem = countryLabels.find(item => item.block === block);
        if (labelItem) labelItem.label.material.color.set(isActive ? 0xffff00 : 0xffffff);
    });
}

function highlightNeuralCubesByProgram(selectedCategory) {
    const category = selectedCategory.toLowerCase();
    const matchingCountries = getMatchingCountries(category);
    const matcherMap = {
        'ug': /ug|undergraduate|degree|bachelor|bsn|bba/i,
        'pg': /pg|postgraduate|master|msc|ma|msn|mba|phd/i,
    };
    const regex = matcherMap[category];

    Object.keys(neuralCubeMap).forEach(countryName => {
        const cube = neuralCubeMap[countryName];
        if (cube) {
            const scale = matchingCountries.includes(countryName) ? 1.3 : 1.0;
            new TWEEN.Tween(cube.scale).to({ x: scale, y: scale, z: scale }, 500).start();
        }
    });

    cubes.forEach(cube => {
        if (cube.isGroup && cube.children.length > 10) { // Neural Cluster
            cube.children.forEach(subCube => {
                if (!subCube.userData?.programName) return;
                const shouldHighlight = regex ? regex.test(subCube.userData.programName.toLowerCase()) : false;
                new TWEEN.Tween(subCube.material).to({ emissiveIntensity: shouldHighlight ? 1.5 : 0.2, opacity: shouldHighlight ? 1.0 : 0.25 }, 300).start();
                new TWEEN.Tween(subCube.scale).to({ x: shouldHighlight ? 1.3 : 1.0, y: shouldHighlight ? 1.3 : 1.0, z: shouldHighlight ? 1.3 : 1.0 }, 300).start();
            });
        }
    });
}

async function populateCarousel() {
  await fetchCarouselData();
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
       </a>`
    );
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
  const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
  if (defaultCard) {
    defaultCard.classList.add('selected');
    setTimeout(() => { highlightCountriesByProgram('UG'); highlightNeuralCubesByProgram('UG'); }, 1000);
  }
}

function scrollCarousel(direction) {
  const container = document.getElementById('carouselContainer');
  if (!container) return;
  const card = container.querySelector('.carousel-card');
  if (!card) return;
  const cardWidth = card.offsetWidth + 16;
  container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
}

// === TOGGLE FUNCTION CREATION ===
const toggleFunctionMap = {};

function createToggleFunctions() {
    const stateFlags = {
        'Europe': { get: () => isEuropeCubeExploded, set: (v) => isEuropeCubeExploded = v, cube: () => europeCube, subCubes: () => europeSubCubes, positions: () => explodedPositions },
        'Thailand': { get: () => isNewThailandCubeExploded, set: (v) => isNewThailandCubeExploded = v, cube: () => newThailandCube, subCubes: () => newThailandSubCubes, positions: () => newThailandExplodedPositions },
        'Canada': { get: () => isCanadaCubeExploded, set: (v) => isCanadaCubeExploded = v, cube: () => canadaCube, subCubes: () => canadaSubCubes, positions: () => canadaExplodedPositions },
        'UK': { get: () => isUkCubeExploded, set: (v) => isUkCubeExploded = v, cube: () => ukCube, subCubes: () => ukSubCubes, positions: () => ukExplodedPositions },
        'USA': { get: () => isUsaCubeExploded, set: (v) => isUsaCubeExploded = v, cube: () => usaCube, subCubes: () => usaSubCubes, positions: () => usaExplodedPositions },
        'India': { get: () => isIndiaCubeExploded, set: (v) => isIndiaCubeExploded = v, cube: () => indiaCube, subCubes: () => indiaSubCubes, positions: () => indiaExplodedPositions },
        'Singapore': { get: () => isSingaporeCubeExploded, set: (v) => isSingaporeCubeExploded = v, cube: () => singaporeCube, subCubes: () => singaporeSubCubes, positions: () => singaporeExplodedPositions },
        'Malaysia': { get: () => isMalaysiaCubeExploded, set: (v) => isMalaysiaCubeExploded = v, cube: () => malaysiaCube, subCubes: () => malaysiaSubCubes, positions: () => malaysiaExplodedPositions },
    };

    Object.keys(stateFlags).forEach(name => {
        toggleFunctionMap[name] = function() {
            const config = stateFlags[name];
            if (!config.cube()) {
                console.error(`Cube for ${name} is not defined.`);
                return;
            }

            const shouldBeExploded = !config.get();
            config.set(shouldBeExploded);

            const targetPosition = new THREE.Vector3();
            if (shouldBeExploded) {
                config.cube().getWorldPosition(targetPosition);
                transformControls.attach(config.cube());
            } else {
                transformControls.detach();
            }

            new TWEEN.Tween(controls.target).to(targetPosition, 800).easing(TWEEN.Easing.Cubic.InOut).start();
            transformControls.visible = shouldBeExploded;

            config.subCubes().forEach((subCube, i) => {
                const targetPos = shouldBeExploded ? config.positions()[i] : subCube.userData.initialPosition;
                new TWEEN.Tween(subCube.position).to(targetPos, 800).easing(TWEEN.Easing.Exponential.InOut).start();
            });
        };
    });
}

// ===
// CUBE CREATION (Reverted to Original Colors)
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
          // Reverted to use the default country color for all cubes
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
// CORRECTED: Creates a Mesh for the membrane effect
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
  const rainbowExtendedColors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x8a2be2, 0x9400d3, 0x7f00ff];
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

// NOTE: This assumes `arcParticles` is defined globally in your Part 1 file, e.g. let arcParticles = [];
function animateArcParticles(arc) {
  const curve = arc.userData.curve;
  if (!curve) return;
  const particleCount = 5;
  const speed = 0.5;
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
    );
    particle.userData = {
      t: Math.random(),
      speed: speed * (0.8 + Math.random() * 0.4),
      curve: curve
    };
    scene.add(particle);
    arcParticles.push(particle);
  }
}
function drawAllConnections() {
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  const originalPairs = countryNames.map(country => ["Thailand", country]);
  const additionalPairs = [
    ["India", "Canada"],
    ["India", "Europe"],
    ["Canada", "USA"]
  ];
  const allPairs = [...originalPairs, ...additionalPairs];
  arcPaths = allPairs.map(([from, to], index) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    if (fromBlock && toBlock) return createConnectionPath(fromBlock, toBlock, index);
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
  if (clickedObject.userData.countryName) {
    const countryName = clickedObject.userData.countryName;
    const correspondingNeuralCube = neuralCubeMap[countryName];
    const toggleFunc = toggleFunctionMap[countryName];
    if (correspondingNeuralCube && toggleFunc) {
      const explosionStateMap = {'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded};
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      if (typeof TWEEN !== 'undefined') { new TWEEN.Tween(correspondingNeuralCube.scale).to({ x: 1.5, y: 1.5, z: 1.5 }, 200).yoyo(true).repeat(1).start(); }
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
  
  const explosionStateMap = {'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded};
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
  const btnUp = document.getElementById('btn-up'); if (btnUp) { btnUp.addEventListener('click', () => { controls.target.y += panSpeed; controls.update(); }); }
  const btnDown = document.getElementById('btn-down'); if (btnDown) { btnDown.addEventListener('click', () => { controls.target.y -= panSpeed; controls.update(); }); }
  const btnLeft = document.getElementById('btn-left'); if (btnLeft) { btnLeft.addEventListener('click', () => { controls.target.x -= panSpeed; controls.update(); }); }
  const btnRight = document.getElementById('btn-right'); if (btnRight) { btnRight.addEventListener('click', () => { controls.target.x += panSpeed; controls.update(); }); }
  const btnZoomIn = document.getElementById('btn-zoom-in'); if (btnZoomIn) { btnZoomIn.addEventListener('click', () => { camera.position.multiplyScalar(0.9); controls.update(); }); }
  const btnZoomOut = document.getElementById('btn-zoom-out'); if (btnZoomOut) { btnZoomOut.addEventListener('click', () => { camera.position.multiplyScalar(1.1); controls.update(); }); }
  
  const btnRotate = document.getElementById('btn-rotate');
  if (btnRotate) { btnRotate.addEventListener('click', () => setInteractionMode('ROTATE')); }
  const btnPan = document.getElementById('btn-pan');
  if (btnPan) { btnPan.addEventListener('click', () => setInteractionMode('PAN')); }
  
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
  document.addEventListener('keydown', (event) => {
    if (!controls) return;
    switch(event.code) {
      case 'ArrowUp': case 'KeyW': event.preventDefault(); controls.target.y += 0.1; controls.update(); break;
      case 'ArrowDown': case 'KeyS': event.preventDefault(); controls.target.y -= 0.1; controls.update(); break;
      case 'ArrowLeft': case 'KeyA': event.preventDefault(); controls.target.x -= 0.1; controls.update(); break;
      case 'ArrowRight': case 'KeyD': event.preventDefault(); controls.target.x += 0.1; controls.update(); break;
      case 'Equal': case 'NumpadAdd': event.preventDefault(); camera.position.multiplyScalar(0.9); controls.update(); break;
      case 'Minus': case 'NumpadSubtract': event.preventDefault(); camera.position.multiplyScalar(1.1); controls.update(); break;
      case 'Space': 
        event.preventDefault(); 
        if(pauseButton) pauseButton.click();
        break;
    }
  });
  window.addEventListener('resize', () => { updateCanvasSize(); });
}
// ===
// GLOBE AND CUBES CREATION
// ===
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
// ===
// ANIMATION (with FINAL "Sticky" and Interactive Hover Card)
// ===
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

        // If we found a cube, clear any pending timeout to hide the card
        clearTimeout(hoverTimeout);
        hoverCard.classList.remove('hover-card-hidden');

        // Update card content ONLY if we hover over a NEW cube
        if (currentlyHovered !== firstIntersect) {
          currentlyHovered = firstIntersect;
          const data = firstIntersect.userData;

          document.getElementById('hover-card-title').textContent = data.university;
          document.getElementById('hover-card-program').textContent = data.programName.replace(/\\n/g, ' ');

          const infoBtn = document.getElementById('hover-card-info-btn');
          const applyBtn = document.getElementById('hover-card-apply-btn');

          // --- MAKE THE BUTTONS CLICKABLE ---
          infoBtn.onclick = () => { if (!infoBtn.disabled) window.open(data.programLink, '_blank'); };
          applyBtn.onclick = () => { if (!applyBtn.disabled) window.open(data.applyLink, '_blank'); };
          
          infoBtn.disabled = !data.programLink || data.programLink === '#';
          applyBtn.disabled = !data.applyLink || data.applyLink === '#';
        }

        // Update position based on the currently hovered cube's screen location
        const vector = new THREE.Vector3();
        currentlyHovered.getWorldPosition(vector);
        vector.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        hoverCard.style.left = `${x + 15}px`;
        hoverCard.style.top = `${y}px`;
      }
    }

    // If we did NOT find a valid cube and one was previously hovered
    if (!foundValidSubCube && currentlyHovered) {
      // ...start a timer to hide the card after a delay.
      hoverTimeout = setTimeout(() => {
        hoverCard.classList.add('hover-card-hidden');
        currentlyHovered = null; // Clear the selection after the card is hidden
      }, 3000); // 3-second grace period to move mouse to the card
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

    if (neuralNetworkLines && neuralNetworkLines.visible) {
        const vertices = [];
        const maxDist = 0.6;
        const connectionsPerCube = 3;
        for (let i = 0; i < cubes.length; i++) {
            if (!cubes[i].visible || cubes[i].userData.neuralName) continue;
            let neighbors = [];
            for (let j = i + 1; j < cubes.length; j++) {
                if (!cubes[j].visible || cubes[j].userData.neuralName) continue;
                const dist = cubes[i].position.distanceTo(cubes[j].position);
                if (dist < maxDist) {
                    neighbors.push({ dist: dist, cube: cubes[j] });
                }
            }
            neighbors.sort((a, b) => a.dist - b.dist);
            const closest = neighbors.slice(0, connectionsPerCube);
            if (closest.length > 1) {
                for (let k = 0; k < closest.length - 1; k++) {
                    const startNode = cubes[i].position;
                    const neighbor1 = closest[k].cube.position;
                    const neighbor2 = closest[k + 1].cube.position;
                    vertices.push(startNode.x, startNode.y, startNode.z);
                    vertices.push(neighbor1.x, neighbor1.y, neighbor1.z);
                    vertices.push(neighbor2.x, neighbor2.y, neighbor2.z);
                }
            }
        }
        neuralNetworkLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        neuralNetworkLines.geometry.attributes.position.needsUpdate = true;
        neuralNetworkLines.geometry.computeVertexNormals();
    }
  }

  renderer.render(scene, camera);
}
// ===
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
  hoverCard = document.getElementById('hover-card'); // Initialize the hover card
  console.log('🚀 Loading Interactive Globe Widget...');
  try {
    await fetchAuthStatus();
    if (authStatus.isAuthenticated) {
      console.log('✅ User is already authenticated on load!');
    }
    await fetchDataFromBackend();
    initializeThreeJS();
    setupEventListeners();
    await createGlobeAndCubes();
    if (authStatus.isAuthenticated) {
      console.log('🎮 Activating cubes for authenticated user!');
      setTimeout(() => {
        activateAllCubes();
      }, 500);
    }
    await populateCarousel();
    animate();
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
