// ======================================================
//      Global Education Alliance - Interactive Globe
//
//          --- SINGLE FILE VERSION ---
// ======================================================

// --- Global Scope: Three.js, State, and Data Variables ---

// Core Three.js Components
let scene, camera, renderer, controls, globeGroup, transformControls, raycaster, clock, fontLoader;
let mouse = new THREE.Vector2();

// Interaction and State Management
let mouseDownPos = new THREE.Vector2();
let previousMousePosition = { x: 0, y: 0 };
let isPanMode = false;
let isRotationPaused = false;
let isCubeMovementPaused = false;
let isDragging = false;
let isInteracting = false; // Used to pause hover effects during drag
let authStatus = { isAuthenticated: false, user: null };

// Globe Object Collections
const cubes = [];
const velocities = [];
const countryBlocks = {};
const countryLabels = [];
const neuralCubeMap = {};
let neuralNetworkLines;
let arcPaths = [];
let arcParticles = [];

// Data Arrays for Each Cube
let europeContent = [], newThailandContent = [], canadaContent = [], ukContent = [], usaContent = [], indiaContent = [], singaporeContent = [], malaysiaContent = [];
const europeSubCubes = [], newThailandSubCubes = [], canadaSubCubes = [], ukSubCubes = [], usaSubCubes = [], indiaSubCubes = [], singaporeSubCubes = [], malaysiaSubCubes = [];
const explodedPositions = [], newThailandExplodedPositions = [], canadaExplodedPositions = [], ukExplodedPositions = [], usaExplodedPositions = [], indiaExplodedPositions = [], singaporeExplodedPositions = [], malaysiaExplodedPositions = [];
let allUniversityContent = [], countryConfigs = [], carouselData = [];

// Explosion State Flags
let isEuropeCubeExploded = false, isNewThailandCubeExploded = false, isCanadaCubeExploded = false, isUkCubeExploded = false, isUsaCubeExploded = false, isIndiaCubeExploded = false, isSingaporeCubeExploded = false, isMalaysiaCubeExploded = false;

// Hover Card Elements
let hoverCard, currentlyHovered, hoverTimeout;

// Constants
const GLOBE_RADIUS = 1.0;
const count = 150, maxRadius = 1.5, vortexCubeSize = 0.01, microGap = 0.002, explodedSpacing = 0.1;

// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Loading Interactive Globe Widget...');
    hoverCard = document.getElementById('hover-card'); // Safely initialize here
    try {
        await initializeExperience();
        console.log('✅ Globe Widget loaded successfully!');
    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
    }
});

async function initializeExperience() {
    // 1. Fetch data
    await fetchAuthStatus();
    await Promise.all([
        fetchDataFromBackend(),
        fetchCarouselData()
    ]);
    
    // 2. Setup 3D Scene
    initializeThreeJS();
    
    // 3. Create objects
    await createGlobeAndCubes();
    
    // 4. Setup UI and Interactions
    setupEventListeners();
    await populateCarousel();
    
    // 5. Initial state check
    if (authStatus.isAuthenticated) {
        console.log('🎮 Activating cubes for authenticated user!');
        setTimeout(() => activateAllCubes(), 500); // Delay for visual effect
    }
    
    // 6. Start loops
    startAuthStatusPolling();
    animate();
}

// ======================================================
// DATA FETCHING & AUTHENTICATION
// ======================================================

