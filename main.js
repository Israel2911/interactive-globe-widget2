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

let isEuropeCubeExploded = false;
let isNewThailandCubeExploded = false;
let isCanadaCubeExploded = false;
let isUkCubeExploded = false;
let isUsaCubeExploded = false;
let isIndiaCubeExploded = false;
let isSingaporeCubeExploded = false;
let isMalaysiaCubeExploded = false;

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

// Data from backend (populated after fetch)
let europeContent = [], newThailandContent = [], canadaContent = [], ukContent = [], usaContent = [], indiaContent = [], singaporeContent = [], malaysiaContent = [];
let allUniversityContent = [];
let countryPrograms = {};
let countryConfigs = [];

// SIMPLIFIED: Fetch data without authentication
async function fetchDataFromBackend() {
  try {
    // NO AUTHENTICATION - direct API call
    const response = await fetch('/api/globe-data');
    
    if (!response.ok) throw new Error('Failed to fetch data');
    
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
    
    allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent];
    
    console.log('Data fetched successfully:', data);
    
  } catch (error) {
    console.error('Error fetching data:', error);
    // Fallback - continue without data
    console.log('Continuing without backend data...');
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
  
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  
  camera.position.z = 5;
}

// FIXED: Color calculation function
function getColorByData(data) {
  const baseHue = data.domain * 30 % 360;
  const lightness = 50 + data.engagement * 25;
  const saturation = 70;
  const riskShift = data.risk > 0.5 ? 0 : 120;
  const hue = (baseHue + riskShift) % 360;
  
  // FIXED: Use setHSL instead of hsl string to avoid THREE.js warnings
  const color = new THREE.Color();
  color.setHSL(hue/360, saturation/100, lightness/100);
  color.multiplyScalar(data.confidence);
  return color;
}

// Create texture for cubes
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
  
  if (logoUrl) {
    const logoImg = new Image();
    logoImg.crossOrigin = "Anonymous";
    logoImg.src = logoUrl;
    logoImg.onload = () => {
      ctx.drawImage(logoImg, 16, 16, 64, 64);
      drawText();
    };
    logoImg.onerror = () => {
      drawText();
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

// Create neural cube structure
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  let contentIdx = 0;
  const cubeObject = new THREE.Group();
  
  for (let xi = -1; xi <= 1; xi++) {
    for (let yi = -1; yi <= 1; yi++) {
      for (let zi = -1; zi <= 1; zi++) {
        const item = content[contentIdx];
        let material, userData;
        
        if (item) {
          material = createTexture(item.programName, item.logo, color);
          userData = item;
        } else {
          material = createTexture('University', null, color);
          userData = { university: "University", programName: "Program" };
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

// Convert lat/lon to 3D position
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

// SIMPLIFIED: Show info without authentication
function showInfoPanel(data) {
  if (!data || data.university === "Unassigned") return;
  
  // Simple alert instead of complex panel
  alert(`University: ${data.university || 'University'}\nProgram: ${data.programName || 'Program'}\nClick OK to continue exploring the globe.`);
}

// FIXED: Hide info panel function
function hideInfoPanel() {
  const overlay = document.getElementById('infoPanelOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// FIXED: Carousel function
function scrollCarousel(direction) {
  console.log('Carousel scroll:', direction);
  // Add carousel logic here if needed
}

// Mouse interaction handlers - REMOVED ALL AUTH CHECKS
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
      showInfoPanel(clickedSubCube.userData);
    } else {
      const anyExploded = Object.values(explosionStateMap).some(state => state);
      closeAllExploded();
      setTimeout(() => toggleFunc(), anyExploded ? 810 : 0);
    }
  } else {
    closeAllExploded();
  }
}

// SIMPLIFIED: Setup event listeners without DOM dependencies
function setupEventListeners() {
  renderer.domElement.addEventListener('mousedown', onCanvasMouseDown);
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUp);
  
  // FIXED: Add null checks for all button elements
  const btnUp = document.getElementById('btn-up');
  if (btnUp) {
    btnUp.addEventListener('click', () => {
      controls.pan(0, -3);
      controls.update();
    });
  }
  
  const btnDown = document.getElementById('btn-down');
  if (btnDown) {
    btnDown.addEventListener('click', () => {
      controls.pan(0, 3);
      controls.update();
    });
  }
  
  const btnLeft = document.getElementById('btn-left');
  if (btnLeft) {
    btnLeft.addEventListener('click', () => {
      controls.pan(3, 0);
      controls.update();
    });
  }
  
  const btnRight = document.getElementById('btn-right');
  if (btnRight) {
    btnRight.addEventListener('click', () => {
      controls.pan(-3, 0);
      controls.update();
    });
  }
  
  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      controls.dollyIn(1.2);
      controls.update();
    });
  }
  
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      controls.dollyOut(1.2);
      controls.update();
    });
  }
  
  const btnRotate = document.getElementById('btn-rotate');
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      btnRotate.style.background = controls.autoRotate ? '#a46bfd' : 'rgba(0,0,0,0.8)';
    });
  }
  
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
  
  // Add keyboard controls as backup
  window.addEventListener('keydown', (event) => {
    switch(event.key) {
      case ' ': // Spacebar to pause rotation
        controls.autoRotate = !controls.autoRotate;
        break;
      case 'r': // R to reset view
        camera.position.set(0, 0, 5);
        controls.target.set(0, 0, 0);
        controls.update();
        break;
    }
  });
}

// Create globe and cubes
function createGlobeAndCubes() {
  createNeuralNetwork();
  
  // Default country configs if backend fails
  const defaultCountryConfigs = [
    {"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933},
    {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF},
    {"name": "UK", "lat": 53, "lon": -0.1276, "color": 0x191970},
    {"name": "Singapore", "lat": 1.35, "lon": 103.8, "color": 0xff0000},
    {"name": "Malaysia", "lat": 4, "lon": 102, "color": 0x0000ff},
    {"name": "Thailand", "lat": 13.7563, "lon": 100.5018, "color": 0xffcc00},
    {"name": "Canada", "lat": 56.1304, "lon": -106.3468, "color": 0xff0000},
    {"name": "USA", "lat": 39.8283, "lon": -98.5795, "color": 0x003366}
  ];
  
  // Use backend data or fallback to defaults
  const configs = countryConfigs.length > 0 ? countryConfigs : defaultCountryConfigs;
  
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
  
  // Create globe texture
  new THREE.TextureLoader().load("https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg", (tex) => {
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({
        map: tex,
        transparent: true,
        opacity: 0.28
      })
    );
    globeGroup.add(globe);
  });
  
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
  
  // Create country blocks
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    configs.forEach(config => {
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
      
      const lM = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lMesh = new THREE.Mesh(lG, lM);
      
      countryLabels.push({
        label: lMesh,
        block: blockMesh,
        offset: 0.06
      });
      
      globeGroup.add(lMesh);
    });
    
    drawAllConnections();
  });
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

// SIMPLIFIED: Initialize application without authentication blocking
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Interactive Globe Widget...');
  
  // Try to fetch data, but continue even if it fails
  try {
    await fetchDataFromBackend();
  } catch (error) {
    console.log('Backend fetch failed, continuing with basic globe...');
  }
  
  // Initialize Three.js
  initializeThreeJS();
  
  // Setup event listeners
  setupEventListeners();
  
  // Create globe and cubes
  createGlobeAndCubes();
  
  // Start animation
  animate();
  
  console.log('Globe Widget initialized successfully!');
});
