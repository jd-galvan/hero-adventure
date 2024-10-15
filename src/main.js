import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Terrain } from './world/terrain';
import { Hero } from './characters/hero';
import { Sky } from './world/sky';
import { Diamond } from './objects/diamond';
import { Prison } from './objects/prison';
import { Prisoner } from './characters/prisoner';

let cannonDebugger;

let terrain,
  scene,
  camera,
  cameraTop,
  renderer,
  orbitControls,
  physicWorld,
  hero,
  diamonds,
  skybox,
  diamondsCounter = 0,
  prison,
  prisoner;

const nDiamonds = 1;

const keysPressed = {}

function getRandomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function init() {
  document.getElementById('contador').innerText = "Diamantes: 0 / " + nDiamonds;
  scene = new THREE.Scene();

  // CAMERA: Tercera persona
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 20);  // Ajustar posición inicial

  // CAMERA: Ortográfica (vista superior o mapa)
  const aspectRatio = window.innerWidth / window.innerHeight;
  const frustumSize = 100;
  cameraTop = new THREE.OrthographicCamera(
    (frustumSize * aspectRatio) / -2,  // left
    (frustumSize * aspectRatio) / 2,   // right
    frustumSize / 2,                   // top
    frustumSize / -2,                  // bottom
    0.1,                               // near
    1000                               // far
  );

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;

  // OrbitControls: Para la cámara en tercera persona
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;

  // Creando cielo
  skybox = new Sky();

  // Creando mundo visual
  terrain = new Terrain();
  // Creando mundo fisico
  physicWorld = new CANNON.World();
  physicWorld.gravity.set(0, -9.82, 0);
  const defaultPhysicMaterial = new CANNON.Material('default');
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultPhysicMaterial,
    defaultPhysicMaterial,
    {
      friction: 0.4,
      restitution: 0.3
    }
  )
  physicWorld.defaultContactMaterial = defaultContactMaterial;

  document.body.appendChild(renderer.domElement);

  hero = new Hero(orbitControls, camera, cameraTop, scene, physicWorld);
  prison = new Prison();
  prisoner = new Prisoner(scene);

  diamonds = [];
  for (let index = 0; index < nDiamonds; index++) {
    diamonds.push(new Diamond(getRandomBetween(-160, 160), getRandomBetween(-160, 160), scene, physicWorld, hero.characterBody))
  }

  setupKeyCommands();

  // DEBUGGING
  if (import.meta.env.VITE_CANNON_DEBUGGER_ENABLED == 'true') {
    cannonDebugger = new CannonDebugger(scene, physicWorld);
  }

  window.addEventListener('resize', onWindowResize);
}

function loadScene() {
  scene.add(terrain.getTerrainSurface());
  scene.add(terrain.getWaterSurface());
  scene.add(skybox.skybox);
  scene.add(prison.prison);
  physicWorld.addBody(terrain.getPhysicTerrain());
  physicWorld.addBody(terrain.getPhysicWater());
  skybox.wallBodies.forEach(wallBody => {
    physicWorld.addBody(wallBody)
  });
  physicWorld.addBody(prison.prisonBody)
  light();
}

function updateDiamondsCounter() {
  // Actualizamos el texto en el div
  diamondsCounter++;
  document.getElementById('contador').innerText = "Diamantes: " + diamondsCounter + " / " + nDiamonds;
}

const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  let mixerUpdateDelta = clock.getDelta();
  // Avanzar la simulación física
  physicWorld.step(1 / 60, mixerUpdateDelta, 3);

  hero.update(mixerUpdateDelta, keysPressed);
  prisoner.update(mixerUpdateDelta);


  diamonds.forEach((diamond, index) => {
    diamond.update();
    if (hero.characterBody && diamond.diamondBody) {
      const distancia = hero.characterBody.position.distanceTo(diamond.diamondBody.position);
      if (distancia <= 2) {

        // Eliminar el diamante del mundo de físicas y de la escena
        physicWorld.removeBody(diamond.diamondBody); // Eliminar del mundo físico
        diamonds.splice(index, 1); // Eliminar del array de diamantes
        scene.remove(diamond.model); // Eliminar la geometría Three.js (asumiendo que estás usando threeMesh en cada body)

        // Aumentar el contador
        updateDiamondsCounter();
      }
    }
  })
  // Actualizar controles de órbita para la cámara de tercera persona
  orbitControls.update();

  // Renderizar escena con la cámara en tercera persona (pantalla completa)
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);  // Vista completa
  renderer.setScissorTest(false);  // Desactivar scissor para la vista principal
  renderer.render(scene, camera);

  // Mapa
  const insetWidth = window.innerWidth / 4;  // Ancho del mini-mapa
  const insetHeight = window.innerHeight / 4;  // Alto del mini-mapa
  const borderSize = 3;  // Tamaño del borde en píxeles

  // Paso 1: Renderizar el borde negro antes de renderizar la cámara ortográfica
  renderer.setViewport(window.innerWidth - insetWidth - borderSize - 10, 10 - borderSize, insetWidth + 2 * borderSize, insetHeight + 2 * borderSize);
  renderer.setScissor(window.innerWidth - insetWidth - borderSize - 10, 10 - borderSize, insetWidth + 2 * borderSize, insetHeight + 2 * borderSize);
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000);  // Color del borde (negro)
  renderer.clear();  // Limpiar esa área con el color del borde

  // Paso 2: Renderizar la cámara ortográfica dentro del borde negro
  renderer.setViewport(window.innerWidth - insetWidth - 10, 10, insetWidth, insetHeight);
  renderer.setScissor(window.innerWidth - insetWidth - 10, 10, insetWidth, insetHeight);
  renderer.setScissorTest(true);
  renderer.setClearColor(0x87CEEB);  // Color del cielo o fondo
  renderer.clear();  // Limpiar la zona interna del mini-mapa

  // Finalmente renderizamos la escena desde la cámara ortográfica (mini-mapa)
  renderer.render(scene, cameraTop);

  // Debugging de cannon js
  if (import.meta.env.VITE_CANNON_DEBUGGER_ENABLED == 'true') {
    cannonDebugger.update();
  }
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(0, 100, 0);
  dirLight.shadow.mapSize.width = 320;
  dirLight.shadow.mapSize.height = 320;
  scene.add(dirLight);
}

function setupKeyCommands() {
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'w') { // Tecla para saltar
      hero.jump();
    }
    if (event.key == 'Shift') {
      hero.updateRunToggle(true)
    }
    keysPressed[event.key.toLowerCase()] = true;
  }, false);

  document.addEventListener('keyup', (event) => {
    if (event.key == ' ') {
      hero.resetCameraPosition()
    }
    if (event.key == 'Shift') {
      hero.updateRunToggle(false);
    }
    keysPressed[event.key.toLowerCase()] = false;
  }, false);
}

function onWindowResize() {
  const aspectRatio = window.innerWidth / window.innerHeight;

  // Actualizar cámara en tercera persona
  camera.aspect = aspectRatio;
  camera.updateProjectionMatrix();

  // Actualizar cámara ortográfica (mapa)
  const frustumSize = 100;
  cameraTop.left = (frustumSize * aspectRatio) / -2;
  cameraTop.right = (frustumSize * aspectRatio) / 2;
  cameraTop.top = frustumSize / 2;
  cameraTop.bottom = frustumSize / -2;
  cameraTop.updateProjectionMatrix();

  // Ajustar tamaño del renderizador
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
loadScene();
render();
