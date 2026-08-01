/**
 * Interactive Bloch Sphere Visualizer Component
 */

import { QubitState, QuantumGates } from '../engine/quantum_state.js';

export class BlochSphereVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.qubitState = new QubitState(); // Defaults to |0>
    
    // Camera rotation angles
    this.rotX = 0.3; // pitch
    this.rotY = 0.6; // yaw

    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.initEvents();
    this.resize();
    this.render();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio || 300;
    this.canvas.height = rect.height * window.devicePixelRatio || 220;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.rotY += dx * 0.01;
      this.rotX += dy * 0.01;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.render();
    });
  }

  setState(qubitState) {
    this.qubitState = qubitState.clone();
    this.render();
  }

  applyGate(gate) {
    this.qubitState.applyGate(gate);
    this.render();
  }

  // 3D to 2D perspective projection
  project(x, y, z, radius) {
    // Rotate Y
    const x1 = x * Math.cos(this.rotY) + z * Math.sin(this.rotY);
    const z1 = -x * Math.sin(this.rotY) + z * Math.cos(this.rotY);
    // Rotate X
    const y2 = y * Math.cos(this.rotX) - z1 * Math.sin(this.rotX);
    const z2 = y * Math.sin(this.rotX) + z1 * Math.cos(this.rotX);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const px = cx + x1 * radius;
    const py = cy - y2 * radius;

    return { x: px, y: py, z: z2 };
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const radius = Math.min(w, h) * 0.35;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw outer sphere circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.fill();

    // 2. Draw equator & meridian circles
    this.drawCircle3D(0, 0, 0, radius, 'xy', 'rgba(255, 255, 255, 0.08)');
    this.drawCircle3D(0, 0, 0, radius, 'xz', 'rgba(0, 240, 255, 0.15)');

    // 3. Draw Axes (X, Y, Z)
    this.drawAxis(1.2, 0, 0, '+X (|+⟩)', '#ff00a0', radius);
    this.drawAxis(0, 1.2, 0, '+Y (|i⟩)', '#00ff88', radius);
    this.drawAxis(0, 0, 1.2, '+Z (|0⟩)', '#00f0ff', radius);
    this.drawAxis(0, 0, -1.2, '-Z (|1⟩)', '#8a2be2', radius);

    // 4. Draw State Vector
    const coords = this.qubitState.getBlochCoords();
    const pCenter = this.project(0, 0, 0, radius);
    const pVector = this.project(coords.x, coords.y, coords.z, radius);

    // Vector line with glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(pCenter.x, pCenter.y);
    ctx.lineTo(pVector.x, pVector.y);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrowhead point
    ctx.beginPath();
    ctx.arc(pVector.x, pVector.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Update state text overlay if element exists
    const textEl = document.getElementById('blochStateText');
    if (textEl) {
      const aRe = this.qubitState.alpha.re.toFixed(2);
      const aIm = this.qubitState.alpha.im.toFixed(2);
      const bRe = this.qubitState.beta.re.toFixed(2);
      const bIm = this.qubitState.beta.im.toFixed(2);
      textEl.innerText = `|ψ⟩ = (${aRe}${aIm >= 0 ? '+' : ''}${aIm}i)|0⟩ + (${bRe}${bIm >= 0 ? '+' : ''}${bIm}i)|1⟩`;
    }
  }

  drawCircle3D(cx, cy, cz, radius, plane, style) {
    const ctx = this.ctx;
    const steps = 60;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      let x = 0, y = 0, z = 0;
      if (plane === 'xz') {
        x = Math.cos(angle);
        z = Math.sin(angle);
      } else if (plane === 'xy') {
        x = Math.cos(angle);
        y = Math.sin(angle);
      }
      const p = this.project(x, y, z, radius);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawAxis(x, y, z, label, color, radius) {
    const ctx = this.ctx;
    const pCenter = this.project(0, 0, 0, radius);
    const pTip = this.project(x, y, z, radius);

    ctx.beginPath();
    ctx.moveTo(pCenter.x, pCenter.y);
    ctx.lineTo(pTip.x, pTip.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.fillText(label, pTip.x + 4, pTip.y + 4);
  }
}
