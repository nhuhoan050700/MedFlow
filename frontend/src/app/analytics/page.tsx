'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type RevenuePoint = {
  period: string
  revenue: number
  order_count: number
  label?: string
}

const GROUP_OPTIONS = [
  { value: 'day', label: 'By day' },
  { value: 'week', label: 'By week' },
  { value: 'year', label: 'By year' },
] as const

function formatPeriod(periodStr: string, groupBy: string): string {
  try {
    const d = new Date(periodStr)
    if (groupBy === 'year') return d.getFullYear().toString()
    if (groupBy === 'week') return `Wk ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  } catch {
    return periodStr
  }
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' ₫'
}

export default function AnalyticsPage() {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'year'>('day')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [data, setData] = useState<RevenuePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('group_by', groupBy)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const res = await fetch(`/api/analytics/revenue?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || 'Failed to load revenue data')
        setData([])
        return
      }
      const raw = Array.isArray(json.data) ? json.data : []
      const withLabels: RevenuePoint[] = raw.map((r: { period: string; revenue: number; order_count: number }) => ({
        ...r,
        revenue: Number(r.revenue) || 0,
        order_count: Number(r.order_count) || 0,
        label: formatPeriod(r.period, json.group_by || groupBy),
      }))
      setData(withLabels)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [groupBy, fromDate, toDate])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0)
  const totalOrders = data.reduce((sum, p) => sum + p.order_count, 0)

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[var(--app-border)] px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-lg text-[var(--app-text-secondary)] hover:bg-gray-100 hover:text-[var(--app-text)]"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-[var(--app-text)]">Revenue analytics</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-8 space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-2xl border border-[var(--app-border)] shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">Group by</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGroupBy(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    groupBy === opt.value
                      ? 'bg-[var(--app-primary)] text-white'
                      : 'bg-gray-100 text-[var(--app-text)] hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-white text-[var(--app-text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-white text-[var(--app-text)]"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--app-error-bg)] border border-red-200 text-[var(--app-error)] px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Summary */}
        {!error && data.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-[var(--app-border)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--app-text-secondary)] font-medium">Total revenue</p>
              <p className="text-xl font-bold text-[var(--app-text)] mt-1">{formatVnd(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--app-border)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--app-text-secondary)] font-medium">Orders</p>
              <p className="text-xl font-bold text-[var(--app-text)] mt-1">{totalOrders}</p>
            </div>
          </div>
        )}

        {/* Line chart */}
        <div className="bg-white rounded-2xl border border-[var(--app-border)] shadow-sm p-4">
          <h2 className="text-sm font-semibold text-[var(--app-text)] mb-4">Revenue over time</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-[var(--app-text-secondary)]">Loading chart…</div>
          ) : data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-[var(--app-text-secondary)]">
              No data for the selected period.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--app-text-secondary)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}K` : String(v))}
                    tick={{ fontSize: 11, fill: 'var(--app-text-secondary)' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatVnd(value), 'Revenue']}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--app-border)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--app-primary)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--app-primary)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
