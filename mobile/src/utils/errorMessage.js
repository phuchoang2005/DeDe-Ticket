// Maps an ApiError (from apiClient) to a user-friendly Vietnamese message.
// Transport failures get actionable copy; everything else falls back to the
// server-provided message.
export function friendlyError(err) {
  const code = err && err.code;
  switch (code) {
    case 'NETWORK_ERROR':
      return 'Không thể kết nối máy chủ. Kiểm tra kết nối mạng và địa chỉ máy chủ.';
    case 'TIMEOUT':
      return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.';
    case 'HTTP_502':
    case 'HTTP_503':
    case 'HTTP_504':
      return 'Máy chủ tạm thời không khả dụng. Vui lòng thử lại sau.';
    default:
      return (err && err.message) || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}
