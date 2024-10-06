import { CharacterControls } from './characterControls';
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

var scene, camera, cameraTop, renderer, orbitControls, characterControls;
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
  orbitControls.minPolarAngle = Math.PI / 4
  orbitControls.update();

  document.body.appendChild(renderer.domElement);
}

function loadScene() {
  scene.background = new THREE.Color(0xa8def0);

  // Character
  new GLTFLoader().load('models/mainCharacter.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object) {
      if (object.isMesh) {
        object.castShadow = true;
        // Si tiene una textura de color base, no la sobrescribimos
        if (object.material.map) {
          object.material.roughness = 0.6;  // Ajustar para suavizar la reflectividad
          object.material.metalness = 0.0;  // Evitar reflejos metálicos
        }
        console.log('COLOR')
        console.log(object.material.color)
        object.material.color.set(0xffeed4);
      }
    });
    scene.add(model);

    const gltfAnimations = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map()
    gltfAnimations.filter(a => a.name != 'TPose').forEach((a) => {
      console.log('POSE')
      console.log(a)
      animationsMap.set(a.name, mixer.clipAction(a))
    })

    characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, cameraTop, 'Idle')
  });

  // Control Keys
  document.addEventListener('keydown', (event) => {
    if (event.key == 'Shift') {
      characterControls.updateRunToggle(true)
    }
    (keysPressed)[event.key.toLowerCase()] = true
  }, false);
  document.addEventListener('keyup', (event) => {
    if (event.key == 'Shift') {
      characterControls.updateRunToggle(false)
    }
    (keysPressed)[event.key.toLowerCase()] = false
  }, false);
  generateFloor()
  light()
}

const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);

  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }

  // Actualizar controles de órbita
  orbitControls.update();

  // Renderizar la vista principal
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);

  // Renderizar la vista superior
  const insetWidth = window.innerWidth / 4;
  const insetHeight = window.innerHeight / 4;

  // renderer.setViewport(0, window.innerHeight - insetHeight, insetWidth, insetHeight);
  // renderer.setScissor(0, window.innerHeight - insetHeight, insetWidth, insetHeight);
  // renderer.setScissorTest(true);
  // renderer.render(scene, cameraTop);
}


init()
loadScene()
render()

function generateFloor() {

  const GRASS = 0
  const MOUNTAIN = 1
  const LAKE = 2
  const HILL = 3
  const SNOW_MOUNTAIN = 4
  const LAND_FLOOR = 5
  const BUSH = 6

  const zs = {
    "0": 0,
    "1": 40,
    "2": -20,
    "3": 10,
    "4": 60,
    "5": 0,
    "6": 10,
  }

  const cs = {
    "0": [0.490, 0.902, 0.463],
    "1": [0.318, 0.255, 0.047],
    "2": [0, 0, 0],
    "3": [0.318, 0.255, 0.047],
    "4": [1, 1, 1],
    "5": [0.318, 0.255, 0.047],
    "6": [0.369, 0.643, 0.329]
  }


  const terrainMatrix = [
    [0, 0, 0, 0, BUSH, 0, BUSH, 0, 0, 0, 0, BUSH, 0, BUSH, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, BUSH, 0, BUSH, 0, 0, MOUNTAIN, MOUNTAIN, 0, BUSH, 0, 0, 0, LAKE, LAKE, LAKE, 0, 0, 0],
    [0, 0, HILL, HILL, HILL, HILL, 0, 0, 0, BUSH, 0, 0, 0, 0, 0, LAKE, LAKE, LAKE, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, BUSH, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, MOUNTAIN, MOUNTAIN, MOUNTAIN, 0, BUSH, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, MOUNTAIN, MOUNTAIN, MOUNTAIN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, MOUNTAIN, MOUNTAIN, MOUNTAIN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, LAKE, LAKE, LAKE, LAKE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, LAKE, LAKE, LAKE, LAKE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, LAKE, LAKE, LAKE, LAKE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, LAKE, LAKE, LAKE, LAKE, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, BUSH, 0, 0, BUSH, 0, MOUNTAIN, MOUNTAIN, MOUNTAIN, 0, BUSH, 0, BUSH],
    [LAND_FLOOR, SNOW_MOUNTAIN, SNOW_MOUNTAIN, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, 0, 0, 0, MOUNTAIN, 0, 0, 0, 0, 0, 0, 0],
    [LAND_FLOOR, SNOW_MOUNTAIN, SNOW_MOUNTAIN, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, 0, 0, 0, 0, 0, 0, 0, 0, MOUNTAIN, MOUNTAIN, 0, 0, 0],
  ]

  const width = 320;
  const height = 320;
  const divisions = 20;

  const terrainGeometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];

  for (let i = 0; i <= divisions; i++) {
    for (let j = 0; j <= divisions; j++) {
      const x = (i / divisions) * width - width / 2;
      const y = (j / divisions) * height - height / 2;
      let z = zs[terrainMatrix[i][j]];

      vertices.push(x, y, z);

      colors.push(...cs[terrainMatrix[i][j]]);
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

  terrainGeometry.setIndex(indices);
  terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); // Añadir colores a los vértices
  terrainGeometry.computeVertexNormals();

  // Material con colores de vértices
  const terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshBasicMaterial({ color: 0x7DE6FF, side: THREE.DoubleSide }));
  waterSurface.position.y = -3;
  waterSurface.rotation.x = Math.PI / 2;

  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;

  scene.add(waterSurface);
  scene.add(terrain);
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(- 60, 100, - 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = - 50;
  dirLight.shadow.camera.left = - 50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
}