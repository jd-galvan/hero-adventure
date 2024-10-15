// Crear material para las paredes, piso y barras
const materialSuperficie = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
const materialBarra = new THREE.MeshBasicMaterial({ color: 0x444444 });

// Crear las paredes de la celda (BoxGeometry)
const anchoCelda = 5;
const altoCelda = 3;
const grosorSuperficie = 0.2;
const profundidadCelda = 5;


// Piso
const piso = new THREE.Mesh(new THREE.BoxGeometry(anchoCelda, grosorSuperficie, profundidadCelda), materialSuperficie);
piso.position.set(0, grosorSuperficie / 2, 0); // Piso
scene.add(piso);

// Techo
const techo = new THREE.Mesh(new THREE.BoxGeometry(anchoCelda, grosorSuperficie, profundidadCelda), materialSuperficie);
techo.position.set(0, altoCelda, 0); // Piso
scene.add(techo);

// Crear las barras de la celda (CylinderGeometry)
const radioBarra = 0.05;
const alturaBarra = altoCelda;

// Crear 5 barras en la pared frontal
for (let i = -3; i <= 3; i++) {
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
  barra.position.set(i * 0.8, alturaBarra / 2, -profundidadCelda / 2 + grosorSuperficie / 2); // Colocar barras en la pared frontal
  scene.add(barra);
}

// Crear 5 barras en la pared izquierda
for (let i = -3; i <= 3; i++) {
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
  barra.position.set(-anchoCelda / 2 + grosorSuperficie / 2, alturaBarra / 2, i * 0.8); // Colocar barras en la pared izquierda
  scene.add(barra);
}

// Crear 5 barras en la pared derecha
for (let i = -3; i <= 3; i++) {
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
  barra.position.set(anchoCelda / 2 - grosorSuperficie / 2, alturaBarra / 2, i * 0.8); // Colocar barras en la pared derecha
  scene.add(barra);
}

// Crear 5 barras en la pared trasera
for (let i = -3; i <= 3; i++) {
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
  barra.position.set(i * 0.8, alturaBarra / 2, profundidadCelda / 2 - grosorSuperficie / 2); // Colocar barras en la pared trasera
  scene.add(barra);
}