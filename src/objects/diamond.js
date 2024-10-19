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
  circle;

  get model() {
    return this.model;
  }
  get diamondBody() {
    return this.diamondBody;
  }
  get circle() {
    return this.circle;
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

        this.diamondBody = new CANNON.Body({ mass: 1, material: new CANNON.Material('default') });
        this.diamondBody.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 0.15, 0.25)));
        this.diamondBody.position.x = this.posX;
        this.diamondBody.position.z = this.posZ;
        this.diamondBody.position.y = 70

        this.model.scale.set(this.scale, this.scale, this.scale)
        this.model.position.copy(this.diamondBody.position)

        // Crear circulo para mapa ortografico
        this.circle = new THREE.Mesh(new THREE.CircleGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 'gray' }))
        this.circle.position.set(this.diamondBody.position.x, 90, this.diamondBody.position.z);
        this.circle.rotation.x = -Math.PI / 2;

        scene.add(this.model);
        scene.add(this.circle);
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
      this.model.position.copy(this.diamondBody.position);
      this.circle.position.x = this.model.position.x;
      this.circle.position.z = this.model.position.z;
    }
  }


}