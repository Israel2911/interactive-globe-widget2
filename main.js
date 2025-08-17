// =============
// NEW SECURE SSO AUTHENTICATION LOGIC
// =============

// Checks the session status with your Render server
async function isLoggedIn() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        return data.isAuthenticated;
    } catch {
        return false;
    }
}

// Updates the <div> at the top-right to show login status
async function updateAuthStatus() {
    const authIndicator = document.getElementById('auth-indicator');
    if (!authIndicator) return;
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.isAuthenticated) {
            authIndicator.innerHTML = `<div style="color: green; padding: 10px; background: rgba(0,255,0,0.1); border-radius: 5px;">&#128274; Securely logged in as ${data.user.name || data.user.email} <button onclick="logout()" style="margin-left: 10px; padding: 5px 10px;">Logout</button></div>`;
        } else {
            authIndicator.innerHTML = `<div style="color: #cc0000; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 5px;">&#128737; Authentication Error: Please return to the homepage and log in.</div>`;
        }
    } catch (error) {
        authIndicator.innerHTML = '<div style="color: red;">&#9888; Auth system unavailable</div>';
    }
}

// Handles logging out
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        alert('You have been logged out.');
        window.location.href = 'https://www.globaleducarealliance.com/home';
    } catch (error) {
        console.error('Logout failed:', error);
        alert('Could not log out at this time.');
    }
}


// =============
// DATA FETCHING & UI POPULATION
// =============
let europeContent, newThailandContent, canadaContent, ukContent, usaContent, indiaContent, singaporeContent, malaysiaContent, countryPrograms, countryConfigs, carouselData = [];
let allUniversityContent = [], globalContentMap = {};

async function fetchDataFromBackend() {
    try {
        const response = await fetch('/api/globe-data');
        if (!response.ok) throw new Error('Network response was not ok');
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
        ].filter(Boolean); // Filter out any null/undefined entries
    } catch (error) {
        console.error('❌ Error fetching data:', error);
    }
}

