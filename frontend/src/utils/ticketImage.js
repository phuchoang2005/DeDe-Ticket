import { formatDateTime } from './format';

const W = 640;
const QR_SIZE = 380;
const PAD = 32;
const BRAND = '#157F19';
const INK = '#1B3120';
const INK_MUTED = '#525252';
const LINE = '#E3E3E3';

// Builds a PNG Blob containing the QR plus event/seat/time metadata.
// Uses crossOrigin on the QR image so the canvas isn't tainted by api.qrserver.com.
export async function buildTicketImage(ticket) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&data=${encodeURIComponent(ticket.qrCode)}&margin=0`;
  const qrImg = await loadImage(qrUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Measure required text height so the canvas can grow with long titles/locations.
  const ctxMeasure = canvas.getContext('2d');
  ctxMeasure.font = 'bold 26px Inter, system-ui, sans-serif';
  const titleLines = wrapLines(ctxMeasure, ticket.eventTitle || '', W - PAD * 2);
  ctxMeasure.font = '16px Inter, system-ui, sans-serif';
  const locationLines = wrapLines(ctxMeasure, ticket.eventLocation || '', W - PAD * 2 - 90);

  const headerH = 64;
  const qrBlockH = QR_SIZE + 40;
  const titleH = titleLines.length * 32 + 8;
  const rowsH = (locationLines.length + 2) * 26 + 24;
  const footerH = 64;
  const H = headerH + qrBlockH + titleH + rowsH + footerH;

  canvas.width = W;
  canvas.height = H;

  // White background.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Brand header bar.
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Dề Dê · Vé điện tử', PAD, headerH / 2);
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Ticket #${ticket.id}`, W - PAD, headerH / 2);
  ctx.textAlign = 'left';

  // QR (with a thin border so it's distinguishable from the page on white printers).
  const qrX = (W - QR_SIZE) / 2;
  const qrY = headerH + 20;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(qrX - 1, qrY - 1, QR_SIZE + 2, QR_SIZE + 2);
  ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE);

  // Event title.
  let y = headerH + qrBlockH;
  ctx.fillStyle = INK;
  ctx.font = 'bold 26px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y);
    y += 32;
  }
  y += 8;

  // Metadata rows: label (muted) + value (ink). Labels are 86px wide so they align.
  const labelX = PAD;
  const valueX = PAD + 90;
  drawRow(ctx, 'Địa điểm', locationLines, labelX, valueX, y);
  y += locationLines.length * 26;
  drawRow(ctx, 'Thời gian', [formatDateTime(ticket.eventStartTime)], labelX, valueX, y);
  y += 26;
  drawRow(ctx, 'Ghế', [`${ticket.section} · ${ticket.rowLabel}-${ticket.seatNumber}`], labelX, valueX, y);

  // Footer: divider + QR code string.
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(PAD, H - footerH);
  ctx.lineTo(W - PAD, H - footerH);
  ctx.stroke();
  ctx.fillStyle = INK_MUTED;
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(ticket.qrCode, W / 2, H - footerH / 2);
  ctx.textAlign = 'left';

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the browser has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('QR image failed to load'));
    img.src = src;
  });
}

function wrapLines(ctx, text, maxWidth) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawRow(ctx, label, valueLines, labelX, valueX, y) {
  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillText(label, labelX, y);
  ctx.fillStyle = INK;
  ctx.font = '16px Inter, system-ui, sans-serif';
  for (let i = 0; i < valueLines.length; i += 1) {
    ctx.fillText(valueLines[i], valueX, y + i * 26);
  }
}
