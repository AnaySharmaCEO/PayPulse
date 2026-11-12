import React from 'react';
import { Order } from '../../types';

interface SettlementTimelineProps {
  selectedOrder: Order | null;
}

export const SettlementTimeline: React.FC<SettlementTimelineProps> = ({
  selectedOrder: o
}) => {
  if (!o) {
    return (
      <section className="card tl">
        <div className="empty">Select a payment above to view its settlement timeline.</div>
      </section>
    );
  }

  const live = o.dropped && o.status !== 'HEALED';
  const lat = o.dropped
    ? o.lat != null
      ? o.lat
      : Math.max(0, (Date.now() - (o.deadlineAt ?? Date.now())) / 1000)
    : 0;

  const sla = o.sla;
  const end = o.dropped ? sla + lat : Math.min(sla, 3);
  const span = Math.max(sla * 1.12, end + Math.max(4, sla * 0.1));

  const pc = (v: number) => `${((v / span) * 100).toFixed(2)}%`;
  const w = (a: number, b: number) => `${(((b - a) / span) * 100).toFixed(2)}%`;

  const healed = o.status === 'HEALED';
  const fulfilledAt = o.dropped ? (healed ? sla + lat : null) : 2.2;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    label: `${Math.round(span * f)}s`,
    left: `${f * 100}%`
  }));

  return (
    <section className="card tl" id="timeline">
      <h3>
        <span>
          Settlement timeline · <span className="mono">{o.id}</span>
        </span>
        {o.dropped ? (
          healed ? (
            <span className="badge ok">
              <i />
              Gap closed automatically
            </span>
          ) : (
            <span className="badge bad pulse">
              <i />
              Confirmation gap open
            </span>
          )
        ) : (
          <span className="badge ok">
            <i />
            Confirmed on time
          </span>
        )}
      </h3>

      {/* Lane 1: Order created */}
      <div className="lane">
        <div className="lb">Order created</div>
        <div className="track">
          <div className="bar n" style={{ left: 0, width: pc(1.4) }}>
            create
          </div>
        </div>
      </div>

      {/* Lane 2: Confirmation window */}
      <div className="lane">
        <div className="lb">Confirmation window · {sla}s</div>
        <div className="track">
          <div className="bar ok" style={{ left: 0, width: w(0, sla) }}>
            expected within {sla}s
          </div>
        </div>
      </div>

      {/* Lane 3: Delivery gap */}
      <div className="lane">
        <div className="lb">Delivery gap</div>
        <div className="track">
          {o.dropped ? (
            <div
              className="bar bad"
              style={{ left: pc(sla), width: w(sla, sla + Math.max(lat, 0.5)) }}
            >
              confirmation never arrived
            </div>
          ) : (
            <span className="hint" style={{ left: 8 }}>
              none · webhook delivered
            </span>
          )}
        </div>
      </div>

      {/* Lane 4: Reconciler */}
      <div className="lane">
        <div className="lb">Reconciler</div>
        <div className="track">
          {o.dropped && healed ? (
            <>
              <div className="pin" style={{ left: pc(sla + lat) }} />
              <span
                className="pl"
                style={{ right: `calc(100% - ${pc(sla + lat)} + 12px)` }}
              >
                asked PayPal → COMPLETED
              </span>
            </>
          ) : live ? (
            <span className="hint" style={{ left: pc(sla), color: 'var(--warn)' }}>
              {o.status === 'BREACHED'
                ? 'deadline missed…'
                : o.status === 'RECONCILING'
                ? 'asking PayPal…'
                : 'waiting…'}
            </span>
          ) : (
            <span className="hint" style={{ left: 8 }}>
              not needed
            </span>
          )}
        </div>
      </div>

      {/* Lane 5: Fulfilled */}
      <div className="lane">
        <div className="lb">Fulfilled</div>
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

      {/* Ticks Axis */}
      <div className="axis">
        <div />
        <div className="ticks">
          {ticks.map(tick => (
            <span key={tick.label} style={{ left: tick.left }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
