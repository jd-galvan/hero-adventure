import * as THREE from 'three'
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
    cameraTop, currentAction) {
    this.model = model
    model.position.x = -155
    model.position.z = -155
    // model.position.y = -4.3 // For swimming

    model.rotation.y = -2.2
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

      // move model & camera
      const moveX = this.walkDirection.x * velocity * delta
      const moveZ = this.walkDirection.z * velocity * delta
      this.model.position.x += moveX
      this.model.position.z += moveZ
      this.#updateCameraTarget(moveX, moveZ)
    }
  }

  #updateCameraTarget(moveX, moveZ) {
    // move camera
    this.camera.position.x += moveX
    this.camera.position.z += moveZ

    // update camera target
    this.cameraTarget.x = this.model.position.x
    this.cameraTarget.y = this.model.position.y + 1
    this.cameraTarget.z = this.model.position.z

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