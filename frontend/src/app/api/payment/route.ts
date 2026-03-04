import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** POST - Submit payment. Proxies to n8n local-bank-payment (card/Stripe removed). */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.payment_method !== 'bank') {
      return NextResponse.json(
        { success: false, error: 'Only bank payment is supported. Use SePay (VietQR) or Manual bank.' },
        { status: 400 }
      );
    }

    const n8nBase = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
    if (!n8nBase) {
      return NextResponse.json(
        { success: false, error: 'N8N webhook URL not configured' },
        { status: 500 }
      );
    }

    const payload =
      Array.isArray(body.order_ids) && body.order_ids.length > 0
        ? { order_ids: body.order_ids, reference: body.reference || '' }
        : { order_id: body.order_id, reference: body.reference || '' };

    const n8nRes = await fetch(`${n8nBase.replace(/\/+$/, '')}/local-bank-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await n8nRes.json().catch(() => ({}));

    if (!n8nRes.ok) {
      console.error('[payment] n8n status:', n8nRes.status, 'body:', JSON.stringify(data));
    }

    return NextResponse.json(data, { status: n8nRes.status });
  } catch (err) {
    console.error('[payment] proxy error', err);
    return NextResponse.json(
      { success: false, error: 'Payment request failed' },
      { status: 500 }
    );
  }
}
