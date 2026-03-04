'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order') || ''
  const [confirmed, setConfirmed] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!orderNumber) return

    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/payment/sepay/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_number: orderNumber }),
        })
        const confirmData = await res.json().catch(() => ({}))
        const actuallyUpdated = confirmData?.success === true && (confirmData?.rows_updated ?? 0) > 0
        if (!cancelled) setConfirmed(actuallyUpdated)

        const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || ''
        if (!n8nUrl) {
          if (!cancelled) setRedirecting(true)
          return
        }
        const orderRes = await fetch(`${n8nUrl}/order-by-number?order_number=${encodeURIComponent(orderNumber)}`)
        const orderData = await orderRes.json().catch(() => ({}))
        if (!cancelled && orderData.success && orderData.order) {
          try {
            localStorage.setItem('checkin_orders', JSON.stringify([orderData.order]))
          } catch (_) {}
        }
        if (!cancelled) setRedirecting(true)
      } catch (_) {
        if (!cancelled) setRedirecting(true)
      }
    }
    run()
    return () => { cancelled = true }
  }, [orderNumber])

  useEffect(() => {
    if (!redirecting || !orderNumber) return
    window.location.href = `/?step=process`
  }, [redirecting, orderNumber])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment successful</h1>
        <p className="text-gray-600 text-sm mb-6">
          Your payment has been received.
          {orderNumber && ` Order ${orderNumber}${confirmed ? ' has been confirmed.' : ' — confirmation is still pending (our team will update it shortly).'}`}
          {redirecting && ' Taking you to your visit…'}
        </p>
        {!confirmed && orderNumber && (
          <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            If your order does not appear as paid, please contact support with order number <strong>{orderNumber}</strong>.
          </p>
        )}
        {redirecting ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
          </div>
        ) : (
          <Link
            href="/?step=process"
            className="inline-block w-full py-3 px-4 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition"
          >
            View my visit
          </Link>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
