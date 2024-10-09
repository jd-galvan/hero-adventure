import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger';

const UP = 'arrowup'
const LEFT = 'arrowleft'
const DOWN = 'arrowdown'
const RIGHT = 'arrowright'
const SHIFT = 'shift'
const W = 'w'
const E = 'e'
const DIRECTIONS = [UP, LEFT, DOWN, RIGHT]
const ACTIONS = [W, E]

const SURFACES = ["land", "water"]


export class CharacterControls {

  model
  mixer
  animationsMap = new Map() // Walk, Run, Idle
  orbitControl
  camera
  cameraTop

  // state
  toggleRun = false
  currentAction
  currentSurface
  characterBody

  // temporary data
  walkDirection = new THREE.Vector3()
  rotateAngle = new THREE.Vector3(0, 1, 0)
  rotateQuarternion = new THREE.Quaternion()
  cameraTarget = new THREE.Vector3()

  // constants
  fadeDuration = 0.2
  runVelocity = 5
  walkVelocity = 2

  constructor(model,
    mixer, animationsMap,
    orbitControl, camera,
    cameraTop, currentAction,
    characterBody, position) {
    this.model = model
    this.characterBody = characterBody;

    // model.position.x = -155
    // this.model.position.x = position.x
    // model.position.z = -155
    // this.model.position.z = position.z
    // this.model.position.y -= 1
    this.model.position.copy(this.characterBody.position)

    // model.position.y = -4.3 // For swimming

    this.model.rotation.y = -2.2
    this.mixer = mixer
    this.animationsMap = animationsMap
    this.currentAction = currentAction
    this.animationsMap.forEach((value, key) => {
      if (key == currentAction) {
        value.play()
      }
    })
    this.orbitControl = orbitControl
    this.camera = camera

    this.camera.position.x = this.model.position.x - 3
    this.camera.position.z = this.model.position.z - 3
    this.camera.position.y = this.model.position.y + 2
    this.#updateCameraTarget(0, 0)
    this.currentSurface = "land"

    this.characterBody.addEventListener('collide', (event) => {
      const collidedBody = event.body;
      console.log('Colisión con:', collidedBody);

      // Lógica adicional según el objeto con el que colisionó
    });
  }

  updateRunToggle(mustRun) {
    this.toggleRun = mustRun
  }

  updateCurrentSurface() {
    if (this.currentSurface == "land") {
      this.currentSurface = "water"
      this.model.position.y = -4.3
    } else {
      this.currentSurface = "land"
      this.model.position.y = 0
    }
  }

  update(delta, keysPressed) {
    const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true)

    var play = '';
    if (directionPressed && this.toggleRun && this.currentSurface == "land") {
      play = 'Run'
    } else if (directionPressed && this.currentSurface == "land") {
      play = 'Walk'
    } else if (this.currentSurface == "land") {
      play = "Idle"
    } else {
      play = "Swim"
    }

    const actionPressed = ACTIONS.find(key => keysPressed[key] == true)

    switch (actionPressed) {
      case W:
        play = 'Jump'
        break;
      default:
        break;
    }

    if (this.currentAction != play) {
      const toPlay = this.animationsMap.get(play)
      const current = this.animationsMap.get(this.currentAction)

      current.fadeOut(this.fadeDuration)
      toPlay.reset().fadeIn(this.fadeDuration).play();

      this.currentAction = play
    }

    this.mixer.update(delta)

    let moveX = 0;
    let moveZ = 0;
    // if (this.currentAction == 'Run' || this.currentAction == 'Walk') {
    if (directionPressed) {
      // calculate towards camera direction
      var angleYCameraDirection = Math.atan2(
        (this.camera.position.x - this.model.position.x),
        (this.camera.position.z - this.model.position.z))
      // diagonal movement angle offset
      var directionOffset = this.directionOffset(keysPressed)

      // rotate model
      this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

      // calculate direction
      this.camera.getWorldDirection(this.walkDirection)
      this.walkDirection.y = 0
      this.walkDirection.normalize()
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

      this.camera.quaternion.rotateTowards(this.rotateQuarternion, 0.2)
      // run/walk velocity
      const velocity = this.toggleRun && this.currentSurface == "land" ? this.runVelocity : this.walkVelocity

      this.characterBody.velocity.x = this.walkDirection.x * velocity;
      this.characterBody.velocity.z = this.walkDirection.z * velocity;
      // move model & camera
      moveX = this.walkDirection.x * velocity * delta
      moveZ = this.walkDirection.z * velocity * delta
    } else {
      // Detener al personaje si no se presionan teclas de dirección
      this.characterBody.velocity.x = 0;
      this.characterBody.velocity.z = 0;
    }
    // Sincronizar el modelo con el cuerpo físico
    this.model.position.copy(this.characterBody.position);
    this.model.position.y -= 1;

