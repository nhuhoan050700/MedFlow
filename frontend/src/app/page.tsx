'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import type { Procedure } from '@/components/ProcedureSelection'
import CheckIn from '@/components/CheckIn'
import ProcedureSelection from '@/components/ProcedureSelection'
import CartView from '@/components/CartView'
import Payment from '@/components/Payment'
import OrderStatus from '@/components/OrderStatus'
import ProfileModal from '@/components/ProfileModal'

type User = {
  id: number
  email: string
  name: string
  birthday?: string
  phone?: string
  address?: string
}

type Order = {
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

async function completeCheckIn(
  accessToken: string,
  setUser: (u: User) => void,
  setSessionToken: (t: string | null) => void,
  setStep: (s: 'checkin' | 'order' | 'visit' | 'process' | 'payment') => void
) {
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!userInfoResponse.ok) {
    alert('Could not fetch Google profile. Check console.')
    return
  }
  const userInfo = await userInfoResponse.json()

  const checkInResponse = await fetch('/api/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    })
  })
  const checkInData = await checkInResponse.json().catch(() => null)

  // n8n may return user at different paths (flat top-level, nested, or direct)
  const u =
    (checkInData && typeof checkInData === 'object' && !Array.isArray(checkInData) && checkInData.id != null && checkInData.email ? checkInData : null) ??
    checkInData?.user ??
    checkInData?.data?.user ??
    (checkInData?.data && typeof checkInData.data === 'object' && 'id' in checkInData.data ? checkInData.data : null) ??
    checkInData?.body?.user
  const userId = u?.id != null ? Number(u.id) : NaN
  const hasValidUser = checkInResponse.ok && !!u && !isNaN(userId) && userId > 0

  if (!hasValidUser) {
    console.error('[check-in] Invalid response:', {
      status: checkInResponse.status,
      success: checkInData?.success,
      hasUser: !!u,
      userId,
      raw: checkInData,
      keys: checkInData ? Object.keys(checkInData) : [],
    })
  }

  if (hasValidUser) {
    setUser({ id: userId, email: u.email || '', name: u.name || '', birthday: u.birthday ?? undefined, phone: u.phone, address: u.address ?? undefined })
    setSessionToken(checkInData.sessionToken ?? null)
    if (typeof window !== 'undefined') {
      try {
        const saved = { id: userId, email: u.email || '', name: u.name || '', birthday: u.birthday ?? undefined, phone: u.phone, address: u.address ?? undefined }
        localStorage.setItem('checkin_user', JSON.stringify(saved))
        if (checkInData.sessionToken) localStorage.setItem('checkin_session', checkInData.sessionToken)
      } catch (_) {}
    }
    setStep('order')
  } else {
    const err = checkInData?.message ?? checkInData?.error
    const backendError = typeof err === 'string' ? err : (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '')
    const msg = !hasValidUser
      ? `Check-in failed: ${backendError || 'user data was missing'}. Open browser console (F12) for details.`
      : (!checkInResponse.ok ? `Check-in failed (${checkInResponse.status}).` : 'Check-in failed.')
    alert(msg)
  }
}

