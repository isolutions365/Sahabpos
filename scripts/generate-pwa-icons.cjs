const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Utility to build uncompressed/deflated PNG buffer from RGBA pixels
function createPNG(width, height, getPixel) {
  // getPixel(x, y) => [r, g, b, a]
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // CRC32 helper
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Function to generate Waseela POS Icon PNG
function generateWaseelaIcon(size, isMaskable = false) {
  const bgR = 15, bgG = 23, bgB = 42; // Dark Slate (#0f172a)
  const emeraldR = 16, emeraldG = 185, emeraldB = 129; // Emerald (#10b981)
  const whiteR = 255, whiteG = 255, whiteB = 255;

  const margin = isMaskable ? Math.floor(size * 0.15) : Math.floor(size * 0.08);

  return createPNG(size, size, (x, y) => {
    // Check if within rounded background box or maskable full bleed
    const cx = size / 2;
    const cy = size / 2;

    if (!isMaskable) {
      const radius = size * 0.22;
      const boxMargin = size * 0.04;
      // Distance from rounded rectangle
      const dx = Math.max(0, Math.abs(x - cx) - (cx - boxMargin - radius));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - boxMargin - radius));
      if (dx * dx + dy * dy > radius * radius) {
        return [0, 0, 0, 0]; // Transparent outside icon bounds
      }
    }

    // Emerald gradient / circle in center
    const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const innerRadius = size * 0.38;

    // Draw 'W' logo inside
    // Scale coordinates to -1..1 relative to center
    const nx = (x - cx) / (size * 0.25);
    const ny = (y - cy) / (size * 0.25);

    // Thick 'W' polyline distance
    // W points: (-0.8, -0.6), (-0.4, 0.6), (0, -0.1), (0.4, 0.6), (0.8, -0.6)
    const points = [
      [-0.8, -0.5],
      [-0.4, 0.5],
      [0, -0.1],
      [0.4, 0.5],
      [0.8, -0.5]
    ];

    let minDist = 999;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      let t = Math.max(0, Math.min(1, ((nx - x1) * (x2 - x1) + (ny - y1) * (y2 - y1)) / l2));
      const px = x1 + t * (x2 - x1);
      const py = y1 + t * (y2 - y1);
      const d = Math.sqrt((nx - px) ** 2 + (ny - py) ** 2);
      if (d < minDist) minDist = d;
    }

    const strokeWidth = 0.22;
    if (minDist <= strokeWidth) {
      return [whiteR, whiteG, whiteB, 255];
    }

    // Emerald badge accent ring
    if (distFromCenter <= innerRadius && distFromCenter >= innerRadius - size * 0.03) {
      return [emeraldR, emeraldG, emeraldB, 255];
    }

    // Background color
    return [bgR, bgG, bgB, 255];
  });
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateWaseelaIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateWaseelaIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateWaseelaIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateWaseelaIcon(180, false));
console.log('Icons generated successfully in /public');