    // Actualizar la cámara
    this.#updateCameraTarget(moveX, moveZ);
  }

  #updateCameraTarget(moveX, moveZ) {
    // move camera
    this.camera.position.x += moveX
    this.camera.position.z += moveZ

    this.cameraTarget.x = this.characterBody.position.x
    this.cameraTarget.y = this.characterBody.position.y + 1
    this.cameraTarget.z = this.characterBody.position.z

    this.orbitControl.target = this.cameraTarget
  }

  resetCameraPosition() {
    const idealOffset = new THREE.Vector3(0, 2, 5); // Ajusta la posición detrás y por encima del personaje
    idealOffset.applyQuaternion(this.model.quaternion); // Rotar la cámara junto con el personaje
    idealOffset.add(this.model.position); // Ajustar la posición final

    // Suavizado para el seguimiento de la cámara
    this.camera.position.lerp(idealOffset, 0.9);

    // Actualizar el objetivo de la cámara (mirar al personaje)
    const lookAt = new THREE.Vector3(0, 1, 0); // Posición a la que debe mirar la cámara
    lookAt.applyQuaternion(this.model.quaternion);
    lookAt.add(this.model.position);

    this.camera.lookAt(lookAt);
  }


  directionOffset(keysPressed) {
    var directionOffset = 0

    if (keysPressed[UP]) {
      if (keysPressed[LEFT]) {
        directionOffset = Math.PI / 4
      } else if (keysPressed[RIGHT]) {
        directionOffset = - Math.PI / 4
      }
    } else if (keysPressed[DOWN]) {
      if (keysPressed[LEFT]) {
        directionOffset = Math.PI / 4 + Math.PI / 2
      } else if (keysPressed[RIGHT]) {
        directionOffset = -Math.PI / 4 - Math.PI / 2
      } else {
        console.log('DOWN')
        directionOffset = Math.PI
      }
    } else if (keysPressed[LEFT]) {
      directionOffset = Math.PI / 2
    } else if (keysPressed[RIGHT]) {
      directionOffset = - Math.PI / 2
    }
    return directionOffset
  }
}

let cannonDebugger;

var scene, camera, cameraTop, renderer, orbitControls, characterControls, physicWorld, physicCharacterBody;
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
  orbitControls.enablePan = false
  // orbitControls.minPolarAngle = Math.PI / 4
  // orbitControls.maxPolarAngle = Math.PI / 2;

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

  // addRock()

  document.body.appendChild(renderer.domElement);

  // Character
  new GLTFLoader().load(import.meta.env.VITE_MODEL_PATH, function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object) {
      if (object.isMesh) {
        object.castShadow = true;
        // Si tiene una textura de color base, no la sobrescribimos
        if (object.material.map) {
          object.material.roughness = 0.6;  // Ajustar para suavizar la reflectividad
          object.material.metalness = 0.0;  // Evitar reflejos metálicos
        }
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

    const position = {
      x: -155,
      y: 0,
      z: -155
    };
    const radius = 1;
    physicCharacterBody = new CANNON.Body({ mass: 1, material: new CANNON.Material('default') });

    physicCharacterBody.addShape(new CANNON.Sphere(radius));
    physicCharacterBody.position.x = position.x;
    physicCharacterBody.position.y = 1;
    physicCharacterBody.position.z = position.z;
    console.log('POSITION')
    console.log(position)
    physicWorld.addBody(physicCharacterBody);

    characterControls = new CharacterControls(
      model,
      mixer,
      animationsMap,
      orbitControls,
      camera,
      cameraTop,
      'Idle',
      physicCharacterBody,
      position
    );
  });

  cannonDebugger = new CannonDebugger(scene, physicWorld);
}

function loadScene() {
  scene.background = new THREE.Color(0xa8def0);

  // Control Keys
  document.addEventListener('keydown', (event) => {
    if (event.key == 'Shift') {
      characterControls.updateRunToggle(true)
    }
    (keysPressed)[event.key.toLowerCase()] = true
  }, false);
  document.addEventListener('keyup', (event) => {
    // if (event.code == 'KeyE') {
    //   characterControls.updateCurrentSurface()
    // }
    if (event.key == ' ') {
      characterControls.resetCameraPosition()
    }
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
  // Avanzar la simulación física
  physicWorld.step(1 / 60, mixerUpdateDelta, 3);
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }

  cannonDebugger.update();


  // Actualizar controles de órbita
  orbitControls.update();
  renderer.render(scene, camera);
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
    [GRASS, GRASS, GRASS, GRASS, BUSH, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, BUSH, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, HILL, HILL, HILL, HILL, GRASS, GRASS, MOUNTAIN, MOUNTAIN, GRASS, BUSH, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS],
    [GRASS, GRASS, HILL, HILL, HILL, HILL, GRASS, GRASS, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS],
    [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, GRASS],
    [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, GRASS],
    [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, GRASS, GRASS],
    [GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, BUSH, GRASS, GRASS, BUSH, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, BUSH, GRASS, BUSH],
    [LAND_FLOOR, SNOW_MOUNTAIN, SNOW_MOUNTAIN, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, MOUNTAIN, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
    [LAND_FLOOR, SNOW_MOUNTAIN, SNOW_MOUNTAIN, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, MOUNTAIN, MOUNTAIN, GRASS, GRASS, GRASS],
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

  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(320, 320),
    new THREE.MeshBasicMaterial({
      color: 0x7DE6FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    }));
  waterSurface.position.y = -2;
  waterSurface.rotation.x = Math.PI / 2;

  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;

  scene.add(waterSurface);
  scene.add(terrain);


  // Crear el Heightfield para Cannon.js
  const matrix = [];

  for (let i = 0; i <= divisions; i++) {
    const row = [];
    for (let j = 0; j <= divisions; j++) {
      let z = zs[terrainMatrix[i][j]]; // Obtener la altura del terreno
      row.push(z);
    }
    matrix.push(row);
  }

  // Ajustar el tamaño de elemento según tu terreno
  const elementSize = width / divisions;

  // Crear la forma Heightfield
  const heightfieldShape = new CANNON.Heightfield(matrix, { elementSize });

  // Crear el cuerpo físico
  const heightfieldBody = new CANNON.Body({ mass: 0 }); // Masa 0 para que sea estático
  heightfieldBody.addShape(heightfieldShape);
  heightfieldBody.position.set(-height / 2, 0, width / 2); // Ajustar posición si es necesario
  heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotar para coincidir con THREE.js
  physicWorld.addBody(heightfieldBody);
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