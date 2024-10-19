import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const UP = 'arrowup'
const LEFT = 'arrowleft'
const DOWN = 'arrowdown'
const RIGHT = 'arrowright'
const SHIFT = 'shift'
const W = 'w'
const DIRECTIONS = [UP, LEFT, DOWN, RIGHT]
const ACTIONS = [W]

const SURFACES = ["land", "water"]


export class Hero {
  model
  mixer
  animationsMap = new Map()
  orbitControl
  camera;
  get camera() {
    return this.camera;
  }
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
  waterLevel = -1;
  initialPosition = {
    x: -155,
    y: 1,
    z: -155
  }

  // Nuevas propiedades para el triángulo
  triangle;
  triangleMaterial;

  constructor(orbitControl, camera, cameraTop, scene, physicWorld) {
    const radius = 1;
    this.characterBody = new CANNON.Body({ mass: 1, material: new CANNON.Material('default') });
    this.characterBody.addShape(new CANNON.Sphere(radius));
    this.characterBody.position.x = this.initialPosition.x;
    this.characterBody.position.y = this.initialPosition.y;
    this.characterBody.position.z = this.initialPosition.z;

    new GLTFLoader().loadAsync("/models/mainCharacter.glb")
      .then((gltf) => {
        this.model = gltf.scene;
        this.model.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            if (object.material.map) {
              object.material.roughness = 0.6;
              object.material.metalness = 0.0;
            }
            object.material.color.set(0xffeed4);
          }
        });
        this.gltfAnimations = gltf.animations;

        this.mixer = new THREE.AnimationMixer(this.model);
        this.gltfAnimations.filter(a => a.name != 'TPose').forEach((a) => {
          this.animationsMap.set(a.name, this.mixer.clipAction(a))
        });

        this.model.position.copy(this.characterBody.position);
        this.model.rotation.y = -2.2;
        this.model.position.y -= 1;
        this.currentAction = "Idle";
        this.animationsMap.forEach((value, key) => {
          if (key == this.currentAction) {
            value.play();
          }
        });

        this.orbitControl = orbitControl;
        this.camera = camera;
        this.camera.position.x = this.model.position.x - 3;
        this.camera.position.z = this.model.position.z - 3;
        this.camera.position.y = this.model.position.y + 2;
        this.cameraTop = cameraTop;
        this.cameraTop.position.x = this.model.position.x;
        this.cameraTop.position.z = this.model.position.z;
        this.cameraTop.position.y = 100;
        this.cameraTop.lookAt(this.model.position.x, 0, this.model.position.z);
        this.#updateCameraTarget(0, 0);
        // this.#updateCameraTopTarget(0, 0);
        this.cameraTop.rotation.z -= ((Math.PI / 4) + (Math.PI / 2));
        this.currentSurface = "land";

        // Crear el triángulo y agregarlo a la escena
        this.#createTriangle(scene);

