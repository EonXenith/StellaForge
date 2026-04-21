import * as THREE from 'three';

export class CameraController {
  private spherical = new THREE.Spherical(3, Math.PI / 2, 0);
  private target = new THREE.Vector3(0, 0, 0);
  private panOffset = new THREE.Vector3();
  private isDragging = false;
  private isPanning = false;
  private lastMouse = { x: 0, y: 0 };
  private damping = 0.92;
  private rotateVelocity = { theta: 0, phi: 0 };
  private zoomMin = 1.5;
  private zoomMax = 10;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement
  ) {
    this.bindEvents();
    this.update();
  }

  private bindEvents() {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      // Only orbit if no tool is active (checked externally)
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.lastMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse = { x: e.clientX, y: e.clientY };

    if (this.isDragging) {
      this.rotateVelocity.theta = -dx * 0.005;
      this.rotateVelocity.phi = -dy * 0.005;
      this.spherical.theta += this.rotateVelocity.theta;
      this.spherical.phi += this.rotateVelocity.phi;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    }

    if (this.isPanning) {
      const panSpeed = 0.002 * this.spherical.radius;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      right.setFromMatrixColumn(this.camera.matrix, 0);
      up.setFromMatrixColumn(this.camera.matrix, 1);
      this.panOffset.addScaledVector(right, -dx * panSpeed);
      this.panOffset.addScaledVector(up, dy * panSpeed);
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius = Math.max(this.zoomMin, Math.min(this.zoomMax, this.spherical.radius * factor));
  };

  get orbitDragging() {
    return this.isDragging;
  }

  update() {
    // Apply damping
    if (!this.isDragging) {
      this.rotateVelocity.theta *= this.damping;
      this.rotateVelocity.phi *= this.damping;
      this.spherical.theta += this.rotateVelocity.theta;
      this.spherical.phi += this.rotateVelocity.phi;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    }

    // Apply pan
    this.target.add(this.panOffset);
    this.panOffset.set(0, 0, 0);

    // Update camera from spherical
    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos.add(this.target));
    this.camera.lookAt(this.target);
  }

  getZoom() {
    return this.spherical.radius;
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}
