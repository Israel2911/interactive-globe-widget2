// main.js

// Add test token for initial globe rendering
localStorage.setItem('userToken', 'guest-viewer');

// Authentication helpers
function userIsAuthenticated() {
  const token = localStorage.getItem('userToken');
  return token && token !== 'guest-viewer';
}

function showLoginPrompt(message = 'Please log in to interact with universities and programs') {
  alert(message + '\n\nThe globe is free to explore, but login is required for university details and applications.');
}

// THREE.js globals
let scene, camera, renderer, controls, globeGroup, transformControls;
const neuronGroup = new THREE.Group();
const countryBlocks = {}, neuralCubeMap = {};
const clock = new THREE.Clock();

// Country definitions
const countryConfigs = [
  { name: "India", lat: 22, lon: 78, color: 0xFF9933 },
  { name: "Europe", lat: 48.8566, lon: 2.3522, color: 0x0000FF },
  { name: "UK", lat: 53, lon: -0.1276, color: 0x191970 },
  { name: "Singapore", lat: 1.35, lon: 103.8, color: 0xff0000 },
  { name: "Malaysia", lat: 4, lon: 102, color: 0x0000ff },
  { name: "Thailand", lat: 13.7563, lon: 100.5018, color: 0xffcc00 },
  { name: "Canada", lat: 56.1304, lon: -106.3468, color: 0xff0000 },
  { name: "USA", lat: 39.8283, lon: -98.5795, color: 0x003366 }
];

