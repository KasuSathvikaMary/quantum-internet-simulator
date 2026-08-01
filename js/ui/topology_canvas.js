/**
 * Interactive Network Topology Canvas Component
 */

import { NodeType, LinkType } from '../engine/network_graph.js';

export class TopologyCanvas {
  constructor(canvasId, networkGraph, onSelectionChange) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.graph = networkGraph;
    this.onSelectionChange = onSelectionChange;

    this.mode = 'select'; // 'select', 'connect', 'node'
    this.selectedNode = null;
    this.selectedLink = null;
    this.connectSourceNode = null;

    this.isDraggingNode = false;
    this.draggedNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.hoverNode = null;
    this.hoverLink = null;

    this.lastTime = performance.now();

    this.initEvents();
    this.resize();
    this.startAnimationLoop();
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth * window.devicePixelRatio || 800;
    this.canvas.height = parent.clientHeight * window.devicePixelRatio || 600;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handleMouseDown(e) {
    const coords = this.getCanvasCoords(e);
    const node = this.getNodeAt(coords.x, coords.y);
    const link = this.getLinkAt(coords.x, coords.y);

    if (this.mode === 'connect') {
      if (node) {
        if (!this.connectSourceNode) {
          this.connectSourceNode = node;
        } else if (this.connectSourceNode !== node) {
          this.graph.addLink(this.connectSourceNode.id, node.id, 15, LinkType.FIBER);
          this.connectSourceNode = null;
          this.mode = 'select';
        }
      } else {
        this.connectSourceNode = null;
      }
      return;
    }

    if (node) {
      this.selectedNode = node;
      this.selectedLink = null;
      this.isDraggingNode = true;
      this.draggedNode = node;
      this.dragOffsetX = coords.x - node.x;
      this.dragOffsetY = coords.y - node.y;
    } else if (link) {
      this.selectedLink = link;
      this.selectedNode = null;
    } else {
      this.selectedNode = null;
      this.selectedLink = null;
    }

    if (this.onSelectionChange) {
      this.onSelectionChange({ node: this.selectedNode, link: this.selectedLink });
    }
  }

  handleMouseMove(e) {
    const coords = this.getCanvasCoords(e);

    if (this.isDraggingNode && this.draggedNode) {
      this.draggedNode.x = coords.x - this.dragOffsetX;
      this.draggedNode.y = coords.y - this.dragOffsetY;
      return;
    }

    this.hoverNode = this.getNodeAt(coords.x, coords.y);
    this.hoverLink = this.getNodeAt(coords.x, coords.y) ? null : this.getLinkAt(coords.x, coords.y);
  }

  handleMouseUp() {
    this.isDraggingNode = false;
    this.draggedNode = null;
  }

  getNodeAt(x, y) {
    for (const node of this.graph.nodes.values()) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= 24 * 24) {
        return node;
      }
    }
    return null;
  }

  getLinkAt(x, y) {
    for (const link of this.graph.links.values()) {
      const p1 = link.source;
      const p2 = link.target;
      const dist = this.distToSegment({ x, y }, p1, p2);
      if (dist < 8) return link;
    }
    return null;
  }

  distToSegment(p, v, w) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  startAnimationLoop() {
    const loop = (now) => {
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    for (const link of this.graph.links.values()) {
      link.updatePhotons(dt);
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Links
    for (const link of this.graph.links.values()) {
      this.drawLink(link);
    }

    // 2. Draw Connection Preview Line if connecting
    if (this.mode === 'connect' && this.connectSourceNode) {
      ctx.beginPath();
      ctx.moveTo(this.connectSourceNode.x, this.connectSourceNode.y);
      ctx.lineTo(this.hoverNode ? this.hoverNode.x : this.width / 2, this.hoverNode ? this.hoverNode.y : this.height / 2);
      ctx.strokeStyle = '#00f0ff';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Nodes
    for (const node of this.graph.nodes.values()) {
      this.drawNode(node);
    }
  }

  drawLink(link) {
    const ctx = this.ctx;
    const src = link.source;
    const tgt = link.target;
    const isSelected = this.selectedLink === link;
    const isHover = this.hoverLink === link;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);

    if (link.type === LinkType.FREE_SPACE) {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = isSelected ? '#ffaa00' : (isHover ? '#ffcc00' : 'rgba(255, 170, 0, 0.4)');
    } else {
      ctx.strokeStyle = isSelected ? '#00f0ff' : (isHover ? '#ffffff' : 'rgba(0, 240, 255, 0.3)');
    }

    ctx.lineWidth = isSelected ? 3 : (isHover ? 2.5 : 2);
    ctx.stroke();
    ctx.restore();

    // Distance Label on Link
    const midX = (src.x + tgt.x) / 2;
    const midY = (src.y + tgt.y) / 2;
    ctx.fillStyle = 'rgba(8, 11, 20, 0.85)';
    ctx.fillRect(midX - 22, midY - 9, 44, 18);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(midX - 22, midY - 9, 44, 18);

    ctx.font = '600 9px JetBrains Mono, monospace';
    ctx.fillStyle = isSelected ? '#00f0ff' : '#8e9bb0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${link.distanceKm}km`, midX, midY);

    // Draw Photons in Flight along link
    for (const photon of link.photons) {
      const px = src.x + photon.progress * (tgt.x - src.x);
      const py = src.y + photon.progress * (tgt.y - src.y);

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }
  }

  drawNode(node) {
    const ctx = this.ctx;
    const isSelected = this.selectedNode === node;
    const isHover = this.hoverNode === node;
    const radius = 22;

    // Node Outer Glow Ring
    ctx.save();
    if (isSelected || isHover) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.getNodeColor(node.type);
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(16, 22, 38, 0.9)';
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#ffffff' : this.getNodeColor(node.type);
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    ctx.restore();

    // Node Type Icon Text
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillStyle = this.getNodeColor(node.type);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.getNodeIconText(node.type), node.x, node.y);

    // Label under Node
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillStyle = isSelected ? '#00f0ff' : '#f0f4f9';
    ctx.fillText(node.label, node.x, node.y + radius + 14);
  }

  getNodeColor(type) {
    switch (type) {
      case NodeType.ENDNODE: return '#00f0ff';
      case NodeType.REPEATER: return '#8a2be2';
      case NodeType.ROUTER: return '#00ff88';
      case NodeType.SATELLITE: return '#ffaa00';
      case NodeType.EVE: return '#ff3366';
      default: return '#00f0ff';
    }
  }

  getNodeIconText(type) {
    switch (type) {
      case NodeType.ENDNODE: return 'Q';
      case NodeType.REPEATER: return 'REP';
      case NodeType.ROUTER: return 'SW';
      case NodeType.SATELLITE: return 'SAT';
      case NodeType.EVE: return 'EVE';
      default: return 'N';
    }
  }
}
