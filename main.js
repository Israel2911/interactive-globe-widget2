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
    });
  });
  showNotification('Neon green blink (requestAnimationFrame) applied!', true);
}
