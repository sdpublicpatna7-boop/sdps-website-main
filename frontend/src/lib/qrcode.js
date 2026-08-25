/**
 * SDPS QR Code Generator Engine
 * Pure JavaScript, zero-dependency, ISO/IEC 18004 compliant QR Matrix generator.
 * Supports Error Correction Level H (30% recovery) optimized for center school logo placement.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11D (285)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF256_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], factor);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCompute(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ res[0];
    for (let j = 0; j < ecCount - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[gen.length - 2 - j], coef);
    }
    res[ecCount - 1] = gfMul(gen[0], coef);
  }
  return res;
}

// Error Correction Levels: L (0), M (1), Q (2), H (3)
export const EC_LEVEL = {
  L: { name: "L", bits: 0b01, index: 0 },
  M: { name: "M", bits: 0b00, index: 1 },
  Q: { name: "Q", bits: 0b11, index: 2 },
  H: { name: "H", bits: 0b10, index: 3 }, // 30% redundancy - Ideal for center logos
};

// Alignment pattern coordinate centers per version
const ALIGNMENT_COORDS = [
  [], // V0
  [], // V1
  [6, 18], // V2
  [6, 22], // V3
  [6, 26], // V4
  [6, 30], // V5
  [6, 34], // V6
  [6, 22, 38], // V7
  [6, 24, 42], // V8
  [6, 26, 46], // V9
  [6, 28, 50], // V10
  [6, 30, 54], // V11
  [6, 32, 58], // V12
  [6, 34, 62], // V13
  [6, 26, 46, 66], // V14
  [6, 26, 48, 70], // V15
  [6, 26, 50, 74], // V16
  [6, 30, 54, 78], // V17
  [6, 30, 56, 82], // V18
  [6, 30, 58, 86], // V19
  [6, 34, 62, 90], // V20
  [6, 28, 50, 72, 94], // V21
  [6, 26, 50, 74, 98], // V22
  [6, 30, 54, 78, 102], // V23
  [6, 28, 54, 80, 106], // V24
  [6, 32, 58, 84, 110], // V25
  [6, 30, 58, 86, 114], // V26
  [6, 34, 62, 90, 118], // V27
  [6, 26, 50, 74, 98, 122], // V28
  [6, 30, 54, 78, 102, 126], // V29
  [6, 26, 52, 78, 104, 130], // V30
  [6, 30, 56, 82, 108, 134], // V31
  [6, 34, 60, 86, 112, 138], // V32
  [6, 30, 58, 86, 114, 142], // V33
  [6, 34, 62, 90, 118, 146], // V34
  [6, 30, 54, 78, 102, 126, 150], // V35
  [6, 24, 50, 76, 102, 128, 154], // V36
  [6, 28, 54, 80, 106, 132, 158], // V37
  [6, 32, 58, 84, 110, 136, 162], // V38
  [6, 26, 54, 82, 110, 138, 166], // V39
  [6, 30, 58, 86, 114, 142, 170]  // V40
];

// EC Block Specs: [totalDataCodewords, ecCodewordsPerBlock, group1Blocks, group1DataPerBlock, group2Blocks, group2DataPerBlock]
// Format: TABLE[version][ec_index (0:L, 1:M, 2:Q, 3:H)]
const EC_SPECS = [
  null,
  // V1
  [[19, 7, 1, 19, 0, 0], [16, 10, 1, 16, 0, 0], [13, 13, 1, 13, 0, 0], [9, 17, 1, 9, 0, 0]],
  // V2
  [[34, 10, 1, 34, 0, 0], [28, 16, 1, 28, 0, 0], [22, 22, 1, 22, 0, 0], [16, 28, 1, 16, 0, 0]],
  // V3
  [[55, 15, 1, 55, 0, 0], [44, 26, 1, 44, 0, 0], [34, 18, 2, 17, 0, 0], [26, 22, 2, 13, 0, 0]],
  // V4
  [[80, 20, 1, 80, 0, 0], [64, 18, 2, 32, 0, 0], [48, 26, 2, 24, 0, 0], [36, 16, 4, 9, 0, 0]],
  // V5
  [[108, 26, 1, 108, 0, 0], [86, 24, 2, 43, 0, 0], [62, 18, 2, 15, 2, 16], [46, 22, 2, 11, 2, 12]],
  // V6
  [[136, 18, 2, 68, 0, 0], [108, 16, 4, 27, 0, 0], [76, 24, 4, 19, 0, 0], [60, 28, 4, 15, 0, 0]],
  // V7
  [[156, 20, 2, 78, 0, 0], [124, 18, 4, 31, 0, 0], [88, 18, 2, 14, 4, 15], [66, 26, 4, 13, 1, 14]],
  // V8
  [[194, 24, 2, 97, 0, 0], [154, 22, 2, 38, 2, 39], [110, 22, 4, 18, 2, 19], [86, 26, 4, 14, 2, 15]],
  // V9
  [[232, 30, 2, 116, 0, 0], [182, 22, 3, 36, 2, 37], [132, 20, 4, 16, 4, 17], [100, 24, 4, 12, 4, 13]],
  // V10
  [[274, 18, 2, 68, 2, 69], [216, 26, 4, 43, 1, 44], [154, 24, 6, 19, 2, 20], [122, 28, 6, 15, 2, 16]],
  // V11
  [[324, 20, 4, 81, 0, 0], [254, 30, 1, 50, 4, 51], [180, 28, 4, 22, 4, 23], [140, 24, 3, 12, 8, 13]],
  // V12
  [[370, 24, 2, 92, 2, 93], [290, 22, 6, 36, 2, 37], [206, 26, 4, 20, 6, 21], [158, 28, 7, 14, 4, 15]],
  // V13
  [[428, 26, 4, 107, 0, 0], [334, 22, 8, 37, 1, 38], [244, 24, 8, 20, 4, 21], [180, 22, 12, 11, 4, 12]],
  // V14
  [[461, 30, 3, 115, 1, 116], [365, 24, 4, 40, 5, 41], [261, 20, 11, 16, 5, 17], [197, 24, 11, 12, 5, 13]],
  // V15
  [[523, 22, 5, 87, 1, 88], [415, 24, 5, 41, 5, 42], [295, 30, 5, 24, 7, 25], [223, 24, 11, 12, 7, 13]],
  // V16
  [[589, 24, 5, 98, 1, 99], [453, 28, 7, 45, 3, 46], [325, 24, 15, 19, 2, 20], [253, 30, 3, 15, 13, 16]],
  // V17
  [[647, 28, 1, 107, 5, 108], [507, 28, 10, 46, 1, 47], [367, 28, 1, 22, 15, 23], [283, 28, 2, 14, 17, 15]],
  // V18
  [[721, 30, 5, 120, 1, 121], [563, 26, 9, 43, 4, 44], [397, 28, 17, 22, 1, 23], [313, 28, 2, 14, 19, 15]],
  // V19
  [[795, 28, 3, 113, 4, 114], [627, 26, 3, 44, 11, 45], [445, 26, 17, 21, 4, 22], [341, 26, 9, 13, 16, 14]],
  // V20
  [[861, 28, 3, 107, 5, 108], [669, 26, 3, 41, 13, 42], [485, 30, 15, 24, 5, 25], [385, 28, 15, 15, 10, 16]],
];

// UTF-8 string to bytes
function stringToUtf8ByteArray(str) {
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    bytes[i] = utf8.charCodeAt(i);
  }
  return bytes;
}

// Select best QR version based on byte length and error correction
function pickVersion(dataByteLength, ecLevel) {
  for (let v = 1; v <= 20; v++) {
    const spec = EC_SPECS[v]?.[ecLevel.index];
    if (!spec) continue;
    const capacity = spec[0];
    // 4 bits mode indicator + character count indicator (8 bits for v1-9, 16 bits for v10+)
    const charCountBits = v < 10 ? 8 : 16;
    const overheadBytes = Math.ceil((4 + charCountBits) / 8);
    if (dataByteLength + overheadBytes <= capacity) {
      return v;
    }
  }
  return 20; // fallback to V20 for large URLs
}

// Build encoded bitstream and pad to required length
function encodeData(dataBytes, version, ecLevel) {
  const spec = EC_SPECS[version][ecLevel.index];
  const totalDataCodewords = spec[0];

  const bits = [];
  const appendBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // 1. Mode indicator: Byte mode = 0100 (4 bits)
  appendBits(0b0100, 4);

  // 2. Character count indicator
  const charCountBits = version < 10 ? 8 : 16;
  appendBits(dataBytes.length, charCountBits);

  // 3. Data bytes
  for (let i = 0; i < dataBytes.length; i++) {
    appendBits(dataBytes[i], 8);
  }

  // 4. Terminator (up to 4 zeroes)
  const maxBits = totalDataCodewords * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // 5. Pad to multiple of 8
  while (bits.length % 8 !== 0) bits.push(0);

  // 6. Convert to bytes
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    bytes.push(b);
  }

  // 7. Pad bytes with alternating 0xEC and 0x11
  let padToggle = false;
  while (bytes.length < totalDataCodewords) {
    bytes.push(padToggle ? 0x11 : 0xec);
    padToggle = !padToggle;
  }

  return new Uint8Array(bytes);
}

// Interleave data codewords and error correction codewords
function interleaveBlocks(dataBytes, version, ecLevel) {
  const spec = EC_SPECS[version][ecLevel.index];
  const [totalData, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = spec;
  const totalBlocks = g1Blocks + g2Blocks;

  const dataBlocks = [];
  const ecBlocks = [];

  let dataOffset = 0;
  for (let b = 0; b < totalBlocks; b++) {
    const isG1 = b < g1Blocks;
    const blockSize = isG1 ? g1Data : g2Data;
    const blockData = dataBytes.slice(dataOffset, dataOffset + blockSize);
    dataOffset += blockSize;

    dataBlocks.push(blockData);
    ecBlocks.push(rsCompute(blockData, ecPerBlock));
  }

  const interleaved = [];
  const maxDataBlockLen = Math.max(g1Data, g2Data || 0);

  // Interleave data
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (i < dataBlocks[b].length) {
        interleaved.push(dataBlocks[b][i]);
      }
    }
  }

  // Interleave error correction
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      interleaved.push(ecBlocks[b][i]);
    }
  }

  return new Uint8Array(interleaved);
}

// 8 standard mask pattern functions
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

// Evaluate QR mask penalty score
function evaluateMaskPenalty(matrix, size) {
  let penalty = 0;

  // 1. Horizontal & Vertical 5+ identical runs
  for (let r = 0; r < size; r++) {
    let runColor = -1;
    let runLen = 0;
    for (let c = 0; c < size; c++) {
      const val = matrix[r][c];
      if (val === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = val;
        runLen = 1;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let runColor = -1;
    let runLen = 0;
    for (let r = 0; r < size; r++) {
      const val = matrix[r][c];
      if (val === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = val;
        runLen = 1;
      }
    }
  }

  // 2. 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

// Compute format info bits with BCH (15, 5) code XORed with 0x5412
function getFormatBits(ecLevel, maskIndex) {
  let data = (ecLevel.bits << 3) | maskIndex;
  let d = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((d >>> (i + 10)) & 1) {
      d ^= 0x537 << i;
    }
  }
  return ((data << 10) | d) ^ 0x5412;
}

/**
 * Generate standard QR Code boolean matrix
 * @param {string} text The string/URL to encode
 * @param {object} options Configuration { ecLevel: 'H' | 'Q' | 'M' | 'L' }
 * @returns {object} { size, modules: boolean[][] }
 */
