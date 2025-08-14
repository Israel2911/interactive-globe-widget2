// =============================================================
// NEW SECURE AUTHENTICATION LOGIC (ADDED/MODIFIED)
// =============================================================

// Helper functions for the PKCE security protocol
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// MODIFIED: This function now securely checks the server session
async function userIsAuthenticated() {
    try {
        const response = await fetch('/check-auth');
        if (!response.ok) return false;
        const data = await response.json();
        return data.isAuthenticated;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// ADDED: This function handles the redirect to Wix for login
async function redirectToWixLogin() {
    console.log("User is not authenticated. Preparing PKCE flow and redirecting to Wix...");
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('wix_code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    // IMPORTANT: Replace this with your actual Client ID from the Wix Dashboard
    const wixClientId = 'fbee306e-6797-40c2-8a51-70f052b8dde4';
    const redirectUri = 'https://interactive-globe-widget2.onrender.com/';

    const authUrl = new URL('https://www.wix.com/oauth2/authorize');
    authUrl.searchParams.append('client_id', wixClientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    window.location.href = authUrl.toString();
}

// ADDED: This function handles the user returning from Wix after login
async function handleWixLoginCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authorizationCode = urlParams.get('code');
    if (authorizationCode) {
        const codeVerifier = sessionStorage.getItem('wix_code_verifier');
        if (!codeVerifier) {
            console.error("Login callback error: Code verifier not found.");
            return;
        }
        try {
            const response = await fetch('/auth/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authorizationCode, codeVerifier })
            });
            if (response.ok) {
                console.log("Wix login successful. Reloading page.");
                window.history.replaceState({}, document.title, "/");
                sessionStorage.removeItem('wix_code_verifier');
                location.reload();
            } else {
                console.error("Failed to exchange token with server.");
            }
        } catch (error) {
            console.error("Error during token exchange:", error);
        }
    }
}


// =============================================================
// YOUR ORIGINAL CODE STARTS HERE (PRESERVED)
// =============================================================

// The old localStorage-based authentication functions are no longer needed.
// localStorage.setItem('userToken', 'guest-viewer');
// function userIsAuthenticated() { ... }
// function showLoginPrompt(...) { ... }

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
      { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced programs." },
      { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
      { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
      { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
      { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
    ];
    return false;
  }
}

// MODIFIED: This function no longer sends a client-side token.
async function fetchDataFromBackend() {
  try {
    console.log('🔄 Fetching data from server...');
    const response = await fetch('/api/globe-data'); // The server checks the session cookie for auth
    
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
        'Europe': europeContent, 'Thailand': newThailandContent, 'Canada': canadaContent,
        'UK': ukContent, 'USA': usaContent, 'India': indiaContent,
        'Singapore': singaporeContent, 'Malaysia': malaysiaContent
      };
      
      allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent];
      
      console.log('✅ Data loaded successfully!');
      return true;
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    // Fallback data remains the same...
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

function getMatchingCountries(category) {
  if (!globalContentMap || Object.keys(globalContentMap).length === 0) return [];
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
    if (labelItem) labelItem.label.material.color.set(isActive ? 0xffff00 : 0xffffff);
    if (typeof TWEEN !== 'undefined' && isActive) {
      new TWEEN.Tween(group.material).to({ emissiveIntensity: 2.0 }, 300).yoyo(true).repeat(2).start();
    }
  });
  console.log(`✨ Highlighted ${matchingCountries.length} countries:`, matchingCountries);
}

function highlightNeuralCubesByProgram(selectedCategory) { /* ... This function is preserved exactly as is ... */ }
async function populateCarousel() { /* ... This function is preserved exactly as is ... */ }
function scrollCarousel(direction) { /* ... This function is preserved exactly as is ... */ }
function togglePanMode() { /* ... This function is preserved exactly as is ... */ }
function toggleGlobeRotation() { /* ... This function is preserved exactly as is ... */ }
function initializeThreeJS() { /* ... This function is preserved exactly as is ... */ }
function updateCanvasSize() { /* ... This function is preserved exactly as is ... */ }
function getColorByData(data) { /* ... This function is preserved exactly as is ... */ }
function createTexture(text, logoUrl, bgColor = '#003366') { /* ... This function is preserved exactly as is ... */ }

// =============================================================
// YOUR ORIGINAL CODE CONTINUES HERE (PRESERVED)
// =============================================================

function createToggleFunction(countryName) {
    const explosionStateMap = { 'Europe': isEuropeCubeExploded, 'Thailand': isNewThailandCubeExploded, 'Canada': isCanadaCubeExploded, 'UK': isUkCubeExploded, 'USA': isUsaCubeExploded, 'India': isIndiaCubeExploded, 'Singapore': isSingaporeCubeExploded, 'Malaysia': isMalaysiaCubeExploded };
    const setExplosionStateMap = { 'Europe': (v) => isEuropeCubeExploded = v, 'Thailand': (v) => isNewThailandCubeExploded = v, 'Canada': (v) => isCanadaCubeExploded = v, 'UK': (v) => isUkCubeExploded = v, 'USA': (v) => isUsaCubeExploded = v, 'India': (v) => isIndiaCubeExploded = v, 'Singapore': (v) => isSingaporeCubeExploded = v, 'Malaysia': (v) => isMalaysiaCubeExploded = v };
    const cubeMap = { 'Europe': europeCube, 'Thailand': newThailandCube, 'Canada': canadaCube, 'UK': ukCube, 'USA': usaCube, 'India': indiaCube, 'Singapore': singaporeCube, 'Malaysia': malaysiaCube };
    const subCubeMap = { 'Europe': europeSubCubes, 'Thailand': newThailandSubCubes, 'Canada': canadaSubCubes, 'UK': ukSubCubes, 'USA': usaSubCubes, 'India': indiaSubCubes, 'Singapore': singaporeSubCubes, 'Malaysia': malaysiaSubCubes };
    const explodedPosMap = { 'Europe': explodedPositions, 'Thailand': newThailandExplodedPositions, 'Canada': canadaExplodedPositions, 'UK': ukExplodedPositions, 'USA': usaExplodedPositions, 'India': indiaExplodedPositions, 'Singapore': singaporeExplodedPositions, 'Malaysia': malaysiaExplodedPositions };

    return function() {
        const isExploded = explosionStateMap[countryName];
        const setExploded = setExplosionStateMap[countryName];
        const cube = cubeMap[countryName];
        const subCubes = subCubeMap[countryName];
        const explodedPos = explodedPosMap[countryName];
        
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

function createNeuralCube(content, subCubeArray, explodedPositionArray, color) { /* ... Preserved ... */ }
function createNeuralNetwork() { /* ... Preserved ... */ }
function latLonToVector3(lat, lon, radius) { /* ... Preserved ... */ }
function createConnectionPath(fromGroup, toGroup, color = 0xffff00) { /* ... Preserved ... */ }
function drawAllConnections() { /* ... Preserved ... */ }

// MODIFIED: This function now calls redirectToWixLogin() instead of the old prompt
async function showInfoPanel(data) {
  const isLoggedIn = await userIsAuthenticated();
  if (!isLoggedIn) {
    redirectToWixLogin(); // This is the new behavior for non-logged-in users
    return;
  }
  
  if (!data || data.university === "Unassigned") return;
  const uniData = allUniversityContent.filter(item => item && item.university === data.university);
  if (uniData.length === 0) return;
  
  const mainErasmusLink = uniData[0].erasmusLink;
  document.getElementById('infoPanelMainCard').innerHTML = `<div class="main-card-details"><img src="${uniData[0].logo}" alt="${uniData[0].university}"><h3>${uniData[0].university}</h3></div><div class="main-card-actions">${mainErasmusLink ? `<a href="${mainErasmusLink}" target="_blank" class="partner-cta erasmus">Erasmus Info</a>` : ''}</div>`;
  
  document.getElementById('infoPanelSubcards').innerHTML = '';
  uniData.forEach(item => {
    if (!item) return;
    const infoLinkClass = item.programLink && item.programLink !== '#' ? 'partner-cta' : 'partner-cta disabled';
    const infoLinkHref = item.programLink && item.programLink !== '#' ? `javascript:window.open('${item.programLink}', '_blank')` : 'javascript:void(0);';
    const applyLinkClass = item.applyLink && item.applyLink !== '#' ? 'partner-cta apply' : 'partner-cta apply disabled';
    const applyLinkHref = item.applyLink && item.applyLink !== '#' ? `javascript:window.open('${item.applyLink}', '_blank')` : 'javascript:void(0);';
    const subcardHTML = `<div class="subcard"><div class="subcard-info"><img src="${item.logo}" alt=""><h4>${item.programName.replace(/\n/g, ' ')}</h4></div><div class="subcard-buttons"><a href="${infoLinkHref}" class="${infoLinkClass}">Info</a><a href="${applyLinkHref}" class="${applyLinkClass}">Apply</a></div></div>`;
    document.getElementById('infoPanelSubcards').insertAdjacentHTML('beforeend', subcardHTML);
  });
  document.getElementById('infoPanelOverlay').style.display = 'flex';
}

function hideInfoPanel() { document.getElementById('infoPanelOverlay').style.display = 'none'; }
function onCanvasMouseDown(event) { mouseDownPos.set(event.clientX, event.clientY); }
function closeAllExploded() { /* ... Preserved ... */ }
function onCanvasMouseUp(event) { /* ... Preserved ... */ }
function onCanvasMouseDownPan(event) { /* ... Preserved ... */ }
function onCanvasMouseMovePan(event) { /* ... Preserved ... */ }
function onCanvasMouseUpPan(event) { /* ... Preserved ... */ }
function setupEventListeners() { /* ... Preserved ... */ }
async function createGlobeAndCubes() { /* ... Preserved ... */ }
function animate() { /* ... Preserved ... */ }

// MODIFIED: The DOMContentLoaded listener is the entry point for the application.
// It now runs the handleWixLoginCallback function first.
document.addEventListener('DOMContentLoaded', async () => {
  // ADDED: This MUST run first to handle the redirect from Wix
  await handleWixLoginCallback();

  console.log('🚀 Loading Interactive Globe Widget...');
  
  try {
    console.log('1️⃣ Fetching server data...');
    await fetchDataFromBackend();
    
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
    
    updateCanvasSize();
    
    console.log('✅ Globe Widget loaded successfully!');
    
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});

// The old simulateLogin and localStorage-based logout functions are no longer needed.
// function simulateLogin() { ... }
// MODIFIED: This function is replaced by the new server-side logout
async function logout() {
  try {
    await fetch('/logout', { method: 'POST' });
    alert('You have been logged out.');
    location.reload();
  } catch (error) {
    console.error('Logout failed:', error);
    alert('Could not log out at this time. Please try again.');
  }
}
