'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PaymentErrorContent() {
  const searchParams = useSearchParams()
  const order = searchParams.get('order') || ''

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment failed</h1>
        <p className="text-gray-600 text-sm mb-6">
          There was a problem with your payment. {order && `Order ${order} was not completed.`} Please try again.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 px-4 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition"
        >
          Return to homepage
        </Link>
      </div>
    </div>
  )
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentErrorContent />
    </Suspense>
  )
}
