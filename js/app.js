/**
 * QuantumNet Studio - Main Application Controller
 */

import { NetworkGraph, NodeType, LinkType } from './engine/network_graph.js';
import { TopologyCanvas } from './ui/topology_canvas.js';
import { BlochSphereVisualizer } from './ui/bloch_sphere.js';
import { TelemetryCharts } from './ui/charts.js';
import { BB84Protocol } from './protocols/bb84.js';
import { TeleportationProtocol } from './protocols/teleportation.js';
import { EntanglementSwappingProtocol } from './protocols/swapping.js';
import { QubitState, QuantumGates } from './engine/quantum_state.js';

class QuantumApp {
  constructor() {
    this.graph = new NetworkGraph();
    this.canvas = null;
    this.blochSphere = null;
    this.charts = null;
    this.activeProtocol = 'bb84'; // 'bb84', 'teleportation', 'swapping'
    
    this.init();
  }

  init() {
    // 1. Initialize Graph & Canvas
    this.canvas = new TopologyCanvas('networkCanvas', this.graph, (selection) => {
      this.handleSelectionChange(selection);
    });

    // 2. Initialize Bloch Sphere
    this.blochSphere = new BlochSphereVisualizer('blochCanvas');

    // 3. Initialize Telemetry Charts
    this.charts = new TelemetryCharts('fidelityChartCanvas', 'qberChartCanvas');
    this.charts.renderFidelityVsDistance(20);
    this.charts.renderQBERChart(0);

    // 4. Setup Event Listeners
    this.setupUIEvents();

    // 5. Load Default Preset Scenario (Repeater Chain)
    this.loadPreset('repeater');

    this.logEvent('QuantumNet Studio initialized. Operational.', 'info');
  }

