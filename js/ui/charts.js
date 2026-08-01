/**
 * Telemetry Analytics & Performance Charts Renderer
 */

export class TelemetryCharts {
  constructor(fidelityChartId, qberChartId) {
    this.fidelityCanvas = document.getElementById(fidelityChartId);
    this.qberCanvas = document.getElementById(qberChartId);
  }

  renderFidelityVsDistance(currentDistanceKm = 20) {
    if (!this.fidelityCanvas) return;
    const ctx = this.fidelityCanvas.getContext('2d');
    const w = this.fidelityCanvas.width = this.fidelityCanvas.parentElement.clientWidth * window.devicePixelRatio || 320;
    const h = this.fidelityCanvas.height = 140 * window.devicePixelRatio || 140;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = w / window.devicePixelRatio;
    const height = h / window.devicePixelRatio;

    ctx.clearRect(0, 0, width, height);

    // Axes
    const padding = 25;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 10);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - 10, height - padding);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#505c73';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText('1.0', 5, 15);
    ctx.fillText('0.5', 5, (height - padding + 10) / 2);
    ctx.fillText('Distance (km)', width - 75, height - 8);

    // Theoretical curve F(L) = 0.25 + 0.75 * e^(-gamma * L)
    const maxDist = 100;
    const pointsDirect = [];
    const pointsRepeater = [];

    for (let d = 0; d <= maxDist; d += 2) {
      const fDirect = 0.25 + 0.75 * Math.exp(-0.02 * d);
      // Repeater chain maintains higher fidelity
      const fRepeater = 0.5 + 0.48 * Math.exp(-0.005 * d);

      const px = padding + (d / maxDist) * (width - padding - 15);
      const pyDirect = (height - padding) - (fDirect - 0.5) * 2 * (height - padding - 15);
      const pyRepeater = (height - padding) - (fRepeater - 0.5) * 2 * (height - padding - 15);

      pointsDirect.push({ x: px, y: pyDirect });
      pointsRepeater.push({ x: px, y: pyRepeater });
    }

    // Draw Direct Link Curve (Cyan)
    ctx.beginPath();
    for (let i = 0; i < pointsDirect.length; i++) {
      if (i === 0) ctx.moveTo(pointsDirect[i].x, pointsDirect[i].y);
      else ctx.lineTo(pointsDirect[i].x, pointsDirect[i].y);
    }
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Repeater Link Curve (Purple)
    ctx.beginPath();
    for (let i = 0; i < pointsRepeater.length; i++) {
      if (i === 0) ctx.moveTo(pointsRepeater[i].x, pointsRepeater[i].y);
      else ctx.lineTo(pointsRepeater[i].x, pointsRepeater[i].y);
    }
    ctx.strokeStyle = '#8a2be2';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(padding + 10, 15, 8, 8);
    ctx.fillStyle = '#8e9bb0';
    ctx.fillText('Direct', padding + 22, 22);

    ctx.fillStyle = '#8a2be2';
    ctx.fillRect(padding + 70, 15, 8, 8);
    ctx.fillStyle = '#8e9bb0';
    ctx.fillText('Repeater', padding + 82, 22);
  }

  renderQBERChart(currentQBER = 0) {
    if (!this.qberCanvas) return;
    const ctx = this.qberCanvas.getContext('2d');
    const w = this.qberCanvas.width = this.qberCanvas.parentElement.clientWidth * window.devicePixelRatio || 320;
    const h = this.qberCanvas.height = 140 * window.devicePixelRatio || 140;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = w / window.devicePixelRatio;
    const height = h / window.devicePixelRatio;

    ctx.clearRect(0, 0, width, height);

    const padding = 25;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 10);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - 10, height - padding);
    ctx.stroke();

    // Security Threshold line at 11% QBER
    const thresholdY = (height - padding) - (0.11 / 0.35) * (height - padding - 15);
    ctx.beginPath();
    ctx.moveTo(padding, thresholdY);
    ctx.lineTo(width - 10, thresholdY);
    ctx.strokeStyle = 'rgba(255, 51, 102, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff3366';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText('Eve Limit (11%)', width - 90, thresholdY - 4);

    // QBER curve vs Eve interception rate (0% -> 100%)
    ctx.beginPath();
    for (let rate = 0; rate <= 1.0; rate += 0.05) {
      const qber = rate * 0.25; // max 25% QBER for BB84 intercept-resend
      const px = padding + rate * (width - padding - 15);
      const py = (height - padding) - (qber / 0.35) * (height - padding - 15);
      if (rate === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
