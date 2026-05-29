import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ticketApi } from '../services/api';
import { getDeviceId } from '../utils/deviceId';
import { formatDateTime } from '../utils/format';

const SCAN_THROTTLE_MS = 150;

// facingMode "environment" = rear (phones); "user" = front (laptops).
// QR finder patterns aren't mirror-invariant, so we only mirror the
// preview, never the canvas the decoder reads.
const FACING_OPTIONS = [
  { key: 'environment', label: 'Camera sau' },
  { key: 'user', label: 'Camera trước' },
];

export default function ScanPage() {
  const [active, setActive] = useState(false);
  const [facing, setFacing] = useState('environment');
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const deviceId = useMemo(() => getDeviceId(), []);

  const constraints = useMemo(
    () => ({
      facingMode: facing === 'environment' ? { ideal: 'environment' } : 'user',
      width: { ideal: 640 },
      height: { ideal: 640 },
    }),
    [facing]
  );

  const handleScan = useCallback(
    async (detected) => {
      if (!detected || detected.length === 0 || paused || submitting) return;
      const value = detected[0].rawValue;
      if (!value) return;

      setPaused(true);
      setSubmitting(true);
      setError(null);
      setResult(null);
      try {
        const res = await ticketApi.scan(value, deviceId);
        setResult(res);
      } catch (e) {
        setError({ code: e.code, message: e.message });
      } finally {
        setSubmitting(false);
      }
    },
    [paused, submitting, deviceId]
  );

  const handleError = useCallback((e) => {
    setCameraError(e?.message || String(e));
    setActive(false);
  }, []);

  const reset = () => {
    setResult(null);
    setError(null);
    setPaused(false);
  };

  const stop = () => {
    setActive(false);
    setPaused(false);
    setResult(null);
    setError(null);
    setCameraError(null);
  };

  const mirror = facing === 'user';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">Quét vé</h1>
          <p className="text-sm text-ink-subtle mt-0.5">
            Hướng QR vào khung hình. Hỗ trợ điện thoại và webcam laptop.
          </p>
        </div>
        <Link to="/scan/history" className="btn-ghost text-sm px-3 py-1.5 shrink-0">Lịch sử</Link>
      </div>

      <section className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-line overflow-hidden">
            {FACING_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFacing(opt.key)}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  facing === opt.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-ink-muted hover:bg-surface-alt'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          {!active ? (
            <button type="button" onClick={() => { setCameraError(null); setActive(true); }} className="btn-primary text-sm px-3 py-1.5">
              Bật camera
            </button>
          ) : (
            <button type="button" onClick={stop} className="btn-ghost text-sm px-3 py-1.5">
              Tắt camera
            </button>
          )}
        </div>

        <div className="relative aspect-square max-w-[640px] mx-auto bg-ink/90 rounded-xl overflow-hidden border border-line">
          {active ? (
            <div className={`absolute inset-0 ${mirror ? 'scale-x-[-1]' : ''}`}>
              {/* key on facing forces a clean stream stop+restart when the
                  user toggles the camera — no manual on/off step needed. */}
              <Scanner
                key={facing}
                onScan={handleScan}
                onError={handleError}
                constraints={constraints}
                paused={paused}
                formats={['qr_code']}
                scanDelay={SCAN_THROTTLE_MS}
                components={{ finder: false, torch: false, zoom: false, onOff: false }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' },
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm px-4 text-center">
              Camera đang tắt. Nhấn “Bật camera” để bắt đầu quét.
            </div>
          )}

          {submitting && (
            <div className="absolute inset-0 bg-ink/60 text-white flex items-center justify-center text-sm">
              Đang xác thực vé…
            </div>
          )}
        </div>

        {cameraError && (
          <div className="text-sm text-danger-600">
            Không mở được camera: {cameraError}. Hãy kiểm tra quyền truy cập trình duyệt và HTTPS.
          </div>
        )}
      </section>

      {(result || error) && (
        <ScanResult result={result} error={error} onAgain={reset} />
      )}
    </div>
  );
}

function ScanResult({ result, error, onAgain }) {
  if (error) {
    const tone = error.code === 'ALREADY_USED' ? 'warn' : 'danger';
    const title =
      error.code === 'ALREADY_USED' ? 'Vé đã được sử dụng'
        : error.code === 'TICKET_NOT_FOUND' ? 'Không tìm thấy vé'
        : error.code === 'TICKET_NOT_VALID' ? 'Vé không hợp lệ'
        : 'Lỗi quét vé';
    return (
      <section className={`card p-4 sm:p-5 border-2 ${tone === 'warn' ? 'border-warn-200 bg-warn-50' : 'border-danger-200 bg-danger-50'}`}>
        <div className={`text-sm font-bold ${tone === 'warn' ? 'text-warn-700' : 'text-danger-600'}`}>
          {title}
        </div>
        <div className="text-sm text-ink-muted mt-1">{error.message}</div>
        <button onClick={onAgain} className="btn-primary text-sm px-3 py-1.5 mt-3">Quét vé khác</button>
      </section>
    );
  }
  if (result) {
    return (
      <section className="card p-4 sm:p-5 border-2 border-brand-200 bg-brand-50">
        <div className="text-sm font-bold text-brand-700">Check-in thành công</div>
        <dl className="mt-2 grid grid-cols-[110px_1fr] gap-y-1 text-sm">
          <dt className="text-ink-subtle">Sự kiện</dt><dd className="text-ink font-semibold">{result.eventTitle}</dd>
          <dt className="text-ink-subtle">Ghế</dt><dd className="text-ink">{result.section} · {result.rowLabel}-{result.seatNumber}</dd>
          <dt className="text-ink-subtle">Thời điểm</dt><dd className="text-ink">{formatDateTime(result.checkedInAt)}</dd>
          <dt className="text-ink-subtle">Ticket ID</dt><dd className="text-ink font-mono">#{result.ticketId}</dd>
        </dl>
        <button onClick={onAgain} className="btn-primary text-sm px-3 py-1.5 mt-3">Quét vé khác</button>
      </section>
    );
  }
  return null;
}
