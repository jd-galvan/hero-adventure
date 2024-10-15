import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Diamond {

  scale = 0.5;
  posX;
  posZ;
  model;
  diamondBody;
  heroBody;

  get model() {
    return this.model;
  }
  get diamondBody() {
    return this.diamondBody;
  }

  constructor(posX, posZ, scene, physicWorld, heroBody) {
    this.posX = posX;
    this.posZ = posZ;
    new GLTFLoader().loadAsync("/models/diamond.glb")
      .then((gltf) => {
        this.model = gltf.scene;
        this.model.traverse((object) => {
          if (object.isMesh) {
            object.material = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              metalness: 0.4,         // Sin metalidad
              roughness: 0.1,         // Un poco más de rugosidad para reducir el brillo excesivo
              opacity: 1,           // Opacidad algo más alta para evitar que sea demasiado claro
              transmission: 0.4,     // Baja un poco la transmisión para reducir el exceso de claridad
            });
          }
        });
        const radius = 0.5;
        this.diamondBody = new CANNON.Body({ mass: 1, material: new CANNON.Material('default') });
        this.diamondBody.addShape(new CANNON.Sphere(radius));
        this.diamondBody.position.x = this.posX;
        this.diamondBody.position.z = this.posZ;
        this.diamondBody.position.y = 70

        this.model.scale.set(this.scale, this.scale, this.scale)
        this.model.position.copy(this.diamondBody.position)

        scene.add(this.model);
        physicWorld.addBody(this.diamondBody);
        this.diamondBody.addEventListener("collide", function (event) {
          const collidedWith = event.body; // El cuerpo con el que colisionó
          if (collidedWith == heroBody) {
            console.log("La esfera ha colisionado con el protagonista", collidedWith);
          }
        });
      })
      .catch((error) => {
        console.error('Error al cargar el modelo:', error);
      });
  }

  update() {
    if (this.model) {
      this.model.rotation.y += Math.PI / 100;
      this.model.position.copy(this.diamondBody.position);
    }
  }


}