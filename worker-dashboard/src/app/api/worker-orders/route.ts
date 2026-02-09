import { NextRequest, NextResponse } from 'next/server'

/** GET - Proxy to n8n worker-orders webhook to avoid CORS. */
export async function GET(request: NextRequest) {
  const base = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || ''
  if (!base) {
    return NextResponse.json(
      { success: false, error: 'N8N_WEBHOOK_URL not configured' },
      { status: 500 }
    )
  }
  const status = request.nextUrl.searchParams.get('status')
  const url = status && status !== 'all'
    ? `${base.replace(/\/$/, '')}/worker-orders?status=${encodeURIComponent(status)}`
    : `${base.replace(/\/$/, '')}/worker-orders`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (data && (data as { error?: string }).error) || `n8n returned ${res.status}`
      return NextResponse.json({ success: false, error: msg, orders: [] }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/worker-orders]', err)
    return NextResponse.json(
      { success: false, error: `Cannot reach n8n: ${message}`, orders: [] },
      { status: 502 }
    )
  }
}
