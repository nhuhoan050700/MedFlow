import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET not supported; use POST. Keeps route discoverable and avoids 404 from accidental GET. */
export function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to check in.' },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Default to local n8n when no env is set, so dev works without n8n.cloud
    const n8nBase = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
    const n8nRes = await fetch(
      `${n8nBase}/check-in`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await n8nRes.json().catch(() => ({}));

    // Log so you can debug when check-in fails (check terminal running npm run dev)
    if (!n8nRes.ok || !data?.success) {
      console.error('[check-in] n8n status:', n8nRes.status, 'body:', JSON.stringify(data));
    }

    return NextResponse.json(data, {
      status: n8nRes.status,
    });
  } catch (err) {
    console.error('Proxy error', err);
    return NextResponse.json(
      { error: 'Failed to call check-in webhook' },
      { status: 500 }
    );
  }
}