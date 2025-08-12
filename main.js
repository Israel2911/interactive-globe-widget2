localStorage.setItem('userToken', 'guest-viewer');

function userIsAuthenticated() {
  const token = localStorage.getItem('userToken');
  return token && token !== 'guest-viewer';
}

function showLoginPrompt(message = 'Please log in to interact with universities and programs') {
  alert(message + '\n\nThe globe is free to explore, but login is required for university details and applications.');
}

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
      {
        category: "UG",
        img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png",
        title: "Undergraduate",
        text: "Bachelor-level opportunities."
      },
      {
        category: "PG", 
        img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png",
        title: "Postgraduate",
        text: "Master's & advanced programs."
      },
      {
        category: "Diploma",
        img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", 
        title: "Diploma",
        text: "Professional & foundation."
      },
      {
        category: "Mobility",
        img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png",
        title: "Semester Abroad", 
        text: "Exchange & mobility."
      },
      {
        category: "Upskilling",
        img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png",
        title: "Upskilling",
        text: "Short-term training."
      },
      {
        category: "Research",
        img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg",
        title: "Research", 
        text: "Opportunities & links."
      }
    ];
    return false;
  }
}

async function fetchDataFromBackend() {
  try {
    let headers = {};
    if (userIsAuthenticated()) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('userToken')}`;
    }
    
    console.log('🔄 Fetching data from server...');
    const response = await fetch('/api/globe-data', { headers });
    
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
        'Europe': europeContent,
        'Thailand': newThailandContent, 
        'Canada': canadaContent,
        'UK': ukContent,
        'USA': usaContent,
        'India': indiaContent,
        'Singapore': singaporeContent,
        'Malaysia': malaysiaContent
      };
      
      allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent];
      
      console.log('✅ Data loaded successfully!');
      return true;
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    countryConfigs = [
      {"name": "India", "lat": 22, "lon": 78, "color": 0xFF9933},
      {"name": "Europe", "lat": 48.8566, "lon": 2.3522, "color": 0x0000FF},
      {"name": "UK", "lat": 53, "lon": -0.1276, "color": 0x191970},
      {"name": "Singapore", "lat": 1.35, "lon": 103.8, "color": 0xff0000},
      {"name": "Malaysia", "lat": 4, "lon": 102, "color": 0x0000ff},
      {"name": "Thailand", "lat": 13.7563, "lon": 100.5018, "color": 0xffcc00},
      {"name": "Canada", "lat": 56.1304, "lon": -106.3468, "color": 0xff0000},
      {"name": "USA", "lat": 39.8283, "lon": -98.5795, "color": 0x003366}
    ];
    europeContent = Array(27).fill(null);
    newThailandContent = Array(27).fill(null);
    canadaContent = Array(27).fill(null);
    ukContent = Array(27).fill(null);
    usaContent = Array(27).fill(null);
    indiaContent = Array(27).fill(null);
    singaporeContent = Array(27).fill(null);
    malaysiaContent = Array(27).fill(null);
  }
  return false;
}

function getMatchingCountries(category) {
  if (!globalContentMap || Object.keys(globalContentMap).length === 0) {
    return [];
  }
  
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

function highlightCountriesByProgram(programType) {
  console.log('🌍 Highlighting countries for program:', programType);
  
  const matchingCountries = getMatchingCountries(programType);
  
  Object.keys(countryBlocks).forEach(countryName => {
    const countryBlock = countryBlocks[countryName];
    if (countryBlock && countryBlock.material) {
      countryBlock.material.emissiveIntensity = 0.6;
    }
  });
  
  matchingCountries.forEach(countryName => {
    const countryBlock = countryBlocks[countryName];
    if (countryBlock && countryBlock.material) {
      countryBlock.material.emissiveIntensity = 1.5;
      
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

function highlightNeuralCubesByProgram(category) {
  console.log(`🌍 Global neural cube filtering for: ${category}`);
  
  const matchingCountries = getMatchingCountries(category);
  
  Object.keys(neuralCubeMap).forEach(countryName => {
    const cube = neuralCubeMap[countryName];
    if (cube && typeof TWEEN !== 'undefined') {
      new TWEEN.Tween(cube.scale)
        .to({ x: 1.0, y: 1.0, z: 1.0 }, 300)
        .start();
    }
  });
  
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
  
  Object.values(neuralCubeMap).forEach(cube => {
    cube.children.forEach(subCube => {
      if (subCube.userData.isSubCube) {
        subCube.material.emissiveIntensity = 0.6;
        new TWEEN.Tween(subCube.scale).to({ x: 1.0, y: 1.0, z: 1.0 }, 200).start();
      }
    });
  });
  
  Object.entries(globalContentMap).forEach(([countryName, content]) => {
    const neuralCube = neuralCubeMap[countryName];
    if (!neuralCube) return;
    
    content.forEach((program, index) => {
      if (matcher(program)) {
        const subCube = neuralCube.children[index];
        if (subCube && subCube.userData.isSubCube) {
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

async function populateCarousel() {
    await fetchCarouselData();
    
    const container = document.getElementById('carouselContainer');
    if (!container) {
      console.log('❌ Carousel container not found');
      return;
    }
    
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
    
    document.querySelectorAll('.carousel-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            const category = this.dataset.category;
            console.log(`🌍 Global filtering activated for: ${category}`);
            
            highlightCountriesByProgram(category);
            highlightNeuralCubesByProgram(category);
            highlightMatchingSubCubes(category);
        });
    });
    
    const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
    if (defaultCard) {
        defaultCard.classList.add('selected');
        setTimeout(() => {
          highlightCountriesByProgram('UG');
          highlightNeuralCubesByProgram('UG');
          highlightMatchingSubCubes('UG');
        }, 1000);
    }
    
    console.log('✅ Carousel populated successfully');
}

function scrollCarousel(direction) {
    const container = document.getElementById('carouselContainer');
    if (!container) return;
    
    const card = container.querySelector('.carousel-card');
    if (!card) return;
    
    const cardWidth = card.offsetWidth + 16;
    container.scrollBy({
        left: direction * cardWidth,
        behavior: 'smooth'
    });
}

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

function zoomGlobeIn() {
  if (!controls || !renderer) {
    console.error('Controls or renderer not initialized yet');
    return;
  }
  
  console.log('Zooming in with + button...');
  
  const wheelEvent = new WheelEvent('wheel', {
    deltaY: -120,
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
  
  const wheelEvent = new WheelEvent('wheel', {
    deltaY: 120,
    bubbles: true,
    cancelable: true,
    clientX: renderer.domElement.width / 2,
    clientY: renderer.domElement.height / 2
  });
  
  renderer.domElement.dispatchEvent(wheelEvent);
}

function toggleGlobeRotation() {
  if (controls) {
    controls.autoRotate = !controls.autoRotate;
    
    const rotateBtn = document.getElementById('btn-rotate');
    const panBtn = document.getElementById('btn-pan');
    
    if (controls.autoRotate) {
      isPanMode = false;
      controls.enableRotate = true;
      controls.enablePan = true;
      
      if (rotateBtn) {
        rotateBtn.style.background = '#ffa500';
        rotateBtn.style.color = '#222';
      }
      
      if (panBtn) {
        panBtn.style.background = '#223366';
        panBtn.style.color = '#fff';
        panBtn.title = 'Enter Pan Mode';
      }
    } else {
      if (rotateBtn) {
        rotateBtn.style.background = '#223366';
        rotateBtn.style.color = '#fff';
      }
    }
  }
}

// **FIXED: Updated togglePanMode function with proper mouse button mapping and transform control management**
function togglePanMode() {
  if (controls) {
    isPanMode = !isPanMode;
    
    const panBtn = document.getElementById('btn-pan');
    const rotateBtn = document.getElementById('btn-rotate');
    
    if (isPanMode) {
      // **FIXED: Proper pan mode setup**
      controls.autoRotate = false;
      controls.enableRotate = false;
      controls.enablePan = true;
      
      // **CRITICAL FIX: Disable transform controls during pan to prevent drawing**
      if (transformControls) {
        transformControls.enabled = false;
        transformControls.visible = false;
      }
      
      // **FIX: Set proper mouse button mapping for pan mode**
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,      // Left mouse button pans in pan mode
        MIDDLE: THREE.MOUSE.DOLLY,  // Middle button zooms
        RIGHT: THREE.MOUSE.ROTATE   // Right button rotates
      };
      
      if (panBtn) {
        panBtn.style.background = '#ffa500';
        panBtn.style.color = '#222';
        panBtn.title = 'Exit Pan Mode (Drag to Move)';
      }
      
      if (rotateBtn) {
        rotateBtn.style.background = '#223366';
        rotateBtn.style.color = '#fff';
      }
    } else {
      // **FIXED: Restore normal controls**
      controls.enableRotate = true;
      controls.enablePan = true;
      
      // **CRITICAL FIX: Re-enable transform controls**
      if (transformControls) {
        transformControls.enabled = true;
      }
      
      // **FIX: Restore default mouse button mapping**
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,   // Left mouse button rotates (default)
        MIDDLE: THREE.MOUSE.DOLLY,  // Middle button zooms
        RIGHT: THREE.MOUSE.PAN      // Right button pans (default)
      };
      
      if (panBtn) {
        panBtn.style.background = '#223366';
        panBtn.style.color = '#fff';
        panBtn.title = 'Enter Pan Mode';
      }
    }
    
    console.log(isPanMode ? '🖐️ Pan mode enabled - left click drags to move globe' : '🔄 Pan mode disabled - normal rotation enabled');
  }
}

// **FIXED: Enhanced initializeThreeJS with clipping fixes**
function initializeThreeJS() {
  console.log('🔄 Initializing Three.js...');
  
  scene = new THREE.Scene();
  
  // **FIXED: Reduced near plane from 0.1 to 0.01 to prevent close clipping**
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 5000);
  
  // **FIXED: Added logarithmic depth buffer for better zoom precision**
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    logarithmicDepthBuffer: true,  // Prevents z-fighting and depth issues
    precision: 'highp'  // Higher precision for better rendering
  });
  
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
  
  // **FIXED: Set proper zoom limits to prevent excessive close-up distortion**
  controls.minDistance = 0.1;   // Allow very close zoom
  controls.maxDistance = 15;    // Reasonable max distance
  
  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
  });
  scene.add(transformControls);
  
  // **ENHANCED LIGHTING: Better lighting to reduce visual artifacts**
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);  // Increased intensity
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);  // Increased intensity
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0x336699, 0.8);  // Increased intensity
  backLight.position.set(-5, -5, -5);
  scene.add(backLight);
  
  camera.position.z = 5;
  
  console.log('✅ Three.js initialized successfully');
}

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

// **FIXED: Updated createNeuralCube function with clipping fixes**
function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
  let contentIdx = 0;
  const cubeObject = new THREE.Group();
  
  // **FIXED: Disable frustum culling to prevent disappearing on zoom**
  cubeObject.frustumCulled = false;
  
  for (let xi = -1; xi <= 1; xi++) {
    for (let yi = -1; yi <= 1; yi++) {
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
        microcube.userData = { 
          ...userData,
          isSubCube: true,
          initialPosition: pos.clone()
        };
        
        // **FIXED: Disable frustum culling for individual subcubes**
        microcube.frustumCulled = false;
        
        // **FIXED: Better material depth handling**
        if (microcube.material) {
          microcube.material.depthTest = true;
          microcube.material.depthWrite = true;
          microcube.material.alphaTest = 0.1;  // Prevent z-fighting with transparent areas
        }
        
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

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
}

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

function drawAllConnections() {
  const countryNames = ["India", "Europe", "UK", "Canada", "USA", "Singapore", "Malaysia"];
  const pairs = countryNames.map(country => ["Thailand", country]);
  arcPaths = pairs.map(([from, to]) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    if (fromBlock && toBlock) return createConnectionPath(fromBlock, toBlock);
  }).filter(Boolean);
}

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

function hideInfoPanel() {
  document.getElementById('infoPanelOverlay').style.display = 'none';
}

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
      if (!userIsAuthenticated()) {
        showLoginPrompt('Please log in to view detailed university programs and application links');
        return;
      }
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

// **FIXED: Updated pan mouse handlers with conflict prevention**
function onCanvasMouseDownPan(event) {
  mouseDownPos.set(event.clientX, event.clientY);
  
  // **FIXED: Only handle pan dragging in pan mode**
  if (isPanMode) {
    isDragging = true;
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    renderer.domElement.style.cursor = 'grabbing';
    
    // **CRITICAL FIX: Prevent other event handlers from interfering**
    event.preventDefault();
    event.stopPropagation();
  }
}

function onCanvasMouseMovePan(event) {
  // **FIXED: Only process in pan mode and when actually dragging**
  if (isPanMode && isDragging) {
    const deltaMove = {
      x: event.clientX - previousMousePosition.x,
      y: event.clientY - previousMousePosition.y
    };
    
    const panSpeed = 0.002;
    const deltaX = deltaMove.x * panSpeed;
    const deltaY = deltaMove.y * panSpeed;
    
    controls.object.position.x -= deltaX;
    controls.target.x -= deltaX;
    controls.object.position.y += deltaY;
    controls.target.y += deltaY;
    
    controls.update();
    
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    
    // **PREVENT DEFAULT BEHAVIOR**
    event.preventDefault();
    event.stopPropagation();
  }
}

function onCanvasMouseUpPan(event) {
  if (isPanMode) {
    isDragging = false;
    renderer.domElement.style.cursor = isPanMode ? 'grab' : 'default';
    
    // **PREVENT OTHER HANDLERS FROM FIRING**
    event.preventDefault();
    event.stopPropagation();
  }
  
  onCanvasMouseUp(event);
}

function setupEventListeners() {
  renderer.domElement.addEventListener('mousedown', onCanvasMouseDownPan);
  renderer.domElement.addEventListener('mousemove', onCanvasMouseMovePan);
  renderer.domElement.addEventListener('mouseup', onCanvasMouseUpPan);
  
  renderer.domElement.addEventListener('mouseenter', () => {
    if (isPanMode) {
      renderer.domElement.style.cursor = 'grab';
    }
  });
  
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
    
    setTimeout(() => {
      highlightCountriesByProgram("UG");
    }, 500);
  });
  
  console.log('✅ Globe and cubes created successfully');
}

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

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Loading Interactive Globe Widget...');
  
  try {
    console.log('1️⃣ Fetching server data...');
    const dataLoaded = await fetchDataFromBackend();
    
    console.log('2️⃣ Initializing Three.js...');
    initializeThreeJS();
    
    console.log('3️⃣ Setting up event listeners...');
    setupEventListeners();
    
    console.log('4️⃣ Creating globe and cubes...');
    await createGlobeAndCubes();
    
    console.log('5️⃣ Populating carousel...');
    await populateCarousel();
    
    console.log('6️⃣ Starting animation...');
    animate();
    
    const leftBtn = document.getElementById('carouselScrollLeft');
    const rightBtn = document.getElementById('carouselScrollRight');
    if (leftBtn) leftBtn.onclick = () => scrollCarousel(-1);
    if (rightBtn) rightBtn.onclick = () => scrollCarousel(1);
    
    console.log('✅ Globe Widget loaded successfully!');
    
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});

function simulateLogin() {
  localStorage.setItem('userToken', 'authenticated-user-token');
  alert('Logged in! You can now access detailed university information and application links.');
  location.reload();
}

function logout() {
  localStorage.setItem('userToken', 'guest-viewer');
  alert('Logged out. Globe exploration continues, but detailed features require login.');
  location.reload();
}
