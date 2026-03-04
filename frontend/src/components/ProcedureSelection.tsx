'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatVnd } from '@/lib/format'

export interface Procedure {
  id: number
  name: string
  description: string
  price: number
  duration: number
  room: string
}

interface User {
  id: number
  email: string
  name: string
  birthday?: string
  phone?: string
  address?: string
}

interface ProcedureSelectionProps {
  userId: number
  user?: User
  onSelect?: (procedure: Procedure) => void
  onAddToCart?: (procedure: Procedure) => void
  onCheckout?: (procedures: Procedure[]) => void
  cart?: Procedure[]
  onRemoveFromCart?: (procedure: Procedure) => void
  onSignOut?: () => void
  /** When true, cart is shown in a separate Visit tab; hide sticky bar and sheet */
  hideCartUI?: boolean
}

function toProcedureList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const len = typeof o.length === 'number' ? o.length : 0
  if (len > 0) {
    return Array.from({ length: len }, (_, i) => o[i]).filter((v): v is Record<string, unknown> => v != null && typeof v === 'object' && 'id' in v)
  }
  if (o.id != null) return [o]
  return (Object.values(o) as unknown[]).filter((v): v is Record<string, unknown> => v != null && typeof v === 'object' && 'id' in v)
}

export default function ProcedureSelection({
  onAddToCart,
  onCheckout,
  cart = [],
  onRemoveFromCart,
  hideCartUI = false,
}: ProcedureSelectionProps) {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const total = cart.reduce((sum, p) => sum + Number(p.price), 0)
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  const fetchProcedures = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/procedures?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      const data = await res.json().catch(() => ({}))
      const raw = data?.procedures
      const arr = toProcedureList(raw)
      if (!data?.success || arr.length === 0) {
        if (data?.success && arr.length === 0) {
          setProcedures([])
        } else {
          throw new Error(data?.error || 'Invalid response')
        }
      } else {
        setProcedures(arr.map((p: Record<string, unknown>) => ({
          id: Number(p.id),
          name: String(p.name ?? ''),
          description: String(p.description ?? ''),
          price: Number(p.price) || 0,
          duration: Number(p.duration ?? p.duration_minutes ?? 0),
          room: String(p.room ?? p.room_number ?? ''),
        })))
      }
    } catch (err) {
      setProcedures([])
      setError(err instanceof Error ? err.message : 'Could not load procedures.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProcedures()
  }, [fetchProcedures])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-11 h-11 border-2 border-[var(--app-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--app-text-secondary)] text-sm mt-4 font-medium">Loading procedures…</p>
      </div>
    )
  }

  return (
    <div className="max-w-app mx-auto">
      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50/80 backdrop-blur flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchProcedures(); }}
            className="h-9 px-4 rounded-xl bg-amber-100 text-amber-800 font-medium text-sm hover:bg-amber-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Procedure list - 2 columns */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {procedures.length === 0 && !error ? (
          <div className="col-span-2 py-16 text-center rounded-2xl bg-white/80 shadow-sm border border-gray-100">
            <p className="text-[var(--app-text-secondary)] text-sm">No procedures available.</p>
          </div>
        ) : (
          procedures.map((proc) => {
            const inCart = cart.some((p) => p.id === proc.id)
            return (
              <div
                key={proc.id}
                className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow duration-200"
              >
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="font-semibold text-gray-900 text-[14px] leading-snug line-clamp-2 min-h-[2.5rem]">
                    {proc.name}
                  </h3>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-[var(--app-primary)] tabular-nums leading-none">
                      {formatVnd(Number(proc.price))}
                    </span>
                    {proc.room?.trim() ? (
                      <span className="shrink-0 inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                        {proc.room}
                      </span>
                    ) : null}
                  </div>
                  {(onAddToCart || (inCart && onRemoveFromCart)) && (
                    <button
                      type="button"
                      onClick={() => inCart && onRemoveFromCart ? onRemoveFromCart(proc) : onAddToCart?.(proc)}
                      className={`mt-4 w-full h-11 rounded-xl font-semibold text-[13px] touch-target active:scale-[0.98] transition-all duration-150 ${
                        inCart
                          ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          : 'bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-hover)]'
                      }`}
                    >
                      {inCart ? 'Remove' : 'Add to visit'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Sticky bottom bar (hidden when cart is in Visit tab) */}
      {!hideCartUI && onAddToCart && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] max-w-app mx-auto">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0 flex items-center justify-between h-12 px-4 rounded-xl bg-gray-100">
              <span className="text-sm font-medium text-gray-700">
                {cart.length} {cart.length === 1 ? 'procedure' : 'procedures'}
              </span>
              <span className="text-base font-semibold text-blue-600">{formatVnd(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-12 px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm touch-target active:bg-blue-700"
            >
              Review visit
            </button>
          </div>
        </div>
      )}

      {/* Bottom sheet (hidden when cart is in Visit tab) */}
      {!hideCartUI && onAddToCart && cart.length > 0 && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Close"
            onClick={closeSheet}
            onKeyDown={(e) => e.key === 'Escape' && closeSheet()}
            className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${sheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          />
          <div
            className={`fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out max-h-[88vh] flex flex-col pb-[env(safe-area-inset-bottom)] ${sheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <div className="flex-shrink-0 py-3 px-4">
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto" aria-hidden />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your visit · {cart.length} {cart.length === 1 ? 'procedure' : 'procedures'}
              </h3>
              <ul className="space-y-2 mb-4">
                {cart.map((proc) => (
                  <li
                    key={proc.id}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{proc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {proc.room?.trim() ? (
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-200/80 rounded px-1.5 py-0.5">
                            {proc.room}
                          </span>
                        ) : null}
                        <span className="font-semibold text-[var(--app-primary)] text-sm tabular-nums">
                          {formatVnd(Number(proc.price))}
                        </span>
                      </div>
                    </div>
                    {onRemoveFromCart ? (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(proc)}
                          className="text-red-600 text-sm font-medium touch-target min-w-[44px] min-h-[44px]"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center py-3 border-t border-gray-200 mb-4">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">{formatVnd(total)}</span>
              </div>
              {onCheckout && (
                <button
                  type="button"
                  onClick={() => { closeSheet(); onCheckout(cart); }}
                  className="w-full h-12 rounded-xl bg-green-600 text-white font-semibold touch-target active:bg-green-700"
                >
                  Proceed to payment
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
