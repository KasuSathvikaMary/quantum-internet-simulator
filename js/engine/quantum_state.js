/**
 * Quantum Engine - Qubit State, Matrix Operations, Quantum Gates & Fidelity
 */

export class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }

  add(c) {
    return new Complex(this.re + c.re, this.im + c.im);
  }

  sub(c) {
    return new Complex(this.re - c.re, this.im - c.im);
  }

  mul(c) {
    if (typeof c === 'number') {
      return new Complex(this.re * c, this.im * c);
    }
    return new Complex(
      this.re * c.re - this.im * c.im,
      this.re * c.im + this.im * c.re
    );
  }

  conj() {
    return new Complex(this.re, -this.im);
  }

  absSq() {
    return this.re * this.re + this.im * this.im;
  }

  abs() {
    return Math.sqrt(this.absSq());
  }

  arg() {
    return Math.atan2(this.im, this.re);
  }
}

export class QubitState {
  /**
   * Represents single qubit state alpha|0> + beta|1>
   */
  constructor(alpha = new Complex(1, 0), beta = new Complex(0, 0)) {
    this.alpha = alpha;
    this.beta = beta;
    this.normalize();
  }

  normalize() {
    const norm = Math.sqrt(this.alpha.absSq() + this.beta.absSq());
    if (norm > 1e-12) {
      this.alpha = this.alpha.mul(1 / norm);
      this.beta = this.beta.mul(1 / norm);
    }
  }

  /**
   * Apply 2x2 unitary matrix gate
   * Matrix format: [[u00, u01], [u10, u11]]
   */
  applyGate(u) {
    const a = u[0][0].mul(this.alpha).add(u[0][1].mul(this.beta));
    const b = u[1][0].mul(this.alpha).add(u[1][1].mul(this.beta));
    this.alpha = a;
    this.beta = b;
    this.normalize();
    return this;
  }

  /**
   * Measure Qubit in computational basis Z
   * Returns bit 0 or 1
   */
  measureZ() {
    const prob0 = this.alpha.absSq();
    const rand = Math.random();
    if (rand < prob0) {
      this.alpha = new Complex(1, 0);
      this.beta = new Complex(0, 0);
      return 0;
    } else {
      this.alpha = new Complex(0, 0);
      this.beta = new Complex(1, 0);
      return 1;
    }
  }

  /**
   * Measure Qubit in X-basis (+/- basis)
   */
  measureX() {
    // Apply Hadamard then measure in Z basis
    this.applyGate(QuantumGates.H);
    const result = this.measureZ(); // 0 -> +, 1 -> -
    this.applyGate(QuantumGates.H); // return to X-basis
    return result;
  }

  /**
   * Get spherical coordinates (theta, phi) for Bloch Sphere representation
   */
  getBlochCoords() {
    const r0 = this.alpha.abs();
    const r1 = this.beta.abs();
    
    let theta = 2 * Math.acos(Math.min(1, r0));
    let phi = this.beta.arg() - this.alpha.arg();
    
    // X, Y, Z coordinates on unit sphere
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);

    return { theta, phi, x, y, z };
  }

  /**
   * Calculate fidelity F = |<psi|phi>|^2 with target state
   */
  fidelityWith(otherState) {
    const inner = this.alpha.conj().mul(otherState.alpha).add(this.beta.conj().mul(otherState.beta));
    return inner.absSq();
  }

  clone() {
    return new QubitState(
      new Complex(this.alpha.re, this.alpha.im),
      new Complex(this.beta.re, this.beta.im)
    );
  }
}

/**
 * Standard Quantum Gates
 */
const SQRT2_INV = 1 / Math.sqrt(2);

