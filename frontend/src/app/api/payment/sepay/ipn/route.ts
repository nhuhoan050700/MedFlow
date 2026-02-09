import { NextResponse } from 'next/server';
import { parseIpnPayload } from '@/lib/sepay';

export const dynamic = 'force-dynamic';

/**
 * POST - SePay IPN (Instant Payment Notification) webhook.
 * SePay calls this when a payment is completed. We forward to n8n to update orders.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[sepay/ipn] Received IPN:', JSON.stringify({ notification_type: (body as { notification_type?: string })?.notification_type, order_invoice: (body as { order?: { order_invoice_number?: string } })?.order?.order_invoice_number }));

    const payload = parseIpnPayload(body);

    if (!payload) {
      console.error('[sepay/ipn] Invalid payload');
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    if (payload.notification_type !== 'ORDER_PAID') {
      console.log('[sepay/ipn] Ignored notification_type:', payload.notification_type);
      return NextResponse.json({ success: true, message: 'Ignored' }, { status: 200 });
    }

    const invoiceNumber = payload.order?.order_invoice_number;
    if (!invoiceNumber) {
      console.error('[sepay/ipn] Missing order_invoice_number, payload:', JSON.stringify(payload).slice(0, 500));
      return NextResponse.json({ success: false, error: 'Missing order_invoice_number' }, { status: 400 });
    }

    const n8nBase = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
    if (!n8nBase) {
      console.error('[sepay/ipn] N8N webhook URL not configured');
      return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const forwardPayload = {
      order_invoice_number: invoiceNumber,
      order_status: payload.order?.order_status,
      transaction_id: payload.transaction?.transaction_id,
      amount: payload.order?.order_amount,
      currency: payload.order?.order_currency,
      raw: payload,
    };
    console.log('[sepay/ipn] Forwarding to n8n:', n8nBase + '/sepay-ipn', 'invoice:', invoiceNumber);

    // Forward to n8n sepay-ipn workflow
    const n8nRes = await fetch(`${n8nBase}/sepay-ipn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardPayload),
    });

    const data = await n8nRes.json().catch(() => ({}));

    if (!n8nRes.ok) {
      console.error('[sepay/ipn] n8n error:', n8nRes.status, data);
      return NextResponse.json({ success: false, error: 'Processing failed' }, { status: 500 });
    }

    console.log('[sepay/ipn] Success, n8n response:', data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[sepay/ipn]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
