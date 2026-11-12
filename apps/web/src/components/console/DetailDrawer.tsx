import React, { useState } from 'react';
import { Order, Incident } from '../../types';
import { getOrderDisplayStatus } from '../../lib/labels';
import { formatMoney } from '../../data/mockProducts';

interface DetailDrawerProps {
  isOpen: boolean;
  order: Order | null;
  incident?: Incident;
  activeTab: 'evidence' | 'diag';
  onSelectTab: (tab: 'evidence' | 'diag') => void;
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

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  order: o,
  incident: inc,
  activeTab,
  onSelectTab,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  if (!isOpen || !o) return null;

  const { badgeClass, label } = getOrderDisplayStatus(
    o.status,
    o.status === 'HEALED'
  );

  const handleCopy = () => {
    navigator.clipboard?.writeText(GOOD_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkReviewed = () => {
    setReviewed(true);
  };

  const renderPackets = () => {
    const leftLines: { text: string; className?: string }[] =
      o.scenario === 'drop'
        ? [
            { text: 'POST /api/webhooks/paypal' },
            { text: 'x-paypulse-chaos: drop' },
            { text: 'event: PAYMENT.CAPTURE.COMPLETED' },
            { text: 'journal.status: CHAOS_DROPPED', className: 'del' },
            { text: 'body: none (never delivered)', className: 'del' }
          ]
        : o.scenario === 'forge'
        ? [
            { text: 'POST /api/webhooks/paypal' },
            { text: 'signature_verified: false', className: 'del' },
            { text: 'response: 400 SIGNATURE_VERIFICATION_FAILED', className: 'del' },
            { text: 'order state: untouched' }
          ]
        : [
            { text: 'POST /api/webhooks/paypal' },
            { text: 'signature_verified: true' },
            { text: 'event: PAYMENT.CAPTURE.COMPLETED' },
            { text: 'journal.status: PROCESSED' },
            { text: `event_id: WH-${o.cap.slice(4)}A9` }
          ];

    const rightLines: { text: string; className?: string }[] =
      o.status === 'APPROVED'
        ? [{ text: 'not queried · confirmation window still open' }]
        : [
            { text: `GET /v2/checkout/orders/${o.id}` },
            { text: 'status: COMPLETED' },
            { text: `capture: ${o.cap} · COMPLETED` },
            { text: `amount: ${formatMoney(o.amount, o.cur)}` },
            ...(o.dropped
              ? [
                  { text: `event_id: REC_CAPTURE_${o.cap}`, className: 'add' },
                  { text: 'source: RECONCILER', className: 'add' }
                ]
              : [])
          ];

    return (
      <div className="two">
        <div className="pane">
          <h5>
            <span>What reached us</span>
            {o.scenario === 'drop' || o.scenario === 'forge' ? (
              <span className="badge bad">Not accepted</span>
            ) : (
              <span className="badge ok">Verified</span>
            )}
          </h5>
          <pre>
            {leftLines.map((ln, idx) => (
              <span key={idx} className={`d ${ln.className || ''}`}>
                {ln.text}
              </span>
            ))}
          </pre>
        </div>

        <div className="pane">
          <h5>
            <span>What PayPal says</span>
            <span className="badge">Ground truth</span>
          </h5>
          <pre>
            {rightLines.map((ln, idx) => (
              <span key={idx} className={`d ${ln.className || ''}`}>
                {ln.text}
              </span>
            ))}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`scrim ${isOpen ? 'on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`slide ${isOpen ? 'open' : ''}`} aria-label="Payment details">
        <header>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <b id="slTitle">{o.id}</b>
            <span id="slBadge" className={`badge ${badgeClass}`}>
              <i />
              {label}
            </span>
          </div>
          <button className="btn sm" id="closeSlide" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="tabs" id="slTabs">
          <button
            role="tab"
            aria-selected={activeTab === 'evidence'}
            onClick={() => onSelectTab('evidence')}
          >
            Evidence
          </button>
          {inc && (
            <button
              role="tab"
              aria-selected={activeTab === 'diag'}
              onClick={() => onSelectTab('diag')}
            >
              Diagnosis
            </button>
          )}
        </div>

        <div className="body" id="slBody">
          {activeTab === 'evidence' ? (
            <>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  What happened
                </div>
                <ul className="log">
                  {o.events.map((e, idx) => {
                    const elapsed = ((e.at - o.createdAt) / 1000).toFixed(1);
                    return (
                      <li key={idx} className={e.kind}>
                        <span className="t">+{elapsed}s</span>
                        <span className="p" />
                        <span className="x">{e.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Packet inspector
                </div>
                {renderPackets()}
              </div>
            </>
          ) : inc ? (
            inc.cat === 'SIGNATURE_FAILURE' ? (
              <>
                <div>
                  <div className="eyebrow">Root cause</div>
                  <h3 style={{ marginTop: 6 }}>
                    A webhook failed signature verification and was quarantined
                  </h3>
                  <p style={{ color: 'var(--tx-2)', marginTop: 8 }}>
                    The request did not match PayPal’s verification endpoint, so it was
                    rejected before touching the order. The ledger was never modified.
                    No action is needed.
                  </p>
                </div>

                <div className="facts">
                  <div className="fact">
                    <div className="eyebrow">Category</div>
                    <div className="v">SIGNATURE_FAILURE</div>
                  </div>
                  <div className="fact">
                    <div className="eyebrow">Severity</div>
                    <div className="v">HIGH</div>
                  </div>
                  <div className="fact">
                    <div className="eyebrow">Outcome</div>
                    <div className="v">Contained</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="eyebrow">Root cause</div>
                  <h3 style={{ marginTop: 6 }}>
                    The capture webhook never reached us within {o.sla}s
                  </h3>
                  <p style={{ color: 'var(--tx-2)', marginTop: 8 }}>
                    PAYMENT.CAPTURE.COMPLETED was lost in transit. PayPal confirms
                    capture <span className="mono">{o.cap}</span> is COMPLETED. The
                    reconciler fixed the order; this patch moves that recovery into
                    the main checkout path.
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
                    <div className="v">+{o.lat ?? 44}s</div>
                  </div>
                </div>

                {inc.patch ? (
                  <>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 8 }}>
                        Suggested fix · with and without schema grounding
                      </div>
                      <div className="two">
                        <div className="pane">
                          <h5>
                            <span>Without APIMatic</span>
                            <span className="badge bad">4 schema violations</span>
                          </h5>
                          <pre>{BAD_CODE}</pre>
                        </div>
                        <div className="pane">
                          <h5>
                            <span>With APIMatic</span>
                            <span className="badge ok">0 type errors</span>
                          </h5>
                          <pre>{GOOD_CODE}</pre>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn primary" id="copyPatch" onClick={handleCopy}>
                        {copied ? 'Copied' : 'Copy fix'}
                      </button>
                      <button
                        className="btn"
                        id="markReviewed"
                        disabled={reviewed}
                        onClick={handleMarkReviewed}
                      >
                        {reviewed ? 'Reviewed ✓' : 'Mark as reviewed'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="sk">
                    <i />
                    <i />
                    <i />
                    <span style={{ marginLeft: 8 }}>Gemini is writing a fix…</span>
                  </div>
                )}
              </>
            )
          ) : null}
        </div>
      </aside>
    </>
  );
};
