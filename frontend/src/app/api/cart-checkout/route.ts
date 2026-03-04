import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** POST - Create one order with multiple procedures. Proxies to n8n cart-checkout webhook. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const n8nBase = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
    if (!n8nBase) {
      return NextResponse.json(
        { success: false, error: 'N8N webhook URL not configured' },
        { status: 500 }
      );
    }

    const n8nRes = await fetch(`${n8nBase}/cart-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await n8nRes.json().catch(() => ({}));
    if (!n8nRes.ok || !data?.success) {
      console.error('[cart-checkout] n8n status:', n8nRes.status, 'body:', JSON.stringify(data));
      return NextResponse.json(data?.error ? { success: false, error: data.error } : data, {
        status: n8nRes.status,
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[cart-checkout] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
