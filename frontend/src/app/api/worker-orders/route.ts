import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

/** GET - Fetch order items (procedures) with order + user info from Railway database. */
export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json(
      { success: false, error: 'DATABASE_URL is not configured' },
      { status: 500 }
    )
  }

  const statusParam = request.nextUrl.searchParams.get('status')
  const statusFilter =
    statusParam && statusParam !== 'all' ? statusParam : null

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    const query = `
      SELECT po.id, uo.id AS order_id, uo.order_number, po.state AS status,
             uo.payment_status, uo.total_amount, po.paid_at, uo.created_at,
             u.id AS user_id, u.name AS user_name,
             po.id AS item_id, po.procedure_name, po.room_number, po.amount
      FROM unpaid_orders uo
      JOIN users u ON uo.user_id = u.id
      INNER JOIN paid_orders po ON po.order_id = uo.id
      WHERE ($1::text IS NULL OR $1 = 'all' OR po.state = $1)
      ORDER BY uo.created_at DESC, uo.id ASC, po.id ASC
      LIMIT 100
    `
    const result = await pool.query(query, [statusFilter])
    const orders = result.rows.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      order_number: row.order_number,
      status: row.status,
      payment_status: row.payment_status,
      total_amount: row.total_amount,
      paid_at: row.paid_at,
      created_at: row.created_at,
      user_id: row.user_id,
      user_name: row.user_name,
      item_id: row.item_id,
      procedure_name: row.procedure_name,
      room_number: row.room_number,
      amount: row.amount,
    }))
    return NextResponse.json({ success: true, orders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/worker-orders]', err)
    return NextResponse.json(
      { success: false, error: `Database error: ${message}`, orders: [] },
      { status: 502 }
    )
  } finally {
    await pool.end()
  }
}