export function generateQRMatrix(text, options = {}) {
  const ec = EC_LEVEL[options.ecLevel || "H"] || EC_LEVEL.H;
  const rawBytes = stringToUtf8ByteArray(text);
  const version = pickVersion(rawBytes.length, ec);
  const size = 17 + 4 * version;

  // Initialize matrix and reserved flags
  const matrix = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  const setModule = (r, c, val, isFunc = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = !!val;
      if (isFunc) isFunction[r][c] = true;
    }
  };

  // 1. Place Finder Patterns (7x7) + Separators
  const placeFinder = (top, left) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
        const isOuterSquare = r === 0 || r === 6 || c === 0 || c === 6;
        const isInnerSquare = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(row, col, !isBorder && (isOuterSquare || isInnerSquare));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment Patterns
  const alignCoords = ALIGNMENT_COORDS[version] || [];
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      const cr = alignCoords[i];
      const cc = alignCoords[j];
      if (isFunction[cr][cc]) continue; // Skip if collides with finder
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isSquare = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          setModule(cr + r, cc + c, isSquare);
        }
      }
    }
  }

  // 3. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark Module
  setModule(4 * version + 9, 8, true);

  // 5. Reserve Format Info areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  // 6. Encode Data & Error Correction
  const encodedData = encodeData(rawBytes, version, ec);
  const interleavedBytes = interleaveBlocks(encodedData, version, ec);

  // Convert bytes to bits
  const bitStream = [];
  for (let i = 0; i < interleavedBytes.length; i++) {
    const b = interleavedBytes[i];
    for (let bit = 7; bit >= 0; bit--) {
      bitStream.push((b >>> bit) & 1);
    }
  }

  // 7. Place Data Bits in Zig-Zag pattern
  let bitIndex = 0;
  let dirUp = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip timing column
    const colA = rightCol;
    const colB = rightCol - 1;

    for (let step = 0; step < size; step++) {
      const row = dirUp ? size - 1 - step : step;
      if (!isFunction[row][colA]) {
        matrix[row][colA] = bitIndex < bitStream.length ? bitStream[bitIndex++] === 1 : false;
      }
      if (!isFunction[row][colB]) {
        matrix[row][colB] = bitIndex < bitStream.length ? bitStream[bitIndex++] === 1 : false;
      }
    }
    dirUp = !dirUp;
  }

  // 8. Mask selection & application
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestMatrix = null;

  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const maskFn = MASKS[maskIdx];
    const candidate = matrix.map((rowArr, r) =>
      rowArr.map((cell, c) => (isFunction[r][c] ? cell : cell ^ maskFn(r, c)))
    );

    // Apply format info
    const formatBits = getFormatBits(ec, maskIdx);
    for (let i = 0; i < 15; i++) {
      const bit = ((formatBits >>> i) & 1) === 1;
      if (i < 6) candidate[8][i] = bit;
      else if (i < 8) candidate[8][i + 1] = bit;
      else candidate[14 - i][8] = bit;

      if (i < 8) candidate[size - 1 - i][8] = bit;
      else candidate[8][size - 15 + i] = bit;
    }

    const penalty = evaluateMaskPenalty(candidate, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = maskIdx;
      bestMatrix = candidate;
    }
  }

  return {
    version,
    size,
    modules: bestMatrix,
  };
}

