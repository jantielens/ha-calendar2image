/**
 * CRC32 calculation utility
 * Uses the standard CRC32 algorithm (IEEE 802.3)
 */

/**
 * Generate CRC32 lookup table
 * @returns {Uint32Array} CRC32 lookup table
 */
function makeCRCTable() {
  let c;
  const crcTable = new Uint32Array(256);
  
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
  
  return crcTable;
}

// Pre-generate the lookup table
const crcTable = makeCRCTable();

/**
 * Calculate CRC32 checksum of a buffer
 * @param {Buffer} buffer - Input buffer
 * @returns {string} CRC32 checksum as lowercase hexadecimal string
 */
function calculateCRC32(buffer) {
  let crc = 0 ^ (-1);
  
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xFF];
  }
  
  crc = (crc ^ (-1)) >>> 0;
  
  // Convert to lowercase hex string with padding
  return crc.toString(16).padStart(8, '0');
}

module.exports = {
  calculateCRC32
};