  setupUIEvents() {
    // Nav Button Actions
    document.getElementById('btnReset').addEventListener('click', () => {
      this.graph.clear();
      this.logEvent('Network graph cleared.', 'warning');
    });

    document.getElementById('btnRunProtocol').addEventListener('click', () => {
      this.runActiveProtocol();
    });

    // Canvas Tool buttons
    document.getElementById('toolSelect').addEventListener('click', (e) => {
      this.setActiveTool('select', e.currentTarget);
    });
    document.getElementById('toolConnect').addEventListener('click', (e) => {
      this.setActiveTool('connect', e.currentTarget);
    });

    // Add Node palette drag/click events
    document.querySelectorAll('.node-palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const label = item.getAttribute('data-label');
        // Spawn in center
        const x = this.canvas.width / 2 + (Math.random() * 80 - 40);
        const y = this.canvas.height / 2 + (Math.random() * 80 - 40);
        const node = this.graph.addNode(label, type, x, y);
        this.logEvent(`Added node: ${label} (${type.toUpperCase()})`, 'info');
      });
    });

    // Preset selection
    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const preset = card.getAttribute('data-preset');
        this.loadPreset(preset);
      });
    });

    // Protocol tab selection
    document.querySelectorAll('#protocolTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#protocolTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeProtocol = btn.getAttribute('data-protocol');
        this.updateProtocolUI();
      });
    });

    // Bloch Sphere Quantum Gate Buttons
    document.querySelectorAll('.gate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const gateName = btn.getAttribute('data-gate');
        if (QuantumGates[gateName]) {
          this.blochSphere.applyGate(QuantumGates[gateName]);
          this.logEvent(`Applied quantum gate [${gateName}] to target qubit.`, 'info');
        }
      });
    });

    // Eve Eavesdropper Toggle
    const eveToggle = document.getElementById('eveToggle');
    if (eveToggle) {
      eveToggle.addEventListener('change', () => {
        this.logEvent(`Eavesdropper (Eve) Interception ${eveToggle.checked ? 'ENABLED' : 'DISABLED'}`, eveToggle.checked ? 'danger' : 'info');
      });
    }

    // Fiber Distance Slider
    const distSlider = document.getElementById('fiberDistSlider');
    if (distSlider) {
      distSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('fiberDistVal').innerText = `${val} km`;
        for (const link of this.graph.links.values()) {
          link.distanceKm = val;
        }
        this.updateMetricsDisplay();
        this.charts.renderFidelityVsDistance(val);
      });
    }
  }

  setActiveTool(toolMode, element) {
    this.canvas.mode = toolMode;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    if (toolMode === 'connect') {
      this.logEvent('Click source node then target node to establish quantum link.', 'info');
    }
  }

  handleSelectionChange({ node, link }) {
    const detailsPanel = document.getElementById('selectionDetails');
    if (!detailsPanel) return;

    if (node) {
      detailsPanel.innerHTML = `
        <div class="popover-header">${node.label} (${node.type.toUpperCase()})</div>
        <div class="popover-row"><span class="popover-label">Memory Slots:</span><span class="popover-val">${node.memorySlots} Qubits</span></div>
        <div class="popover-row"><span class="popover-label">Gate Infidelity:</span><span class="popover-val">${(node.gateInfidelity * 100).toFixed(2)}%</span></div>
        <div class="popover-row"><span class="popover-label">Status:</span><span class="popover-val">${node.status}</span></div>
      `;
    } else if (link) {
      const trans = (link.getTransmittance() * 100).toFixed(2);
      const fid = (link.getLinkFidelity() * 100).toFixed(2);
      detailsPanel.innerHTML = `
        <div class="popover-header">Quantum Link (${link.type.toUpperCase()})</div>
        <div class="popover-row"><span class="popover-label">Endpoints:</span><span class="popover-val">${link.source.label} ↔ ${link.target.label}</span></div>
        <div class="popover-row"><span class="popover-label">Distance:</span><span class="popover-val">${link.distanceKm} km</span></div>
        <div class="popover-row"><span class="popover-label">Transmittance:</span><span class="popover-val">${trans}%</span></div>
        <div class="popover-row"><span class="popover-label">Link Fidelity:</span><span class="popover-val">${fid}%</span></div>
      `;
    } else {
      detailsPanel.innerHTML = `<span style="color: var(--text-dim); font-size: 0.75rem;">Click any node or quantum link to inspect parameters.</span>`;
    }
  }

  loadPreset(presetName) {
    this.graph.clear();
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    switch (presetName) {
      case 'repeater': {
        const alice = this.graph.addNode('Alice (Node 1)', NodeType.ENDNODE, cx - 220, cy);
        const rep = this.graph.addNode('Repeater 1', NodeType.REPEATER, cx, cy);
        const bob = this.graph.addNode('Bob (Node 2)', NodeType.ENDNODE, cx + 220, cy);

        this.graph.addLink(alice.id, rep.id, 25, LinkType.FIBER);
        this.graph.addLink(rep.id, bob.id, 25, LinkType.FIBER);
        this.logEvent('Loaded Preset: Quantum Repeater Chain (3 Nodes).', 'info');
        break;
      }
      case 'bb84': {
        const alice = this.graph.addNode('Alice (Sender)', NodeType.ENDNODE, cx - 240, cy);
        const eve = this.graph.addNode('Eve (Attacker)', NodeType.EVE, cx, cy - 40);
        const bob = this.graph.addNode('Bob (Receiver)', NodeType.ENDNODE, cx + 240, cy);

        const l1 = this.graph.addLink(alice.id, eve.id, 15, LinkType.FIBER);
        const l2 = this.graph.addLink(eve.id, bob.id, 15, LinkType.FIBER);
        
        document.getElementById('eveToggle').checked = true;
        this.logEvent('Loaded Preset: BB84 QKD with Active Eavesdropping.', 'warning');
        break;
      }
      case 'teleportation': {
        const alice = this.graph.addNode('Alice', NodeType.ENDNODE, cx - 180, cy);
        const bob = this.graph.addNode('Bob', NodeType.ENDNODE, cx + 180, cy);
        this.graph.addLink(alice.id, bob.id, 10, LinkType.FIBER);
        this.logEvent('Loaded Preset: Quantum Teleportation Pipeline.', 'info');
        break;
      }
      case 'satellite': {
        const groundA = this.graph.addNode('Station Alpha', NodeType.ENDNODE, cx - 200, cy + 100);
        const sat = this.graph.addNode('LEO Quantum Sat', NodeType.SATELLITE, cx, cy - 120);
        const groundB = this.graph.addNode('Station Beta', NodeType.ENDNODE, cx + 200, cy + 100);

        this.graph.addLink(groundA.id, sat.id, 500, LinkType.FREE_SPACE);
        this.graph.addLink(sat.id, groundB.id, 500, LinkType.FREE_SPACE);
        this.logEvent('Loaded Preset: Satellite Free-Space Quantum Link.', 'info');
        break;
      }
    }
    this.updateMetricsDisplay();
  }

  runActiveProtocol() {
    // Animate photon pulses on all active links
    for (const link of this.graph.links.values()) {
      link.spawnPhotonAnimation({}, () => {});
    }

    if (this.activeProtocol === 'bb84') {
      const eveChecked = document.getElementById('eveToggle') ? document.getElementById('eveToggle').checked : false;
      const bb84 = new BB84Protocol({ numBits: 32, eveEnabled: eveChecked });
      const result = bb84.runSimulation();

      this.updateBB84UI(result);
      this.logEvent(`[BB84 Execution] Sent: ${result.numBitsSent} photons | Sifted Key: ${result.totalSifted} bits | QBER: ${result.qber.toFixed(1)}% | Secure Yield: ${result.secureKeyYield} bits`, result.eveDetected ? 'danger' : 'success');

      if (result.eveDetected) {
        this.logEvent('SECURITY ALERT: High QBER detected! Eavesdropping detected on quantum link.', 'danger');
      }
    } else if (this.activeProtocol === 'teleportation') {
      const teleport = new TeleportationProtocol();
      const result = teleport.runProtocol(0.95);

      this.blochSphere.setState(result.bobState);
      this.logEvent(`[Teleportation Execution] BSM Outcome Bits: [${result.classicalBits.join(', ')}] | Received State Fidelity: ${(result.fidelity * 100).toFixed(2)}%`, 'success');
    } else if (this.activeProtocol === 'swapping') {
      const swapping = new EntanglementSwappingProtocol();
      const result = swapping.runSwapping(0.95, 0.95);

      this.logEvent(`[Entanglement Swapping] BSM Outcome: ${result.bsmOutcomeLabel} | End-to-End Fidelity: ${(result.endToEndFidelity * 100).toFixed(1)}% | Repeater Gain: ${result.repeaterAdvantageRatio}x vs direct link`, 'success');
    }

    this.updateMetricsDisplay();
  }

  updateBB84UI(result) {
    const gridEl = document.getElementById('bb84BitGrid');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    for (let i = 0; i < result.aliceBits.length; i++) {
      const div = document.createElement('div');
      const matched = result.aliceBases[i] === result.bobBases[i];
      const isErr = matched && (result.aliceBits[i] !== result.bobBits[i]);

      div.className = `bit-item ${matched ? (isErr ? 'error' : 'match') : 'discarded'}`;
      div.innerText = result.aliceBits[i];
      div.title = `Alice: ${result.aliceBits[i]} (${result.aliceBases[i]}) | Bob: ${result.bobBits[i]} (${result.bobBases[i]})`;
      gridEl.appendChild(div);
    }
  }

  updateProtocolUI() {
    const bb84Panel = document.getElementById('bb84Controls');
    const teleportPanel = document.getElementById('teleportControls');

    if (this.activeProtocol === 'bb84') {
      if (bb84Panel) bb84Panel.style.display = 'block';
      if (teleportPanel) teleportPanel.style.display = 'none';
    } else {
      if (bb84Panel) bb84Panel.style.display = 'none';
      if (teleportPanel) teleportPanel.style.display = 'block';
    }
  }

  updateMetricsDisplay() {
    // Average link fidelity
    let totalFid = 0;
    let count = 0;
    for (const link of this.graph.links.values()) {
      totalFid += link.getLinkFidelity();
      count++;
    }
    const avgFid = count > 0 ? (totalFid / count * 100).toFixed(1) : '100.0';

    const fidVal = document.getElementById('metricFidelity');
    if (fidVal) fidVal.innerText = `${avgFid}%`;
  }

  logEvent(message, type = 'info') {
    const logContainer = document.getElementById('logTerminal');
    if (!logContainer) return;

    const timeStr = new Date().toLocaleTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-msg ${type}">${message}</span>`;
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

// Instantiate App when DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new QuantumApp();
});
