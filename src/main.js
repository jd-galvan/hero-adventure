import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Terrain } from './world/terrain';
import { Hero } from './world/hero';
import { Sky } from './world/sky';

let cannonDebugger;

let terrain,
  scene,
  camera,
  cameraTop,
  renderer,
  orbitControls,
  physicWorld,
  hero,
  skybox;

const keysPressed = {}

function init() {
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
  cameraTop.position.set(0, 100, 0);   // Posición elevada (mapa desde arriba)
  cameraTop.lookAt(0, 0, 0);           // Apuntar hacia el centro de la escena

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

  hero = new Hero(orbitControls, camera, scene, physicWorld);

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
  physicWorld.addBody(terrain.getPhysicTerrain());
  physicWorld.addBody(terrain.getPhysicWater());
  skybox.wallBodies.forEach(wallBody => {
    physicWorld.addBody(wallBody)
  });
  light();
}

const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  let mixerUpdateDelta = clock.getDelta();
  // Avanzar la simulación física
  physicWorld.step(1 / 60, mixerUpdateDelta, 3);

  if (hero.getHeroModel()) {
    hero.update(mixerUpdateDelta, keysPressed);
  }

  // Actualizar controles de órbita para la cámara de tercera persona
  orbitControls.update();

  // Renderizar escena con la cámara en tercera persona (pantalla completa)
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);  // Vista completa
  renderer.setScissorTest(false);  // Desactivar scissor para la vista principal
  renderer.render(scene, camera);

  // Renderizar la cámara ortográfica (mini-mapa) en una esquina superior derecha
  const insetWidth = window.innerWidth / 4;  // Ancho del mini-mapa
  const insetHeight = window.innerHeight / 4;  // Alto del mini-mapa
  renderer.setViewport(window.innerWidth - insetWidth - 10, 10, insetWidth, insetHeight);  // Ajustar viewport para mini-mapa
  renderer.setScissor(window.innerWidth - insetWidth - 10, 10, insetWidth, insetHeight);   // Ajustar scissor para recortar la región
  renderer.setScissorTest(true);  // Habilitar scissor para limitar la renderización
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
