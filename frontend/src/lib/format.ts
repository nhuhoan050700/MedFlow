/** Format amount as VND (no decimals, thousands separator) */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount) + ' ₫'
}

/** Format date/time in Vietnam timezone (Asia/Ho_Chi_Minh) */
export function formatDateTimeVietnam(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}