async function fetchAuthStatus() {
  // Fetches the user's login status from the server
  try {
    const res = await fetch('/api/auth/status', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    authStatus = { isAuthenticated: !!data.isAuthenticated, user: data.user || null };
  } catch (e) {
    console.error('Auth status fetch failed. Assuming logged out.', e);
    authStatus = { isAuthenticated: false, user: null };
  }
}

function startAuthStatusPolling() {
  // Periodically checks if the user has logged in/out in another tab
  setInterval(async () => {
    const oldStatus = authStatus.isAuthenticated;
    await fetchAuthStatus();
    if (!oldStatus && authStatus.isAuthenticated) {
      activateAllCubes();
    }
    if (oldStatus && !authStatus.isAuthenticated) {
      showNotification('Logged out successfully.', false);
      // You might want to deactivate cubes here as well
    }
  }, 5000); // Check every 5 seconds
}

async function fetchDataFromBackend() {
  // Fetches all university and country data
  try {
    const data = await (await fetch('/api/globe-data')).json();
    europeContent = data.europeContent || [];
    newThailandContent = data.newThailandContent || [];
    canadaContent = data.canadaContent || [];
    ukContent = data.ukContent || [];
    usaContent = data.usaContent || [];
    indiaContent = data.indiaContent || [];
    singaporeContent = data.singaporeContent || [];
    malaysiaContent = data.malaysiaContent || [];
    countryConfigs = data.countryConfigs || [];
    globalContentMap = { 'Europe': europeContent, 'Thailand': newThailandContent, 'Canada': canadaContent, 'UK': ukContent, 'USA': usaContent, 'India': indiaContent, 'Singapore': singaporeContent, 'Malaysia': malaysiaContent };
    allUniversityContent = Object.values(globalContentMap).flat();
  } catch (error) {
    console.error('❌ Error fetching data, using fallback:', error);
    // Provide minimal data for the globe to render without content
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
  }
}

async function fetchCarouselData() {
  // Fetches data for the bottom carousel
  try {
    const data = await (await fetch('/api/carousel/data')).json();
    carouselData = data;
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
  }
}

// ======================================================
// THREE.JS SCENE, OBJECTS, & ANIMATION
// ======================================================

function initializeThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 1000);
    camera.position.z = 3.5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.id = 'threejs-canvas';
    document.body.appendChild(renderer.domElement);

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const neuronContainer = new THREE.Group();
    neuronContainer.name = "NeuronContainer";
    globeGroup.add(neuronContainer);
    neuronGroup = neuronContainer;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 1.5;
    controls.maxDistance = 10.0;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate');
    transformControls.addEventListener('dragging-changed', event => { controls.enabled = !event.value; });
    transformControls.visible = false;
    scene.add(transformControls);

    scene.add(new THREE.AmbientLight(0x88ccff, 1.5));
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    raycaster = new THREE.Raycaster();
    clock = new THREE.Clock();
    fontLoader = new THREE.FontLoader();
    
    addInfoPanelStyles();
}

function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
    let contentIdx = 0;
    const cubeObject = new THREE.Group();
    for (let xi = -1; xi <= 1; xi++) {
        for (let yi = -1; yi <= 1; yi++) {
            for (let zi = -1; zi <= 1; zi++) {
                if (xi === 0 && yi === 0 && zi === 0) continue; // Skip center cube
                
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
        }
    }
    return cubeObject;
}

