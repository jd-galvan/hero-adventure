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
import Stats from 'three/examples/jsm/libs/stats.module.js';

let nDiamonds;

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
  prisoner,
  timeRemaining,
  gameOver = false,
  win = false;



// Función para mostrar la pantalla de "Perdiste"
function showGameOver() {
  document.getElementById('gameOverScreen').style.visibility = 'visible'; // Mostrar pantalla de Game Over
}
// Evento para detectar cuando se presiona la tecla Space
document.addEventListener('keydown', function (event) {
  if (event.code === 'Space' && gameOver) {
    this.location.reload(); // Recargar la página para reiniciar el juego
  }
});

let lastTime; // Tiempo inicial para el cálculo del decremento
function resetTime() {
  timeRemaining = 70 * nDiamonds;
  lastTime = performance.now();
}

// Función para formatear el tiempo en MM:SS
function formatTime(seconds) {
  var minutes = Math.floor(seconds / 60); // Calcular minutos
  var seconds = seconds % 60; // Calcular segundos restantes

  // Asegurarse de que los minutos y segundos tengan siempre dos dígitos
  var minutesStr = minutes < 10 ? '0' + minutes : minutes;
  var secondsStr = seconds < 10 ? '0' + seconds : seconds;

  return minutesStr + ':' + secondsStr;
}

// Función para decrementar el tiempo
function decrementTime() {
  let currentTime = performance.now();
  let elapsedTime = currentTime - lastTime;

  // Si ha pasado más de un segundo, decrementa el tiempo restante
  if (elapsedTime >= 1000) {
    timeRemaining--;
    lastTime = currentTime;

    // Actualiza el texto en el contador en formato MM:SS
    document.getElementById('countdown').innerHTML = "Tiempo restante: " + formatTime(timeRemaining);

    // Si el tiempo llega a cero, detener el contador
    if (timeRemaining <= 0) {
      gameOver = true;
      showGameOver(); // Mostrar la pantalla de "Perdiste"
    }
  }
}

const keysPressed = {}

function getRandomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function askForDiamonds() {
  while (true) {
    nDiamonds = parseInt(prompt("Shift: Velocidad\nW: Saltar\nSpace: Reajustar la camara\nDesplazamiento: Flechas direccionales\n\nIngresa la cantidad de elementos que deseas en la escena (1-30):"));
    if (nDiamonds < 1 || nDiamonds > 30) {
      alert("Ingresa un valor permitido de diamantes (1-30)");
    } else {
      break;
    }
  }
}

let stats;
function statsInit() {
  // Inicializa Stats.js
  stats = new Stats();
  stats.showPanel(0); // 0 es el panel de FPS
  document.body.appendChild(stats.dom); // Agregar el panel de stats a la página
  // Estilo para posicionar el panel de Stats.js al centro del lado izquierdo
  stats.dom.style.position = 'absolute';
  stats.dom.style.left = '0px'; // Alinearlo al borde izquierdo
  stats.dom.style.top = '50%'; // Centrarlo verticalmente en la pantalla
  stats.dom.style.transform = 'translateY(-50%)'; // Ajustar para que el punto medio esté alineado
}

function init() {
  askForDiamonds();
  resetTime(nDiamonds);
  statsInit();

  document.getElementById('counter').innerText = "Diamantes: 0 / " + nDiamonds;
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
  orbitControls.enableZoom = false
  orbitControls.enablePan = false
  orbitControls.minPolarAngle = Math.PI / 4
  orbitControls.maxPolarAngle = Math.PI / 2;

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
    diamonds.push(new Diamond(getRandomBetween(nDiamonds == 1 ? -150 : -160, nDiamonds == 1 ? -145 : 160), getRandomBetween(nDiamonds == 1 ? -150 : -160, nDiamonds == 1 ? -145 : 160), scene, physicWorld, hero.characterBody))
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
  document.getElementById('counter').innerText = "Diamantes: " + diamondsCounter + " / " + nDiamonds;
}

function moveCameraToCenter() {
  const targetPosition = new THREE.Vector3(5, 1, 5);  // Posición final de la cámara
  const duration = 2;  // Duración de la animación en segundos
  const startPosition = camera.position.clone();  // Clonamos la posición actual de la cámara
  const startTime = performance.now();  // Tiempo inicial
  const centerOfScene = new THREE.Vector3(0, 0, 0);  // Punto hacia el que queremos que mire la cámara

  function animateCamera(time) {
    const elapsed = (time - startTime) / 1000;  // Tiempo transcurrido en segundos
    const t = Math.min(elapsed / duration, 1);  // Interpolación entre 0 y 1
    camera.position.lerpVectors(startPosition, targetPosition, t);  // Interpolación lineal

    // Hacer que la cámara siempre mire hacia el centro de la escena
    camera.lookAt(centerOfScene);  // Ajusta la cámara para que mire hacia el centro dinámicamente

    // Si la interpolación no ha llegado a 1, seguir animando
    if (t < 1) {
      requestAnimationFrame(animateCamera);
    }
  }

  requestAnimationFrame(animateCamera);  // Inicia la animación
}



const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  let mixerUpdateDelta = clock.getDelta();
  // Avanzar la simulación física
  physicWorld.step(1 / 60, mixerUpdateDelta, 3);

  if (!win) {

    hero.update(mixerUpdateDelta, keysPressed);
    hero.adjustCameraTopPosition();
    diamonds.forEach((diamond, index) => {
      diamond.update();
      if (hero.characterBody && diamond.diamondBody) {
        const distancia = hero.characterBody.position.distanceTo(diamond.diamondBody.position);
        if (distancia <= 2) {

          // Eliminar el diamante del mundo de físicas y de la escena
          physicWorld.removeBody(diamond.diamondBody); // Eliminar del mundo físico
          diamonds.splice(index, 1); // Eliminar del array de diamantes
          scene.remove(diamond.model); // Eliminar la geometría Three.js
          scene.remove(diamond.circle); // Eliminar la geometría del mapa 

          // Aumentar el contador
          updateDiamondsCounter();
        }
      }
    })

    orbitControls.update();

    decrementTime()
  }

  prisoner.update(mixerUpdateDelta);

  // Verificar si se han recogido todos los diamantes
  if (diamonds.length === 0) {
    win = true;
    scene.remove(prison.prison);
    moveCameraToCenter(); // Mover la cámara cuando se recogen todos los diamantes
    prisoner.release();
    document.getElementById('winText').style.display = 'block'; // Mostrar el texto de "Ganaste"
  }
  // Actualizar controles de órbita para la cámara de tercera persona

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

  stats.end(); // Termina la medición del rendimiento

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
