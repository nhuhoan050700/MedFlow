import { NextRequest } from 'next/server'
import { subscribe, type OrderUpdatePayload } from '@/lib/order-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET - SSE stream for order/item status updates for a user. Query: user_id= number */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userIdParam = searchParams.get('user_id') ?? searchParams.get('userId')
  const userId = userIdParam ? parseInt(String(userIdParam), 10) : NaN
  if (!userId || userId < 1) {
    return new Response('user_id required', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (data: OrderUpdatePayload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (_) {
          // client may have disconnected
        }
      }
      const unsubscribe = subscribe(userId, send)
      // Keep-alive every 25s so the connection isn't dropped
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch (_) {
          clearInterval(keepAlive)
        }
      }, 25000)
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        unsubscribe()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Connection: 'keep-alive',
    },
  })
}