async function createGlobeAndCubes() {
    // This function populates the scene with all the 3D objects
    createNeuralNetwork();

    const cubeCreationPromises = [
        { name: 'Europe', content: europeContent, subCubes: europeSubCubes, explodedPositions: explodedPositions, color: '#003366' },
        { name: 'Thailand', content: newThailandContent, subCubes: newThailandSubCubes, explodedPositions: newThailandExplodedPositions, color: '#A52A2A' },
        { name: 'Canada', content: canadaContent, subCubes: canadaSubCubes, explodedPositions: canadaExplodedPositions, color: '#006400' },
        { name: 'UK', content: ukContent, subCubes: ukSubCubes, explodedPositions: ukExplodedPositions, color: '#483D8B' },
        { name: 'USA', content: usaContent, subCubes: usaSubCubes, explodedPositions: usaExplodedPositions, color: '#B22234' },
        { name: 'India', content: indiaContent, subCubes: indiaSubCubes, explodedPositions: indiaExplodedPositions, color: '#FF9933' },
        { name: 'Singapore', content: singaporeContent, subCubes: singaporeSubCubes, explodedPositions: singaporeExplodedPositions, color: '#EE2536' },
        { name: 'Malaysia', content: malaysiaContent, subCubes: malaysiaSubCubes, explodedPositions: malaysiaExplodedPositions, color: '#FFD700' }
    ];

    cubeCreationPromises.forEach((config, i) => {
        const cubeObject = createNeuralCube(config.content, config.subCubes, config.explodedPositions, config.color);
        const r = maxRadius * (0.8 + Math.random() * 0.2); // Place them in an outer shell
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        cubeObject.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        cubeObject.userData.neuralName = config.name;
        neuronGroup.add(cubeObject);
        cubes.push(cubeObject);
        velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.001, (Math.random() - 0.5) * 0.001, (Math.random() - 0.5) * 0.001));
        neuralCubeMap[config.name] = cubeObject;
        // Assign the global variable for the cube (e.g., europeCube)
        switch(config.name) {
            case 'Europe': europeCube = cubeObject; break;
            case 'Thailand': newThailandCube = cubeObject; break;
            case 'Canada': canadaCube = cubeObject; break;
            case 'UK': ukCube = cubeObject; break;
            case 'USA': usaCube = cubeObject; break;
            case 'India': indiaCube = cubeObject; break;
            case 'Singapore': singaporeCube = cubeObject; break;
            case 'Malaysia': malaysiaCube = cubeObject; break;
        }
    });
    
    // Add decorative nodes
    for (let i = 0; i < count - cubeCreationPromises.length; i++) {
        const r = maxRadius * Math.random();
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
        const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
        const cubeObject = new THREE.Mesh(new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), material);
        cubeObject.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        cubeObject.userData.isSmallNode = true;
        neuronGroup.add(cubeObject);
        cubes.push(cubeObject);
        velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002));
    }
    
    // Create Globe and Country Markers
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
        setTimeout(() => { highlightCountriesByProgram("UG"); }, 1000);
    });
}

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (controls && controls.enabled) {
        controls.update();
    }
    if (typeof TWEEN !== 'undefined') {
        TWEEN.update();
    }

    // Hover Card Logic
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

    // Animate arcs and labels
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

    // Animate cubes
    if (!isCubeMovementPaused) {
        const explosionStateMap = {
            'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,
            'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,
            'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded
        };
        const boundaryRadius = 1.0;
        const buffer = 0.02;

        cubes.forEach((cube, i) => {
            const isExploded = cube.userData.neuralName && explosionStateMap[cube.userData.neuralName];
            if (!isExploded) {
                cube.position.add(velocities[i]);
                if (cube.position.length() > maxRadius - buffer) {
                    cube.position.normalize().multiplyScalar(maxRadius - buffer);
                    velocities[i].reflect(cube.position.clone().normalize());
                }
            }
        });

        if (neuralNetworkLines && neuralNetworkLines.visible) {
            // Your neural network line drawing logic here...
        }
    }

    renderer.render(scene, camera);
}


// ======================================================
// EVENT HANDLERS & UI
// ======================================================

