/**
 * Three.js WebGL 3D Graph Renderer for Surfaces and 3D Curves
 */

import * as THREE from "three";

export interface ThreeSurfacePlot {
  fn: (x: number, y: number) => number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  resolution?: number;
  wireframe?: boolean;
}

export interface ThreeCurvePlot {
  fn: (t: number) => [number, number, number];
  tMin: number;
  tMax: number;
  samples?: number;
  color?: string;
}

/**
 * Color map generator from normalized value [0, 1] to Three.js Color
 */
function heightToColor(t: number): THREE.Color {
  // Cyan -> Purple -> Amber gradient
  const clamped = Math.max(0, Math.min(1, t));
  const color = new THREE.Color();
  if (clamped < 0.5) {
    // 0 to 0.5: Cyan (#00d4ff) to Purple (#a855f7)
    const factor = clamped * 2;
    color.setRGB(
      (1 - factor) * 0.0 + factor * 0.66,
      (1 - factor) * 0.83 + factor * 0.33,
      (1 - factor) * 1.0 + factor * 0.97,
    );
  } else {
    // 0.5 to 1: Purple (#a855f7) to Amber (#f59e0b)
    const factor = (clamped - 0.5) * 2;
    color.setRGB(
      (1 - factor) * 0.66 + factor * 0.96,
      (1 - factor) * 0.33 + factor * 0.62,
      (1 - factor) * 0.97 + factor * 0.04,
    );
  }
  return color;
}

export class ThreeGraphController {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private meshGroup: THREE.Group;
  private isDestroyed = false;

  // Orbit controls state
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private spherical = { radius: 25, theta: Math.PI / 4, phi: Math.PI / 3 };

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0d14);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 15);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x00d4ff, 0.4);
    dirLight2.position.set(-10, -10, -10);
    this.scene.add(dirLight2);

    // Grid floor
    const grid = new THREE.GridHelper(20, 20, 0x00d4ff, 0x27273a);
    grid.position.y = 0;
    this.scene.add(grid);

    // Axes
    const axes = new THREE.AxesHelper(6);
    this.scene.add(axes);

    this.meshGroup = new THREE.Group();
    this.scene.add(this.meshGroup);

    this.setupInteraction();
    this.render();
  }

  private updateCameraPosition() {
    this.camera.position.x =
      this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z =
      this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    this.camera.lookAt(0, 0, 0);
  }

  private setupInteraction() {
    const dom = this.renderer.domElement;

    dom.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;

      this.spherical.theta -= dx * 0.01;
      this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi - dy * 0.01));

      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.updateCameraPosition();
      this.render();
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    dom.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.spherical.radius = Math.max(5, Math.min(80, this.spherical.radius + e.deltaY * 0.05));
        this.updateCameraPosition();
        this.render();
      },
      { passive: false },
    );
  }

  public updateSurface(plot: ThreeSurfacePlot) {
    // Clear previous objects
    while (this.meshGroup.children.length > 0) {
      const obj = this.meshGroup.children[0];
      this.meshGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    const { fn, xMin, xMax, yMin, yMax, resolution = 60, wireframe = false } = plot;
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const dx = (xMax - xMin) / resolution;
    const dy = (yMax - yMin) / resolution;

    // 1. Calculate heights and min/max Z
    const zValues: number[][] = [];
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let j = 0; j <= resolution; j++) {
      const row: number[] = [];
      const y = yMin + j * dy;
      for (let i = 0; i <= resolution; i++) {
        const x = xMin + i * dx;
        let z = fn(x, y);
        if (!Number.isFinite(z) || Number.isNaN(z)) z = 0;
        row.push(z);
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      zValues.push(row);
    }

    const zSpan = maxZ - minZ || 1;

    // 2. Build vertices & color attributes
    for (let j = 0; j <= resolution; j++) {
      const y = yMin + j * dy;
      for (let i = 0; i <= resolution; i++) {
        const x = xMin + i * dx;
        const z = zValues[j][i];

        // Map math coordinates (X, Y, Z) to Three.js (X, Z_up, -Y)
        vertices.push(x, z, -y);

        const normZ = (z - minZ) / zSpan;
        const c = heightToColor(normZ);
        colors.push(c.r, c.g, c.b);
      }
    }

    // 3. Build triangle face indices
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        const a = j * (resolution + 1) + i;
        const b = j * (resolution + 1) + i + 1;
        const c = (j + 1) * (resolution + 1) + i + 1;
        const d = (j + 1) * (resolution + 1) + i;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.2,
      wireframe,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.meshGroup.add(mesh);
    this.render();
  }

  public resize(width: number, height: number) {
    if (this.isDestroyed || width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.render();
  }

  public render() {
    if (this.isDestroyed) return;
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isDestroyed = true;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