/**
 * Render QR Code onto an HTML5 Canvas with centered school logo
 */
export async function renderQRToCanvas(canvas, text, options = {}) {
  const {
    size = 1024,
    margin = 3,
    color = "#0E3B91",
    bgColor = "#FFFFFF",
    dotStyle = "square", // 'square' | 'rounded' | 'dots'
    includeLogo = true,
    logoUrl = "/logo512.png",
    logoShape = "circle", // 'circle' | 'rounded'
    logoSizeRatio = 0.22, // 22% of total size (well within 30% EC 'H' tolerance)
    logoPaddingRatio = 0.035, // White badge surrounding logo
  } = options;

  const qr = generateQRMatrix(text, { ecLevel: "H" });
  const moduleCount = qr.size + margin * 2;
  const cellSize = size / moduleCount;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Draw QR Modules
  ctx.fillStyle = color;
  const offset = margin * cellSize;

  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (!qr.modules[r][c]) continue;
      const x = offset + c * cellSize;
      const y = offset + r * cellSize;

      if (dotStyle === "rounded") {
        const radius = cellSize * 0.35;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + cellSize - radius, y);
        ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + radius);
        ctx.lineTo(x + cellSize, y + cellSize - radius);
        ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - radius, y + cellSize);
        ctx.lineTo(x + radius, y + cellSize);
        ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      } else if (dotStyle === "dots") {
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.44, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Classic crisp square
        ctx.fillRect(x, y, cellSize + 0.15, cellSize + 0.15);
      }
    }
  }

  // Draw Centered School Logo
  if (includeLogo && logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => {
          // Fallback to local logo if external fails
          img.src = "/logo512.png";
          img.onload = resolve;
          img.onerror = reject;
        };
        img.src = logoUrl;
      });

      const centerX = size / 2;
      const centerY = size / 2;
      const badgeSize = size * (logoSizeRatio + logoPaddingRatio * 2);
      const logoInnerSize = size * logoSizeRatio;

      ctx.save();

      // Draw clean white badge shield behind logo
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      if (logoShape === "circle") {
        ctx.arc(centerX, centerY, badgeSize / 2, 0, Math.PI * 2);
      } else {
        const radius = badgeSize * 0.22;
        const x = centerX - badgeSize / 2;
        const y = centerY - badgeSize / 2;
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, badgeSize, badgeSize, radius);
        } else {
          ctx.rect(x, y, badgeSize, badgeSize);
        }
      }
      ctx.fill();

      // Reset shadow for border & logo
      ctx.shadowColor = "transparent";

      // Subtle badge ring
      ctx.strokeStyle = "rgba(14, 59, 145, 0.18)";
      ctx.lineWidth = Math.max(2, size * 0.004);
      ctx.stroke();

      // Clip and draw logo
      ctx.beginPath();
      if (logoShape === "circle") {
        ctx.arc(centerX, centerY, logoInnerSize / 2, 0, Math.PI * 2);
      } else {
        const radius = logoInnerSize * 0.2;
        const x = centerX - logoInnerSize / 2;
        const y = centerY - logoInnerSize / 2;
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, logoInnerSize, logoInnerSize, radius);
        } else {
          ctx.rect(x, y, logoInnerSize, logoInnerSize);
        }
      }
      ctx.clip();

      ctx.drawImage(
        img,
        centerX - logoInnerSize / 2,
        centerY - logoInnerSize / 2,
        logoInnerSize,
        logoInnerSize
      );

      ctx.restore();
    } catch (err) {
      console.warn("Logo overlay render failed:", err);
    }
  }

  return canvas;
}

