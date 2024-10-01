import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Crear la escena, la cámara y el renderizador
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const simplex = new SimplexNoise();

const width = 100;
const height = 100;
const divisions = 20;

const geometry = new THREE.BufferGeometry();
const vertices = [];
const scale = 0.5; // Escala del ruido

for (let i = 0; i <= divisions; i++) {
  for (let j = 0; j <= divisions; j++) {
    const x = (i / divisions) * width - width / 2;
    const y = (j / divisions) * height - height / 2;
    let z = 0;
    if (i % 5 == 0 && j % 5 == 0) {
      z = 5; // Obstáculo
      // z = simplex.noise2D(x * scale, y * scale) * 5; // Ruido
    }
    vertices.push(x, y, z);
  }
}

const indices = [];

// Crear caras triangulares
for (let i = 0; i < divisions; i++) {
  for (let j = 0; j < divisions; j++) {
    const a = i * (divisions + 1) + (j + 1);
    const b = i * (divisions + 1) + j;
    const c = (i + 1) * (divisions + 1) + j;
    const d = (i + 1) * (divisions + 1) + (j + 1);

    // Dos triángulos por cuadrado en la malla
    indices.push(a, b, d);
    indices.push(b, c, d);
  }
}

geometry.setIndex(indices);
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.computeVertexNormals();

// Material y malla
const material = new THREE.MeshLambertMaterial({ color: 0xabdeff, wireframe: false });




const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Añadir luz
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 50, 50);
scene.add(light);

camera.position.set(0, -90, 30);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);

let cube; // Variable global para el cubo
const cubeGeometry = new THREE.SphereGeometry(3, 35, 35);
const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

// Colocar el cubo en la posición válida
cube.position.set(-10, 0, 2.5);
scene.add(cube);

// Función para obtener la altura del terreno en una posición específica (x, y)
function getTerrainHeightAt(x, y, vertices, divisions, width, height) {
  const i = Math.floor((x + width / 2) / width * divisions);
  const j = Math.floor((y + height / 2) / height * divisions);
  const index = (i * (divisions + 1) + j) * 3;
  return vertices[index + 2]; // Retornar el valor de z (altura)
}

// Función para manejar el movimiento del cubo
const moveSpeed = 3; // Velocidad de movimiento
function moveCube(event) {
  let newX = cube.position.x;
  let newY = cube.position.y;
  switch (event.key) {
    case 'ArrowUp':
      newY += moveSpeed; // Mover hacia arriba
      break;
    case 'ArrowDown':
      newY -= moveSpeed; // Mover hacia abajo
      break;
    case 'ArrowLeft':
      newX -= moveSpeed; // Mover hacia la izquierda
      break;
    case 'ArrowRight':
      newX += moveSpeed; // Mover hacia la derecha
      break;
  }

  // Obtener la altura del terreno en la nueva posición
  const newZ = getTerrainHeightAt(newX, newY, vertices, divisions, width, height);

  // Verificar si el cubo puede moverse a la nueva posición
  if (newZ <= cube.position.z - 2.5) { // 2.5 es la mitad de la altura del cubo
    cube.position.x = newX;
    cube.position.y = newY;
    cube.position.z = newZ + 2.5; // Ajustar la posición para estar sobre el terreno
  } else {
    console.log('Colisión detectada, no se puede avanzar.');
  }
}

// Añadir el listener para las teclas
window.addEventListener('keydown', moveCube);

// Renderizar la escena
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
