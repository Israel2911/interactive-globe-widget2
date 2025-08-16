// =====
// WIX MEMBERS AUTHENTICATION 
// =====
import { authentication } from 'wix-members-frontend';

async function isWixMemberLoggedIn() {
    try {
        const member = await authentication.currentUser.getMember();
        return member !== null;
    } catch (error) {
        console.log('Member check failed:', error);
        return false;
    }
}

async function getCurrentMemberInfo() {
    try {
        const member = await authentication.currentUser.getMember();
        return {
            isAuthenticated: !!member,
            user: member ? {
                name: member.profile.nickname || member.profile.slug,
                email: member.loginEmail,
                id: member._id
            } : null
        };
    } catch (error) {
        return { isAuthenticated: false, user: null };
    }
}

async function updateWixAuthStatus() {
    const authIndicator = document.getElementById('auth-indicator');
    if (!authIndicator) return;
    
    const authData = await getCurrentMemberInfo();
    
    if (authData.isAuthenticated) {
        authIndicator.innerHTML = `
            <div style="color: green; padding: 10px; background: rgba(0,255,0,0.1); border-radius: 5px;">
                🔐 Logged in as ${authData.user.name || authData.user.email}
                <button onclick="wixLogout()" style="margin-left: 10px; padding: 5px 10px;">Logout</button>
            </div>
        `;
        activateAllCubes();
    } else {
        authIndicator.innerHTML = `
            <div style="color: orange; padding: 10px; background: rgba(255,165,0,0.1); border-radius: 5px;">
                🛡️ Login required for program details - Click subcubes to login
            </div>
        `;
    }
}

async function wixLogout() {
    try {
        await authentication.logout();
        showNotification('You have been logged out.');
        location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
        showNotification('Could not log out at this time.', false);
    }
}

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

// =============
// GLOBE WIDGET LOGIC
// =============
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

// Fetch data from Wix backend
async function fetchCarouselData() {
    try {
        const response = await fetch('/_functions/carouselData');
        if (response.ok) {
            carouselData = await response.json();
            console.log('📊 Carousel data loaded from Wix backend:', carouselData);
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

async function fetchDataFromBackend() {
    try {
        console.log('🔄 Fetching data from Wix backend...');
        const response = await fetch('/_functions/globeData');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Wix backend data received:', data);
            
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
            
            allUniversityContent = [...europeContent, ...newThailandContent, ...canadaContent, ...ukContent, ...usaContent, ...indiaContent, ...singaporeContent, ...malaysiaContent];
            
            console.log('✅ Data loaded successfully from Wix!');
            return true;
        }
    } catch (error) {
        console.error('❌ Error fetching from Wix backend:', error);
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

// Three.js initialization
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
    scene.add(new THREE.AmbientLight(0x88ccff, 1.5));
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    console.log('✅ Three.js initialized successfully');
}

// Utility functions  
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
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(text, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ map: texture, emissive: new THREE.Color(bgColor), emissiveIntensity: 0.6 });
}

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

// Globe and cubes creation
async function createGlobeAndCubes() {
    console.log('🔄 Creating globe and cubes...');
    
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
        }
        else if (i === 1) { 
            cubeObject = createNeuralCube(newThailandContent, newThailandSubCubes, newThailandExplodedPositions, '#A52A2A'); 
            cubeObject.userData.neuralName = 'Thailand'; 
            newThailandCube = cubeObject; 
        }
        else if (i === 2) { 
            cubeObject = createNeuralCube(canadaContent, canadaSubCubes, canadaExplodedPositions, '#006400'); 
            cubeObject.userData.neuralName = 'Canada'; 
            canadaCube = cubeObject; 
        }
        else if (i === 3) { 
            cubeObject = createNeuralCube(ukContent, ukSubCubes, ukExplodedPositions, '#483D8B'); 
            cubeObject.userData.neuralName = 'UK'; 
            ukCube = cubeObject; 
        }
        else if (i === 4) { 
            cubeObject = createNeuralCube(usaContent, usaSubCubes, usaExplodedPositions, '#B22234'); 
            cubeObject.userData.neuralName = 'USA'; 
            usaCube = cubeObject; 
        }
        else if (i === 5) { 
            cubeObject = createNeuralCube(indiaContent, indiaSubCubes, indiaExplodedPositions, '#FF9933'); 
            cubeObject.userData.neuralName = 'India'; 
            indiaCube = cubeObject; 
        }
        else if (i === 6) { 
            cubeObject = createNeuralCube(singaporeContent, singaporeSubCubes, singaporeExplodedPositions, '#EE2536'); 
            cubeObject.userData.neuralName = 'Singapore'; 
            singaporeCube = cubeObject; 
        }
        else if (i === 7) { 
            cubeObject = createNeuralCube(malaysiaContent, malaysiaSubCubes, malaysiaExplodedPositions, '#FFD700'); 
            cubeObject.userData.neuralName = 'Malaysia'; 
            malaysiaCube = cubeObject; 
        }
        else {
            cubeObject = new THREE.Group();
            const subCubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400, emissiveIntensity: 0.6 });
            const microcube = new THREE.Mesh( new THREE.BoxGeometry(vortexCubeSize, vortexCubeSize, vortexCubeSize), subCubeMaterial );
            cubeObject.add(microcube);
            cubeObject.userData.isSmallNode = true;
        }
        
        cubeObject.position.set(x, y, z);
        neuronGroup.add(cubeObject);
        cubes.push(cubeObject);
        velocities.push(new THREE.Vector3( (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002 ));
        if (cubeObject.userData.neuralName) { 
            neuralCubeMap[cubeObject.userData.neuralName] = cubeObject; 
        }
    }
    
    // Create globe surface
    new THREE.TextureLoader().load("https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg", (tex) => {
        const globe = new THREE.Mesh( new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64), new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.28 }) );
        globeGroup.add(globe);
    });
    
    // Create country blocks
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        countryConfigs.forEach(config => {
            const size = 0.03; 
            const blockGeometry = new THREE.BoxGeometry(size, size, size);
            const blockMaterial = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.6 });
            const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
            blockMesh.userData.countryName = config.name;
            const position = latLonToVector3(config.lat, config.lon, 1.1);
            blockMesh.position.copy(position);
            blockMesh.lookAt(0, 0, 0);
            globeGroup.add(blockMesh);
            countryBlocks[config.name] = blockMesh;
        });
    });
    
    console.log('✅ Globe and cubes created successfully');
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (controls && controls.enabled) { controls.update(); }
    renderer.render(scene, camera);
}