function setupEventListeners() {
    renderer.domElement.addEventListener('mousedown', onCanvasMouseDown);
    renderer.domElement.addEventListener('mouseup', onCanvasMouseUp);
    
    // Global mouse move for raycasting
    window.addEventListener('mousemove', (event) => {
        const canvasRect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    }, false);
    
    // UI Buttons
    const panSpeed = 0.1;
    document.getElementById('btn-up')?.addEventListener('click', () => { controls.target.y += panSpeed; controls.update(); });
    document.getElementById('btn-down')?.addEventListener('click', () => { controls.target.y -= panSpeed; controls.update(); });
    document.getElementById('btn-left')?.addEventListener('click', () => { controls.target.x -= panSpeed; controls.update(); });
    document.getElementById('btn-right')?.addEventListener('click', () => { controls.target.x += panSpeed; controls.update(); });
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => { controls.zoomIn(); });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => { controls.zoomOut(); });
    document.getElementById('btn-rotate')?.addEventListener('click', () => setInteractionMode('ROTATE'));
    document.getElementById('btn-pan')?.addEventListener('click', () => setInteractionMode('PAN'));
    
    document.getElementById('pauseButton')?.addEventListener('click', (e) => {
        isRotationPaused = !isRotationPaused;
        controls.autoRotate = !isRotationPaused;
        e.target.textContent = isRotationPaused ? "Resume Rotation" : "Pause Rotation";
    });
    
    document.getElementById('pauseCubesButton')?.addEventListener('click', (e) => {
        isCubeMovementPaused = !isCubeMovementPaused;
        e.target.textContent = isCubeMovementPaused ? "Resume Cube Motion" : "Pause Cube Motion";
    });
    
    document.getElementById('toggleMeshButton')?.addEventListener('click', (e) => {
        const wireframeMesh = globeGroup.children.find(c => c.material?.wireframe);
        if (wireframeMesh) {
            wireframeMesh.visible = !wireframeMesh.visible;
            e.target.textContent = wireframeMesh.visible ? "Hide Globe Mesh" : "Show Globe Mesh";
        }
    });

    document.getElementById('arcToggleBtn')?.addEventListener('click', () => {
        if(arcPaths.length > 0) {
            const visible = !arcPaths[0].visible;
            arcPaths.forEach(p => { p.visible = visible; });
        }
    });

    document.getElementById('toggleNodesButton')?.addEventListener('click', (e) => {
        const neuralNodes = cubes.filter(cube => cube.userData.isSmallNode);
        if (neuralNodes.length > 0) {
            const newVisibility = !neuralNodes[0].visible;
            neuralNodes.forEach(node => node.visible = newVisibility);
            if (neuralNetworkLines) neuralNetworkLines.visible = newVisibility;
            e.target.textContent = newVisibility ? "Hide Neural Nodes" : "Show Neural Nodes";
        }
    });

    const scrollLockButton = document.getElementById('scrollLockBtn');
    if (scrollLockButton) {
        const setGlobeInteraction = (isInteractive) => {
            if (controls) controls.enabled = isInteractive;
            scrollLockButton.textContent = isInteractive ? 'Unlock Scroll' : 'Lock Globe';
            scrollLockButton.classList.toggle('unlocked', !isInteractive);
            document.getElementById('scrollLockInstruction').textContent = isInteractive ? 'Globe is active.' : 'Page scroll is active.';
        }
        scrollLockButton.addEventListener('click', () => setGlobeInteraction(!controls.enabled));
    }

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (!controls) return;
        switch(event.code) {
            case 'ArrowUp': case 'KeyW': controls.target.y += 0.1; break;
            case 'ArrowDown': case 'KeyS': controls.target.y -= 0.1; break;
            case 'ArrowLeft': case 'KeyA': controls.target.x -= 0.1; break;
            case 'ArrowRight': case 'KeyD': controls.target.x += 0.1; break;
            case 'Equal': case 'NumpadAdd': controls.dollyIn(); break;
            case 'Minus': case 'NumpadSubtract': controls.dollyOut(); break;
            case 'Space': event.preventDefault(); document.getElementById("pauseButton")?.click(); break;
        }
        controls.update();
    });
    
    window.addEventListener('resize', updateCanvasSize, false);
}


function onCanvasMouseDown(event) {
  isInteracting = true; // Set flag to indicate user is interacting
  clearTimeout(hoverTimeout); // Prevent hover card from hiding during a click
  mouseDownPos.set(event.clientX, event.clientY);
}

