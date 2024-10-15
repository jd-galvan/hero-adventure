import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Prison {
  anchoCelda = 5;
  altoCelda = 3;
  grosorSuperficie = 0.2;
  profundidadCelda = 5;
  prison;
  _prisonBody;

  get prisonBody() {
    return this._prisonBody;
  }

  get prison() {
    return this.prison;
  }

  constructor() {
    // Crear material para las paredes, piso y barras
    this.prison = new THREE.Group()
    const materialSuperficie = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const materialBarra = new THREE.MeshBasicMaterial({ color: 0x444444 });

    // Piso
    const piso = new THREE.Mesh(new THREE.BoxGeometry(this.anchoCelda, this.grosorSuperficie, this.profundidadCelda), materialSuperficie);
    piso.position.set(0, this.grosorSuperficie / 2, 0);
    this.prison.add(piso);

    // Techo
    const techo = new THREE.Mesh(new THREE.BoxGeometry(this.anchoCelda, this.grosorSuperficie, this.profundidadCelda), materialSuperficie);
    techo.position.set(0, this.altoCelda, 0);
    this.prison.add(techo);

    // Crear las barras de la celda (CylinderGeometry)
    const radioBarra = 0.05;
    const alturaBarra = this.altoCelda;

    // Crear barras
    for (let i = -3; i <= 3; i++) {
      const barra = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
      barra.position.set(i * 0.8, alturaBarra / 2, -this.profundidadCelda / 2 + this.grosorSuperficie / 2); // Colocar barras en la pared frontal
      this.prison.add(barra);

      const barra2 = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
      barra2.position.set(this.anchoCelda / 2 - this.grosorSuperficie / 2, alturaBarra / 2, i * 0.8); // Colocar barras en la pared derecha
      this.prison.add(barra2);

      const barra3 = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
      barra3.position.set(-this.anchoCelda / 2 + this.grosorSuperficie / 2, alturaBarra / 2, i * 0.8); // Colocar barras en la pared izquierda
      this.prison.add(barra3);

      const barra4 = new THREE.Mesh(new THREE.CylinderGeometry(radioBarra, radioBarra, alturaBarra), materialBarra);
      barra4.position.set(i * 0.8, alturaBarra / 2, this.profundidadCelda / 2 - this.grosorSuperficie / 2); // Colocar barras en la pared trasera
      this.prison.add(barra4);
    }

    const physicShape = new CANNON.Box(new CANNON.Vec3(this.anchoCelda / 2, this.altoCelda / 2, this.anchoCelda / 2)); // La mitad del tamaño del cubo en cada eje
    this._prisonBody = new CANNON.Body({
      mass: 0, // Establecer la masa (1 significa que tiene peso)
      position: new CANNON.Vec3(0, 1, 0), // Posicionar el cuerpo en el espacio
      shape: physicShape
    });
  }
}


