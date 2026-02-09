'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { formatVnd } from '@/lib/format'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface OrderItem {
  id: number
  order_number: string
  total_amount: number
}

interface ProcedureItem {
  name: string
  price: number
}

interface PaymentProps {
  orders: OrderItem[]
  procedures: ProcedureItem[]
  onSuccess: () => void
  onCancel?: () => void
  stripeAvailable?: boolean
}

type PaymentMethod = 'card' | 'sepay' | 'bank'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function PaymentForm({ orders, procedures, onSuccess, onCancel, stripeAvailable = true }: PaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const defaultMethod: PaymentMethod = stripeAvailable ? 'card' : 'sepay'
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bankReference, setBankReference] = useState('')
  const total = procedures.reduce((sum, p) => sum + Number(p.price), 0)

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const card = elements.getElement(CardElement)
    if (!card) return

    setProcessing(true)
    setError(null)
    try {
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card })
      if (pmError) {
        setError(pmError.message || 'Payment failed')
        setProcessing(false)
        return
      }

      const amountCents = Math.round(total * 100)
      const isMulti = orders.length > 1
      const body = isMulti
        ? { order_ids: orders.map((o) => o.id), amount: amountCents, paymentMethodId: paymentMethod.id }
        : { order_id: orders[0].id, amount: amountCents, paymentMethodId: paymentMethod.id }

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json().catch(() => ({}))
      if (data.success) onSuccess()
      else setError(data.error || 'Payment failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handleSepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)
    try {
      const orderNumber = orders.length === 1 ? orders[0].order_number : orders.map((o) => o.order_number).join(',')
      const total = procedures.reduce((sum, p) => sum + Number(p.price), 0)
      const response = await fetch('/api/payment/sepay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          amount: total,
          description: orders.length === 1 ? `Order ${orderNumber}` : `Orders ${orderNumber}`,
          order_ids: orders.length > 1 ? orders.map((o) => o.id) : undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!data.success) {
        setError(data.error || 'Could not start SePay checkout')
        setProcessing(false)
        return
      }
      // Redirect to SePay by submitting form
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.checkoutUrl
      for (const [k, v] of Object.entries(data.formFields || {})) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = k
        input.value = String(v)
        form.appendChild(input)
      }
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProcessing(false)
    }
  }

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)
    try {
      const body =
        orders.length > 1
          ? { payment_method: 'bank', order_ids: orders.map((o) => o.id), reference: bankReference.trim() || undefined }
          : { payment_method: 'bank', order_id: orders[0].id, reference: bankReference.trim() || undefined }
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json().catch(() => ({}))
      if (data.success) onSuccess()
      else setError(data.error || 'Bank payment could not be recorded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-app mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order summary</h3>
        {procedures.map((proc, i) => (
          <div key={i} className="flex justify-between text-sm py-1">
            <span className="text-gray-700 truncate flex-1">{proc.name}</span>
            <span className="font-medium text-gray-900 shrink-0 ml-2">{formatVnd(Number(proc.price))}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold mt-3 pt-3 border-t border-gray-200">
          <span>Total</span>
          <span>{formatVnd(total)}</span>
        </div>
      </div>

      {/* Payment method tabs */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
        {stripeAvailable && (
          <button
            type="button"
            onClick={() => { setMethod('card'); setError(null) }}
            className={`flex-1 py-3 text-sm font-medium ${method === 'card' ? 'bg-white border border-gray-200 shadow-sm' : 'text-gray-600'}`}
          >
            Card (Stripe)
          </button>
        )}
        <button
          type="button"
          onClick={() => { setMethod('sepay'); setError(null) }}
          className={`flex-1 py-3 text-sm font-medium ${method === 'sepay' ? 'bg-white border border-gray-200 shadow-sm' : 'text-gray-600'}`}
        >
          SePay (VietQR)
        </button>
        <button
          type="button"
          onClick={() => { setMethod('bank'); setError(null) }}
          className={`flex-1 py-3 text-sm font-medium ${method === 'bank' ? 'bg-white border border-gray-200 shadow-sm' : 'text-gray-600'}`}
        >
          Manual bank
        </button>
      </div>

      {method === 'card' && (
        <form onSubmit={handleStripeSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
            <CardElement
              options={{
                style: {
                  base: { fontSize: '16px', color: '#1d1d1f', '::placeholder': { color: '#86868b' } },
                },
              }}
            />
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={processing}
                className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-medium touch-target disabled:opacity-50 active:bg-gray-50"
              >
                Cancel payment
              </button>
            )}
            <button
              type="submit"
              disabled={!stripe || processing}
              className={`h-12 rounded-xl bg-blue-600 text-white font-semibold touch-target disabled:opacity-50 active:bg-blue-700 ${onCancel ? 'flex-1' : 'w-full'}`}
            >
              {processing ? 'Processing…' : `Pay ${formatVnd(total)}`}
            </button>
          </div>
          <p className="text-center text-gray-400 text-xs">Secure payment by Stripe</p>
        </form>
      )}

      {method === 'sepay' && (
        <form onSubmit={handleSepaySubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-700">
              Pay via VietQR bank transfer. You will be redirected to SePay to scan the QR code with your banking app.
            </p>
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={processing}
                className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-medium touch-target disabled:opacity-50 active:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={processing}
              className={`h-12 rounded-xl bg-emerald-600 text-white font-semibold touch-target disabled:opacity-50 active:bg-emerald-700 ${onCancel ? 'flex-1' : 'w-full'}`}
            >
              {processing ? 'Redirecting…' : `Pay with VietQR`}
            </button>
          </div>
          <p className="text-center text-gray-400 text-xs">Powered by SePay</p>
        </form>
      )}

      {method === 'bank' && (
        <form onSubmit={handleBankSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <p className="text-sm text-gray-700">
              Pay by bank transfer, then confirm below. Your order will be marked as paid.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment reference (optional)</label>
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="e.g. your name or transfer ID"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={processing}
                className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-medium touch-target disabled:opacity-50 active:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={processing}
              className={`h-12 rounded-xl bg-green-600 text-white font-semibold touch-target disabled:opacity-50 active:bg-green-700 ${onCancel ? 'flex-1' : 'w-full'}`}
            >
              {processing ? 'Recording…' : 'I’ve paid by bank'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function Payment({ orders, procedures, onSuccess, onCancel }: PaymentProps) {
  const orderNumbers = orders.map((o) => o.order_number).join(', ')
  const hasStripeKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  return (
    <div className="max-w-app mx-auto">
      <p className="text-gray-600 text-sm mb-4">
        Order {orders.length === 1 ? 'number' : 'numbers'}: <span className="font-medium text-gray-900">{orderNumbers}</span>
      </p>
      {!hasStripeKey && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          Stripe is not configured. Use bank transfer below or set <code className="text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> for card payments.
        </p>
      )}
      <Elements stripe={stripePromise}>
        <PaymentForm orders={orders} procedures={procedures} onSuccess={onSuccess} onCancel={onCancel} stripeAvailable={hasStripeKey} />
      </Elements>
    </div>
  )
}