        scene.add(this.model);
        physicWorld.addBody(this.characterBody);
      })
      .catch((error) => {
        console.error('Error al cargar el modelo:', error);
      });
  }

  #createTriangle(scene) {
    const vertices = new Float32Array([
      0, 3, 0, // vértice superior
      -3, -3, 0, // vértice inferior izquierdo
      3, -3, 0 // vértice inferior derecho
    ]);

    const triangleGeometry = new THREE.BufferGeometry();
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    this.triangleMaterial = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide }); // Material amarillo
    this.triangle = new THREE.Mesh(triangleGeometry, this.triangleMaterial);

    // Posicionamos el triángulo por encima del personaje
    this.triangle.position.set(this.characterBody.position.x, 90, this.characterBody.position.z);
    // this.triangle.rotation.x = Math.PI / 4;
    this.triangle.rotation.x = -Math.PI / 2;

    scene.add(this.triangle);
  }

  getHeroModel() {
    return this.model;
  }

  get characterBody() {
    return this.characterBody;
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
    if (this.model) {
      const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true);

      var play = '';
      if (directionPressed && this.toggleRun && this.currentSurface == "land") {
        play = 'Run';
      } else if (directionPressed && this.currentSurface == "land") {
        play = 'Walk';
      } else if (this.currentSurface == "land") {
        play = "Idle";
      } else {
        play = "Swim";
      }

      const actionPressed = ACTIONS.find(key => keysPressed[key] == true);

      switch (actionPressed) {
        case W:
          play = 'Jump';
          break;
        default:
          break;
      }

      if (this.currentAction != play) {
        const toPlay = this.animationsMap.get(play);
        const current = this.animationsMap.get(this.currentAction);

        current.fadeOut(this.fadeDuration);
        toPlay.reset().fadeIn(this.fadeDuration).play();

        this.currentAction = play;
      }

      this.mixer.update(delta);

      let moveX = 0;
      let moveZ = 0;
      if (directionPressed) {
        var angleYCameraDirection = Math.atan2(
          (this.camera.position.x - this.model.position.x),
          (this.camera.position.z - this.model.position.z));

        var directionOffset = this.calculateRotationOffset(keysPressed);

        this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
        this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);
        this.triangle.rotation.z = (angleYCameraDirection - directionOffset);

        this.camera.getWorldDirection(this.walkDirection);
        this.walkDirection.y = 0;
        this.walkDirection.normalize();
        this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

        const velocity = this.toggleRun && this.currentSurface == "land" ? this.runVelocity : this.walkVelocity;

        this.characterBody.velocity.x = this.walkDirection.x * velocity;
        this.characterBody.velocity.z = this.walkDirection.z * velocity;

        moveX = this.walkDirection.x * velocity * delta;
        moveZ = this.walkDirection.z * velocity * delta;

        this.camera.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

        this.model.position.copy(this.characterBody.position);
        this.model.position.y -= 1;

        // Actualizar la posición del triángulo
        this.triangle.position.x = this.model.position.x;
        this.triangle.position.z = this.model.position.z;

        this.#updateCameraTarget(moveX, moveZ);
        // this.#updateCameraTopTarget(moveX, moveZ);
      } else {
        this.characterBody.velocity.x = 0;
        this.characterBody.velocity.z = 0;
      }


      if (this.characterBody.position.y < this.waterLevel) {
        if (this.currentSurface !== "water") {
          console.log("El personaje ha entrado en el agua");
          this.currentSurface = "water";
        }
      } else {
        if (this.currentSurface !== "land") {
          console.log("El personaje ha salido del agua");
          this.currentSurface = "land";
        }
      }
    }
  }

  #updateCameraTarget(moveX, moveZ) {
    // move camera
    this.camera.position.x += moveX
    this.camera.position.z += moveZ

    this.cameraTarget.x = this.characterBody.position.x
    this.cameraTarget.y = this.characterBody.position.y
    this.cameraTarget.z = this.characterBody.position.z

    this.cameraTop.position.x += moveX
    this.cameraTop.position.z += moveZ

    this.orbitControl.target = this.cameraTarget
  }

  resetCameraPosition() {
    const idealOffset = new THREE.Vector3(0, 2, 5);  // Ajusta este offset para controlar la posición de la cámara
    idealOffset.applyQuaternion(this.model.quaternion);  // Aplica la rotación del modelo al offset
    idealOffset.add(this.model.position);  // Establece la posición deseada para la cámara de perspectiva

    // Suavizado para el seguimiento de la cámara de perspectiva
    this.camera.position.lerp(idealOffset, 0.9);

    // Actualizar el objetivo de la cámara de perspectiva (mirar al personaje)
    const lookAt = new THREE.Vector3(0, 1, 0);  // Punto donde la cámara debe mirar
    lookAt.applyQuaternion(this.model.quaternion);  // Aplica la rotación del personaje al vector
    lookAt.add(this.model.position);  // Posición a la que debe mirar la cámara

    // La cámara de perspectiva mira al personaje
    this.camera.lookAt(lookAt);
  }

  adjustCameraTopPosition() {
    if (this.model) {
      // Actualizar la posición de la cámara ortográfica (cameraTop)
      const topOffset = new THREE.Vector3(0, 100, 0);  // Offset de la cámara ortográfica para mantener la vista desde arriba
      topOffset.add(this.model.position);  // Aplica la posición del personaje (mantenemos la altura en Y)

      // Suavizar el seguimiento de la cámara ortográfica
      this.cameraTop.position.lerp(topOffset, 0.9);

      // Rotar la cámara ortográfica para que siempre mire hacia adelante en función del triángulo
      const direction = new THREE.Vector3(0, 0, -1);  // Dirección inicial "hacia adelante"
      direction.applyQuaternion(this.model.quaternion);  // Aplica la rotación del modelo a la dirección
      const lookAtTop = new THREE.Vector3();
      lookAtTop.copy(this.model.position).add(direction);  // Ajusta el objetivo de la cámara ortográfica

      // Calcular la rotación deseada (hacia donde queremos que mire la cámara ortográfica)
      const currentQuaternion = this.cameraTop.quaternion.clone();
      const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(this.cameraTop.position, lookAtTop, this.cameraTop.up)
      );

      // Interpolar suavemente entre la rotación actual y la rotación objetivo (slerp)
      this.cameraTop.quaternion.slerpQuaternions(currentQuaternion, targetQuaternion, 0.1);
    }
  }




  calculateRotationOffset(keysPressed) {
    let directionOffset = 0

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
        directionOffset = Math.PI
      }
    } else if (keysPressed[LEFT]) {
      directionOffset = Math.PI / 2
    } else if (keysPressed[RIGHT]) {
      directionOffset = - Math.PI / 2
    }
    return directionOffset
  }

  jump() {
    if (this.currentAction != 'Jump'
      && this.currentAction != "Swim"
      && this.characterBody.position.y <= 1)
      this.characterBody.velocity.y = 3; // Ajusta la fuerza de salto
  }
}