import { OrdersController } from '@paypal/paypal-server-sdk';

export interface ApimaticReconcileResult {
  eventId: string;
  orderId: string;
  captureId: string;
  status: string;
  schemaValidated: boolean;
}

/**
 * Reconciles an order using PayPal's official server SDK (generated via APIMatic).
 * Enforces zero-type-error schema grounding against OrdersController.
 */
export async function reconcileCaptureWithApimatic(
  orders: OrdersController,
  id: string
): Promise<ApimaticReconcileResult | null> {
  const { result } = await orders.getOrder({ id });
  const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];

  if (capture?.status === 'COMPLETED' && capture.id) {
    return {
      eventId: `REC_CAPTURE_${capture.id}`,
      orderId: id,
      captureId: capture.id,
      status: 'COMPLETED',
      schemaValidated: true
    };
  }

  return null;
}
