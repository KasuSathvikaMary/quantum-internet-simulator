/**
 * Quantum Network Graph Engine - Nodes, Links, Channels & Loss Models
 */

export const NodeType = {
  ENDNODE: 'endnode',      // Alice / Bob / User Terminals
  REPEATER: 'repeater',    // Quantum Repeater (BSM + Entanglement Swapping)
  ROUTER: 'router',        // Quantum Switch / Router
  SATELLITE: 'satellite',  // Space Quantum Node / Free-Space Link
  EVE: 'eve'               // Eavesdropper Node
};

export const LinkType = {
  FIBER: 'fiber',          // Standard Single-Mode Fiber (0.2 dB/km)
  FREE_SPACE: 'freespace'  // Satellite-to-Ground Optical Link
};

export class Node {
  constructor(id, label, type, x, y) {
    this.id = id;
    this.label = label;
    this.type = type;
    this.x = x;
    this.y = y;
    this.memorySlots = 4; // Max qubits stored in quantum memory
    this.qubits = [];     // Stored QubitState instances
    this.gateInfidelity = 0.005; // 0.5% gate error
    this.status = 'idle'; // 'idle', 'transmitting', 'receiving', 'entangled'
  }

  storeQubit(qubit) {
    if (this.qubits.length < this.memorySlots) {
      this.qubits.push(qubit);
      return true;
    }
    return false; // Memory full
  }

  clearMemory() {
    this.qubits = [];
  }
}

export class QuantumLink {
  constructor(id, sourceNode, targetNode, distanceKm = 10, type = LinkType.FIBER) {
    this.id = id;
    this.source = sourceNode;
    this.target = targetNode;
    this.distanceKm = distanceKm;
    this.type = type;
    
    // Physical Parameters
    this.attenuationDBperKm = (type === LinkType.FIBER) ? 0.2 : 0.05; // dB/km
    this.depolarizingRatePerKm = 0.003; // Noise accumulation
    this.entanglementRateHz = 1000;     // Initial pair generation rate Hz

    // Active photons in flight for animation: array of { progress: 0..1, speed, payload, state }
    this.photons = [];
  }

  /**
   * Channel Transmittance T = 10^(-alpha * L / 10)
   */
  getTransmittance() {
    const alpha = this.attenuationDBperKm;
    return Math.pow(10, -(alpha * this.distanceKm) / 10);
  }

  /**
   * Calculate fidelity decay over this link
   * F(L) = 0.25 + 0.75 * e^(-gamma * L)
   */
  getLinkFidelity() {
    const gamma = this.depolarizingRatePerKm * 1.5;
    const f = 0.25 + 0.75 * Math.exp(-gamma * this.distanceKm);
    return Math.min(1.0, Math.max(0.5, f));
  }

  /**
   * Simulate transmitting a photon across this link with potential loss/noise
   */
  transmitPhoton(qubitState) {
    const T = this.getTransmittance();
    const isLost = Math.random() > T;

    if (isLost) {
      return { success: false, qubit: null, reason: 'Photon absorbed by fiber attenuation' };
    }

    // Apply depolarizing noise
    const noisyQubit = qubitState.clone();
    const noiseProb = 1 - Math.exp(-this.depolarizingRatePerKm * this.distanceKm);
    
    if (Math.random() < noiseProb) {
      // Random Pauli noise X, Y, or Z
      const noiseType = Math.floor(Math.random() * 3);
      if (noiseType === 0) noisyQubit.applyGate([[ {re:0,im:0}, {re:1,im:0} ], [ {re:1,im:0}, {re:0,im:0} ]]); // X
      else if (noiseType === 1) noisyQubit.applyGate([[ {re:1,im:0}, {re:0,im:0} ], [ {re:0,im:0}, {re:-1,im:0} ]]); // Z
    }

    return { success: true, qubit: noisyQubit };
  }

  updatePhotons(dt) {
    for (let i = this.photons.length - 1; i >= 0; i--) {
      const p = this.photons[i];
      p.progress += p.speed * dt;
      if (p.progress >= 1.0) {
        if (p.onArrival) p.onArrival(p);
        this.photons.splice(i, 1);
      }
    }
  }

  spawnPhotonAnimation(payload, onArrival) {
    this.photons.push({
      progress: 0,
      speed: 0.8 / Math.max(1, Math.sqrt(this.distanceKm)), // Normalized speed
      payload: payload,
      onArrival: onArrival
    });
  }
}

