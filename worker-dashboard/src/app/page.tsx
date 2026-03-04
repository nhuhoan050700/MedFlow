'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import OrderList from '@/components/OrderList'
import { isAuthenticated, clearAuth } from '@/lib/auth'

export default function WorkerDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) {
      router.replace('/login')
    }
  }, [mounted, router])

  const handleLogout = () => {
    clearAuth()
    router.replace('/login')
  }

  if (!mounted || !isAuthenticated()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 overflow-y-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              MedFlow Worker Dashboard
            </h1>
            <p className="text-gray-600">
              Manage patient orders and update test status
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300"
          >
            Log out
          </button>
        </div>

        <OrderList />
      </div>
    </main>
  )
}
