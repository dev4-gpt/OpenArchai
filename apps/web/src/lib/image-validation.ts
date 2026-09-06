// Shared by the browser upload form (fast feedback) and the recordUpload
// server action (actual enforcement boundary — the client check is only a
// hint and can be bypassed by calling the action directly).

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_DIMENSION_PX = 8000; // guards against decompression-bomb-style images

export type ImageType = "image/png" | "image/jpeg" | "image/webp";

export type ValidationResult =
  | { ok: true; type: ImageType; width: number | null; height: number | null }
  | { ok: false; reason: string };

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // Signature (8 bytes) + IHDR length/type (8 bytes) puts width at offset 16.
  if (bytes.length < 24) return null;
  return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2; // skip SOI (0xFFD8)
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 carry height/width; skip everything else.
    const isSOF =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    const segmentLength = readUint16BE(bytes, offset + 2);
    if (isSOF) {
      return { height: readUint16BE(bytes, offset + 5), width: readUint16BE(bytes, offset + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9) break; // SOI/EOI have no length
    offset += 2 + segmentLength;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk === "VP8X") {
    // Width/height are 24-bit little-endian, minus-one encoded, at bytes 24 and 27.
    const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
    const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
    return { width, height };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    // Lossy bitstream: 14-bit width/height (with 2-bit scale flags) after a 3-byte sync code.
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    if (width > 0 && height > 0) return { width, height };
  }
  // VP8L (lossless) dimension bits are packed in a way not worth hand-parsing here —
  // format is still accepted, just without a dimension check (size cap still applies).
  return null;
}

function sniffType(bytes: Uint8Array): ImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageBytes(bytes: Uint8Array): ValidationResult {
  if (bytes.byteLength === 0) {
    return { ok: false, reason: "File is empty" };
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit` };
  }

  const type = sniffType(bytes);
  if (!type) {
    return { ok: false, reason: "Unsupported file — please upload a JPEG, PNG, or WebP image" };
  }

  const dims =
    type === "image/png" ? pngDimensions(bytes) : type === "image/jpeg" ? jpegDimensions(bytes) : webpDimensions(bytes);

  if (dims && (dims.width > MAX_DIMENSION_PX || dims.height > MAX_DIMENSION_PX)) {
    return { ok: false, reason: `Image dimensions exceed the ${MAX_DIMENSION_PX}px limit` };
  }

  return { ok: true, type, width: dims?.width ?? null, height: dims?.height ?? null };
}
