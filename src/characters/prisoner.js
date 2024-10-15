import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Prisoner {
  model
  mixer
  animationsMap = new Map()

  // constants
  fadeDuration = 0.2

  constructor(scene) {
    new GLTFLoader().loadAsync("/models/prisoner.glb")
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

        this.currentAction = "Sad"
        this.animationsMap.forEach((value, key) => {
          if (key == this.currentAction) {
            value.play()
          }
        })

        scene.add(this.model);
      })
      .catch((error) => {
        console.error('Error al cargar el modelo:', error);
      });
  }

  update(delta) {
    if (this.model) {
      this.mixer.update(delta)
    }
  }
}