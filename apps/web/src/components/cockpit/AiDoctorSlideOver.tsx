import React, { useState } from 'react';
import { Order } from '../../types';

interface AiDoctorSlideOverProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

const BAD_CODE = `const order = await ordersController
  .fetchOrder({ v1_order_id: orderId });
const t = order.purchase_units[0]
  .amount.breakdown.total;
if (order.state === 'completed')
  fulfill(order.transactions[0].id);`;

const GOOD_CODE = `import { OrdersController } from '@paypal/paypal-server-sdk';

export async function reconcileCapture(
  orders: OrdersController, id: string) {
  const { result } = await orders.getOrder({ id });
  const cap = result.purchaseUnits?.[0]
    ?.payments?.captures?.[0];
  if (cap?.status === 'COMPLETED')
    return { eventId: \`REC_CAPTURE_\${cap.id}\` };
  return null;
}`;

export const AiDoctorSlideOver: React.FC<AiDoctorSlideOverProps> = ({
  isOpen,
  order: o,
  onClose
}) => {
  const [patchApplied, setPatchApplied] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !o) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(GOOD_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className={`slide ${isOpen ? 'open' : ''}`} aria-label="AI Doctor">
        <header>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <b>AI Doctor</b>
            <span className="badge">INC · OVERDUE_CAPTURE · {o.id}</span>
          </div>
          <button className="btn sm" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="body">
          <div>
            <div className="eyebrow">Root cause</div>
            <h3 style={{ marginTop: 6 }}>
              Capture webhook never reached the edge within {o.sla}s
            </h3>
            <p style={{ color: 'var(--tx-2)', marginTop: 6 }}>
              PAYMENT.CAPTURE.COMPLETED was dropped in transit. PayPal Orders v2
              confirms capture <span className="mono">{o.cap}</span> is
              COMPLETED. Ledger healed by the reconciler; this patch makes
              recovery part of the main checkout path.
            </p>
          </div>

          <div className="facts">
            <div className="fact">
              <div className="eyebrow">Category</div>
              <div className="v">OVERDUE_CAPTURE</div>
            </div>
            <div className="fact">
              <div className="eyebrow">Confidence</div>
              <div className="v">0.97</div>
            </div>
            <div className="fact">
              <div className="eyebrow">Recovered in</div>
              <div className="v">{o.lat ?? 44}s</div>
            </div>
          </div>

          {o.patch ? (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Generated patch · grounded vs ungrounded
              </div>
              <div className="ab">
                <div className="pane">
                  <h5>
                    <span>Without APIMatic</span>
                    <span className="badge bad">✗ 4 SCHEMA VIOLATIONS</span>
                  </h5>
                  <pre>{BAD_CODE}</pre>
                </div>
                <div className="pane">
                  <h5>
                    <span>With APIMatic grounding</span>
                    <span className="badge ok">✓ 0 TYPE ERRORS</span>
                  </h5>
                  <pre>{GOOD_CODE}</pre>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  className="btn primary"
                  disabled={patchApplied}
                  onClick={() => setPatchApplied(true)}
                >
                  {patchApplied ? 'Patch applied ✓' : 'Apply patch'}
                </button>
                <button className="btn" onClick={handleCopy}>
                  {copied ? 'Copied ✓' : 'Copy patch'}
                </button>
              </div>
            </div>
          ) : (
            <div className="sk">
              <i />
              <i />
              <i />
              <span style={{ marginLeft: 8 }}>Generating patch…</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