// University program data
const europeContent = [
  { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", programName: "Degree-Seeking" },
  { university: "University of Passau", logo: "https://static.wixstatic.com/shapes/d77f36_467b1d2eed4042eab43fdff25124915b.svg", programName: "Exchange" },
  null,null,
  { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", programName: "Full Degree" },
  { university: "ICES", logo: "https://static.wixstatic.com/media/d77f36_c11cec0bd94f4ab7a1b611cecb9e90cb~mv2.png", programName: "Mobility" },
  null,null,
  { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", programName: "Exchange" },
  { university: "Université Catholique de Lille", logo: "https://static.wixstatic.com/media/d77f36_009f964ce876419f9391e6a604f9257c~mv2.png", programName: "Summer Program" },
  null,null,
  { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", programName: "Master\nHumanitarian" },
  { university: "IRCOM", logo: "https://static.wixstatic.com/media/d77f36_592f23b64ee44211abcb87444198e26a~mv2.jpg", programName: "Mobility" },
  null,null,
  { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", programName: "Int'l Studies" },
  { university: "KATHO-NRW", logo: "https://static.wixstatic.com/shapes/d77f36_b6a110be4758449f8537733a427f2dba.svg", programName: "Study Abroad" },
  null,null,
  { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", programName: "Int'l Students" },
  { university: "TSI", logo: "https://static.wixstatic.com/media/d77f36_1992247272bb4d55a3cac5060abec418~mv2.jpeg", programName: "Innovation" },
  null,null,
  { university: "INSEEC", logo: "https://static.wixstatic.com/media/d77f36_66d4c88c4ebb4b7da6cacaed57178165~mv2.webp", programName: "Exchanges" },
  null,null
];

const newThailandContent = [
  { university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Undergraduate Business (BBA)" },
  { university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Master of Business Administration (MBA)" },
  { university: "Assumption University", logo: "https://static.wixstatic.com/media/d77f36_7dd03d8eefa54bc8a73c18f0a7f35230~mv2.png", programName: "Study Abroad / Exchange" },
  { university: "Bangkok University", logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg", programName: "Innovative Media Production" },
  { university: "Bangkok University", logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg", programName: "Media & Communication" },
  { university: "Bangkok University", logo: "https://static.wixstatic.com/media/d77f36_5d91110e0e094c799bb3647dbcbaa590~mv2.jpg", programName: "Innovation Management (MBA)" },
  { university: "Siam University", logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png", programName: "Bachelor of Business Admin. (BBA)" },
  { university: "Siam University", logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png", programName: "Master of Business Admin. (MBA)" },
  { university: "Siam University", logo: "https://static.wixstatic.com/media/d77f36_69fce6d5825e467a88fc02a01b416cf7~mv2.png", programName: "Semester Abroad / Exchange" },
  null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
];

const canadaContent = [
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "BSN" },
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MSN" },
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "Biotechnology" },
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "Computing Science" },
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MA in Leadership" },
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "MBA" },
  { university: "Trinity Western University", logo: "https://static.wixstatic.com/media/d77f36_b14379dfcff54ffcad6ed7b604debd6f~mv2.png", programName: "BBA" },
  { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "Cyber Security" },
  { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "Data Analytics" },
  { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "Full Stack Dev" },
  { university: "Wawiwa Tech Training", logo: "https://static.wixstatic.com/media/d77f36_0d83ad97a7e54b2db3f0eb089dbcec1f~mv2.webp", programName: "UX/UI Design" },
  null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
];

const ukContent = [
  { university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Business & Management" },
  { university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Healthcare & Nursing" },
  { university: "Cardiff University", logo: "https://static.wixstatic.com/media/d77f36_b277c95008c942e6877fff8631e8bc3a~mv2.avif", programName: "Public Policy" },
  { university: "Liverpool Hope University", logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg", programName: "Education" },
  { university: "Liverpool Hope University", logo: "https://static.wixstatic.com/media/d77f36_a723456d47c74ab5a85d81c4e7030ff7~mv2.jpg", programName: "Business" },
  { university: "Nottingham Trent University", logo: "https://static.wixstatic.com/media/d77f36_86cb424c04934227905daf03395fc3b1~mv2.png", programName: "Global\nPartnerships" },
  { university: "University of Exeter", logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg", programName: "Medicine" },
  { university: "University of Exeter", logo: "https://static.wixstatic.com/shapes/d77f36_ae3db739ffe74de88cd658a3878c5c9c.svg", programName: "Law" },
  { university: "UK Students Abroad", logo: "https://static.wixstatic.com/media/d77f36_0be7efbfceee4b359a597935c2851fd3~mv2.jpg", programName: "Study in SG" },
  null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
];

const usaContent = [
  { university: "John Cabot University", logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png", programName: "Degree\nPrograms" },
  { university: "John Cabot University", logo: "https://static.wixstatic.com/media/d77f36_4711ccd9b626480b929186e41e64ee28~mv2.png", programName: "Study Abroad" },
  { university: "St. Mary's University", logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png", programName: "STEM\nPrograms" },
  { university: "St. Mary's University", logo: "https://static.wixstatic.com/media/d77f36_8fda624fd9634997a589119b22051ac8~mv2.png", programName: "Int'l Services" },
  { university: "California Baptist University", logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg", programName: "STEM\nDegrees" },
  { university: "California Baptist University", logo: "https://static.wixstatic.com/shapes/d77f36_efa51305eeef47e2b02a13e35d17e251.svg", programName: "Int'l Exchange" },
  { university: "LeTourneau University", logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png", programName: "Aviation" },
  { university: "LeTourneau University", logo: "https://static.wixstatic.com/media/d77f36_2f89b58cab8349eabfafae4ee16e68a2~mv2.png", programName: "Engineering" },
  null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
];

const indiaContent = [
  { university: "Asia College of Journalism", logo: "https://static.wixstatic.com/media/d77f36_2cd674a2255f4d3f83d8b00721d6f477~mv2.png", programName: "Journalism" },
  { university: "Women's Christian College", logo: "https://static.wixstatic.com/media/d77f36_2c637647ae7145749c1a7d3f74ec6f2e~mv2.jpg", programName: "Academic\nPrograms" },
  { university: "Stella Maris College", logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png", programName: "PG Prospectus" },
  { university: "Stella Maris College", logo: "https://static.wixstatic.com/media/d77f36_e7d55cc621e54077b0205581f5323175~mv2.png", programName: "Exchange" },
  { university: "Symbiosis International University", logo: "https://static.wixstatic.com/media/d77f36_f89cf22ecc514a78b0dd8b34c656d4d9~mv2.png", programName: "Int'l\nAdmissions" },
  { university: "Fergusson College", logo: "https://static.wixstatic.com/media/d77f36_60066c9c2c0242d39e0107a2f25eb185~mv2.png", programName: "Nursing" },
  { university: "Bishop Heber College", logo: "https://static.wixstatic.com/media/d77f36_21e0208f1bc248e5953eff9a0410bad8~mv2.jpeg", programName: "Int'l\nAdmissions" },
  { university: "St. Stephen's College", logo: "https://static.wixstatic.com/media/d77f36_e4e8e1e417874b01b46adf1aadc894be~mv2.png", programName: "Courses\nOffered" },
  { university: "Christ University", logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp", programName: "Int'l\nAdmissions" },
  { university: "Christ University", logo: "https://static.wixstatic.com/media/d77f36_88239521c71f4ad8bcb8e986e7b14ac7~mv2.webp", programName: "Study Abroad" },
  null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
];

const singaporeContent = [
  { university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Business\nSchool" },
  { university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Nursing &\nMedicine" },
  { university: "NUS", logo: "https://static.wixstatic.com/media/d77f36_80b489ce45dd4d2494ec43dce3d88a7b~mv2.jpg", programName: "Public Policy" },
  { university: "SIM", logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif", programName: "IT &\nCompSci" },
  { university: "SIM", logo: "https://static.wixstatic.com/media/d77f36_f2d0805ccb934e8da2019aaf23b16e6f~mv2.avif", programName: "Nursing" },
  { university: "Nanyang Institute of Management", logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png", programName: "Business" },
  { university: "Nanyang Institute of Management", logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png", programName: "Hospitality" },
  { university: "Nanyang Institute of Management", logo: "https://static.wixstatic.com/media/d77f36_e219748ff80a417ea92e264199b7dfe3~mv2.png", programName: "Digital Media\nDiploma" },
  null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
];

const malaysiaContent = [
  { university: "Limkokwing University", logo: "https://static.wixstatic.com/media/d77f36_38c855c3d47448009fc7123812183cc0~mv2.png", programName: "Creative\nTech" },
  { university: "Binary University", logo: "https://static.wixstatic.com/media/d77f36_38969a51e38148f294cade091aa0cbd8~mv2.png", programName: "MyBIG Grant" },
  { university: "Study in Malaysia Guide", logo: "https://static.wixstatic.com/media/d77f36_e6a24c71b7a14548beca3dafbb8e797b~mv2.jpg", programName: "Student\nGuide" },
  null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
];

// Carousel definitions
const carouselData = [
  { category: "UG", img: "https://static.wixstatic.com/media/d77f36_deddd99f45db4a55953835f5d3926246~mv2.png", title: "Undergraduate", text: "Bachelor-level opportunities." },
  { category: "PG", img: "https://static.wixstatic.com/media/d77f36_ae2a1e8b47514fb6b0a995be456a9eec~mv2.png", title: "Postgraduate", text: "Master's & advanced programs." },
  { category: "Diploma", img: "https://static.wixstatic.com/media/d77f36_e8f60f4350304ee79afab3978a44e307~mv2.png", title: "Diploma", text: "Professional & foundation." },
  { category: "Mobility", img: "https://static.wixstatic.com/media/d77f36_1118d15eee5a45f2a609c762d077857e~mv2.png", title: "Semester Abroad", text: "Exchange & mobility." },
  { category: "Upskilling", img: "https://static.wixstatic.com/media/d77f36_d8d9655ba23f4849abba7d09ddb12092~mv2.png", title: "Upskilling", text: "Short-term training." },
  { category: "Research", img: "https://static.wixstatic.com/media/d77f36_aa9eb498381d4adc897522e38301ae6f~mv2.jpg", title: "Research", text: "Opportunities & links." }
];

// Populate carousel
function populateCarousel() {
  const container = document.getElementById('carouselContainer');
  container.innerHTML = '';
  carouselData.forEach(item => {
    container.insertAdjacentHTML('beforeend', `
      <a href="#" class="carousel-card" data-category="${item.category}">
        <img src="${item.img}" alt="${item.title}" />
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
      highlightCountriesByProgram(this.dataset.category);
      highlightNeuralCubesByProgram(this.dataset.category);
    });
  });
  const def = document.querySelector('.carousel-card[data-category="UG"]');
  if(def) def.classList.add('selected');
}

// Scroll carousel
function scrollCarousel(dir) {
  const c = document.getElementById('carouselContainer');
  const card = c.querySelector('.carousel-card');
  if(!card) return;
  const w = card.offsetWidth + 16;
  c.scrollBy({ left: dir*w, behavior: 'smooth' });
}

// Filtering helpers
function hasUndergraduatePrograms(arr) {
  return arr.some(p => p && /bachelor|bba|undergraduate/.test(p.programName.toLowerCase()));
}
function hasPostgraduatePrograms(arr) {
  return arr.some(p => p && /master|mba|postgraduate|msn/.test(p.programName.toLowerCase()));
}
function hasExchangePrograms(arr) {
  return arr.some(p => p && /exchange|abroad|mobility/.test(p.programName.toLowerCase()));
}
function hasDiplomaPrograms(arr) {
  return arr.some(p => p && /diploma/.test(p.programName.toLowerCase()));
}
function hasUpskillPrograms(arr) {
  return arr.some(p => p && /cyber|data|tech|design|ux/.test(p.programName.toLowerCase()));
}

// Client-side filtering
function highlightCountriesByProgram(cat) {
  const maps = {
    Europe: europeContent, Thailand: newThailandContent, Canada: canadaContent,
    UK: ukContent, USA: usaContent, India: indiaContent,
    Singapore: singaporeContent, Malaysia: malaysiaContent
  };
  const fn = {
    UG: hasUndergraduatePrograms, PG: hasPostgraduatePrograms,
    Mobility: hasExchangePrograms, Diploma: hasDiplomaPrograms,
    Upskilling: hasUpskillPrograms, Research: ()=>true
  }[cat] || (()=>true);
  Object.keys(countryBlocks).forEach(name => {
    const m = countryBlocks[name].material;
    m.emissiveIntensity = fn(maps[name])?1.2:0.6;
  });
}
function highlightNeuralCubesByProgram(cat) {
  const maps = {
    Europe: europeContent, Thailand: newThailandContent, Canada: canadaContent,
    UK: ukContent, USA: usaContent, India: indiaContent,
    Singapore: singaporeContent, Malaysia: malaysiaContent
  };
  const fn = {
    UG: hasUndergraduatePrograms, PG: hasPostgraduatePrograms,
    Mobility: hasExchangePrograms, Diploma: hasDiplomaPrograms,
    Upskilling: hasUpskillPrograms, Research: ()=>true
  }[cat] || (()=>true);
  Object.keys(neuralCubeMap).forEach(name => {
    const cube = neuralCubeMap[name];
    const target = fn(maps[name])?1.3:1.0;
    new TWEEN.Tween(cube.scale).to({ x: target, y: target, z: target }, 500).start();
  });
}

// Initialize Three.js
function initializeThreeJS() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeGroup.add(neuronGroup);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;

  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.addEventListener('dragging-changed', e => controls.enabled = !e.value);
  scene.add(transformControls);

  camera.position.z = 5;

  const ambient = new THREE.AmbientLight(0x404040, 1.2);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff,1.5);
  dir.position.set(5,5,5);
  scene.add(dir);

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// LatLon to Vector3
function latLonToVector3(lat, lon, r=1.1) {
  const phi = (90-lat)*Math.PI/180;
  const theta = (lon+180)*Math.PI/180;
  return new THREE.Vector3(
    -r*Math.sin(phi)*Math.cos(theta),
    r*Math.cos(phi),
    r*Math.sin(phi)*Math.sin(theta)
  );
}

// Texture creation
function createTexture(text, logoUrl, bg='#003366') {
  const c = document.createElement('canvas');
  c.width=256; c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,256,256);
  ctx.fillStyle='#fff'; ctx.textAlign='center';
  const lines=text.split('\n');
  let y=120-(lines.length-1)*16;
  ctx.font='bold 24px Arial';
  lines.forEach(l=>{ctx.fillText(l,128,y);y+=30;});
  if(logoUrl){
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{ctx.drawImage(img,16,16,64,64);texture.needsUpdate=true;};
    img.src=logoUrl;
  }
  const texture=new THREE.CanvasTexture(c);
  return new THREE.MeshStandardMaterial({map:texture,emissive:new THREE.Color(bg),emissiveIntensity:0.6});
}

// Create neural cube
function createNeuralCube(contents, color) {
  const group=new THREE.Group();
  let idx=0;
  for(let xi=-1;xi<=1;xi++)for(let yi=-1;yi<=1;yi++)for(let zi=-1;zi<=1;zi++){
    const item=contents[idx++]||null;
    const mat=item?createTexture(item.programName,item.logo,color):createTexture('Unassigned',null,'#333');
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(0.01,0.01,0.01),mat);
    mesh.position.set(
      xi*(0.01+0.002),yi*(0.01+0.002),zi*(0.01+0.002)
    );
    mesh.userData={...item,isSubCube:!!item,initialPosition:mesh.position.clone()};
    group.add(mesh);
  }
  return group;
}

// Create globe and cubes
function createGlobeAndCubes() {
  // Earth texture
  new THREE.TextureLoader().load(
    "https://static.wixstatic.com/media/d77f36_8f868995fda643a0a61562feb20eb733~mv2.jpg",
    tex=>{
      const globe=new THREE.Mesh(
        new THREE.SphereGeometry(1,64,64),
        new THREE.MeshPhongMaterial({map:tex,opacity:0.75,transparent:true,emissive:0x112244,emissiveIntensity:0.2})
      );
      globeGroup.add(globe);
    }
  );
  // Wireframe
  globeGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.05,64,64),
    new THREE.MeshBasicMaterial({color:0x00ffff,wireframe:true,transparent:true,opacity:0.12})
  ));
  // Neural cubes around
  const colors=['#003366','#A52A2A','#006400','#483D8B','#B22234','#FF9933','#EE2536','#FFD700'];
  const datas=[europeContent,newThailandContent,canadaContent,ukContent,usaContent,indiaContent,singaporeContent,malaysiaContent];
  countryConfigs.forEach((cfg,i)=>{
    const cube=createNeuralCube(datas[i],colors[i]);
    cube.userData.neuralName=cfg.name;
    const angle=(i/8)*Math.PI*2,rad=1.8;
    cube.position.set(Math.cos(angle)*rad,(i%2?0.3:-0.3),Math.sin(angle)*rad);
    neuronGroup.add(cube);
    neuralCubeMap[cfg.name]=cube;
  });
  // Country markers
  countryConfigs.forEach(cfg=>{
    const mat=new THREE.MeshStandardMaterial({color:cfg.color,emissive:cfg.color,emissiveIntensity:0.6});
    const marker=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.03),mat);
    marker.userData.countryName=cfg.name;
    marker.position.copy(latLonToVector3(cfg.lat,cfg.lon,1.02));
    globeGroup.add(marker);
    countryBlocks[cfg.name]=marker;
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  TWEEN.update();
  renderer.render(scene,camera);
}

// Initialize application
document.addEventListener('DOMContentLoaded',()=>{
  initializeThreeJS();
  createGlobeAndCubes();
  populateCarousel();
  animate();
});

// Simulate login/logout
function simulateLogin(){localStorage.setItem('userToken','auth');alert('Logged in');location.reload();}
function logout(){localStorage.setItem('userToken','guest-viewer');alert('Logged out');location.reload();}