async function fetchCarouselData() {
    try {
        const response = await fetch('/api/carousel/data');
        if (response.ok) {
            carouselData = await response.json();
        }
    } catch (error) {
        console.log('Using fallback carousel data');
        carouselData = [
            { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
            { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced programs." },
            { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
        ];
    }
}

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
    if (!container) return;
    const card = container.querySelector('.carousel-card');
    if (!card) return;
    const cardWidth = card.offsetWidth + 16;
    container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
}


// =============
// INFO PANEL LOGIC
// =============
async function showInfoPanel(data) {
    if (!(await isLoggedIn())) {
        alert("Your session has expired. Please return to the homepage to log in again.");
        return;
    }
    if (!data || data.university === "Unassigned") return;
    const uniData = allUniversityContent.filter(item => item && item.university === data.university);
    if (uniData.length === 0) return;

    const mainErasmusLink = uniData[0].erasmusLink;
    document.getElementById('infoPanelMainCard').innerHTML = `<div class="main-card-details"><img src="${uniData.logo}" alt="${data.university}"><h3>${data.university}</h3></div><div class="main-card-actions">${mainErasmusLink ? `<a href="${mainErasmusLink}" target="_blank" class="partner-cta erasmus">Erasmus Info</a>` : ''}</div>`;
    document.getElementById('infoPanelSubcards').innerHTML = '';

    uniData.forEach(item => {
        if (!item) return;
        const infoLinkAction = item.programLink && item.programLink !== '#' ? `window.open('${item.programLink}', '_blank')` : 'void(0);';
        const applyLinkAction = item.applyLink && item.applyLink !== '#' ? `window.open('${item.applyLink}', '_blank')` : 'void(0);';
        const subcardHTML = `<div class="subcard"><div class="subcard-info"><img src="${item.logo}" alt=""><h4>${item.programName.replace(/\n/g, ' ')}</h4></div><div class="subcard-buttons"><button onclick="${infoLinkAction}" class="partner-cta">University Info</button><button onclick="${applyLinkAction}" class="partner-cta apply">Apply Now</button></div></div>`;
        document.getElementById('infoPanelSubcards').insertAdjacentHTML('beforeend', subcardHTML);
    });
    document.getElementById('infoPanelOverlay').style.display = 'flex';
}

function hideInfoPanel() {
    document.getElementById('infoPanelOverlay').style.display = 'none';
}


// =============
// THREE.JS SETUP & LOGIC
// =============
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
let isInteracting = false, hoverTimeout;
let clickedSubCube = null;

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

function createTexture(text, logoUrl, bgColor = '#003366') {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
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
        logoImg.onload = () => { try { ctx.drawImage(logoImg, 16, 16, 64, 64); } catch(e) {} drawText(); };
        logoImg.onerror = () => { drawText(); }
    } else { drawText(); }
    return new THREE.MeshStandardMaterial({ map: texture, emissive: new THREE.Color(bgColor), emissiveIntensity: 0.6 });
}

function createNeuralCube(content, subCubeArray, explodedPositionArray, color) {
    let contentIdx = 0;
    const cubeObject = new THREE.Group();
    for (let xi = -1; xi <= 1; xi++)
        for (let yi = -1; yi <= 1; yi++)
            for (let zi = -1; zi <= 1; zi++) {
                if (xi === 0 && yi === 0 && zi === 0) continue;
                const item = content[contentIdx];
                let material, userData;
                if (item) {
                    material = createTexture(item.programName, item.logo, color);
                    userData = item;
                } else {
                    material = createTexture('Unassigned', null, '#333333');
                    userData = { university: "Unassigned" };
                }
                const microcube = new THREE.Mesh( new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), material );
                const pos = new THREE.Vector3( xi * (vortexCubeSize + microGap), yi * (vortexCubeSize + microGap), zi * (vortexCubeSize + microGap) );
                microcube.position.copy(pos);
                microcube.userData = { ...userData, isSubCube: true, initialPosition: pos.clone() };
                subCubeArray.push(microcube);
                explodedPositionArray.push(new THREE.Vector3( xi * explodedSpacing, yi * explodedSpacing, zi * explodedSpacing ));
                cubeObject.add(microcube);
                contentIdx++;
            }
    return cubeObject;
}

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
    controls.minDistance = 1.5;
    controls.maxDistance = 15.0;
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.visible = false;
    scene.add(transformControls);
    scene.add(new THREE.AmbientLight(0x88ccff, 1.5));
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    if (controls && !isRotationPaused) controls.update();
    renderer.render(scene, camera);
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

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        if (clickedObject.userData.isSubCube && clickedObject.userData.university !== "Unassigned") {
            showInfoPanel(clickedObject.userData);
        } else if (clickedObject.userData.countryName) {
            const countryName = clickedObject.userData.countryName;
            const toggleFunc = toggleFunctionMap[countryName];
            if(toggleFunc) toggleFunc();
        }
    } else {
        closeAllExploded();
    }
}

