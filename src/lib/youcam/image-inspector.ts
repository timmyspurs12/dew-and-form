export type SupportedBinaryImageMime = "image/jpeg" | "image/png";

export type BinaryInspectionResult =
  | {
      valid: true;
      mimeType: SupportedBinaryImageMime;
      width: number;
      height: number;
    }
  | {
      valid: false;
      code: "EMPTY_FILE" | "UNSUPPORTED_BINARY_FORMAT" | "MALFORMED_IMAGE";
      message: string;
    };

const MAX_DIMENSION_PX = 16_384;

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) +
    ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)) +
    ((bytes[offset + 3] << 24) >>> 0)
  );
}

function isPngSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpegSignature(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function inspectPng(bytes: Uint8Array): BinaryInspectionResult {
  // Minimum valid PNG: 8-byte sig + 25-byte IHDR chunk + 12-byte IEND chunk (or >=33 bytes header)
  if (bytes.byteLength < 33) {
    return {
      valid: false,
      code: "MALFORMED_IMAGE",
      message: "The uploaded PNG file is truncated or malformed.",
    };
  }

  const ihdrLength = readUint32BE(bytes, 8);
  const isIhdrTag =
    bytes[12] === 0x49 && // I
    bytes[13] === 0x48 && // H
    bytes[14] === 0x44 && // D
    bytes[15] === 0x52; // R

  if (ihdrLength !== 13 || !isIhdrTag) {
    return {
      valid: false,
      code: "MALFORMED_IMAGE",
      message: "The uploaded PNG file is missing a valid IHDR header.",
    };
  }

  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];

  const validBitDepth =
    bitDepth === 1 || bitDepth === 2 || bitDepth === 4 || bitDepth === 8 || bitDepth === 16;
  const validColorType =
    colorType === 0 || colorType === 2 || colorType === 3 || colorType === 4 || colorType === 6;

  if (
    !validBitDepth ||
    !validColorType ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_DIMENSION_PX ||
    height > MAX_DIMENSION_PX
  ) {
    return {
      valid: false,
      code: "MALFORMED_IMAGE",
      message: "The uploaded PNG file has invalid or unsupported pixel dimensions.",
    };
  }

  return {
    valid: true,
    mimeType: "image/png",
    width,
    height,
  };
}

/**
 * Extracts EXIF IFD0 Orientation (1–8) from a JPEG APP1 segment if present,
 * so 90°/270° rotated phone portraits report their true display dimensions.
 */
function parseExifOrientation(bytes: Uint8Array, segmentDataStart: number, dataLength: number): number {
  if (dataLength < 14) return 1;
  // Verify "Exif\0\0"
  if (
    bytes[segmentDataStart] !== 0x45 ||
    bytes[segmentDataStart + 1] !== 0x78 ||
    bytes[segmentDataStart + 2] !== 0x69 ||
    bytes[segmentDataStart + 3] !== 0x66 ||
    bytes[segmentDataStart + 4] !== 0x00 ||
    bytes[segmentDataStart + 5] !== 0x00
  ) {
    return 1;
  }

  const tiffStart = segmentDataStart + 6;
  const segmentEnd = segmentDataStart + dataLength;
  if (tiffStart + 8 > segmentEnd) return 1;

  const isLittleEndian = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
  const isBigEndian = bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d;
  if (!isLittleEndian && !isBigEndian) return 1;

  const u16 = isLittleEndian ? readUint16LE : readUint16BE;
  const u32 = isLittleEndian ? readUint32LE : readUint32BE;

  if (u16(bytes, tiffStart + 2) !== 0x002a) return 1;

  const ifdOffset = u32(bytes, tiffStart + 4);
  const ifdStart = tiffStart + ifdOffset;
  if (ifdStart + 2 > segmentEnd) return 1;

  const entryCount = u16(bytes, ifdStart);
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > segmentEnd) break;
    const tag = u16(bytes, entryOffset);
    if (tag === 0x0112) {
      const value = u16(bytes, entryOffset + 8);
      if (value >= 1 && value <= 8) return value;
      return 1;
    }
  }

  return 1;
}

function isJpegSofMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 && // DHT
    marker !== 0xc8 && // JPG
    marker !== 0xcc // DAC
  );
}

function inspectJpeg(bytes: Uint8Array): BinaryInspectionResult {
  if (bytes.byteLength < 20) {
    return {
      valid: false,
      code: "MALFORMED_IMAGE",
      message: "The uploaded JPEG file is truncated or malformed.",
    };
  }

  let offset = 2;
  let orientation = 1;

  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      return {
        valid: false,
        code: "MALFORMED_IMAGE",
        message: "The uploaded JPEG file has an invalid marker structure.",
      };
    }

    // Skip 0xFF padding bytes
    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.byteLength) break;
    const marker = bytes[offset];
    offset += 1;

    // Standalone markers with no payload
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    // End of image or start of scan reached before any SOF frame header
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 2 > bytes.byteLength) {
      return {
        valid: false,
        code: "MALFORMED_IMAGE",
        message: "The uploaded JPEG file ends unexpectedly inside a segment header.",
      };
    }

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) {
      return {
        valid: false,
        code: "MALFORMED_IMAGE",
        message: "The uploaded JPEG file contains a truncated segment.",
      };
    }

    if (marker === 0xe1) {
      orientation = parseExifOrientation(bytes, offset + 2, segmentLength - 2);
    }

    if (isJpegSofMarker(marker)) {
      if (segmentLength < 8) {
        return {
          valid: false,
          code: "MALFORMED_IMAGE",
          message: "The uploaded JPEG frame header is incomplete.",
        };
      }

      const precision = bytes[offset + 2];
      const rawHeight = readUint16BE(bytes, offset + 3);
      const rawWidth = readUint16BE(bytes, offset + 5);

      if (
        (precision !== 8 && precision !== 12 && precision !== 16) ||
        rawWidth <= 0 ||
        rawHeight <= 0 ||
        rawWidth > MAX_DIMENSION_PX ||
        rawHeight > MAX_DIMENSION_PX
      ) {
        return {
          valid: false,
          code: "MALFORMED_IMAGE",
          message: "The uploaded JPEG file has invalid pixel dimensions.",
        };
      }

      const rotatedQuarterTurn = orientation >= 5 && orientation <= 8;
      return {
        valid: true,
        mimeType: "image/jpeg",
        width: rotatedQuarterTurn ? rawHeight : rawWidth,
        height: rotatedQuarterTurn ? rawWidth : rawHeight,
      };
    }

    offset += segmentLength;
  }

  return {
    valid: false,
    code: "MALFORMED_IMAGE",
    message: "Could not locate valid image dimensions in the uploaded JPEG file.",
  };
}

/**
 * Inspects actual binary file bytes (magic numbers and frame headers) on the server.
 * Never trusts client-supplied MIME types, filenames, or dimension metadata.
 */
export function inspectImageBuffer(bytes: Uint8Array): BinaryInspectionResult {
  if (!bytes || bytes.byteLength === 0) {
    return {
      valid: false,
      code: "EMPTY_FILE",
      message: "The uploaded image file appears to be empty.",
    };
  }

  if (isPngSignature(bytes)) {
    return inspectPng(bytes);
  }

  if (isJpegSignature(bytes)) {
    return inspectJpeg(bytes);
  }

  return {
    valid: false,
    code: "UNSUPPORTED_BINARY_FORMAT",
    message:
      "Unsupported file format. Please upload a genuine JPEG (.jpg, .jpeg) or PNG (.png) photograph.",
  };
}
