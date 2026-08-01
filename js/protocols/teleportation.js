/**
 * Quantum Teleportation Protocol Engine
 */

import { QubitState, TwoQubitState, QuantumGates, Complex } from '../engine/quantum_state.js';

export class TeleportationProtocol {
  constructor(initialState = null) {
    // Default arbitrary quantum state alpha|0> + beta|1>
    if (initialState) {
      this.inputState = initialState;
    } else {
      // Create interesting state e.g., cos(pi/6)|0> + e^(i pi/4) sin(pi/6)|1>
      const alpha = new Complex(Math.cos(Math.PI / 6), 0);
      const beta = new Complex(
        Math.sin(Math.PI / 6) * Math.cos(Math.PI / 4),
        Math.sin(Math.PI / 6) * Math.sin(Math.PI / 4)
      );
      this.inputState = new QubitState(alpha, beta);
    }
  }

  runProtocol(linkFidelity = 1.0) {
    const steps = [];

    // Step 1: Input State Preparation
    steps.push({
      step: 1,
      title: 'State Preparation',
      desc: 'Alice prepares arbitrary state |ψ⟩ = α|0⟩ + β|1⟩ to teleport.',
      stateCoords: this.inputState.getBlochCoords()
    });

    // Step 2: Entangled Pair Generation & Distribution
    const bellPair = TwoQubitState.bellPhiPlus();
    steps.push({
      step: 2,
      title: 'Bell Pair Generation',
      desc: 'Entangled pair |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 generated & shared between Alice and Bob.'
    });

    // Step 3: Bell State Measurement (BSM) at Alice
    // 3-Qubit joint state |ψ⟩_1 ⊗ |Φ⁺⟩_23
    // Simulate BSM outcome (returns 2 classical bits b1, b2 randomly with equal prob 25%)
    const bsmIndex = Math.floor(Math.random() * 4);
    const classicalBit1 = (bsmIndex & 2) >> 1; // H measurement
    const classicalBit2 = bsmIndex & 1;        // CNOT measurement

    const bsmLabels = ['|Φ⁺⟩ (00)', '|Φ⁻⟩ (10)', '|Ψ⁺⟩ (01)', '|Ψ⁻⟩ (11)'];

    steps.push({
      step: 3,
      title: 'Bell State Measurement (BSM)',
      desc: `Alice performs BSM on Q1 and Q2. Outcome: ${bsmLabels[bsmIndex]}. Classical bits: (${classicalBit1}, ${classicalBit2}).`,
      classicalBits: [classicalBit1, classicalBit2]
    });

    // Step 4: Transmission of Classical Bits
    steps.push({
      step: 4,
      title: 'Classical Communication',
      desc: `Alice transmits 2 classical bits [${classicalBit1}, ${classicalBit2}] to Bob.`
    });

    // Step 5: Pauli Correction at Bob
    const bobReceivedState = this.inputState.clone();
    
    // Apply corrections Z^b1 * X^b2
    if (classicalBit2 === 1) {
      bobReceivedState.applyGate(QuantumGates.X);
    }
    if (classicalBit1 === 1) {
      bobReceivedState.applyGate(QuantumGates.Z);
    }

    // Apply link noise if fidelity < 1.0
    if (linkFidelity < 1.0) {
      const noiseAngle = (1.0 - linkFidelity) * Math.PI / 2;
      bobReceivedState.applyGate(QuantumGates.Rx(noiseAngle));
    }

    const fidelity = this.inputState.fidelityWith(bobReceivedState);

    steps.push({
      step: 6,
      title: 'State Verification',
      desc: `Bob receives Qubit 3, applies Pauli correction Z^${classicalBit1} X^${classicalBit2}. Received state fidelity: ${(fidelity * 100).toFixed(2)}%.`,
      finalStateCoords: bobReceivedState.getBlochCoords(),
      fidelity: fidelity
    });

    return {
      inputState: this.inputState,
      bobState: bobReceivedState,
      classicalBits: [classicalBit1, classicalBit2],
      fidelity: fidelity,
      steps: steps
    };
  }
}
