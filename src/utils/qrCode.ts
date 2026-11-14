// Pure TypeScript ISO/IEC 18004 QR Code Generator (Byte Mode, EC Level L, Versions 1-10)
// Renders a boolean matrix (true = dark module, false = light module) with zero external dependencies.

const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = getGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

interface VersionInfo {
  version: number;
  totalDataBytes: number;
  ecBytesPerBlock: number;
  numBlocks: number;
  alignment: number[];
}

// Version 1 to 10 (Error Correction Level L - maximum capacity & clean scanning)
const VERSION_TABLE: VersionInfo[] = [
  { version: 1, totalDataBytes: 19, ecBytesPerBlock: 7, numBlocks: 1, alignment: [] },
  { version: 2, totalDataBytes: 34, ecBytesPerBlock: 10, numBlocks: 1, alignment: [6, 18] },
  { version: 3, totalDataBytes: 55, ecBytesPerBlock: 15, numBlocks: 1, alignment: [6, 22] },
  { version: 4, totalDataBytes: 80, ecBytesPerBlock: 20, numBlocks: 1, alignment: [6, 26] },
  { version: 5, totalDataBytes: 108, ecBytesPerBlock: 26, numBlocks: 1, alignment: [6, 30] },
  { version: 6, totalDataBytes: 136, ecBytesPerBlock: 18, numBlocks: 2, alignment: [6, 34] },
  { version: 7, totalDataBytes: 156, ecBytesPerBlock: 20, numBlocks: 2, alignment: [6, 22, 38] },
  { version: 8, totalDataBytes: 194, ecBytesPerBlock: 24, numBlocks: 2, alignment: [6, 24, 42] },
  { version: 9, totalDataBytes: 232, ecBytesPerBlock: 30, numBlocks: 2, alignment: [6, 26, 46] },
  { version: 10, totalDataBytes: 274, ecBytesPerBlock: 18, numBlocks: 4, alignment: [6, 28, 50] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text);

  // Pick smallest version that fits Byte Mode (4 bits mode + 8/16 bits length + 8*N bits data)
  let vInfo = VERSION_TABLE[VERSION_TABLE.length - 1];
  for (const candidate of VERSION_TABLE) {
    const lengthBits = candidate.version <= 9 ? 8 : 16;
    const maxBytes = Math.floor((candidate.totalDataBytes * 8 - 4 - lengthBits) / 8);
    if (utf8.length <= maxBytes) {
      vInfo = candidate;
      break;
    }
  }

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4);
  // Character count indicator
  pushBits(utf8.length, vInfo.version <= 9 ? 8 : 16);
  // Payload bytes
  for (let i = 0; i < utf8.length; i++) {
    pushBits(utf8[i], 8);
  }

  const maxBits = vInfo.totalDataBytes * 8;
  // Terminator (up to 4 zeros)
  for (let i = 0; i < 4 && bits.length < maxBits; i++) {
    bits.push(0);
  }
  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes = new Uint8Array(vInfo.totalDataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  // Pad remaining bytes with alternating 0xEC, 0x11
  let padToggle = true;
  for (let i = bits.length / 8; i < vInfo.totalDataBytes; i++) {
    dataBytes[i] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  // Split into blocks and compute Reed-Solomon EC
  const blockSize = Math.floor(vInfo.totalDataBytes / vInfo.numBlocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < vInfo.numBlocks; b++) {
    const start = b * blockSize;
    const block = dataBytes.slice(start, start + blockSize);
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomon(block, vInfo.ecBytesPerBlock));
  }

  // Interleave data and EC codewords
  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < vInfo.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < vInfo.ecBytesPerBlock; i++) {
    for (let b = 0; b < vInfo.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  const size = vInfo.version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (isBorder || isCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const align = vInfo.alignment;
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      // Skip corners where finder patterns live
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = align[i];
      const cc = align[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isDark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(cr + dr, cc + dc, isDark);
        }
      }
    }
  }

  // Dark module and reserved format areas
  setFunctionModule(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Version info for >= 7
  if (vInfo.version >= 7) {
    let rem = vInfo.version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const vBits = (vInfo.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((vBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, dark);
      setFunctionModule(b, a, dark);
    }
  }

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing column
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            const byteVal = finalCodewords[bitIdx >>> 3];
            dark = ((byteVal >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
          // Apply Mask Pattern 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          modules[r][c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // Format information for EC Level L (01) and Mask Pattern 0 (000) -> data = 0b01000
  // Precomputed BCH(15,5) masked with 0x5412 for L + Mask 0 = 0x77C4
  const formatBits = 0x77c4;
  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, ((formatBits >>> i) & 1) !== 0);
  setFunctionModule(8, 7, ((formatBits >>> 6) & 1) !== 0);
  setFunctionModule(8, 8, ((formatBits >>> 7) & 1) !== 0);
  setFunctionModule(7, 8, ((formatBits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, ((formatBits >>> i) & 1) !== 0);

  for (let i = 0; i < 8; i++) setFunctionModule(size - 1 - i, 8, ((formatBits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setFunctionModule(8, size - 15 + i, ((formatBits >>> i) & 1) !== 0);

  return modules;
}
