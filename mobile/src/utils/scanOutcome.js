// Maps a scan error code to a display title and tone, mirroring the web
// ScanResult. Unknown codes fall back to a generic error.
export function describeScanError(code) {
  switch (code) {
    case 'ALREADY_USED':
      return { title: 'Vé đã được sử dụng', tone: 'warn' };
    case 'TICKET_NOT_FOUND':
      return { title: 'Không tìm thấy vé', tone: 'danger' };
    case 'TICKET_NOT_VALID':
      return { title: 'Vé không hợp lệ', tone: 'danger' };
    default:
      return { title: 'Lỗi quét vé', tone: 'danger' };
  }
}
