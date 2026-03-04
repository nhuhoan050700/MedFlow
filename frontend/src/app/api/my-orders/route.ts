import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

/** GET - Fetch paid orders (procedure rows) for a user from paid_orders + unpaid_orders. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id') ?? searchParams.get('userId')
    const uid = user_id ? parseInt(String(user_id), 10) : NaN

    if (!uid || uid < 1) {
      return NextResponse.json(
        { success: false, error: 'user_id is required and must be a positive number' },
        { status: 400 }
      )
    }

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL is not configured' },
        { status: 500 }
      )
    }

    const pool = new Pool({ connectionString: databaseUrl })
    const result = await pool.query(
      `SELECT uo.id, uo.order_number, uo.user_id, uo.payment_status, uo.payment_intent_id, uo.total_amount, uo.paid_at, uo.created_at,
              u.name AS user_name,
              po.id AS item_id, po.procedure_id, po.procedure_name, po.room_number, po.amount, COALESCE(po.state, 'pending') AS status
       FROM unpaid_orders uo
       LEFT JOIN users u ON uo.user_id = u.id
       INNER JOIN paid_orders po ON po.order_id = uo.id
       WHERE uo.user_id = $1
       ORDER BY uo.created_at DESC, po.id ASC
       LIMIT 100`,
      [uid]
    )
    await pool.end()

    const orders = result.rows.map((row) => ({
      id: row.id,
      order_number: row.order_number,
      user_id: row.user_id,
      payment_status: row.payment_status,
      payment_intent_id: row.payment_intent_id,
      total_amount: row.total_amount,
      paid_at: row.paid_at,
      created_at: row.created_at,
      user_name: row.user_name,
      item_id: row.item_id,
      procedure_id: row.procedure_id,
      procedure_name: row.procedure_name,
      room_number: row.room_number,
      amount: row.amount,
      status: row.status,
    }))

    return NextResponse.json({ success: true, orders }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    console.error('[my-orders] error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