export const QuantumGates = {
  I: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(1, 0)]
  ],
  X: [
    [new Complex(0, 0), new Complex(1, 0)],
    [new Complex(1, 0), new Complex(0, 0)]
  ],
  Y: [
    [new Complex(0, 0), new Complex(0, -1)],
    [new Complex(0, 1), new Complex(0, 0)]
  ],
  Z: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(-1, 0)]
  ],
  H: [
    [new Complex(SQRT2_INV, 0), new Complex(SQRT2_INV, 0)],
    [new Complex(SQRT2_INV, 0), new Complex(-SQRT2_INV, 0)]
  ],
  S: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 1)]
  ],
  T: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]
  ],
  Rx: (angle) => [
    [new Complex(Math.cos(angle / 2), 0), new Complex(0, -Math.sin(angle / 2))],
    [new Complex(0, -Math.sin(angle / 2)), new Complex(Math.cos(angle / 2), 0)]
  ],
  Ry: (angle) => [
    [new Complex(Math.cos(angle / 2), 0), new Complex(-Math.sin(angle / 2), 0)],
    [new Complex(Math.sin(angle / 2), 0), new Complex(Math.cos(angle / 2), 0)]
  ],
  Rz: (angle) => [
    [new Complex(Math.cos(angle / 2), -Math.sin(angle / 2)), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(Math.cos(angle / 2), Math.sin(angle / 2))]
  ]
};

/**
 * 2-Qubit State Vector Representation (1x4)
 * |00>, |01>, |10>, |11>
 */
export class TwoQubitState {
  constructor(c00 = 1, c01 = 0, c10 = 0, c11 = 0) {
    this.amps = [
      new Complex(c00, 0),
      new Complex(c01, 0),
      new Complex(c10, 0),
      new Complex(c11, 0)
    ];
    this.normalize();
  }

  normalize() {
    let normSq = 0;
    for (let amp of this.amps) normSq += amp.absSq();
    const norm = Math.sqrt(normSq);
    if (norm > 1e-12) {
      for (let i = 0; i < 4; i++) {
        this.amps[i] = this.amps[i].mul(1 / norm);
      }
    }
  }

  /**
   * Create Bell States
   */
  static bellPhiPlus() {
    return new TwoQubitState(SQRT2_INV, 0, 0, SQRT2_INV); // (|00> + |11>)/sqrt(2)
  }

  static bellPhiMinus() {
    return new TwoQubitState(SQRT2_INV, 0, 0, -SQRT2_INV); // (|00> - |11>)/sqrt(2)
  }

  static bellPsiPlus() {
    return new TwoQubitState(0, SQRT2_INV, SQRT2_INV, 0); // (|01> + |10>)/sqrt(2)
  }

  static bellPsiMinus() {
    return new TwoQubitState(0, SQRT2_INV, -SQRT2_INV, 0); // (|01> - |10>)/sqrt(2)
  }

  /**
   * Apply CNOT Gate (Control Qubit 1, Target Qubit 2)
   */
  applyCNOT() {
    // Swaps |10> and |11> amplitudes
    const tmp = this.amps[2];
    this.amps[2] = this.amps[3];
    this.amps[3] = tmp;
  }

  /**
   * Apply 1-Qubit Gate to Qubit 1 (Control/First qubit)
   */
  applyGateQ1(u) {
    const newAmps = [new Complex(), new Complex(), new Complex(), new Complex()];
    // Q1 operates on (|0x>, |1x>)
    for (let col = 0; col < 2; col++) {
      const idx0 = col;      // |0, col>
      const idx1 = col + 2;  // |1, col>
      
      newAmps[idx0] = u[0][0].mul(this.amps[idx0]).add(u[0][1].mul(this.amps[idx1]));
      newAmps[idx1] = u[1][0].mul(this.amps[idx0]).add(u[1][1].mul(this.amps[idx1]));
    }
    this.amps = newAmps;
    this.normalize();
  }

  /**
   * Perform Bell State Measurement (BSM) on 2 qubits
   * Returns index 0: |Phi+>, 1: |Phi->, 2: |Psi+>, 3: |Psi->
   */
  performBSM() {
    // Step 1: CNOT gate
    this.applyCNOT();
    // Step 2: Hadamard on Qubit 1
    this.applyGateQ1(QuantumGates.H);

    // Measure both qubits in computational basis Z
    const prob00 = this.amps[0].absSq();
    const prob01 = this.amps[1].absSq();
    const prob10 = this.amps[2].absSq();

    const rand = Math.random();
    if (rand < prob00) {
      return 0; // |Phi+>
    } else if (rand < prob00 + prob01) {
      return 1; // |Phi->
    } else if (rand < prob00 + prob01 + prob10) {
      return 2; // |Psi+>
    } else {
      return 3; // |Psi->
    }
  }
}
