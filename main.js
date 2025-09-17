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
async function safeFetch(url, options = {}) {
  try {
    console.log(`🌐 Fetching: ${url}`);
    let headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (window.ssoToken) {
      headers['Authorization'] = 'Bearer ' + window.ssoToken;
    }
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers
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
let alreadyActivated = false; // <--- ADD THIS LINE HERE
// ===
// IMPROVED FETCH AUTH STATUS WITH ERROR HANDLING
async function fetchAuthStatus() {
  try {
    console.log('🔍 Fetching auth status...');
    const res = await fetch('/api/auth/status', { 
      credentials: 'include', 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(window.ssoToken ? { 'Authorization': 'Bearer ' + window.ssoToken } : {})
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


/ --- PLACE THE NEW POSTMESSAGE LISTENER HERE --- //
// For debugging, accept all origins (remove this for production or list all trusted origins)
window.addEventListener("message", event => {
  console.log("[GLOBE] Received postMessage:", event.data); // <--- ADD THIS LINE

  // if (
  //   event.origin === "https://www.globaleducarealliance.com" && // restrict in production!
  if (
    event.data &&
    event.data.type === "SET_CUBE_COLOR" &&
    event.data.universityName
  ) {
    setCubeToAppliedState(event.data.universityName);
    showNotification(
      `Application submitted for ${event.data.universityName}! Cube updated.`, true
    );
  }
});



// ===
// ===
// AUTH STATUS POLLING - IMPROVED WITH SAFER FETCH
// ===
function startAuthStatusPolling() {
  setInterval(async () => {
    const oldStatus = authStatus.isAuthenticated;
    await fetchAuthStatus();

    // Unlock only once on first authentication
    if (!oldStatus && authStatus.isAuthenticated && !alreadyActivated) {
      console.log('🎉 User authentication detected - activating cubes!');
      activateAllCubes();
      alreadyActivated = true;
    }

    // Optional: Check if user logged out, re-enable unlock for re-login
    if (oldStatus && !authStatus.isAuthenticated) {
      console.log('👋 User logged out');
      showNotification('Logged out successfully', false);
      alreadyActivated = false; // Allow cubes to unlock again on next login
    }
  }, 3000); // Check every 3 seconds
}


// vvvvv  PLACE THE NEW FUNCTION RIGHT HERE  vvvvv


/**
 * Periodically polls the server to check for notifications about
 * successful application submissions for the authenticated user.
 */
function startPollingForApplicationUpdates() {
    // Set an interval to check for updates (e.g., every 15 seconds)
    const pollInterval = 15000; 

    setInterval(async () => {
        // Only poll if the user is logged in
        if (!authStatus.isAuthenticated) {
            return;
        }

        try {
            // Use your existing safeFetch wrapper for authenticated requests
            const data = await safeFetch('/api/applications/notifications');
            
            // If the server sends back new notifications, process them
            if (data && data.notifications && data.notifications.length > 0) {
                console.log(`✅ Received ${data.notifications.length} new application updates.`);
                
                data.notifications.forEach(notification => {
                    if (notification.universityName) {
                        // This triggers the visual change on the globe
                        setCubeToAppliedState(notification.universityName);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error during application notification polling:', error);
        }
    }, pollInterval);
}

// FINAL, POWERFUL INFO PANEL SYSTEM
function buildLinkWithToken(baseUrl) {
  if (!baseUrl || baseUrl === "#") return baseUrl;
  if (window.ssoToken && baseUrl.startsWith('/api/link/')) {
    return baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(window.ssoToken);
  }
  return baseUrl;
}

;async function showInfoPanel(data) {
  // Only need the university name from clicked cube
  const universityName = data.university;
  if (!universityName || universityName === 'Unassigned') {
    console.log('❌ Clicked on an unassigned cube.');
    return;
  }
  // All programs for this university
  const uniData = allUniversityContent.filter(item => item && item.university === universityName);
  if (uniData.length === 0) {
    console.log(`❌ No content found for ${universityName}`);
    // Fallback: open whichever link is present
    const linkToOpen = data.programLink || data.applyLink;
    if (linkToOpen && linkToOpen !== '#') window.open(buildLinkWithToken(linkToOpen), '_blank');
    return;
  }
  // --- MAIN CARD ---
  const mainProgram = uniData[0];
  document.getElementById('infoPanelMainCard').innerHTML = `
    <div class="main-card-details">
      <img src="${mainProgram.logo}" alt="${mainProgram.university} Logo">
      <h3>${mainProgram.university}</h3>
    </div>
    <div class="main-card-actions">
      ${mainProgram.erasmusLink && mainProgram.erasmusLink !== '#' ? `<button class="partner-cta erasmus" onclick="window.open('${buildLinkWithToken(mainProgram.erasmusLink)}', '_blank')">Erasmus Info</button>` : ''}
    </div>
  `;
  // --- SUBCARDS ---
  const subcardsContainer = document.getElementById('infoPanelSubcards');
  subcardsContainer.innerHTML = '';
  uniData.forEach(item => {
    if (!item) return;
    const infoEnabled = item.programLink && item.programLink !== '#';
    const applyEnabled = item.applyLink && item.applyLink !== '#';
    const infoLink = buildLinkWithToken(item.programLink);
    const applyLink = buildLinkWithToken(item.applyLink);
    const subcardHTML = `
      <div class="subcard">
        <div class="subcard-info">
          <h4>${item.programName.replace(/\n/g, ' ')}</h4>
        </div>
        <div class="subcard-buttons">
          <button class="partner-cta info" ${infoEnabled ? '' : `disabled title="No info link available"`} 
                  onclick="if(${infoEnabled}) window.open('${infoLink}', '_blank')">
            University Info
          </button>
          <button class="partner-cta apply" ${applyEnabled ? '' : `disabled title="No apply link available"`} 
                  onclick="if(${applyEnabled}) window.open('${applyLink}', '_blank')">
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
// This function sets up the HTML and CSS for the panel when the page loads.
function addInfoPanelStyles() {
  const style = document.createElement('style');
  // Using the same CSS you already had
  style.textContent = `
    #infoPanelOverlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center; }
    .info-panel { background: black; padding: 20px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto; }
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
// This ensures the panel's HTML and CSS are ready when the page loads.
document.addEventListener('DOMContentLoaded', addInfoPanelStyles);
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
        <h4>${item.programName.replace(/\n/g, ' ')}</h4>
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
    .main-card-details h3 {
  color: #111 !important;
  font-weight: bold;
}
.subcard-info h4 {
  color: #111 !important;
  font-weight: bold;
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
// Find this section in your code
let isInteracting = false, hoverTimeout;
let clickedSubCube = null;
let currentlyHovered = null; 
let hoverCard;

// Add this new line right after
let ignoreHover = false; // This will temporarily disable hover detection
let arcParticles = []; // Store all traveling arc cubes


// ====== SSO TOKEN LISTENER GOES HERE ======
window.ssoToken = null;
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SSO_TOKEN' && event.data.token) {
    window.ssoToken = event.data.token;
    console.log("[GLOBE] SSO_TOKEN received and stored:", window.ssoToken);
    fetchAuthStatus(); // ← Updates authStatus, triggers unlock if authenticated
  }
});



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
// ===
// CONTROL TOGGLES (Corrected and Final Version)
// ===

// This single function controls whether the user is in "rotate" or "pan" mode.
// It does NOT affect the automatic rotation.
function setInteractionMode(mode) {
  if (!controls) return;

  const rotateBtn = document.getElementById('btn-rotate');
  const panBtn = document.getElementById('btn-pan');
  const canvas = renderer.domElement;

  if (mode === 'ROTATE') {
    // Set controls to ROTATE mode
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.ROTATE;

    // Set button styles for ROTATE mode
    if (rotateBtn) rotateBtn.style.background = '#a46bfd'; // Active purple color
    if (panBtn) panBtn.style.background = 'rgba(0,0,0,0.8)'; // Inactive color
    canvas.style.cursor = 'default'; // Default cursor for rotation

  } else if (mode === 'PAN') {
    // Set controls to PAN mode
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;

    // Set button styles for PAN mode
    if (rotateBtn) rotateBtn.style.background = 'rgba(0,0,0,0.8)'; // Inactive color
    if (panBtn) panBtn.style.background = '#ffa500'; // Active orange color
    canvas.style.cursor = 'grab'; // "grab" cursor for panning
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

// UTILITIES
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
function setCubeToAppliedState(programOrUniName) {
  const allSubCubes = [
    ...europeSubCubes, ...newThailandSubCubes, ...canadaSubCubes, ...ukSubCubes,
    ...usaSubCubes, ...indiaSubCubes, ...singaporeSubCubes, ...malaysiaSubCubes
  ];
  let cubesToHighlight = allSubCubes.filter(
    cube =>
      cube &&
      cube.userData.university &&
      cube.userData.university.trim().toLowerCase() === programOrUniName.trim().toLowerCase()
  );
  if (cubesToHighlight.length === 0) {
    showNotification(`No cube found for "${programOrUniName}"`, false);
    return;
  }
  cubesToHighlight.forEach(targetCube => {
    let meshes = [];
    if (targetCube.isMesh) {
      meshes = [targetCube];
    } else if (targetCube.type === "Group" && targetCube.children) {
      meshes = targetCube.children.filter(child => child.isMesh);
    }
    meshes.forEach(mesh => {
      mesh.material = new THREE.MeshStandardMaterial({
        color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 5, map: null,
        metalness: 0.18, roughness: 0.05
      });
      // --- Animation frame based blink ---
      let blinkStart = performance.now();
      function blink(time) {
        let elapsed = time - blinkStart;
        let phase = Math.floor(elapsed / 120) % 2;
        let complete = elapsed > 120 * 12; // blinks for ~1.4s
        if (complete) {
          mesh.material.color.set(0x39ff14);
          mesh.material.emissive.set(0x39ff14);
          mesh.material.emissiveIntensity = 6;
          return;
        }
        if (phase === 0) {
          mesh.material.color.set(0x39ff14);
          mesh.material.emissive.set(0x39ff14);
          mesh.material.emissiveIntensity = 8;
        } else {
          mesh.material.color.set(0x000000);
          mesh.material.emissive.set(0x000000);
          mesh.material.emissiveIntensity = 0.3;
        }
        requestAnimationFrame(blink);
      }
      requestAnimationFrame(blink);

      // ---- Neon application plaque anchored above each mesh ----
      addSimpleApplicationPlaque(mesh, "APPLICATION RECEIVED");
    });
  });
  showNotification('Neon green blink (requestAnimationFrame) and plaque applied!', true);
}

function addSimpleApplicationPlaque(mesh, text="APPLICATION RECEIVED") {
  // Remove existing sprite(s)
  mesh.children
    .filter(child => child.isSprite)
    .forEach(sprite => mesh.remove(sprite));

  const cardWidth = 240, cardHeight = 54;
  const canvas = document.createElement('canvas');
  canvas.width = cardWidth;
  canvas.height = cardHeight;
  const ctx = canvas.getContext('2d');

  // Glow frame
  ctx.save();
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#222";
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, cardWidth-16, cardHeight-16, 12);
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // Smaller font size for better fit
  ctx.font = 'bold 15px Arial';
  ctx.fillStyle = "#FFD700";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 6;
  ctx.fillText(text, cardWidth / 2, cardHeight / 2);

  const cardTexture = new THREE.CanvasTexture(canvas);
  const cardMaterial = new THREE.SpriteMaterial({ map: cardTexture, transparent: true });
  const cardSprite = new THREE.Sprite(cardMaterial);

  let geo = mesh.geometry?.parameters || { height: 0.08 };
  cardSprite.position.set(0, geo.height / 2 + 0.055, 0);
  cardSprite.scale.set(0.19, 0.046, 1);
  mesh.add(cardSprite);
  mesh.userData.messageCard = cardSprite;
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

// =============
// == FULL CORRECTED PART 2 (with "Sticky" Hover Card)
// =============
// ===
// CUBE CREATION (Reverted to Original Colors)
// ===
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
          // --- THIS IS THE REVERTED LOGIC ---
          // We are now simply using the 'color' passed into the function for all cubes.
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
// 1. At the top of your file:
const arcRouteColors = {
  "india-europe":        0x0000ff, // Blue
  "europe-india":        0x0000ff, // Blue
  "india-canada":        0xff0033, // Red
  "canada-india":        0xff0033, // Red
  "thailand-usa":        0x39ff14, // Green
  "usa-thailand":        0x00aaff, // Pure Electric Blue
  "thailand-canada":     0x7d00ff, // Indigo
  "canada-thailand":     0xff8800, // Orange (this is the explicit orange mapping!)
  "thailand-europe":     0x7d00ff, // Indigo
  "europe-thailand":     0x7d00ff, // Indigo
  "malaysia-singapore":  0xffff00, // Yellow
  "singapore-malaysia":  0xffff00, // Yellow
  "thailand-singapore":  0xe100ff, // Violet
  "singapore-thailand":  0xe100ff, // Violet
  "india-thailand":      0x7d00ff, // Indigo
  "thailand-india":      0x00aaff, // Pure Electric Blue
  "europe-canada":       0xff8800  // Orange
  // Add new routes as needed!
};

const rainbowExtendedColors = [
  0xff0033, // Red
  0xff8800, // Orange
  0xffff00, // Yellow
  0x39ff14, // Green
  0x00cfff, // Neon Sky Blue
  0x00aaff, // Pure Electric Blue
  0x7d00ff, // Indigo
  0xe100ff  // Violet
];

// 2. Use this for scalable arc connection drawing:
const arcPairs = [
  ["Thailand", "India"],
  ["Thailand", "Europe"],
  ["Thailand", "UK"],
  ["Thailand", "Canada"],
  ["Thailand", "USA"],
  ["Thailand", "Singapore"],
  ["Thailand", "Malaysia"],
  ["India", "Europe"],
  ["India", "Canada"],
  ["India", "Thailand"],
  ["Europe", "India"],
  ["Europe", "Canada"],
  ["Europe", "Thailand"],
  ["Canada", "USA"],
  ["Canada", "Thailand"],    // <-- This triggers the explicit orange arc!
  ["USA", "Thailand"],
  ["Malaysia", "Singapore"],
  ["Singapore", "Malaysia"],
  ["Singapore", "Thailand"]
  // Add more as needed!
];

// 3. Your arc creation code (no changes except for how arcPairs is fed in):
function createConnectionPath(fromGroup, toGroup, arcIndex = 0) {
  const fromName = (fromGroup.userData.countryName || '').toLowerCase();
  const toName = (toGroup.userData.countryName || '').toLowerCase();
  const routeKey = `${fromName}-${toName}`;
  const color = arcRouteColors[routeKey] !== undefined
    ? arcRouteColors[routeKey]
    : rainbowExtendedColors[arcIndex % rainbowExtendedColors.length];
  const start = new THREE.Vector3(); fromGroup.getWorldPosition(start);
  const end = new THREE.Vector3(); toGroup.getWorldPosition(end);
  const globeRadius = 1.0; const arcOffset = 0.05;
  const distance = start.distanceTo(end); const arcElevation = distance * 0.4;
  const offsetStart = start.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const offsetEnd = end.clone().normalize().multiplyScalar(globeRadius + arcOffset);
  const mid = offsetStart.clone().add(offsetEnd).multiplyScalar(0.5)
    .normalize().multiplyScalar(globeRadius + arcOffset + arcElevation);
  const curve = new THREE.QuadraticBezierCurve3(offsetStart, mid, offsetEnd);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.008, 24, false);
  const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const fragmentShader = `varying vec2 vUv; uniform float time; uniform vec3 color; void main() {
    float glow = sin(time * 2.0 + vUv.x * 10.0) * 0.5 + 0.5;
    float intensity = (1.0 - abs(vUv.y - 0.5) * 2.0) * glow;
    gl_FragColor = vec4(color, intensity * 0.8);
  }`;
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

// -------- Animate arc cubes (both ways) --------
function animateArcParticles(arc, intakeLabels = ["1", "2", "3", "4", "5", "6"]) {
  const curve = arc.userData.curve;
  if (!curve) return;
  const particleCount = 6;
  const baseSpeed = 1.2; // Increased speed
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.BoxGeometry(0.009, 0.009, 0.009), // smaller
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.96 })
    );
    // Add small, low-profile white label above the cube
    const labelSprite = createBillboardLabel(intakeLabels[i]);
    particle.add(labelSprite);
    labelSprite.position.set(0, 0.014, 0); // closer to cube
    particle.userData = {
      t: (i / particleCount), // distribute along curve
      speed: baseSpeed * (0.8 + Math.random() * 0.4), // higher speed
      curve: curve
    };
    scene.add(particle);
    arcParticles.push(particle);
  }
}

// -------- Billboard label: smaller, white only --------
function createBillboardLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 28;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 16px Arial';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff'; // white font
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.025, 0.011, 1); // smaller
  return sprite;
}


//    intakeLabels: array of numbers/names for each cube
function animateArcParticles(arc, intakeLabels = ["1", "2", "3", "4", "5", "6"]) {
  const curve = arc.userData.curve;
  if (!curve) return;
  const particleCount = 6;
  const baseSpeed = 1.2;
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.BoxGeometry(0.009, 0.009, 0.009),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.96 })
    );
    // Create and add the label above each cube
    const labelSprite = createBillboardLabel(intakeLabels[i]);
    particle.add(labelSprite);
    labelSprite.position.set(0, 0.014, 0);
    // Store travel state in userData
    particle.userData = {
      t: (i / particleCount),
      speed: baseSpeed * (0.8 + Math.random() * 0.4),
      curve: curve
    };
    scene.add(particle);
    arcParticles.push(particle);
  }
}

// 5. Use arcPairs for all arc generation:
function drawAllConnections() {
  arcPaths = arcPairs.map(([from, to], index) => {
    const fromBlock = countryBlocks[from];
    const toBlock = countryBlocks[to];
    if (fromBlock && toBlock) return createConnectionPath(fromBlock, toBlock, index);
    return null;
  }).filter(Boolean);
  arcPaths.forEach((arc) => animateArcParticles(arc));
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

  // --- START: NEW MOUSE MOVE LISTENER FOR HOVER CARD ---
  window.addEventListener('mousemove', (event) => {
    // This keeps the `mouse` vector updated for the raycaster in the animate loop
    const canvasRect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
  });
  // --- END: NEW MOUSE MOVE LISTENER ---

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
// ANIMATION (with "Sticky" Hover Card Logic)
// ===
function animate() {
  requestAnimationFrame(animate);
  
  // --- START: HOVER CARD LOGIC ---
  if (hoverCard) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(neuronGroup.children, true);
    
    let foundValidSubCube = false;
    if (intersects.length > 0) {
      const firstIntersect = intersects[0].object;
      
      if (firstIntersect.userData.isSubCube && firstIntersect.userData.university !== "Unassigned") {
        foundValidSubCube = true;
        
        if (currentlyHovered !== firstIntersect) {
          currentlyHovered = firstIntersect;
          const data = firstIntersect.userData;
          
          document.getElementById('hover-card-title').textContent = data.university;
          document.getElementById('hover-card-program').textContent = data.programName.replace(/\\n/g, ' ');
          
          const infoBtn = document.getElementById('hover-card-info-btn');
          const applyBtn = document.getElementById('hover-card-apply-btn');
          
          infoBtn.disabled = !data.programLink || data.programLink === '#';
          applyBtn.disabled = !data.applyLink || data.applyLink === '#';
          
          hoverCard.classList.remove('hover-card-hidden');
        }
        
        // --- "STICKY" POSITIONING LOGIC ---
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
      currentlyHovered = null;
      hoverCard.classList.add('hover-card-hidden');
    }
  }
  // --- END: HOVER CARD LOGIC ---

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
// ===== Notification helpers =====
let pendingUnlockUserEmail = null;

function showNotification(message, isSuccess = true) {
  const div = document.createElement('div');
  const icon = isSuccess ? '✅' : '❌';
  const cssClass = isSuccess ? 'notification' : 'notification error';
  div.innerHTML = `<div class="${cssClass}" onclick="this.remove()">
      ${icon} ${message}
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ===== SINGLE postMessage handler for all cases =====
window.addEventListener('message', (event) => {
  console.log('[GLOBE] Received postMessage:', event.data);
if (event.data && event.data.type === 'SSO_TOKEN' && event.data.token) {
  window.ssoToken = event.data.token;
  console.log("[GLOBE] SSO_TOKEN received and stored:", window.ssoToken);
  fetchAuthStatus(); // <-- This updates authStatus, triggers unlock and updates UI!
  return;
}


  // SET_CUBE_COLOR - unlock cube highlight
  if (event.data && event.data.type === "SET_CUBE_COLOR" && event.data.universityName) {
    setCubeToAppliedState(event.data.universityName);
    showNotification(
      `Application submitted for ${event.data.universityName}! Cube updated.`, true
    );
    return;
  }

  // Legacy unlock (cookie/session)
  const { unlock, userEmail } = event.data || {};
  if (unlock && userEmail) {
    if (typeof activateAllCubes === 'function' && Array.isArray(cubes) && cubes.length > 0) {
      activateAllCubes();
      showNotification("All cubes unlocked for: " + userEmail, true);
      window.authStatus = { isAuthenticated: true, user: { email: userEmail }};
      console.log('Cubes unlocked by external message for', userEmail);
      fetch('/api/unlock-user-links', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      })
        .then(res => res.json())
        .then(data => {
          console.log('🔗 Backend responded (links unlocked?):', data);
        })
        .catch(err => console.error('❌ Error unlocking server links:', err));
    } else {
      pendingUnlockUserEmail = userEmail;
    }
    return;
  }

  // Unknown messages
  console.warn('GLOBE WIDGET received unknown or unsupported postMessage:', event.data);
});


// ===== DOMContentLoaded + app startup logic =====
let suppressLoginSuccessMsg = false;
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  if (
    params.get('applicationSuccess') === "1" &&
    params.get('appliedUniversity')
  ) {
    suppressLoginSuccessMsg = true;
    showNotification(
      `Application submitted for ${params.get('appliedUniversity')}! Cube updated.`, true
    );
    setTimeout(() => {
      setCubeToAppliedState(params.get('appliedUniversity'));
    }, 1000);
  }

  hoverCard = document.getElementById('hover-card');
  console.log('🚀 Loading Interactive Globe Widget...');
  try {
    // 1. Check auth status
    await fetchAuthStatus();
    if (authStatus.isAuthenticated) {
      console.log('✅ User is already authenticated on load!');
    }
    // 2. Fetch all program/cube content data
    await fetchDataFromBackend();
    // 3. Initialize the Three.js engine and globe scene
    initializeThreeJS();
    // 4. Setup all user input/event listeners for globe controls, hover, etc.
    setupEventListeners();
    // 5. Create the globe and all university cubes
    await createGlobeAndCubes();
    // 6. Apply any pending "all cubes unlocked" logic (legacy/SSO flows)
    if (pendingUnlockUserEmail) {
      activateAllCubes();
      showNotification("All cubes unlocked for: " + pendingUnlockUserEmail, true);
      window.authStatus = { isAuthenticated: true, user: { email: pendingUnlockUserEmail }};
      pendingUnlockUserEmail = null;
    }
    // 7. On authenticated reload, do not show the global unlock message if suppressed
    if (authStatus.isAuthenticated) {
      console.log('🎮 Activating cubes for authenticated user!');
      setTimeout(() => {
        if (!suppressLoginSuccessMsg) {
          showNotification("All cubes unlocked! Explore programs.", true);
        }
        activateAllCubes();
      }, 500);
    }
    // 8. Populate carousel for program levels/categories
    await populateCarousel();
    // 9. Start animation/render loop
    animate();
    // 10. Begin polling for authentication status changes
    startAuthStatusPolling();
    // 11. Hook buttons for carousel nav (if present)
    const leftBtn = document.getElementById('carouselScrollLeft');
    const rightBtn = document.getElementById('carouselScrollRight');
    if (leftBtn) leftBtn.onclick = () => scrollCarousel(-1);
    if (rightBtn) rightBtn.onclick = () => scrollCarousel(1);
    // 12. Adjust canvas/globe size for UI headers/footers
    updateCanvasSize();
    console.log('✅ Globe Widget loaded successfully!');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
  
});