function onCanvasMouseUp(event) {
    const deltaX = Math.abs(event.clientX - mouseDownPos.x);
    const deltaY = Math.abs(event.clientY - mouseDownPos.y);

    // If the mouse moved significantly, it's a drag, not a click.
    if (deltaX > 5 || deltaY > 5) {
        isInteracting = false;
        return;
    }

    isInteracting = false;

    // Ignore clicks on the info panel or hover card
    if (event.target.closest('.info-panel') || event.target.closest('#hover-card')) {
        return;
    }

    raycaster.setFromCamera(mouse, camera);
    const allClickableObjects = [...Object.values(countryBlocks), ...neuronGroup.children];
    const intersects = raycaster.intersectObjects(allClickableObjects, true);

    if (intersects.length === 0) {
        closeAllExploded();
        return;
    }

    const clickedObject = intersects[0].object;

    // Case 1: Clicked on a country block
    if (clickedObject.userData.countryName) {
        const countryName = clickedObject.userData.countryName;
        const toggleFunc = toggleFunctionMap[countryName];
        if (toggleFunc) {
            const anyExploded = Object.values(isExplodedMap()).some(v => v);
            closeAllExploded(); // Close any other open cube
            // Add a delay to allow the close animation to finish before the new one starts
            setTimeout(() => toggleFunc(), anyExploded ? 600 : 100); 
        }
        return;
    }

    // Case 2: Clicked on a sub-cube within a neural cluster
    let parent = clickedObject;
    let neuralName = null;
    let clickedSubCubeLocal = clickedObject.userData.isSubCube ? clickedObject : null;
    while (parent) {
        if (parent.userData.neuralName) {
            neuralName = parent.userData.neuralName;
            break;
        }
        parent = parent.parent;
    }

    if (neuralName) {
        const isExploded = isExplodedMap()[neuralName];
        const toggleFunc = toggleFunctionMap[neuralName];

        if (isExploded && clickedSubCubeLocal && clickedSubCubeLocal.userData.university !== "Unassigned") {
            // If the cube is exploded and we clicked a sub-cube, show the info panel
            if (authStatus.isAuthenticated) {
                showInfoPanel(clickedSubCubeLocal.userData);
            } else {
                window.open('https://www.globaleducarealliance.com/home?promptLogin=1', '_blank');
            }
        } else {
            // Otherwise, toggle the explosion state of the main cube
            const anyExploded = Object.values(isExplodedMap()).some(v => v);
            closeAllExploded();
            setTimeout(() => toggleFunc(), anyExploded ? 600 : 100);
        }
    } else {
        closeAllExploded();
    }
}

// Utility to get current explosion states
function isExplodedMap() {
    return {
        'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded,
        'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded,
        'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded
    };
}


function createToggleFunction(cubeName) {
  return function() {
    let explosionStates = {
        'Europe': { isExploded: isEuropeCubeExploded, set: (v) => isEuropeCubeExploded = v, cube: europeCube, subCubes: europeSubCubes, positions: explodedPositions },
        'Thailand': { isExploded: isNewThailandCubeExploded, set: (v) => isNewThailandCubeExploded = v, cube: newThailandCube, subCubes: newThailandSubCubes, positions: newThailandExplodedPositions },
        'Canada': { isExploded: isCanadaCubeExploded, set: (v) => isCanadaCubeExploded = v, cube: canadaCube, subCubes: canadaSubCubes, positions: canadaExplodedPositions },
        'UK': { isExploded: isUkCubeExploded, set: (v) => isUkCubeExploded = v, cube: ukCube, subCubes: ukSubCubes, positions: ukExplodedPositions },
        'USA': { isExploded: isUsaCubeExploded, set: (v) => isUsaCubeExploded = v, cube: usaCube, subCubes: usaSubCubes, positions: usaExplodedPositions },
        'India': { isExploded: isIndiaCubeExploded, set: (v) => isIndiaCubeExploded = v, cube: indiaCube, subCubes: indiaSubCubes, positions: indiaExplodedPositions },
        'Singapore': { isExploded: isSingaporeCubeExploded, set: (v) => isSingaporeCubeExploded = v, cube: singaporeCube, subCubes: singaporeSubCubes, positions: singaporeExplodedPositions },
        'Malaysia': { isExploded: isMalaysiaCubeExploded, set: (v) => isMalaysiaCubeExploded = v, cube: malaysiaCube, subCubes: malaysiaSubCubes, positions: malaysiaExplodedPositions }
    };
    
    const targetCube = explosionStates[cubeName];
    if (!targetCube || !targetCube.cube) return;

    const shouldBeExploded = !targetCube.isExploded;
    targetCube.set(shouldBeExploded);

    const targetPosition = new THREE.Vector3();
    if (shouldBeExploded) {
        targetCube.cube.getWorldPosition(targetPosition);
        transformControls.attach(targetCube.cube);
    } else {
        targetPosition.set(0, 0, 0);
        transformControls.detach();
    }
    
    new TWEEN.Tween(controls.target)
        .to(targetPosition, 800)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();

    transformControls.visible = shouldBeExploded;
    
    targetCube.subCubes.forEach((subCube, i) => {
      const targetPos = shouldBeExploded ? targetCube.positions[i] : subCube.userData.initialPosition;
      new TWEEN.Tween(subCube.position)
        .to(targetPos, 800)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();
    });
  }
}

