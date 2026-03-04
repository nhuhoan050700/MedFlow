import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

/** POST - Update paid_orders.state by item id (procedure row). */
export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json(
      { success: false, error: 'DATABASE_URL is not configured' },
      { status: 500 }
    )
  }
  try {
    const body = await request.json()
    const itemId = body?.item_id != null ? Number(body.item_id) : null
    const status = body?.status != null ? String(body.status).trim() : null
    if (itemId == null || !status) {
      return NextResponse.json(
        { success: false, error: 'item_id and status required' },
        { status: 400 }
      )
    }
    const pool = new Pool({ connectionString: databaseUrl })
    const result = await pool.query(
      `UPDATE paid_orders SET state = $1 WHERE id = $2 RETURNING id, order_id, procedure_name, room_number, state`,
      [status, itemId]
    )
    await pool.end()
    const row = result.rows[0]
    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }
    const orderId = Number(row.order_id)
    const payload = {
      order_id: orderId,
      item_id: row.id,
      status: row.state,
      procedure_name: row.procedure_name ?? undefined,
      room_number: row.room_number ?? undefined,
    }
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || ''
    if (frontendUrl) {
      try {
        await fetch(`${frontendUrl.replace(/\/$/, '')}/api/notify-order-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (notifyErr) {
        console.warn('[update-item-status] notify frontend failed', notifyErr)
      }
    }
    return NextResponse.json({
      success: true,
      item: {
        id: row.id,
        order_id: row.order_id,
        procedure_name: row.procedure_name,
        room_number: row.room_number,
        status: row.state,
      },
    })
  } catch (err) {
    console.error('[api/update-item-status]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
