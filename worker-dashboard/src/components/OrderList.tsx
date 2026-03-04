'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

/** One row = one order_item (procedure) with order + user info */
interface OrderItem {
  id: number
  order_id: number
  order_number?: string
  procedure_name: string | null
  room_number: string | null
  user_name: string
  user_id?: number
  status: string
}

export default function OrderList() {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const localStatusUpdates = useRef<Record<number, string>>({})

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setError(null)
      setLoading(true)
      const url = '/api/worker-orders'
      const response = await fetch(url, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Failed to load orders')
        setItems([])
        return
      }
      if (data.success && Array.isArray(data.orders)) {
        const rows = data.orders.map((o: Record<string, unknown>) => {
          const id = Number(o.item_id ?? o.id ?? 0)
          const serverStatus = String(o.status ?? 'pending')
          // Prefer server status so refresh shows persisted state; keep local only for optimistic UI until next fetch
          const status = localStatusUpdates.current[id] ?? serverStatus
          if (serverStatus === localStatusUpdates.current[id]) {
            delete localStatusUpdates.current[id]
          }
          return {
            id,
            order_id: Number(o.order_id ?? o.id ?? 0),
            order_number: o.order_number != null ? String(o.order_number) : undefined,
            procedure_name: o.procedure_name != null ? String(o.procedure_name) : null,
            room_number: o.room_number != null ? String(o.room_number) : null,
            user_name: o.user_name != null ? String(o.user_name) : '',
            user_id: o.user_id != null ? Number(o.user_id) : undefined,
            status,
          }
        })
        setItems(rows)
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Cannot reach server. Is the worker dashboard running?')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const updateItemStatus = async (itemId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/update-item-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, status: newStatus }),
      })

      const data = await response.json()
      if (data.success) {
        localStatusUpdates.current[itemId] = newStatus
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
        )
        setFilter(newStatus)
      } else {
        alert(data?.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('Error updating order:', err)
      alert('Failed to update order status')
    }
  }

  const matchesFilter = (status: string) => {
    if (filter === 'all') return true
    if (filter === 'pending') return ['pending', 'paid', 'assigned'].includes(status)
    if (filter === 'in_progress') return status === 'in_progress'
    if (filter === 'completed') return status === 'completed'
    return true
  }

  const filteredItems = useMemo(() => {
    let list = items.filter((row) => matchesFilter(row.status))
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((row) => {
        const matchOrderId = String(row.order_id).includes(q)
        const matchUsername = (row.user_name ?? '').toLowerCase().includes(q)
        return matchOrderId || matchUsername
      })
    }
    return list
  }, [items, search, filter])

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
        <p className="mt-2 text-sm text-gray-500">Set DATABASE_URL in .env.local (Railway Postgres). Orders are loaded from the database.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold">Order items</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or username..."
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              In progress
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Id</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Order ID</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Procedure name</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Room number</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Username</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  {search.trim() ? 'No matching order items' : 'No order items found'}
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm tabular-nums">{row.id}</td>
                  <td className="p-3 text-sm font-semibold tabular-nums">{row.order_id}</td>
                  <td className="p-3 text-sm">{row.procedure_name ?? '—'}</td>
                  <td className="p-3">
                    <span className="font-semibold text-green-600 text-sm">
                      {row.room_number ?? '—'}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{row.user_name || '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateItemStatus(row.id, 'pending')}
                        className={`text-sm px-3 py-1.5 rounded font-medium ${['pending', 'paid', 'assigned'].includes(row.status) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateItemStatus(row.id, 'in_progress')}
                        className={`text-sm px-3 py-1.5 rounded font-medium ${row.status === 'in_progress' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        In progress
                      </button>
                      <button
                        onClick={() => updateItemStatus(row.id, 'completed')}
                        className={`text-sm px-3 py-1.5 rounded font-medium ${row.status === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        Done
                      </button>
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
