/**
 * Entanglement Swapping Protocol Engine (Quantum Repeater)
 */

import { TwoQubitState, QuantumGates } from '../engine/quantum_state.js';

export class EntanglementSwappingProtocol {
  constructor(repeaterChainLength = 1) {
    this.numRepeaters = repeaterChainLength;
  }

  runSwapping(link1Fidelity = 0.95, link2Fidelity = 0.95) {
    // Generate pair 1 (Alice - R1) and pair 2 (R2 - Bob)
    const pair1 = TwoQubitState.bellPhiPlus();
    const pair2 = TwoQubitState.bellPhiPlus();

    // Repeater executes BSM on R1 & R2
    const bsmOutcome = Math.floor(Math.random() * 4); // 0..3
    const bsmLabels = ['|Φ⁺⟩', '|Φ⁻⟩', '|Psi⁺⟩', '|Psi⁻⟩'];

    // End-to-end fidelity calculation using Werner state formula
    // F_swapped = F1 * F2 + (1 - F1)*(1 - F2) / 3
    const endToEndFidelity = link1Fidelity * link2Fidelity + ((1 - link1Fidelity) * (1 - link2Fidelity)) / 3;

    return {
      success: true,
      bsmOutcomeIndex: bsmOutcome,
      bsmOutcomeLabel: bsmLabels[bsmOutcome],
      endToEndFidelity: endToEndFidelity,
      directTransmissionFidelity: Math.pow(link1Fidelity, 2.5), // Direct link without repeater would be significantly lower
      repeaterAdvantageRatio: (endToEndFidelity / Math.max(0.01, Math.pow(link1Fidelity, 2.5))).toFixed(2)
    };
  }
}
