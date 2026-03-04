'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { formatVnd } from '@/lib/format'

interface OrderItem {
  id: number
  order_number: string
  room_number: string
  status: string
  total_amount: number
  procedure_name?: string
  user_name?: string
  payment_status?: string
  payment_intent_id?: string
  created_at?: string
  paid_at?: string
}

interface OrderStatusProps {
  orders: OrderItem[]
}

/** One order (order_number) with its procedure items */
interface GroupedOrder {
  order_number: string
  total_amount: number
  paid_at?: string
  created_at?: string
  status: string
  items: { procedure_name: string; room_number: string; status: string }[]
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  paid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Pending' },
  in_progress: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'In progress' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Done' },
}

function groupOrdersByOrderNumber(orders: OrderItem[]): GroupedOrder[] {
  const byNumber = new Map<string, OrderItem[]>()
  for (const o of orders) {
    const n = o.order_number ?? ''
    if (!byNumber.has(n)) byNumber.set(n, [])
    byNumber.get(n)!.push(o)
  }
  const result: GroupedOrder[] = []
  Array.from(byNumber.entries()).forEach(([order_number, items]) => {
    const first = items[0]
    const statuses = items.map((i) => i.status ?? 'pending')
    let orderStatus: string
    if (statuses.some((s) => s === 'in_progress')) orderStatus = 'in_progress'
    else if (statuses.every((s) => s === 'completed')) orderStatus = 'completed'
    else orderStatus = 'pending'
    result.push({
      order_number,
      total_amount: Number(first?.total_amount ?? 0),
      paid_at: first?.paid_at,
      created_at: first?.created_at,
      status: orderStatus,
      items: items.map((i) => ({
        procedure_name: (i.procedure_name ?? 'Procedure').trim() || 'Procedure',
        room_number: (i.room_number ?? '').trim() || '—',
        status: i.status ?? 'pending',
      })),
    })
  })
  result.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return result
}

export default function OrderStatus({ orders }: OrderStatusProps) {
  const grouped = useMemo(() => groupOrdersByOrderNumber(orders), [orders])

  const notYet = grouped.filter((o) => ['pending', 'paid', 'assigned'].includes(o.status))
  const inProgress = grouped.filter((o) => o.status === 'in_progress')
  const done = grouped.filter((o) => o.status === 'completed')

  const renderOrderCard = (order: GroupedOrder) => {
    const style = STATUS_STYLES[order.status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: order.status }
    const isActive = order.status === 'in_progress'
    const isDone = order.status === 'completed'
    const href = `/process/order/${encodeURIComponent(order.order_number)}`
    return (
      <Link
        key={order.order_number}
        href={href}
        className={`block bg-white rounded-2xl overflow-hidden shadow-sm border transition-all duration-200 hover:shadow ${
          isActive ? 'border-orange-200 ring-1 ring-orange-100' : 'border-gray-100'
        } ${isDone ? 'opacity-95' : ''}`}
      >
        <div className="w-full p-5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-gray-900">Order {order.order_number}</p>
            <p className="text-[13px] text-[var(--app-text-secondary)] mt-0.5">
              {order.items.length} {order.items.length === 1 ? 'procedure' : 'procedures'} · {formatVnd(order.total_amount)}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
            {style.label}
          </span>
          <span className="shrink-0 text-gray-400" aria-hidden>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-app mx-auto space-y-6">
      {inProgress.length > 0 && (
        <section>
          <div className="space-y-4">
            {inProgress.map((order) => renderOrderCard(order))}
          </div>
        </section>
      )}

      {notYet.length > 0 && (
        <section>
          <div className="space-y-4">
            {notYet.map((order) => renderOrderCard(order))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <div className="space-y-4">
            {done.map((order) => renderOrderCard(order))}
          </div>
        </section>
      )}

      {grouped.length === 0 && (
        <p className="text-[13px] text-gray-500 px-0.5">No orders yet.</p>
      )}
    </div>
  )
}