export class NetworkGraph {
  constructor() {
    this.nodes = new Map();
    this.links = new Map();
    this.nodeCounter = 0;
    this.linkCounter = 0;
  }

  addNode(label, type, x, y) {
    const id = `node_${++this.nodeCounter}`;
    const node = new Node(id, label, type, x, y);
    this.nodes.set(id, node);
    return node;
  }

  removeNode(nodeId) {
    this.nodes.delete(nodeId);
    // Remove attached links
    for (const [linkId, link] of this.links.entries()) {
      if (link.source.id === nodeId || link.target.id === nodeId) {
        this.links.delete(linkId);
      }
    }
  }

  addLink(sourceNodeId, targetNodeId, distanceKm = 15, type = LinkType.FIBER) {
    const src = this.nodes.get(sourceNodeId);
    const tgt = this.nodes.get(targetNodeId);
    if (!src || !tgt || src === tgt) return null;

    // Avoid duplicate links
    for (const link of this.links.values()) {
      if ((link.source.id === sourceNodeId && link.target.id === targetNodeId) ||
          (link.source.id === targetNodeId && link.target.id === sourceNodeId)) {
        return link;
      }
    }

    const linkId = `link_${++this.linkCounter}`;
    const link = new QuantumLink(linkId, src, tgt, distanceKm, type);
    this.links.set(linkId, link);
    return link;
  }

  removeLink(linkId) {
    this.links.delete(linkId);
  }

  clear() {
    this.nodes.clear();
    this.links.clear();
    this.nodeCounter = 0;
    this.linkCounter = 0;
  }

  /**
   * Calculate multi-hop shortest path using Dijkstra
   */
  findPath(startNodeId, endNodeId) {
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      unvisited.add(nodeId);
    }
    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      let currentId = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        if (distances.get(nodeId) < minDistance) {
          minDistance = distances.get(nodeId);
          currentId = nodeId;
        }
      }

      if (currentId === null || currentId === endNodeId) break;
      unvisited.delete(currentId);

      // Neighbors
      for (const link of this.links.values()) {
        let neighborId = null;
        if (link.source.id === currentId) neighborId = link.target.id;
        else if (link.target.id === currentId) neighborId = link.source.id;

        if (neighborId && unvisited.has(neighborId)) {
          const alt = distances.get(currentId) + link.distanceKm;
          if (alt < distances.get(neighborId)) {
            distances.set(neighborId, alt);
            previous.set(neighborId, { node: currentId, link: link });
          }
        }
      }
    }

    // Reconstruct path
    const pathNodes = [];
    const pathLinks = [];
    let curr = endNodeId;

    if (!previous.has(curr) && curr !== startNodeId) return null; // No path

    while (curr) {
      pathNodes.unshift(this.nodes.get(curr));
      const prev = previous.get(curr);
      if (prev) {
        pathLinks.unshift(prev.link);
        curr = prev.node;
      } else {
        break;
      }
    }

    return { nodes: pathNodes, links: pathLinks, totalDistance: distances.get(endNodeId) };
  }

  /**
   * Export network topology to JSON object
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id, label: n.label, type: n.type, x: n.x, y: n.y
      })),
      links: Array.from(this.links.values()).map(l => ({
        id: l.id, sourceId: l.source.id, targetId: l.target.id, distanceKm: l.distanceKm, type: l.type
      }))
    };
  }

  /**
   * Load network topology from JSON object
   */
  fromJSON(data) {
    this.clear();
    for (const n of data.nodes) {
      const node = new Node(n.id, n.label, n.type, n.x, n.y);
      this.nodes.set(n.id, node);
      const numId = parseInt(n.id.replace('node_', '')) || 0;
      if (numId > this.nodeCounter) this.nodeCounter = numId;
    }
    for (const l of data.links) {
      const src = this.nodes.get(l.sourceId);
      const tgt = this.nodes.get(l.targetId);
      if (src && tgt) {
        const link = new QuantumLink(l.id, src, tgt, l.distanceKm, l.type);
        this.links.set(l.id, link);
        const numId = parseInt(l.id.replace('link_', '')) || 0;
        if (numId > this.linkCounter) this.linkCounter = numId;
      }
    }
  }
}