const toggleFunctionMap = {
  'Europe': createToggleFunction('Europe'), 'Thailand': createToggleFunction('Thailand'),
  'Canada': createToggleFunction('Canada'), 'UK': createToggleFunction('UK'),
  'USA': createToggleFunction('USA'), 'India': createToggleFunction('India'),
  'Singapore': createToggleFunction('Singapore'), 'Malaysia': createToggleFunction('Malaysia')
};

// ======================================================
// UI & UTILITY FUNCTIONS
// ======================================================

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

function showNotification(message, isSuccess = true) {
  const div = document.createElement('div');
  const icon = isSuccess ? '✅' : '❌';
  const cssClass = isSuccess ? 'notification' : 'notification error';
  div.innerHTML = `<div class="${cssClass}" onclick="this.remove()">${icon} ${message}</div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function createTexture(text, logoUrl, bgColor = '#003366') {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle'; // Center text vertically
  
  const texture = new THREE.CanvasTexture(canvas);

  const drawText = () => {
    const lines = text.split('\\n');
    const fontSize = lines.length > 1 ? 28 : 32;
    ctx.font = `bold ${fontSize}px Arial`;
    
    let y = size / 2;
    if (lines.length > 1) {
        y -= (lines.length -1) * (fontSize + 6) / 2; // Adjust start position for multi-line text
    }

    lines.forEach(line => {
      ctx.fillText(line, size / 2, y);
      y += (fontSize + 6);
    });
    
    texture.needsUpdate = true;
  };

  if (logoUrl) {
    const logoImg = new Image();
    logoImg.crossOrigin = "Anonymous";
    logoImg.onload = () => {
      ctx.drawImage(logoImg, (size - 64) / 2, 30, 64, 64); // Center the logo
      drawText();
    };
    logoImg.onerror = () => {
      drawText(); // Draw text even if logo fails
    };
    logoImg.src = logoUrl;
  } else {
    drawText();
  }

  return new THREE.MeshStandardMaterial({
      map: texture,
      emissive: new THREE.Color(bgColor),
      emissiveIntensity: 0.6
  });
}

function getMatchingCountries(category) {
    if (!globalContentMap || Object.keys(globalContentMap).length === 0) return [];
    const lowerCaseCategory = category.toLowerCase();
    const matchers = {
        'ug': /bachelor|bba|undergraduate|bsn|degree/i,
        'pg': /master|mba|postgraduate|ms|msn|phd/i,
        'mobility': /exchange|abroad|mobility|study/i,
        'diploma': /diploma/i,
        'upskilling': /cyber|data|tech|ux|upskill|certificate/i,
        'research': /research|phd|doctor/i
    };
    const regex = matchers[lowerCaseCategory];
    if (!regex) return [];

    return Object.keys(globalContentMap).filter(country =>
        globalContentMap[country].some(p => p && regex.test(p.programName))
    );
}

function highlightCountriesByProgram(level) {
    const matchingCountries = getMatchingCountries(level);
    Object.entries(countryBlocks).forEach(([countryName, block]) => {
        const isActive = matchingCountries.includes(countryName);
        const labelItem = countryLabels.find(item => item.block === block);
        
        new TWEEN.Tween(block.material)
            .to({ emissiveIntensity: isActive ? 1.8 : 0.4, opacity: isActive ? 1.0 : 0.7 }, 300)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(block.scale)
            .to({ x: isActive ? 1.2 : 1.0, y: isActive ? 1.2 : 1.0, z: isActive ? 1.2 : 1.0 }, 300)
            .easing(TWEEN.Easing.Elastic.Out)
            .start();

        if (labelItem) {
            labelItem.label.material.color.set(isActive ? 0xffff00 : 0xffffff);
        }
    });
}

function highlightNeuralCubesByProgram(selectedCategory) {
    const category = selectedCategory.toLowerCase();
    const matchingCountries = getMatchingCountries(category);

    Object.keys(neuralCubeMap).forEach(countryName => {
        const cube = neuralCubeMap[countryName];
        if (cube) {
            const scale = matchingCountries.includes(countryName) ? 1.3 : 1.0;
            new TWEEN.Tween(cube.scale).to({ x: scale, y: scale, z: scale }, 500).easing(TWEEN.Easing.Elastic.Out).start();
        }
    });

    const matchers = {
        'ug': /ug|undergraduate|degree|bachelor|bsn|bba|business school|academic/i,
        'pg': /pg|postgraduate|master|msc|ma|msn|mba|phd|public policy|journalism|prospectus/i,
        'diploma': /diploma/i,
        'mobility': /exchange|mobility|semester|abroad|short|global/i,
        'upskilling': /upskill|certificat|short|cyber|data|stack|design/i,
        'research': /research|phd|doctor/i
    };
    const regex = matchers[category];

    cubes.forEach(cube => {
        if (cube.children.length > 10) { // It's a neural cluster
            cube.children.forEach(subCube => {
                if (!subCube.userData || !subCube.userData.programName) return;
                const prog = subCube.userData.programName.toLowerCase();
                const shouldHighlight = regex ? regex.test(prog) : false;
                
                new TWEEN.Tween(subCube.material)
                    .to({ emissiveIntensity: shouldHighlight ? 1.5 : 0.2, opacity: shouldHighlight ? 1.0 : 0.25 }, 300)
                    .start();
                new TWEEN.Tween(subCube.scale)
                    .to({ x: shouldHighlight ? 1.3 : 1.0, y: shouldHighlight ? 1.3 : 1.0, z: shouldHighlight ? 1.3 : 1.0 }, 300)
                    .easing(TWEEN.Easing.Elastic.Out)
                    .start();
            });
        }
    });
}

async function populateCarousel() {
  const container = document.getElementById('carouselContainer');
  if (!container) return;
  container.innerHTML = '';
  carouselData.forEach(item => {
    container.insertAdjacentHTML('beforeend',
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
      highlightCountriesByProgram(category);
      highlightNeuralCubesByProgram(category);
    });
  });
  const defaultCard = document.querySelector('.carousel-card[data-category="UG"]');
  if (defaultCard) {
    defaultCard.classList.add('selected');
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

function togglePrivacySection() {
  const privacy = document.querySelector('.privacy-assurance');
  const trust = document.querySelector('.trust-indicators');
  privacy.classList.toggle('active');
  trust.classList.toggle('active');
  if (privacy.classList.contains('active')) {
    privacy.scrollIntoView({ behavior: 'smooth' });
  }
}
