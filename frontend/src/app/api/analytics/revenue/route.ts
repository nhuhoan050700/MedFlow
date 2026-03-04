import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const PERIODS = ['day', 'week', 'year'] as const;

/** GET - Revenue analytics by day/week/year. Uses paid_orders.amount (or n8n fallback). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupByRaw = searchParams.get('group_by') || searchParams.get('groupBy') || 'day';
    const groupBy = PERIODS.includes(groupByRaw as (typeof PERIODS)[number]) ? groupByRaw : 'day';
    const from = searchParams.get('from') || searchParams.get('from_date') || '';
    const to = searchParams.get('to') || searchParams.get('to_date') || '';

    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl });
      let client;
      try {
        client = await pool.connect();
        const fromDate = from ? from : null;
        const toDate = to ? to : null;
        const q = `
          SELECT
            (date_trunc($1::text, paid_at))::date AS period,
            COALESCE(SUM(amount), 0)::numeric(12,2) AS revenue,
            COUNT(DISTINCT order_id)::int AS order_count
          FROM paid_orders
          WHERE paid_at IS NOT NULL
            AND ($2::date IS NULL OR paid_at::date >= $2)
            AND ($3::date IS NULL OR paid_at::date <= $3)
          GROUP BY (date_trunc($1::text, paid_at))::date
          ORDER BY period
        `;
        const result = await client.query(q, [groupBy, fromDate, toDate]);
        const data = (result.rows || []).map((row) => ({
          period: row.period instanceof Date ? row.period.toISOString().slice(0, 10) : String(row.period),
          revenue: Number(row.revenue) || 0,
          order_count: Number(row.order_count) || 0,
        }));
        return NextResponse.json(
          { success: true, group_by: groupBy, data },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      } finally {
        client?.release();
        await pool.end();
      }
    }

    const n8nBase = (process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '').replace(/\/+$/, '');
    if (!n8nBase) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL or N8N webhook URL required' },
        { status: 500 }
      );
    }

    const params = new URLSearchParams();
    params.set('group_by', groupBy);
    if (from) params.set('from_date', from);
    if (to) params.set('to_date', to);
    const n8nUrl = `${n8nBase}/revenue-analytics?${params.toString()}`;

    const n8nRes = await fetch(n8nUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const data = await n8nRes.json().catch(() => ({}));
    if (!n8nRes.ok) {
      return NextResponse.json(data?.error ? { success: false, error: data.error } : data, {
        status: n8nRes.status,
      });
    }

    const result = data?.data && Array.isArray(data.data)
      ? { success: true, group_by: data.group_by || groupBy, data: data.data }
      : { success: true, group_by: data.group_by || groupBy, data: [] };
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('[analytics/revenue]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
