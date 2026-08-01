/**
 * BB84 Quantum Key Distribution Protocol Engine
 */

import { QubitState, QuantumGates, Complex } from '../engine/quantum_state.js';

export class BB84Protocol {
  constructor(options = {}) {
    this.numBits = options.numBits || 32;
    this.eveEnabled = options.eveEnabled || false;
    this.eveInterceptRate = options.eveInterceptRate || 1.0; // 100% intercept-resend
    this.fiberLossKm = options.fiberLossKm || 10;
  }

  runSimulation(networkLink = null) {
    const aliceBits = [];
    const aliceBases = []; // 'Z' (0/1) or 'X' (+/-)
    const eveBases = [];
    const eveBits = [];
    const bobBases = [];
    const bobBits = [];
    const siftedKeyAlice = [];
    const siftedKeyBob = [];

    // Step 1 & 2: Alice prepares random bits and bases
    for (let i = 0; i < this.numBits; i++) {
      const bit = Math.random() < 0.5 ? 0 : 1;
      const basis = Math.random() < 0.5 ? 'Z' : 'X';
      aliceBits.push(bit);
      aliceBases.push(basis);

      // Create Qubit State
      let qubit = new QubitState();
      if (bit === 1) qubit.applyGate(QuantumGates.X); // |1>
      if (basis === 'X') qubit.applyGate(QuantumGates.H); // |+> or |->

      // Fiber attenuation transmission loss check
      if (networkLink) {
        const transResult = networkLink.transmitPhoton(qubit);
        if (!transResult.success) {
          // Photon absorbed in fiber
          bobBits.push(null);
          bobBases.push(Math.random() < 0.5 ? 'Z' : 'X');
          eveBits.push(null);
          eveBases.push(null);
          continue;
        }
        qubit = transResult.qubit;
      }

      // Step 3: Eve Eavesdropping Intercept-Resend Attack
      if (this.eveEnabled && Math.random() < this.eveInterceptRate) {
        const eveBasis = Math.random() < 0.5 ? 'Z' : 'X';
        eveBases.push(eveBasis);

        let eveBit;
        if (eveBasis === 'Z') {
          eveBit = qubit.measureZ();
        } else {
          eveBit = qubit.measureX();
        }
        eveBits.push(eveBit);

        // Eve resends new qubit according to her measurement
        qubit = new QubitState();
        if (eveBit === 1) qubit.applyGate(QuantumGates.X);
        if (eveBasis === 'X') qubit.applyGate(QuantumGates.H);
      } else {
        eveBases.push(null);
        eveBits.push(null);
      }

      // Step 4: Bob receives and measures
      const bobBasis = Math.random() < 0.5 ? 'Z' : 'X';
      bobBases.push(bobBasis);

      let bobBit;
      if (bobBasis === 'Z') {
        bobBit = qubit.measureZ();
      } else {
        bobBit = qubit.measureX();
      }
      bobBits.push(bobBit);
    }

    // Step 5: Public Sifting Phase
    let bitErrors = 0;
    let totalSifted = 0;

    for (let i = 0; i < this.numBits; i++) {
      if (bobBits[i] === null) continue; // Photon lost

      if (aliceBases[i] === bobBases[i]) {
        // Basis matched!
        siftedKeyAlice.push(aliceBits[i]);
        siftedKeyBob.push(bobBits[i]);
        totalSifted++;

        if (aliceBits[i] !== bobBits[i]) {
          bitErrors++;
        }
      }
    }

    // Calculate QBER (Quantum Bit Error Rate)
    const qber = totalSifted > 0 ? (bitErrors / totalSifted) : 0;
    // Secure Key Yield (B92 / Shannon limit heuristic: R = 1 - 2*H(QBER))
    const h2 = (p) => (p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p));
    const rawYield = 1 - 2 * h2(qber);
    const secretKeyLength = Math.max(0, Math.floor(totalSifted * Math.max(0, rawYield)));

    return {
      numBitsSent: this.numBits,
      aliceBits,
      aliceBases,
      eveBases,
      eveBits,
      bobBases,
      bobBits,
      siftedKeyAlice,
      siftedKeyBob,
      totalSifted,
      bitErrors,
      qber: qber * 100, // percentage
      secureKeyYield: secretKeyLength,
      eveDetected: qber > 8.0 // Threshold ~8% QBER triggers security alarm
    };
  }
}
