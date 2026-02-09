import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET - Fetch paid orders for a user. Proxies to n8n my-orders webhook. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id') ?? searchParams.get('userId');
    const uid = user_id ? parseInt(String(user_id), 10) : NaN;

    if (!uid || uid < 1) {
      return NextResponse.json(
        { success: false, error: 'user_id is required and must be a positive number' },
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

    const n8nRes = await fetch(`${n8nBase}/my-orders?user_id=${uid}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await n8nRes.json().catch(() => ({}));
    if (!n8nRes.ok) {
      console.error('[my-orders] n8n status:', n8nRes.status, 'body:', JSON.stringify(data));
      return NextResponse.json(data?.error ? { success: false, error: data.error } : data, {
        status: n8nRes.status,
      });
    }

    const orders = Array.isArray(data.orders) ? data.orders : [];
    return NextResponse.json({ success: true, orders });
  } catch (err) {
    console.error('[my-orders] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