function createToggleFunction(cubeName) {
    return function() {
        const stateMap = { 'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded, 'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded, 'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded };
        const setStateMap = { 'Europe': v => isEuropeCubeExploded = v, 'Thailand': v => isNewThailandCubeExploded = v, 'Canada': v => isCanadaCubeExploded = v, 'UK': v => isUkCubeExploded = v, 'USA': v => isUsaCubeExploded = v, 'India': v => isIndiaCubeExploded = v, 'Singapore': v => isSingaporeCubeExploded = v, 'Malaysia': v => isMalaysiaCubeExploded = v };
        const cubeMap = { 'Europe': europeCube, 'Thailand': newThailandCube, 'Canada': canadaCube, 'UK': ukCube, 'USA': usaCube, 'India': indiaCube, 'Singapore': singaporeCube, 'Malaysia': malaysiaCube };
        const subCubeMap = { 'Europe': europeSubCubes, 'Thailand': newThailandSubCubes, 'Canada': canadaSubCubes, 'UK': ukSubCubes, 'USA': usaSubCubes, 'India': indiaSubCubes, 'Singapore': singaporeSubCubes, 'Malaysia': malaysiaSubCubes };
        const explodedPosMap = { 'Europe': explodedPositions, 'Thailand': newThailandExplodedPositions, 'Canada': canadaExplodedPositions, 'UK': ukExplodedPositions, 'USA': usaExplodedPositions, 'India': indiaExplodedPositions, 'Singapore': singaporeExplodedPositions, 'Malaysia': malaysiaExplodedPositions };

        let isExploded = stateMap[cubeName];
        let setExploded = setStateMap[cubeName];
        let subCubes = subCubeMap[cubeName];
        let explodedPos = explodedPosMap[cubeName];
        
        setExploded(!isExploded);
        isExploded = !isExploded;

        subCubes.forEach((subCube, i) => {
            const targetPos = isExploded ? explodedPos[i] : subCube.userData.initialPosition;
            new TWEEN.Tween(subCube.position).to(targetPos, 800).easing(TWEEN.Easing.Exponential.InOut).start();
        });
    };
}

const toggleFunctionMap = {
    'Europe': createToggleFunction('Europe'), 'Thailand': createToggleFunction('Thailand'),
    'Canada': createToggleFunction('Canada'), 'UK': createToggleFunction('UK'),
    'USA': createToggleFunction('USA'), 'India': createToggleFunction('India'),
    'Singapore': createToggleFunction('Singapore'), 'Malaysia': createToggleFunction('Malaysia')
};

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

async function createGlobeAndCubes() {
    const cubeData = [
        { name: 'Europe', content: europeContent, subCubes: europeSubCubes, explodedPos: explodedPositions, color: '#003366', ref: (c) => europeCube = c },
        { name: 'Thailand', content: newThailandContent, subCubes: newThailandSubCubes, explodedPos: newThailandExplodedPositions, color: '#A52A2A', ref: (c) => newThailandCube = c },
        { name: 'Canada', content: canadaContent, subCubes: canadaSubCubes, explodedPos: canadaExplodedPositions, color: '#006400', ref: (c) => canadaCube = c },
        { name: 'UK', content: ukContent, subCubes: ukSubCubes, explodedPos: ukExplodedPositions, color: '#483D8B', ref: (c) => ukCube = c },
        { name: 'USA', content: usaContent, subCubes: usaSubCubes, explodedPos: usaExplodedPositions, color: '#B22234', ref: (c) => usaCube = c },
        { name: 'India', content: indiaContent, subCubes: indiaSubCubes, explodedPos: indiaExplodedPositions, color: '#FF9933', ref: (c) => indiaCube = c },
        { name: 'Singapore', content: singaporeContent, subCubes: singaporeSubCubes, explodedPos: singaporeExplodedPositions, color: '#EE2536', ref: (c) => singaporeCube = c },
        { name: 'Malaysia', content: malaysiaContent, subCubes: malaysiaSubCubes, explodedPos: malaysiaExplodedPositions, color: '#FFD700', ref: (c) => malaysiaCube = c },
    ];
    
    cubeData.forEach(data => {
        const cube = createNeuralCube(data.content, data.subCubes, data.explodedPos, data.color);
        cube.userData.neuralName = data.name;
        data.ref(cube);
        neuronGroup.add(cube);
        neuralCubeMap[data.name] = cube;
        const config = countryConfigs.find(c => c.name === data.name);
        if (config) {
            const position = latLonToVector3(config.lat, config.lon, 1.2);
            cube.position.copy(position);
        }
    });

    new THREE.TextureLoader().load("https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg", (tex) => {
        const globe = new THREE.Mesh( new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64), new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.28 }) );
        globeGroup.add(globe);
    });
    
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        countryConfigs.forEach(config => {
            const size = 0.03; const blockGeometry = new THREE.BoxGeometry(size, size, size);
            const blockMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(config.color), emissive: new THREE.Color(config.color), emissiveIntensity: 0.6, transparent: true, opacity: 0.95 });
            const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
            blockMesh.userData.countryName = config.name;
            const position = latLonToVector3(config.lat, config.lon, 1.1);
            blockMesh.position.copy(position);
            globeGroup.add(blockMesh);
            countryBlocks[config.name] = blockMesh;
        });
    });
}

