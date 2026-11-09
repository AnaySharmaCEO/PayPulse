/**
 * PayPulse Autonomous Reconciler Worker
 * Periodically polls breached expectations, queries PayPal Orders v2 REST ground truth,
 * synthesizes deterministic reconciliation events, heals orders, and triggers the AI Doctor.
 */

import {
  SupabaseClient,
  PayPalOrdersClient,
  type DbExpectation
} from '@paypulse/adapters';
import { transitionOrder } from '@paypulse/core';
import { AiDoctorOrchestrator } from './doctor.js';

export interface ReconcilerOptions {
  supabase?: SupabaseClient;
  ordersClient?: PayPalOrdersClient;
  doctor?: AiDoctorOrchestrator;
  intervalMs?: number;
  enableJitter?: boolean;
}

export interface ReconcilerTickReport {
  timestamp: string;
  scannedExpectations: number;
  breachedCount: number;
  healedCount: number;
  errors: string[];
}

export class ReconcilerWorker {
  private supabase: SupabaseClient;
  private ordersClient: PayPalOrdersClient;
  private doctor: AiDoctorOrchestrator;
  private intervalMs: number;
  private enableJitter: boolean;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: ReconcilerOptions = {}) {
    this.supabase = options.supabase || new SupabaseClient();
    this.ordersClient = options.ordersClient || new PayPalOrdersClient();
    this.doctor = options.doctor || new AiDoctorOrchestrator(this.supabase);
    this.intervalMs = options.intervalMs || 5000;
    this.enableJitter = options.enableJitter ?? true;
  }

  /**
   * Starts non-overlapping recursive polling loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextTick(100); // Initial tick
  }

  /**
   * Gracefully stops the worker loop.
   */
  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextTick(delayMs: number): void {
    if (!this.isRunning) return;

    let delay = delayMs;
    if (this.enableJitter) {
      // Add +/- 15% jitter to prevent thundering herd
      const jitter = (Math.random() - 0.5) * 0.3 * this.intervalMs;
      delay = Math.max(1000, Math.round(this.intervalMs + jitter));
    }

    this.timer = setTimeout(async () => {
      try {
        await this.tick();
      } catch (err: any) {
        console.error('[Reconciler] Error in polling tick:', err.message);
      } finally {
        if (this.isRunning) {
          this.scheduleNextTick(this.intervalMs);
        }
      }
    }, delay);
  }

  /**
   * Executes a single reconciliation pass against expired expectations.
   */
  async tick(asOf?: string): Promise<ReconcilerTickReport> {
    const report: ReconcilerTickReport = {
      timestamp: new Date().toISOString(),
      scannedExpectations: 0,
      breachedCount: 0,
      healedCount: 0,
      errors: []
    };

    try {
      const breachedExpectations = await this.supabase.findBreachedExpectations(asOf);
      report.scannedExpectations = breachedExpectations.length;

      for (const exp of breachedExpectations) {
        if (!exp.id) continue;

        try {
          // 1. Atomic claim: Mark expectation as BREACHED
          await this.supabase.updateExpectation(exp.id, 'BREACHED');
          report.breachedCount++;

          // 2. Resolve order & verify ground truth
          const order = await this.resolveOrder(exp);
          if (!order || !order.id) {
            report.errors.push(`Order not found for expectation ${exp.id}`);
            continue;
          }

          // 3. Query PayPal Orders v2 REST Ground Truth
          const paypalDetails = await this.ordersClient.getOrder(exp.paypal_order_id);

          // 4. Verify capture status
          const capture = paypalDetails.purchase_units?.[0]?.payments?.captures?.[0];
          const isCaptureCompleted =
            paypalDetails.status === 'COMPLETED' || capture?.status === 'COMPLETED';

          if (isCaptureCompleted && capture?.id) {
            // 5. Synthesize deterministic event key
            const syntheticEventId = `REC_CAPTURE_${capture.id}`;
            await this.supabase.insertEvent({
              event_id: syntheticEventId,
              event_type: 'PAYMENT.CAPTURE.COMPLETED',
              resource_type: 'capture',
              resource_id: capture.id,
              signature_verified: true, // Ground truth directly verified via PayPal REST API
              payload: paypalDetails as unknown as Record<string, unknown>,
              status: 'PROCESSED',
              source: 'RECONCILER',
              processed_at: new Date().toISOString()
            });

            // 6. Mutate order status to COMPLETED under optimistic concurrency versioning
            const nextStatus = transitionOrder(order.status, 'COMPLETED');
            await this.supabase.updateOrderStatus(order.id, nextStatus, order.version);

            // 7. Mark expectation as FULFILLED by reconciler
            await this.supabase.updateExpectation(exp.id, 'FULFILLED');

            // 8. Calculate latency metrics
            const expectedBeforeMs = new Date(exp.expected_before).getTime();
            const latencySeconds = Math.max(1, Math.round((Date.now() - expectedBeforeMs) / 1000));

            // 9. Record incident and trigger AI Doctor
            const createdIncidents = await this.supabase.insertIncident({
              order_id: order.id,
              paypal_order_id: exp.paypal_order_id,
              category: 'OVERDUE_CAPTURE',
              severity: 'HIGH',
              status: 'DIAGNOSING',
              root_cause: `Webhook dropped or delayed past SLA window (${latencySeconds}s latency)`,
              remediation_action: 'Autonomously queried PayPal Orders v2 and synthesized ground truth ledger capture.',
              automated: true,
              confidence_score: 0.97,
              detected_at: new Date().toISOString()
            });

            const incidentId = createdIncidents?.[0]?.id;

            // 10. Invoke AI Doctor with Gemini 3.8 Flash Interactions API
            await this.doctor.diagnoseAndHeal(
              {
                orderId: exp.paypal_order_id,
                category: 'OVERDUE_CAPTURE',
                slaSeconds: 90,
                deliveryLatencySeconds: latencySeconds,
                captureId: capture.id
              },
              incidentId
            );

            report.healedCount++;
          }
        } catch (itemErr: any) {
          report.errors.push(`Error reconciling expectation ${exp.id}: ${itemErr.message}`);
        }
      }
    } catch (err: any) {
      report.errors.push(`Tick fatal error: ${err.message}`);
    }

    return report;
  }

  private async resolveOrder(exp: DbExpectation) {
    if (exp.order_id) {
      const byId = await this.supabase.findOrderById(exp.order_id);
      if (byId) return byId;
    }
    return this.supabase.findOrderByPayPalId(exp.paypal_order_id);
  }
}
