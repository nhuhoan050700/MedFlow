import { NextRequest, NextResponse } from 'next/server'

/** POST - Proxy to n8n update-status webhook to avoid CORS. */
export async function POST(request: NextRequest) {
  const base = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || ''
  if (!base) {
    return NextResponse.json(
      { success: false, error: 'N8N_WEBHOOK_URL not configured' },
      { status: 500 }
    )
  }
  const url = `${base.replace(/\/$/, '')}/update-status`
  try {
    const body = await request.json()
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(data || { success: false }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/update-status]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to reach n8n' },
      { status: 502 }
    )
  }
}
