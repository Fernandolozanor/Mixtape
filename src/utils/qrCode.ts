import QRCode from 'qrcode';

/**
 * Standard ISO/IEC 18004 QR Code Matrix Generator using the battle-tested qrcode engine.
 * Generates a clean boolean matrix (true = dark module, false = light module)
 * with Error Correction Level M (15% redundancy, optimal for screen-to-camera scanning).
 */
export function generateQrMatrix(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const matrix: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(qr.modules.get(r, c) === 1);
    }
    matrix.push(row);
  }

  return matrix;
}