function getMatchingCountries(programLevel) {
    if (!countryPrograms) return [];
    let matchingCountries = [];
    for (const country in countryPrograms) {
        if (countryPrograms[country].includes(programLevel)) {
            matchingCountries.push(country);
        }
    }
    return matchingCountries;
}

function highlightCountriesByProgram(level) {
    const matchingCountries = getMatchingCountries(level);
    Object.entries(countryBlocks).forEach(([country, blockMesh]) => {
        const isActive = matchingCountries.includes(country);
        new TWEEN.Tween(blockMesh.material)
            .to({ emissiveIntensity: isActive ? 1.8 : 0.6, opacity: isActive ? 1.0 : 0.7 }, 500)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
    });
}

function highlightNeuralCubesByProgram(level) {
    const matchingCountries = getMatchingCountries(level);
    Object.entries(neuralCubeMap).forEach(([country, cubeGroup]) => {
        const isActive = matchingCountries.includes(country);
        cubeGroup.children.forEach(subCube => {
            new TWEEN.Tween(subCube.material)
                .to({ emissiveIntensity: isActive ? 1.5 : 0.6 }, 500)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();
        });
    });
}

function setupEventListeners() {
    renderer.domElement.addEventListener('mousedown', (e) => mouseDownPos.set(e.clientX, e.clientY), false);
    renderer.domElement.addEventListener('mouseup', onCanvasMouseUp, false);
    document.getElementById('btn-rotate').addEventListener('click', () => isRotationPaused = !isRotationPaused);
    document.getElementById('pauseButton').addEventListener('click', () => isRotationPaused = !isRotationPaused);
    document.getElementById('pauseCubesButton').addEventListener('click', () => isCubeMovementPaused = !isCubeMovementPaused);
    document.getElementById('toggleNodesButton').addEventListener('click', () => {
        neuronGroup.visible = !neuronGroup.visible;
        if(neuralNetworkLines) neuralNetworkLines.visible = !neuralNetworkLines.visible;
    });
    document.getElementById('toggleMeshButton').addEventListener('click', () => {
        const globeMesh = globeGroup.children[0];
        if(globeMesh) globeMesh.visible = !globeMesh.visible;
    });
    document.getElementById('arcToggleBtn').addEventListener('click', () => {
        arcPaths.forEach(arc => arc.visible = !arc.visible);
    });
    window.addEventListener('resize', updateCanvasSize, false);
}

function updateCanvasSize() {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// =============
// NEW STARTUP SEQUENCE - HANDLES SSO TOKEN
// =============
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Handle SSO Token on page load
    const urlParams = new URLSearchParams(window.location.search);
    const ssoToken = urlParams.get('sso_token');

    if (ssoToken) {
        try {
            const response = await fetch('/api/verify-sso-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: ssoToken })
            });
            if (response.ok) {
                console.log("SSO Token verified successfully. Session created.");
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.error("SSO Token verification failed.");
                alert("Your login session could not be verified. Please try accessing the globe from your home page again.");
            }
        } catch (error) {
            console.error("Error during SSO token verification:", error);
        }
    }

    // 2. Continue with the rest of the page load as normal
    console.log('🚀 Loading Interactive Globe Widget...');
    
    await updateAuthStatus();
    
    try {
        await fetchDataFromBackend();
        initializeThreeJS();
        setupEventListeners();
        await createGlobeAndCubes();
        await populateCarousel();
        animate();
        updateCanvasSize();
        console.log('✅ Globe Widget loaded successfully!');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});
