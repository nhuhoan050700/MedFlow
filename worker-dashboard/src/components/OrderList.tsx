'use client'

import { useState, useEffect } from 'react'
import { formatVnd } from '@/lib/format'

interface Order {
  id: number
  order_number: string
  room_number: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  user_name: string
  procedure_name: string
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('paid')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const fetchOrders = async () => {
    try {
      setError(null)
      const url = filter === 'all'
        ? '/api/worker-orders'
        : `/api/worker-orders?status=${encodeURIComponent(filter)}`

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Failed to load orders')
        setOrders([])
        return
      }
      if (data.success) {
        setOrders(Array.isArray(data.orders) ? data.orders : [])
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Cannot reach server. Is the worker dashboard and n8n running?')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus,
          worker_id: 1 // In production, get from auth
        })
      })

      const data = await response.json()
      if (data.success) {
        fetchOrders() // Refresh list
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Failed to update order status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'assigned':
        return 'bg-purple-100 text-purple-800'
      case 'in_progress':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && !error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <p className="mt-2 text-sm text-gray-500">Set N8N_WEBHOOK_URL or NEXT_PUBLIC_N8N_WEBHOOK_URL in .env.local (e.g. http://localhost:5678/webhook). Only paid orders are listed.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Orders</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg ${filter === 'paid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Paid
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg ${filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Done
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Order #</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Procedure</th>
              <th className="text-left p-3">Room</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold">{order.order_number}</td>
                  <td className="p-3">{order.user_name}</td>
                  <td className="p-3">{order.procedure_name ?? '—'}</td>
                  <td className="p-3">
                    <span className="font-semibold text-green-600">
                      {order.room_number ?? '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">{formatVnd(Number(order.total_amount))}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {(order.status === 'paid' || order.status === 'in_progress') && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'in_progress')}
                            className={`text-sm px-3 py-1 rounded ${order.status === 'in_progress' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Not done
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                          >
                            Done
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
