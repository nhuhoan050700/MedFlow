import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Default to local n8n when no env is set, so dev works without n8n.cloud
const N8N_BASE = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

/** Ensure procedures is always an array (n8n or proxy may return object) */
function ensureProceduresArray(data: { success?: boolean; procedures?: unknown; error?: string }): unknown[] {
  const raw = data?.procedures;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const len = typeof o.length === 'number' ? o.length : 0;
    if (len > 0) {
      return Array.from({ length: len }, (_, i) => o[i]).filter((v) => v != null && typeof v === 'object' && 'id' in (v as object));
    }
    if (o.id != null) return [o];
    return (Object.values(o) as unknown[]).filter((v) => v != null && typeof v === 'object' && 'id' in (v as object));
  }
  return [];
}

/** GET - Fetch available procedures from n8n (proxied to avoid CORS) */
export async function GET() {
  try {
    const n8nRes = await fetch(`${N8N_BASE}/procedures`);
    const body = await n8nRes.text();
    const data: { success?: boolean; procedures?: unknown; error?: string } = body ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : {};

    if (!n8nRes.ok) {
      console.error('[procedures] n8n status:', n8nRes.status, 'body:', JSON.stringify(data));
    }

    const procedures = ensureProceduresArray(data);
    const out = { ...data, procedures };

    return NextResponse.json(out, {
      status: n8nRes.status,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    console.error('[procedures] Proxy error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch procedures. Is the Procedure Selection workflow active in n8n?' },
      { status: 500 }
    );
  }
}
