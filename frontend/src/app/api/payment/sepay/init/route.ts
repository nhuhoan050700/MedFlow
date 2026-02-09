import { NextResponse } from 'next/server';
import { initCheckout } from '@/lib/sepay';

export const dynamic = 'force-dynamic';

/**
 * POST - Initialize SePay checkout for VietQR bank transfer.
 * Body: { order_id, order_number, amount, currency?, description? }
 * or:   { order_ids, order_number (first), amount, currency?, description? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderNumber = body.order_number as string;
    const amountFromClient = Number(body.amount);
    const currency = (body.currency as string) || process.env.SEPAY_CURRENCY || 'VND';
    const description = (body.description as string) || undefined;
    const orderIds = body.order_ids as number[] | undefined;

    if (!orderNumber || amountFromClient == null || amountFromClient <= 0) {
      return NextResponse.json(
        { success: false, error: 'order_number and amount are required' },
        { status: 400 }
      );
    }

    // When currency is VND, amount from frontend is already in VND. When USD, convert to VND using rate.
    const rate = Number(process.env.SEPAY_USD_TO_VND_RATE || 25000);
    const amount =
      currency === 'VND'
        ? Math.round(amountFromClient)
        : Math.round(amountFromClient * rate);

    // Use NEXT_PUBLIC_APP_URL in production so your link stays the same (payment redirects, SePay callbacks).
    // Set it in your host's env (e.g. Vercel: NEXT_PUBLIC_APP_URL=https://yourdomain.com).
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'http://localhost:7030';

    const checkout = initCheckout({
      orderInvoiceNumber: orderNumber,
      orderAmount: Math.round(amount),
      currency,
      orderDescription: description || `Order ${orderNumber}`,
      successUrl: `${baseUrl}/payment/success?order=${encodeURIComponent(orderNumber)}`,
      errorUrl: `${baseUrl}/payment/error?order=${encodeURIComponent(orderNumber)}`,
      cancelUrl: `${baseUrl}/payment/cancel?order=${encodeURIComponent(orderNumber)}`,
      paymentMethod: 'BANK_TRANSFER',
      ...(orderIds && orderIds.length > 0 && { customData: JSON.stringify({ order_ids: orderIds, order_numbers: orderNumber.split(',') }) }),
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.checkoutUrl,
      formFields: checkout.formFields,
    });
  } catch (err) {
    console.error('[sepay/init]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to initialize checkout',
      },
      { status: 500 }
    );
  }
}