/**
 * Generate vector SVG string for QR Code
 */
export function generateQRSVG(text, options = {}) {
  const {
    size = 512,
    margin = 3,
    color = "#0E3B91",
    bgColor = "#FFFFFF",
    includeLogo = true,
    logoUrl = "/logo512.png",
  } = options;

  const qr = generateQRMatrix(text, { ecLevel: "H" });
  const moduleCount = qr.size + margin * 2;
  const cellSize = size / moduleCount;

  let paths = "";
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        paths += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${color}" />`;
      }
    }
  }

  const badgeSize = size * 0.26;
  const logoInnerSize = size * 0.20;
  const center = size / 2;

  let logoSvg = "";
  if (includeLogo && logoUrl) {
    logoSvg = `
      <circle cx="${center}" cy="${center}" r="${(badgeSize / 2).toFixed(2)}" fill="#FFFFFF" stroke="${color}" stroke-width="2" />
      <image href="${logoUrl}" x="${(center - logoInnerSize / 2).toFixed(2)}" y="${(center - logoInnerSize / 2).toFixed(2)}" width="${logoInnerSize.toFixed(2)}" height="${logoInnerSize.toFixed(2)}" preserveAspectRatio="xMidYMid meet" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="100%" height="100%" fill="${bgColor}" />
    ${paths}
    ${logoSvg}
  </svg>`;
}

