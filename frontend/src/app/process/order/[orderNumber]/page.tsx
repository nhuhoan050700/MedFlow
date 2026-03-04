'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatVnd } from '@/lib/format'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  paid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Pending' },
  in_progress: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'In progress' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Done' },
}

interface OrderRow {
  order_number: string
  total_amount: number
  procedure_name?: string
  room_number?: string
  status: string
}

export default function ProcessOrderDetailPage() {
  const params = useParams()
  const orderNumberParam = typeof params?.orderNumber === 'string' ? decodeURIComponent(params.orderNumber) : ''
  const [items, setItems] = useState<OrderRow[]>([])
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    const num = orderNumberParam
    if (!num) return
    try {
      setError(null)
      const raw = typeof window !== 'undefined' ? localStorage.getItem('checkin_user') : null
      const user = raw ? JSON.parse(raw) as { id?: number } : null
      const userId = user?.id
      if (!userId) {
        setError('Please sign in to view this order')
        return
      }
      const res = await fetch(`/api/my-orders?user_id=${userId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!data.success || !Array.isArray(data.orders)) {
        setError('Could not load order')
        return
      }
      const rows = data.orders as OrderRow[]
      const forThisOrder = rows.filter((r) => (r.order_number ?? '') === num)
      const orderRank = (s: string) => (s === 'in_progress' ? 0 : s === 'completed' ? 2 : 1)
      const sorted = [...forThisOrder].sort((a, b) => orderRank(a.status ?? '') - orderRank(b.status ?? ''))
      setItems(sorted)
      setTotalAmount(forThisOrder[0]?.total_amount ?? 0)
    } catch (_) {
      setError('Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [orderNumberParam])

  useEffect(() => {
    if (!orderNumberParam) {
      setLoading(false)
      return
    }
    fetchOrder()
  }, [orderNumberParam, fetchOrder])

  // Live updates when worker changes procedure status (SSE, no polling)
  useEffect(() => {
    if (!orderNumberParam || typeof window === 'undefined') return
    const raw = localStorage.getItem('checkin_user')
    const user = raw ? (JSON.parse(raw) as { id?: number }) : null
    const userId = user?.id
    if (!userId) return
    const url = `/api/order-events?user_id=${userId}`
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { item_id?: number; status?: string }
        if (data?.item_id != null && data?.status != null) fetchOrder()
      } catch (_) {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [orderNumberParam, fetchOrder])

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--app-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !orderNumberParam) {
    return (
      <div className="px-4 py-8">
        <header className="flex items-center gap-3 mb-6">
          <Link
            href="/?step=process"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            aria-label="Back to Process"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Order</h1>
        </header>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-[var(--app-text-secondary)]">{error || 'Order not found'}</p>
          <Link href="/?step=process" className="mt-4 inline-block text-[var(--app-primary)] font-medium">
            Back to Process
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-safe">
      <header className="flex items-center gap-3 mb-6">
        <Link
          href="/?step=process"
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0"
          aria-label="Back to Process"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 truncate">Order {orderNumberParam}</h1>
          <p className="text-sm text-[var(--app-text-secondary)]">{formatVnd(totalAmount)}</p>
        </div>
      </header>

      <p className="text-[11px] uppercase tracking-wider text-[var(--app-text-secondary)] font-semibold mb-3 px-0.5">
        Procedures
      </p>
      <ul className="space-y-3">
        {items.map((item, idx) => {
          const style = STATUS_STYLES[item.status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: item.status }
          const name = (item.procedure_name ?? 'Procedure').trim() || 'Procedure'
          const room = (item.room_number ?? '').trim() || '—'
          return (
            <li
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-[15px]">{name}</p>
                  <p className="text-sm text-emerald-600 font-medium mt-0.5">{room}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {items.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-[var(--app-text-secondary)] text-sm">No procedures found for this order.</p>
        </div>
      )}
    </div>
  )
}