const STEP_TITLES: Record<string, string> = {
  checkin: 'Check in',
  order: 'Order',
  visit: 'Payment',
  process: 'Process',
  payment: 'Payment',
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [cart, setCart] = useState<Procedure[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [checkoutProcedures, setCheckoutProcedures] = useState<Procedure[]>([])
  const [step, setStep] = useState<'checkin' | 'order' | 'visit' | 'process' | 'payment'>('checkin')
  const [lastAddedProcedure, setLastAddedProcedure] = useState<Procedure | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  // Count procedures that are pending or in progress (done procedures are subtracted)
  const processTabCount = useMemo(() => {
    return orders.filter((o) => (o.status ?? '') !== 'completed').length
  }, [orders])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const params = new URLSearchParams(window.location.search)
      const urlStep = params.get('step')
      if (urlStep === 'process') setStep('process')

      const stored = localStorage.getItem('checkin_user')
      if (stored) {
        const u = JSON.parse(stored) as User
        setUser(u)
        if (step === 'checkin' && urlStep !== 'process') setStep('order')
      }
      const storedOrders = localStorage.getItem('checkin_orders')
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders) as Order[]
        if (Array.isArray(parsed) && parsed.length > 0) setOrders(parsed)
      }
    } catch (_) {}
  }, [])

  const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || ''
  const hasClientId = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()

  const doCheckIn = useCallback(async (accessToken: string) => {
    try {
      await completeCheckIn(accessToken, setUser, setSessionToken, setStep)
    } catch (e) {
      console.error('Sign-in error:', e)
      alert('Sign-in error: ' + (e instanceof Error ? e.message : 'Unknown'))
    }
  }, [])

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => { await doCheckIn(tokenResponse.access_token) },
    onError: (err) => {
      console.error('Google sign-in error:', err)
      alert('Google sign-in failed. Allow popups and try again.')
    }
  })

  const googleLoginRedirect = useGoogleLogin({
    flow: 'implicit',
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => { await doCheckIn(tokenResponse.access_token) },
    onError: (err) => {
      console.error('Google sign-in error:', err)
      alert('Google sign-in failed.')
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    if (accessToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      doCheckIn(accessToken)
    }
  }, [doCheckIn])

  const fetchProcessOrders = useCallback(() => {
    if (typeof window === 'undefined' || !user?.id) return
    setOrdersLoading(true)
    fetch(`/api/my-orders?user_id=${user.id}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          const raw = data.orders as Record<string, unknown>[]
          const mapped: Order[] = []

          for (const o of raw) {
            const base = {
              order_number: String(o.order_number ?? ''),
              status: String((o as Record<string, unknown>).status ?? (o as Record<string, unknown>).item_status ?? 'pending'),
              total_amount: Number(o.total_amount ?? o.amount ?? 0),
              user_name: o.user_name != null ? String(o.user_name) : undefined,
              payment_status: o.payment_status != null ? String(o.payment_status) : undefined,
              payment_intent_id: o.payment_intent_id != null ? String(o.payment_intent_id) : undefined,
              created_at: o.created_at != null ? String(o.created_at) : undefined,
              paid_at: o.paid_at != null ? String(o.paid_at) : undefined,
            }
            const procedureName = o.procedure_name ?? o.procedureName
            const roomNumber = o.room_number ?? o.roomNumber
            const hasFlatRow = procedureName != null || roomNumber != null

            if (hasFlatRow) {
              mapped.push({
                id: Number(o.item_id ?? o.id) * 1000 + mapped.length,
                ...base,
                procedure_name: procedureName != null ? String(procedureName) : undefined,
                room_number: roomNumber != null ? String(roomNumber) : '',
              })
              continue
            }
            let itemsRaw = o.items
            if (typeof itemsRaw === 'string') {
              try {
                itemsRaw = JSON.parse(itemsRaw as string) as unknown
              } catch {
                itemsRaw = []
              }
            }
            const items = Array.isArray(itemsRaw) ? itemsRaw : []
            if (items.length > 0) {
              items.forEach((it: Record<string, unknown>, i: number) => {
                const name = it.procedure_name ?? it.procedureName
                const room = it.room_number ?? it.roomNumber
                mapped.push({
                  id: Number(o.id) * 1000 + i,
                  ...base,
                  procedure_name: name != null ? String(name) : undefined,
                  room_number: room != null ? String(room) : '',
                })
              })
            } else {
              mapped.push({
                id: Number(o.id),
                ...base,
                procedure_name: undefined,
                room_number: '',
              })
            }
          }
          setOrders(mapped)
          try {
            localStorage.setItem('checkin_orders', JSON.stringify(mapped))
          } catch (_) {}
        }
      })
      .finally(() => setOrdersLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (step !== 'process' || !user?.id) return
    fetchProcessOrders()
  }, [step, user?.id, fetchProcessOrders])

  // Live updates when worker changes procedure status (SSE, no polling)
  useEffect(() => {
    if (step !== 'process' || !user?.id || typeof window === 'undefined') return
    const url = `/api/order-events?user_id=${user.id}`
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { item_id?: number; status?: string }
        if (data?.item_id != null && data?.status != null) {
          fetchProcessOrders()
        }
      } catch (_) {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [step, user?.id, fetchProcessOrders])

  const handleAddToCart = (procedure: Procedure) => {
    if (cart.some((p) => p.id === procedure.id)) return
    setCart([...cart, procedure])
    setLastAddedProcedure(procedure)
  }

  const handleRemoveFromCart = (procedure: Procedure) => {
    setCart((prev) => prev.filter((p) => p.id !== procedure.id))
  }

  const handleCheckout = async (procedures: Procedure[]) => {
    if (!n8nUrl) {
      alert('Missing n8n webhook URL. Set NEXT_PUBLIC_N8N_WEBHOOK_URL.')
      return
    }
    if (!user?.id || procedures.length === 0) return

    const res = await fetch('/api/cart-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        procedures: procedures.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          room: p.room,
        })),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.success && data.order) {
      setOrders([data.order])
      setCheckoutProcedures(procedures)
      setCart([])
      setStep('payment')
    } else {
      alert(data?.error || `Failed to create order. Check cart-checkout workflow.`)
    }
  }

  const handleGoToOrder = () => setStep('order')

  const handlePaymentSuccess = () => {
    try {
      localStorage.setItem('checkin_orders', JSON.stringify(orders))
    } catch (_) {}
    setStep('process')
  }

  const showBottomNav = user && step !== 'checkin' && step !== 'payment'
  const showAvatar = user && step !== 'checkin'
  const initial = user?.name?.trim().charAt(0)?.toUpperCase() || '?'

  const handleProfileSave = useCallback((updated: User) => {
    setUser(updated)
    try {
      localStorage.setItem('checkin_user', JSON.stringify(updated))
    } catch (_) {}
  }, [])

  const highlightedProcedure = lastAddedProcedure ?? (cart.length > 0 ? cart[cart.length - 1] : null)

  return (
    <div className="h-dvh max-h-dvh bg-gray-50 flex flex-col max-w-app mx-auto overflow-hidden">
      {/* App header */}
      <header className="flex-shrink-0 z-30 bg-white border-b border-gray-200 px-4 py-3 pt-safe flex items-center justify-center relative">
        {step === 'visit' && (
          <button
            type="button"
            onClick={() => setStep('order')}
            aria-label="Return to order"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900">
          {STEP_TITLES[step]}
        </h1>
        {showAvatar && (
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Open profile"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center active:bg-blue-200"
          >
            {initial}
          </button>
        )}
      </header>

      {user && (
        <ProfileModal
          user={user}
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onSave={handleProfileSave}
          onSignOut={() => {
            setUser(null)
            setSessionToken(null)
            setCart([])
            setOrders([])
            setCheckoutProcedures([])
            setProfileOpen(false)
            try {
              localStorage.removeItem('checkin_user')
              localStorage.removeItem('checkin_session')
              localStorage.removeItem('checkin_orders')
            } catch (_) {}
            setStep('checkin')
          }}
        />
      )}

      {/* Main content - scrollable area */}
      <main className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${showBottomNav ? 'pb-20' : 'pb-6'}`}>
        <div className="px-4 py-4">
          {step === 'checkin' && (
            <CheckIn
              onLogin={googleLogin}
              onLoginRedirect={googleLoginRedirect}
              hasClientId={hasClientId}
              hasN8nUrl={!!n8nUrl}
            />
          )}

          {step === 'order' && user && (
            <ProcedureSelection
              userId={user.id}
              user={user}
              cart={cart}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
              onCheckout={handleCheckout}
              hideCartUI
            />
          )}

          {step === 'visit' && user && (
            <CartView
              cart={cart}
              onRemoveFromCart={handleRemoveFromCart}
              onCheckout={handleCheckout}
              onGoToOrder={handleGoToOrder}
            />
          )}

          {step === 'process' && (
            <>
              {!user?.id ? (
                <div className="py-16 text-center rounded-2xl bg-white/80 shadow-sm border border-gray-100">
                  <p className="text-[var(--app-text-secondary)] text-sm font-medium">Sign in to see your orders</p>
                  <p className="text-gray-400 text-[13px] mt-1">Check in first, then your Process tab will load.</p>
                </div>
              ) : ordersLoading ? (
                <div className="py-16 text-center rounded-2xl bg-white/80 shadow-sm border border-gray-100">
                  <p className="text-[var(--app-text-secondary)] text-sm font-medium">Loading your orders…</p>
                </div>
              ) : orders.length > 0 ? (
                <OrderStatus orders={orders} />
              ) : (
                <div className="py-16 text-center rounded-2xl bg-white/80 shadow-sm border border-gray-100">
                  <p className="text-[var(--app-text-secondary)] text-sm font-medium">No orders yet</p>
                  <p className="text-gray-400 text-[13px] mt-1">Choose procedures and pay to track your visit here.</p>
                </div>
              )}
            </>
          )}

          {step === 'payment' && orders.length > 0 && checkoutProcedures.length > 0 && (
            <Payment
              orders={orders}
              procedures={checkoutProcedures}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setCart([...checkoutProcedures])
                setOrders([])
                setCheckoutProcedures([])
                setStep('visit')
              }}
            />
          )}
        </div>
      </main>

      {highlightedProcedure && cart.length > 0 && step === 'order' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 flex justify-center z-40">
          <div className="pointer-events-auto max-w-[420px] w-[92%] rounded-2xl bg-white/95 border border-gray-200 shadow-xl px-4 py-3 flex items-center gap-3 backdrop-blur">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg" aria-hidden>
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Added to your visit</p>
              <p className="text-xs text-gray-500 truncate">
                {highlightedProcedure.name} · {cart.length}{' '}
                {cart.length === 1 ? 'procedure selected' : 'procedures selected'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('visit')
              }}
              className="ml-2 text-xs font-semibold px-3 py-1 rounded-full bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-hover)] active:scale-95 transition"
            >
              View visit
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav: Order | Process */}
      {showBottomNav && (
        <nav className="flex-shrink-0 z-40 w-full max-w-app mx-auto bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] grid grid-cols-2">
          <button
            type="button"
            onClick={() => setStep('order')}
            className={`flex flex-col items-center justify-center py-3 gap-1 relative min-w-0 ${step === 'order' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <span className="text-xl shrink-0" aria-hidden>🩺</span>
            <span className="text-xs font-medium truncate w-full text-center">Order</span>
          </button>
          <button
            type="button"
            onClick={() => setStep('process')}
            className={`flex flex-col items-center justify-center py-3 gap-1 relative min-w-0 ${step === 'process' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <span className="text-xl relative inline-block shrink-0" aria-hidden>
              📋
              {processTabCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {processTabCount}
                </span>
              )}
            </span>
            <span className="text-xs font-medium truncate w-full text-center">Process</span>
          </button>
        </nav>
      )}
    </div>
  )
}
