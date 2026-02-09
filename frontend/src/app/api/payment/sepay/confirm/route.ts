import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST - Confirm SePay payment (e.g. when user lands on success page).
 * Marks order(s) as paid by order_number so DB is updated even if IPN was delayed.
 * Body: { order_number: string } (single or comma-separated).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderNumber = typeof body.order_number === 'string' ? body.order_number.trim() : '';
    if (!orderNumber) {
      return NextResponse.json({ success: false, error: 'order_number is required' }, { status: 400 });
    }

    const n8nBase = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
    if (!n8nBase) {
      return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const payload = {
      order_invoice_number: orderNumber,
      transaction_id: 'success-page',
    };

    const n8nRes = await fetch(`${n8nBase}/sepay-ipn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await n8nRes.json().catch(() => ({}));
    if (!n8nRes.ok) {
      return NextResponse.json({ success: false, error: data?.message || 'Failed to confirm payment' }, { status: 500 });
    }

    // Forward n8n response so caller can see rows_updated (0 = DB not updated, e.g. wrong DB or order_number)
    const rowsUpdated = data?.rows_updated ?? (data?.success ? 1 : 0);
    return NextResponse.json({
      success: data?.success === true && rowsUpdated > 0,
      rows_updated: rowsUpdated,
      message: data?.message,
    }, { status: 200 });
  } catch (err) {
    console.error('[sepay/confirm]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
