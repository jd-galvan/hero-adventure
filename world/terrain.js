import * as THREE from 'three';
import * as CANNON from 'cannon-es'

const GRASS = 0
const MOUNTAIN = 1
const LAKE = 2
const HILL = 3
const SNOW_MOUNTAIN = 4
const LAND_FLOOR = 5
const BUSH = 6

// Z values for surfaces
const zs = {
  "0": 0,
  "1": 40,
  "2": -20,
  "3": 10,
  "4": 60,
  "5": 0,
  "6": 10,
}

// Colors for vertex
const cs = {
  "0": [0.490, 0.902, 0.463],
  "1": [0.318, 0.255, 0.047],
  "2": [0, 0, 0],
  "3": [0.318, 0.255, 0.047],
  "4": [1, 1, 1],
  "5": [0.318, 0.255, 0.047],
  "6": [0.369, 0.643, 0.329]
}


export class Terrain {
  physicTerrain;
  terrainSurface;
  physicWater;
  waterSurface;

  width = 320;
  height = 320;
  divisions = 20;

  constructor() {
    const terrainMatrix = [
      [GRASS, GRASS, GRASS, GRASS, BUSH, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, BUSH, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, HILL, HILL, HILL, HILL, GRASS, GRASS, MOUNTAIN, MOUNTAIN, GRASS, BUSH, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS],
      [GRASS, GRASS, HILL, HILL, HILL, HILL, GRASS, GRASS, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS],
      [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, BUSH, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, GRASS],
      [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, GRASS],
      [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, GRASS, GRASS],
      [GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, LAKE, LAKE, LAKE, LAKE, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, BUSH, GRASS, GRASS, BUSH, GRASS, MOUNTAIN, MOUNTAIN, MOUNTAIN, GRASS, BUSH, GRASS, BUSH],
      [LAND_FLOOR, SNOW_MOUNTAIN, SNOW_MOUNTAIN, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, MOUNTAIN, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS],
      [LAND_FLOOR, SNOW_MOUNTAIN, SNOW_MOUNTAIN, SNOW_MOUNTAIN, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, LAND_FLOOR, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, MOUNTAIN, MOUNTAIN, GRASS, GRASS, GRASS],
    ]

    const terrainGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const physicMatrix = [];

    for (let i = 0; i <= this.divisions; i++) {
      const rowPhysicMatrix = [];
      for (let j = 0; j <= this.divisions; j++) {
        const x = (i / this.divisions) * this.width - this.width / 2;
        const y = (j / this.divisions) * this.height - this.height / 2;
        let z = zs[terrainMatrix[i][j]];
        vertices.push(x, y, z);
        colors.push(...cs[terrainMatrix[i][j]]);
        rowPhysicMatrix.push(z)
      }
      physicMatrix.push(rowPhysicMatrix);
    }

    const indexes = [];
    for (let i = 0; i < this.divisions; i++) {
      for (let j = 0; j < this.divisions; j++) {
        const a = i * (this.divisions + 1) + (j + 1);
        const b = i * (this.divisions + 1) + j;
        const c = (i + 1) * (this.divisions + 1) + j;
        const d = (i + 1) * (this.divisions + 1) + (j + 1);

        // Dos triángulos por cuadrado en la malla
        indexes.push(a, b, d);
        indexes.push(b, c, d);
      }
    }

    terrainGeometry.setIndex(indexes);
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); // Añadir colores a los vértices
    terrainGeometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrainSurface = new THREE.Mesh(terrainGeometry, terrainMaterial);
    this.terrainSurface.rotation.x = -Math.PI / 2;

    const elementSize = this.width / this.divisions;
    const heightfieldShape = new CANNON.Heightfield(physicMatrix, { elementSize });
    this.physicTerrain = new CANNON.Body({ mass: 0 });
    this.physicTerrain.addShape(heightfieldShape);
    this.physicTerrain.position.set(-this.height / 2, 0, this.width / 2);
    this.physicTerrain.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    // Water
    this.waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.height),
      new THREE.MeshBasicMaterial({
        color: 0x7DE6FF,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      }));
    this.waterSurface.position.y = -2;
    this.waterSurface.rotation.x = Math.PI / 2;

    const waterHeight = 10;
    const waterShape = new CANNON.Box(new CANNON.Vec3(this.width / 2, waterHeight, this.width / 2));
    this.physicWater = new CANNON.Body({ mass: 0, material: new CANNON.Material('water') });
    this.physicWater.addShape(waterShape);
    this.physicWater.position.set(0, -3.3 - waterHeight, 0);
  }

  getTerrainSurface() {
    return this.terrainSurface;
  }

  getPhysicTerrain() {
    return this.physicTerrain
  }

  getWaterSurface() {
    return this.waterSurface;
  }

  getPhysicWater() {
    return this.physicWater;
  }

  generateFloor() {
    scene.add(waterSurface);
    scene.add(terrain);
    physicWorld.addBody(heightfieldBody);
    physicWorld.addBody(physicWaterBody);
  }
}