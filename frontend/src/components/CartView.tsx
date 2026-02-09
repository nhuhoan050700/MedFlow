'use client'

import { formatVnd } from '@/lib/format'
import type { Procedure } from '@/components/ProcedureSelection'

interface CartViewProps {
  cart: Procedure[]
  onRemoveFromCart: (procedure: Procedure) => void
  onCheckout: (procedures: Procedure[]) => void
  onGoToOrder: () => void
}

export default function CartView({
  cart,
  onRemoveFromCart,
  onCheckout,
  onGoToOrder,
}: CartViewProps) {
  const total = cart.reduce((sum, p) => sum + Number(p.price), 0)

  if (cart.length === 0) {
    return (
      <div className="max-w-app mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-2xl">
            🛒
          </div>
          <p className="text-gray-900 font-semibold text-[15px] mb-1">Your visit is empty</p>
          <p className="text-[var(--app-text-secondary)] text-[13px] mb-6">Add procedures from Order to continue</p>
          <button
            type="button"
            onClick={onGoToOrder}
            className="h-12 px-8 rounded-xl bg-[var(--app-primary)] text-white font-semibold text-sm touch-target hover:bg-[var(--app-primary-hover)] active:scale-[0.98] transition-all"
          >
            Choose procedures
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-app mx-auto space-y-5">
      <p className="text-[13px] text-[var(--app-text-secondary)] font-medium px-0.5">
        {cart.length} {cart.length === 1 ? 'procedure' : 'procedures'} in your visit
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <ul className="divide-y divide-gray-100">
          {cart.map((proc) => (
            <li
              key={proc.id}
              className="flex justify-between items-center py-4 px-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="font-semibold text-gray-900 text-[15px] truncate">{proc.name}</p>
                <p className="text-[var(--app-text-secondary)] text-[12px] mt-0.5">{proc.room} · {proc.duration} min</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-[var(--app-primary)] text-sm tabular-nums">{formatVnd(Number(proc.price))}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFromCart(proc)}
                  className="text-red-500 text-[13px] font-medium hover:text-red-600 touch-target min-w-[44px] min-h-[44px] transition-colors"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-4 bg-gray-50/80 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-[var(--app-primary)] tabular-nums">{formatVnd(total)}</span>
          </div>
          <button
            type="button"
            onClick={() => onCheckout(cart)}
            className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm touch-target hover:bg-emerald-600 active:scale-[0.98] transition-all duration-150"
          >
            Proceed to payment
          </button>
        </div>
      </div>
    </div>
  )
}
