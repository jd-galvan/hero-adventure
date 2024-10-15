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

  // CAMERA
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

  cameraTop = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
  cameraTop.position.set(0, 500, 0);
  cameraTop.lookAt(0, 0, 0);
  cameraTop.up.set(0, 0, 1);
  cameraTop.updateProjectionMatrix();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true

  // OrbitControls
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true
  // orbitControls.enableZoom = false
  // orbitControls.enablePan = false
  // orbitControls.minPolarAngle = Math.PI / 4
  // orbitControls.maxPolarAngle = Math.PI / 2;

  // Creando cielo
  skybox = new Sky();

  // Creando mundo visual
  terrain = new Terrain();
  // Creando mundo fisico
  physicWorld = new CANNON.World();
  physicWorld.gravity.set(0, -9.82, 0)
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
  light()
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

  // Actualizar controles de órbita
  orbitControls.update();
  renderer.render(scene, camera);

  // Debugging de cannon js
  if (import.meta.env.VITE_CANNON_DEBUGGER_ENABLED == 'true') {
    cannonDebugger.update();
  }
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(0, 100, 0);
  dirLight.shadow.mapSize.width = 320;
  dirLight.shadow.mapSize.height = 320;
  scene.add(dirLight);
}

function setupKeyCommands() {
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'w') { // O la tecla que uses para saltar
      hero.jump();

    }
    if (event.key == 'Shift') {
      hero.updateRunToggle(true)
    }
    (keysPressed)[event.key.toLowerCase()] = true
  }, false);
  document.addEventListener('keyup', (event) => {
    if (event.key == ' ') {
      hero.resetCameraPosition()
    }
    if (event.key == 'Shift') {
      hero.updateRunToggle(false)
    }
    (keysPressed)[event.key.toLowerCase()] = false
  }, false);
}

init()
loadScene()
render()

