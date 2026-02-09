'use client'

import { formatVnd, formatDateTimeVietnam } from '@/lib/format'

interface Order {
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
  orders: Order[]
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  paid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Paid' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Assigned' },
  in_progress: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'In progress' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Done' },
}

export default function OrderStatus({ orders }: OrderStatusProps) {

  const notYet = orders.filter((o) => ['pending', 'paid', 'assigned'].includes(o.status))
  const inProgress = orders.filter((o) => o.status === 'in_progress')
  const done = orders.filter((o) => o.status === 'completed')

  const renderOrderCard = (order: Order) => {
    const style = STATUS_STYLES[order.status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: order.status }
    const isActive = order.status === 'in_progress'
    const isDone = order.status === 'completed'
    return (
      <div
        key={order.id}
        className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all duration-200 ${
          isActive ? 'border-orange-200 ring-1 ring-orange-100' : 'border-gray-100'
        } ${isDone ? 'opacity-95' : ''}`}
      >
        <div className="p-5">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-[var(--app-text-secondary)] font-semibold">Order {order.order_number}</p>
              <p className="font-semibold text-gray-900 text-[15px] truncate mt-0.5">
                {order.procedure_name || 'Procedure'}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide shrink-0 ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
          <div className="mb-4 space-y-2">
            <div className="rounded-xl bg-gray-50 px-3 py-2.5">
              <p className="text-[11px] text-[var(--app-text-secondary)] font-medium">Room</p>
              <p className="text-base font-bold text-emerald-600 tabular-nums mt-0.5">{order.room_number || '—'}</p>
            </div>
            {(order.user_name || order.total_amount > 0 || order.created_at || order.paid_at) && (
              <div className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-1.5">
                {order.user_name && (
                  <p className="text-[12px] text-gray-600">
                    <span className="font-medium text-[var(--app-text-secondary)]">Patient</span>{' '}
                    {order.user_name}
                  </p>
                )}
                {order.total_amount > 0 && (
                  <p className="text-[12px] text-gray-700 font-semibold">{formatVnd(order.total_amount)}</p>
                )}
                {order.created_at && (
                  <p className="text-[11px] text-gray-500">Ordered {formatDateTimeVietnam(order.created_at)}</p>
                )}
                {order.paid_at && (
                  <p className="text-[11px] text-emerald-600">Paid {formatDateTimeVietnam(order.paid_at)}</p>
                )}
                {order.payment_status && (
                  <p className="text-[11px] uppercase tracking-wide text-[var(--app-text-secondary)]">
                    Payment: {order.payment_status}
                  </p>
                )}
              </div>
            )}
          </div>
          {isActive && (
            <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 mb-4">
              <p className="text-orange-800 text-sm font-semibold">Go to {order.room_number || 'your room'}</p>
            </div>
          )}
          {isDone && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 mb-4 flex items-center gap-2">
              <span className="text-emerald-600 text-lg">✓</span>
              <p className="text-emerald-800 text-sm font-semibold">Done · Room {order.room_number || '—'}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Please proceed to ${order.room_number || 'your room'}.`))
            }}
            className="w-full h-11 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold touch-target hover:bg-gray-200 active:scale-[0.98] transition-all duration-150"
          >
            Play audio guide
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-app mx-auto space-y-6">
      {notYet.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-text-secondary)] mb-3 px-0.5">
            Purchased · not yet done
          </h2>
          <p className="text-[12px] text-gray-500 mb-2 px-0.5">Procedures you paid for, waiting for your turn.</p>
          <div className="space-y-4">
            {notYet.map((order) => renderOrderCard(order))}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-700 mb-3 px-0.5">
            In progress
          </h2>
          <p className="text-[12px] text-gray-500 mb-2 px-0.5">Go to the room below.</p>
          <div className="space-y-4">
            {inProgress.map((order) => renderOrderCard(order))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3 px-0.5">
            Done
          </h2>
          <p className="text-[12px] text-gray-500 mb-2 px-0.5">Procedure and room completed.</p>
          <div className="space-y-4">
            {done.map((order) => renderOrderCard(order))}
          </div>
        </section>
      )}

      {orders.length === 0 && (
        <p className="text-[13px] text-gray-500 px-0.5">No orders in this section.</p>
      )}
    </div>
  )
}
