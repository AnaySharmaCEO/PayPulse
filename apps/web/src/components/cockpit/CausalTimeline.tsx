import React from 'react';
import { Order } from '../../types';

interface CausalTimelineProps {
  selectedOrder: Order | null;
}

export const CausalTimeline: React.FC<CausalTimelineProps> = ({
  selectedOrder: o
}) => {
  if (!o) {
    return (
      <section className="card tl">
        <div className="empty">Select an order above to view its causal timeline</div>
      </section>
    );
  }

  const live = o.deadlineAt && o.dropped && o.status !== 'HEALED';
  const lat = o.dropped
    ? (o.lat != null
        ? o.lat
        : Math.max(0, (Date.now() - (o.deadlineAt ?? Date.now())) / 1000))
    : 0;

  const sla = o.sla;
  const end = o.dropped ? sla + lat : Math.min(sla, 3);
  const span = Math.max(sla * 1.12, end + Math.max(4, sla * 0.1));

  const pc = (v: number) => `${((v / span) * 100).toFixed(2)}%`;
  const w = (a: number, b: number) => `${(((b - a) / span) * 100).toFixed(2)}%`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    label: `${Math.round(span * f)}s`,
    left: `${f * 100}%`
  }));

  const healed = o.status === 'HEALED';
  const fulfilledAt = o.dropped ? (healed ? sla + lat : null) : 2.2;

  return (
    <section className="card tl">
      <h3>
        <span>
          Causal timeline · <span className="mono">{o.id}</span>
        </span>
        {o.dropped ? (
          healed ? (
            <span className="badge ok">GAP CLOSED AUTONOMOUSLY</span>
          ) : (
            <span className="badge bad pulse">DELIVERY GAP OPEN</span>
          )
        ) : (
          <span className="badge ok">WEBHOOK ON TIME</span>
        )}
      </h3>

      {/* Lane 1: Order created */}
      <div className="lane">
        <div className="lbl">Order created</div>
        <div className="track">
          <div className="bar neutral" style={{ left: 0, width: pc(1.4) }}>
            create
          </div>
        </div>
      </div>

      {/* Lane 2: Settlement window */}
      <div className="lane">
        <div className="lbl">Settlement window · SLA {sla}s</div>
        <div className="track">
          <div className="bar ok" style={{ left: 0, width: w(0, sla) }}>
            expected before {sla}s
          </div>
        </div>
      </div>

      {/* Lane 3: Delivery gap */}
      <div className="lane">
        <div className="lbl">Delivery gap</div>
        <div className="track">
          {o.dropped ? (
            <div
              className="bar bad"
              style={{
                left: pc(sla),
                width: w(sla, sla + Math.max(lat, 0.5))
              }}
            >
              BREACH: webhook never arrived
            </div>
          ) : (
            <span
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                color: 'var(--tx-3)',
                font: '11px var(--mono)'
              }}
            >
              none — webhook delivered
            </span>
          )}
        </div>
      </div>

      {/* Lane 4: Reconciler */}
      <div className="lane">
        <div className="lbl">Reconciler</div>
        <div className="track">
          {o.dropped && healed ? (
            <>
              <div className="pin" style={{ left: pc(sla + lat) }} />
              <span
                className="pinlbl"
                style={{ right: `calc(100% - ${pc(sla + lat)} + 10px)` }}
              >
                GET /orders/{'{id}'} → COMPLETED
              </span>
            </>
          ) : o.dropped && live ? (
            <span
              style={{
                position: 'absolute',
                top: 8,
                left: pc(sla),
                color: 'var(--warn)',
                font: '11px var(--mono)'
              }}
            >
              {o.status === 'BREACHED'
                ? 'breach detected…'
                : 'querying PayPal…'}
            </span>
          ) : (
            <span
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                color: 'var(--tx-3)',
                font: '11px var(--mono)'
              }}
            >
              not needed
            </span>
          )}
        </div>
      </div>

      {/* Lane 5: Fulfilled */}
      <div className="lane">
        <div className="lbl">Fulfilled</div>
        <div className="track">
          {fulfilledAt != null && (
            <div
              className="bar ok"
              style={{
                left: pc(fulfilledAt),
                width: w(fulfilledAt, Math.min(span, fulfilledAt + span * 0.14))
              }}
            >
              fulfilled
            </div>
          )}
        </div>
      </div>

      {/* Time axis */}
      <div className="axis">
        <div />
        <div className="ticks">
          {ticks.map((t, idx) => (
            <span key={idx} style={{ left: t.left }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
