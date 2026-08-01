# QuantumNet Studio ⚛️🌐

An interactive, high-performance web-based **Quantum Internet Simulator** for designing, simulating, and analyzing Quantum Networks and Communication Protocols.

![QuantumNet Studio](https://img.shields.io/badge/QuantumNet-v2.5-00f0ff?style=for-the-badge) ![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20ES6%20Modules-purple?style=for-the-badge)

---

## 🌟 Key Features

- **Interactive Quantum Topology Canvas**:
  - Drag-and-drop end-terminals (Alice & Bob), quantum repeaters, routers, satellite links, and eavesdroppers (Eve).
  - Real-time photon particle animations along optical fiber channels ($0.2\text{ dB/km}$ attenuation).
- **Quantum Protocol Suite**:
  - **BB84 QKD**: Quantum Key Distribution with Eve intercept-resend attack models, basis sifting, and live QBER (%) alarm calculation.
  - **Quantum Teleportation**: Step-by-step state preparation $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$, Bell pair distribution, BSM at Alice, classical 2-bit feedforward, and Pauli corrections ($Z^{b_1} X^{b_2}$).
  - **Entanglement Swapping**: Multi-hop quantum repeater chain creating end-to-end Bell pairs without direct photon transmission.
- **Interactive 3D Bloch Sphere**:
  - 3D unit sphere visualizer with camera rotation controls and real-time quantum gate transformations ($H, X, Y, Z, S, T$).
- **Live Telemetry & Data Analytics**:
  - Real-time charts for Link Fidelity vs. Distance and QBER vs. Eavesdropping Intensity.

---

## 🚀 Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quantum-internet-simulator.git
   cd quantum-internet-simulator
   ```

2. Start the local server:
   ```bash
   node server.js
   ```

3. Open `http://127.0.0.1:8085` in your browser.

---

## 📂 Project Structure

```
quantum-internet-simulator/
├── index.html                 # Main Dashboard & UI Layout
├── css/                       # Design System & Styling
│   ├── main.css               # Glassmorphism dark theme, typography
│   ├── canvas.css             # Network canvas & toolbar styles
│   └── components.css         # Bloch sphere, telemetry cards & event terminal
└── js/                        # ES6 Modules
    ├── app.js                 # Application Coordinator
    ├── engine/                # Qubit Math, Gate Matrices, Loss Models
    ├── protocols/             # BB84, Teleportation, Entanglement Swapping
    └── ui/                    # Bloch Sphere 3D, Topology Canvas & Analytics
```

---

## 📄 License

MIT License © 2026
