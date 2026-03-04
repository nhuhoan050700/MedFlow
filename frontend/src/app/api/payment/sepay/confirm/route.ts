import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

/**
 * POST - Confirm SePay payment (e.g. when user lands on success page).
 * Marks order as paid in DB directly so it works even if n8n IPN/parameters fail.
 * Body: { order_number: string } (single order number, e.g. 20260223-0001).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const orderNumber = typeof body.order_number === 'string' ? body.order_number.trim() : ''
    if (!orderNumber) {
      return NextResponse.json({ success: false, error: 'order_number is required' }, { status: 400 })
    }

    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl })
      let client
      try {
        client = await pool.connect()
        const upd = await client.query(
          `UPDATE unpaid_orders
           SET payment_status = 'paid', paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP)
           WHERE order_number = $1 AND payment_status != 'paid'
           RETURNING id, paid_at, pending_procedures`,
          [orderNumber]
        )
        if (upd.rows.length === 0) {
          return NextResponse.json({
            success: true,
            rows_updated: 0,
            message: 'Order not found or already paid',
          })
        }
        const row = upd.rows[0]
        const orderId = row.id
        const paidAt = row.paid_at || new Date()
        let procs: Array<{ id?: number; name?: string; procedure_name?: string; room?: string; room_number?: string; price?: number }> = []
        try {
          procs = Array.isArray(row.pending_procedures) ? row.pending_procedures : []
        } catch (_) {}
        for (const p of procs) {
          await client.query(
            `INSERT INTO paid_orders (order_id, procedure_id, procedure_name, room_number, amount, paid_at, state)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [
              orderId,
              p.id ?? null,
              p.name ?? p.procedure_name ?? 'Procedure',
              String(p.room ?? p.room_number ?? ''),
              Number(p.price) ?? 0,
              paidAt,
            ]
          )
        }
        return NextResponse.json({
          success: true,
          rows_updated: 1,
          message: 'Order marked as paid',
        })
      } catch (err) {
        console.error('[sepay/confirm] DB error:', err)
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
      } finally {
        client?.release()
        await pool.end()
      }
    }

    const n8nBase = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || ''
    if (!n8nBase) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL or N8N webhook required' }, { status: 500 })
    }
    const payload = { order_invoice_number: orderNumber, transaction_id: 'success-page' }
    const n8nRes = await fetch(`${n8nBase}/sepay-ipn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await n8nRes.json().catch(() => ({}))
    const rowsUpdated = data?.rows_updated ?? (data?.success ? 1 : 0)
    return NextResponse.json({
      success: data?.success === true && rowsUpdated > 0,
      rows_updated: rowsUpdated,
      message: data?.message,
    })
  } catch (err) {
    console.error('[sepay/confirm]', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