function showNotification(message, isSuccess = true) {
    const div = document.createElement('div');
    const bgColor = isSuccess ? '#4CAF50' : '#ff4444';
    const icon = isSuccess ? '✅' : '❌';
    
    div.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: white; padding: 15px; border-radius: 8px; z-index: 3000; cursor: pointer;" onclick="this.remove()">
            ${icon} ${message}
        </div>
    `;
    document.body.appendChild(div);
    
    setTimeout(() => div.remove(), 5000);
}

// =============
// STARTUP SEQUENCE 
// =============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Loading Interactive Globe Widget with Wix Members...');
    
    if (!document.getElementById('auth-indicator')) {
        const indicator = document.createElement('div');
        indicator.id = 'auth-indicator';
        indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; font-size: 14px; max-width: 300px;';
        document.body.appendChild(indicator);
    }
    
    try {
        console.log('1️⃣ Initializing Wix Members authentication...');
        
        authentication.onLogin(async (member) => {
            console.log('🔑 Member logged in:', member.profile.nickname || member.loginEmail);
            await updateWixAuthStatus();
            showNotification(`Welcome back, ${member.profile.nickname || member.loginEmail}!`);
        });
        
        authentication.onLogout(() => {
            console.log('👋 Member logged out');
            showNotification('Logged out successfully');
            setTimeout(() => location.reload(), 1000);
        });
        
        await updateWixAuthStatus();
        
        console.log('2️⃣ Fetching server data...');
        await fetchDataFromBackend();
        
        console.log('3️⃣ Initializing Three.js...');
        initializeThreeJS();
        
        console.log('4️⃣ Creating globe and cubes...');
        await createGlobeAndCubes();
        
        console.log('5️⃣ Starting animation...');
        animate();
        
        console.log('✅ Globe Widget with Wix Members loaded successfully!');
        
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        showNotification('Failed to initialize globe widget', false);
    }
});
