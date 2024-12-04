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

    // Usar THREE.TextureLoader para cargar una imagen de mapa de entorno estándar
    const textureLoader = new THREE.TextureLoader();
    const envMap = textureLoader.load("textures/diamond.jpg", () => {
      // Se carga la imagen como mapa de entorno
      envMap.mapping = THREE.EquirectangularRefractionMapping;
      envMap.encoding = THREE.sRGBEncoding;

      // Aplicar el mapa de entorno a la escena y los materiales
      scene.background = envMap;  // Cambiar el fondo de la escena

      new GLTFLoader().loadAsync("/models/diamond.glb")
        .then((gltf) => {
          this.model = gltf.scene;
          this.model.traverse((object) => {
            if (object.isMesh) {
              object.castShadow = true;
              object.receiveShadow = true;

              // Crear material con el envMap
              object.material = new THREE.MeshPhysicalMaterial({
                envMap: envMap,
                metalness: 0.8,
                roughness: 0.2,
                opacity: 1,
                transmission: 0.4,
              });
            }
          });

          this.diamondBody = new CANNON.Body({ mass: 1, material: new CANNON.Material('default') });
          this.diamondBody.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 0.5, 0.25)));
          this.diamondBody.position.x = this.posX;
          this.diamondBody.position.z = this.posZ;
          this.diamondBody.position.y = 70;

          this.model.scale.set(this.scale, this.scale, this.scale);
          this.model.position.copy(this.diamondBody.position);

          // Crear circulo para mapa ortográfico
          this.circle = new THREE.Mesh(new THREE.CircleGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 'gray' }));
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
