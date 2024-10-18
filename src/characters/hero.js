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
  waterLevel = -1;
  initialPosition = {
    x: -155,
    y: 1,
    z: -155
  }

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
        })

        this.model.position.copy(this.characterBody.position)
        this.model.rotation.y = -2.2
        this.model.position.y -= 1;
        this.currentAction = "Idle"
        this.animationsMap.forEach((value, key) => {
          if (key == this.currentAction) {
            value.play()
          }
        })
        this.orbitControl = orbitControl
        this.camera = camera
        this.camera.position.x = this.model.position.x - 3
        this.camera.position.z = this.model.position.z - 3
        this.camera.position.y = this.model.position.y + 2
        this.#updateCameraTarget(0, 0);
        this.cameraTop = cameraTop
        this.cameraTop.position.x = this.model.position.x
        this.cameraTop.position.z = this.model.position.z
        this.cameraTop.position.y = 100
        this.cameraTop.lookAt(this.model.position.x, 0, this.model.position.z)
        this.#updateCameraTopTarget(0, 0);
        this.cameraTop.rotation.z -= Math.PI / 2;
        this.currentSurface = "land"

        scene.add(this.model);
        physicWorld.addBody(this.characterBody);
      })
      .catch((error) => {
        console.error('Error al cargar el modelo:', error);
      });
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
        var directionOffset = this.calculateRotationOffset(keysPressed)

        // rotate model
        this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
        this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

        // calculate direction
        this.camera.getWorldDirection(this.walkDirection)
        this.walkDirection.y = 0
        this.walkDirection.normalize()
        this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

        // run/walk velocity
        const velocity = this.toggleRun && this.currentSurface == "land" ? this.runVelocity : this.walkVelocity

        this.characterBody.velocity.x = this.walkDirection.x * velocity;
        this.characterBody.velocity.z = this.walkDirection.z * velocity;
        // move model & camera
        moveX = this.walkDirection.x * velocity * delta
        moveZ = this.walkDirection.z * velocity * delta

        this.camera.quaternion.rotateTowards(this.rotateQuarternion, 0.2)
        // Sincronizar el modelo con el cuerpo físico
        this.model.position.copy(this.characterBody.position);
        this.model.position.y -= 1;

        this.#updateCameraTarget(moveX, moveZ);
        this.#updateCameraTopTarget(moveX, moveZ);
      } else {
        // Detener al personaje si no se presionan teclas de dirección
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

    this.orbitControl.target = this.cameraTarget
  }

  #updateCameraTopTarget(moveX, moveZ) {
    // move camera
    this.cameraTop.position.x += moveX
    this.cameraTop.position.z += moveZ
  }

  resetCameraPosition() {
    const idealOffset = new THREE.Vector3(0, 2, 5);
    idealOffset.applyQuaternion(this.model.quaternion);
    idealOffset.add(this.model.position);

    // Suavizado para el seguimiento de la cámara
    this.camera.position.lerp(idealOffset, 0.9);

    // Actualizar el objetivo de la cámara (mirar al personaje)
    const lookAt = new THREE.Vector3(0, 1, 0); // Posición a la que debe mirar la cámara
    lookAt.applyQuaternion(this.model.quaternion);
    lookAt.add(this.model.position);

    this.camera.lookAt(lookAt);
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