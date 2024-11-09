import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Sky {
  width = 320;
  height = 320;
  depth = 320;
  skybox;
  wallBodies = [];

  constructor() {
    const prefixImage = "yonder"
    const bgImages = [
      `skybox/${prefixImage}_ft.jpg`,
      `skybox/${prefixImage}_bk.jpg`,
      `skybox/${prefixImage}_up.jpg`,
      `skybox/${prefixImage}_dn.jpg`,
      `skybox/${prefixImage}_rt.jpg`,
      `skybox/${prefixImage}_lf.jpg`
    ];

    const materialArray = bgImages.map(e => {
      let texture = new THREE.TextureLoader().load(e);
      return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    })

    const skyboxGeo = new THREE.BoxGeometry(this.width * 2, this.height * 2, this.depth * 2);
    this.skybox = new THREE.Mesh(skyboxGeo, materialArray);

    const halfSize = this.width / 2;

    // Pared izquierda
    const leftWallShape = new CANNON.Box(new CANNON.Vec3(1, halfSize, halfSize));
    const leftWallBody = new CANNON.Body({ mass: 0 });
    leftWallBody.addShape(leftWallShape);
    leftWallBody.position.set(-halfSize, 0, 0);
    this.wallBodies.push(leftWallBody);

    // Pared derecha
    const rightWallShape = new CANNON.Box(new CANNON.Vec3(1, halfSize, halfSize));
    const rightWallBody = new CANNON.Body({ mass: 0 });
    rightWallBody.addShape(rightWallShape);
    rightWallBody.position.set(halfSize, 0, 0);
    this.wallBodies.push(rightWallBody);

    // Pared frontal
    const frontWallShape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, 1));
    const frontWallBody = new CANNON.Body({ mass: 0 });
    frontWallBody.addShape(frontWallShape);
    frontWallBody.position.set(0, 0, halfSize);
    this.wallBodies.push(frontWallBody);

    // Pared trasera
    const backWallShape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, 1));
    const backWallBody = new CANNON.Body({ mass: 0 });
    backWallBody.addShape(backWallShape);
    backWallBody.position.set(0, 0, -halfSize);
    this.wallBodies.push(backWallBody);
  }

  get skybox() {
    return this.skybox;
  }

  get wallBodies() {
    return this.wallBodies;
  }
}