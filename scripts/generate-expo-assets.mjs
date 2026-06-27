import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng({ width, height, rgba }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * bytesPerPixel;
      raw[i + 0] = rgba[0];
      raw[i + 1] = rgba[1];
      raw[i + 2] = rgba[2];
      raw[i + 3] = rgba[3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

function writeFileEnsured(outPath, data) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, data);
}

const root = process.cwd();
const outDir = path.join(root, "assets", "images");

// Match app.json paths
const files = [
  { name: "icon.png", width: 1024, height: 1024, rgba: [15, 14, 23, 255] },
  { name: "adaptive-icon.png", width: 1024, height: 1024, rgba: [15, 14, 23, 255] },
  { name: "splash.png", width: 1284, height: 2778, rgba: [15, 14, 23, 255] },
];

for (const f of files) {
  const outPath = path.join(outDir, f.name);
  const png = makePng({ width: f.width, height: f.height, rgba: f.rgba });
  writeFileEnsured(outPath, png);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(root, outPath)} (${f.width}x${f.height})`);
}

