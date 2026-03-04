/**
 * In-memory store for SSE order-update subscriptions.
 * Maps user_id -> set of send functions. Used by GET /api/order-events and POST /api/notify-order-update.
 */

export type OrderUpdatePayload = {
  user_id: number
  item_id: number
  order_id: number
  status: string
  procedure_name?: string | null
  room_number?: string | null
}

type SendFn = (data: OrderUpdatePayload) => void

const subscriptions = new Map<number, Set<SendFn>>()

export function subscribe(userId: number, send: SendFn): () => void {
  if (!subscriptions.has(userId)) {
    subscriptions.set(userId, new Set())
  }
  subscriptions.get(userId)!.add(send)
  return () => {
    const set = subscriptions.get(userId)
    if (set) {
      set.delete(send)
      if (set.size === 0) subscriptions.delete(userId)
    }
  }
}

export function notifyOrderUpdate(payload: OrderUpdatePayload): void {
  const set = subscriptions.get(payload.user_id)
  if (!set) return
  set.forEach((send) => {
    try {
      send(payload)
    } catch (e) {
      console.error('[order-events] send error', e)
    }
  })
}
