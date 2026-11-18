/*
 * Gerador de códigos QR (modo de bytes, correcção de erros M, versões 1 a 10), sem dependências.
 * Cabem cerca de 210 bytes na versão 10, mais do que suficiente para o cartão de estudante.
 * `qrMatrix(texto)` devolve uma matriz de booleanos (true = módulo escuro), sem margem.
 */
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const MAX_VERSION = 10;
const FORMAT_BITS_M = 0;

const bit = (value, index) => ((value >>> index) & 1) !== 0;

function rawModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (version) => (
  Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK[version] * BLOCKS[version]
);

function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsGenerator(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = new Array(divisor.length).fill(0);
  data.forEach((value) => {
    const factor = value ^ result.shift();
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });
  return result;
}

function encodeData(bytes, version) {
  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  bytes.forEach((value) => push(value, 8));
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, value) => (acc << 1) | value, 0));
  }
  for (let pad = 0xec; codewords.length < dataCodewords(version); pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }
  return codewords;
}

function addEccAndInterleave(data, version) {
  const numBlocks = BLOCKS[version];
  const eccLength = ECC_PER_BLOCK[version];
  const raw = Math.floor(rawModules(version) / 8);
  const shortBlocks = numBlocks - (raw % numBlocks);
  const shortLength = Math.floor(raw / numBlocks);
  const divisor = rsGenerator(eccLength);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i += 1) {
    const part = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += part.length;
    const ecc = rsRemainder(part, divisor);
    if (i < shortBlocks) part.push(0);
    blocks.push(part.concat(ecc));
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function alignmentPositions(version) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = version * 4 + 10; result.length < count; position -= step) {
    result.splice(1, 0, position);
  }
  return result;
}

function penalty(modules) {
  const size = modules.length;
  let score = 0;
  const lines = [];
  for (let i = 0; i < size; i += 1) {
    lines.push(modules[i]);
    lines.push(modules.map((row) => row[i]));
  }
  const finder = [true, false, true, true, true, false, true, false, false, false, false];
  const finderReverse = [...finder].reverse();
  lines.forEach((line) => {
    let run = 1;
    for (let i = 1; i <= size; i += 1) {
      if (i < size && line[i] === line[i - 1]) {
        run += 1;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    for (let i = 0; i + 11 <= size; i += 1) {
      const window = line.slice(i, i + 11);
      if (window.every((value, index) => value === finder[index])) score += 40;
      if (window.every((value, index) => value === finderReverse[index])) score += 40;
    }
  });
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x];
      if (color === modules[y][x + 1] && color === modules[y + 1][x]
        && color === modules[y + 1][x + 1]) score += 3;
    }
  }
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const total = size * size;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text ?? '')));
  let version = 1;
  while (version <= MAX_VERSION && 4 + (version <= 9 ? 8 : 16) + bytes.length * 8
    > dataCodewords(version) * 8) {
    version += 1;
  }
  if (version > MAX_VERSION) throw new Error('Texto demasiado longo para o código QR.');

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFunction = (x, y, dark) => {
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  const drawFormat = (mask) => {
    const data = (FORMAT_BITS_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, bit(bits, i));
    setFunction(8, 7, bit(bits, 6));
    setFunction(8, 8, bit(bits, 7));
    setFunction(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, bit(bits, i));
    setFunction(8, size - 8, true);
  };

  const finderPattern = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          setFunction(x, y, distance !== 2 && distance !== 4);
        }
      }
    }
  };

  const alignmentPattern = (cx, cy) => {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  finderPattern(3, 3);
  finderPattern(size - 4, 3);
  finderPattern(3, size - 4);
  const positions = alignmentPositions(version);
  positions.forEach((py, i) => {
    positions.forEach((px, j) => {
      const corner = (i === 0 && j === 0) || (i === 0 && j === positions.length - 1)
        || (i === positions.length - 1 && j === 0);
      if (!corner) alignmentPattern(px, py);
    });
  });
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, bit(bits, i));
      setFunction(b, a, bit(bits, i));
    }
  }

  const codewords = addEccAndInterleave(encodeData(bytes, version), version);
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!reserved[y][x] && index < codewords.length * 8) {
          modules[y][x] = bit(codewords[index >>> 3], 7 - (index & 7));
          index += 1;
        }
      }
    }
  }

  const applyMask = (mask) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const invert = [
          (x + y) % 2 === 0,
          y % 2 === 0,
          x % 3 === 0,
          (x + y) % 3 === 0,
          (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
          ((x * y) % 2) + ((x * y) % 3) === 0,
          (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
          ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0,
        ][mask];
        if (!reserved[y][x] && invert) modules[y][x] = !modules[y][x];
      }
    }
  };

  let best = 0;
  let lowest = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty(modules);
    if (score < lowest) {
      best = mask;
      lowest = score;
    }
    applyMask(mask);
  }
  applyMask(best);
  drawFormat(best);
  return modules;
}
