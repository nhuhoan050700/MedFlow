import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { notifyOrderUpdate } from '@/lib/order-events'

export const dynamic = 'force-dynamic'

/**
 * POST - Notify connected SSE clients that an order item's status changed.
 * Body: { order_id, item_id, status, procedure_name?, room_number? } or { user_id, ... }.
 * If user_id is omitted, it is looked up from unpaid_orders.
 * Used by worker-dashboard after updating item status so the frontend user's UI updates in real time.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const orderId = body?.order_id != null ? Number(body.order_id) : null
    const itemId = body?.item_id != null ? Number(body.item_id) : null
    const status = body?.status != null ? String(body.status).trim() : null
    let userId = body?.user_id != null ? Number(body.user_id) : null
    const procedureName = body?.procedure_name ?? null
    const roomNumber = body?.room_number ?? null

    if (orderId == null || itemId == null || !status) {
      return NextResponse.json(
        { success: false, error: 'order_id, item_id and status required' },
        { status: 400 }
      )
    }

    if (userId == null || userId < 1) {
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        return NextResponse.json(
          { success: false, error: 'DATABASE_URL not configured and user_id not provided' },
          { status: 500 }
        )
      }
      const pool = new Pool({ connectionString: databaseUrl })
      const res = await pool.query(
        'SELECT user_id FROM unpaid_orders WHERE id = $1',
        [orderId]
      )
      await pool.end()
      const row = res.rows[0]
      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }
      userId = Number(row.user_id)
    }

    notifyOrderUpdate({
      user_id: userId,
      item_id: itemId,
      order_id: orderId,
      status,
      procedure_name: procedureName,
      room_number: roomNumber,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/notify-order-update]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to notify' },
      { status: 500 }
    )
  }
}
