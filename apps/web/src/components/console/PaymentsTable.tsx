import React, { useMemo } from 'react';
import { Order, LensType } from '../../types';
import { formatMoney, normalizeToUsd } from '../../data/mockProducts';
import { formatTimeMMSS } from '../../lib/labels';

interface PaymentsTableProps {
  orders: Order[];
  selectedId: string | null;
  lens: LensType;
  onSelectOrder: (id: string) => void;
  onOpenEvidence: (id: string, e: React.MouseEvent) => void;
  onOpenDiagnosis: (id: string, e: React.MouseEvent) => void;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  orders,
  selectedId,
  lens,
  onSelectOrder,
  onOpenEvidence,
  onOpenDiagnosis
}) => {
  const remainingSeconds = (o: Order) =>
    o.deadlineAt ? Math.max(0, Math.ceil((o.deadlineAt - Date.now()) / 1000)) : 0;

  const getSlaCell = (o: Order) => {
    if (o.status === 'APPROVED') {
      const r = remainingSeconds(o);
      return { t: formatTimeMMSS(r), c: r < 15 ? 'warn' : 'ok' };
    }
    if (o.status === 'BREACHED' || o.status === 'RECONCILING') {
      return { t: '00:00', c: 'bad' };
    }
    if (o.status === 'HEALED') {
      return { t: `closed +${o.lat ?? 44}s`, c: 'mute' };
    }
    return { t: 'on time', c: 'mute' };
  };

  const getBadge = (o: Order) => {
    switch (o.status) {
      case 'HEALED':
        return (
          <span className="badge ok">
            <i />
            Recovered
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="badge ok">
            <i />
            Paid
          </span>
        );
      case 'BREACHED':
        return (
          <span className="badge bad pulse">
            <i />
            Confirmation overdue
          </span>
        );
      case 'RECONCILING':
        return (
          <span className="badge warn pulse">
            <i />
            Recovering
          </span>
        );
      case 'APPROVED':
      default:
        return (
          <span className="badge">
            <i />
            Awaiting confirmation
          </span>
        );
    }
  };

  // Filter for 'Orders at risk' lens
  const visibleOrders = useMemo(() => {
    if (lens === 'risk') {
      return orders.filter(
        o =>
          normalizeToUsd(o.amount, o.cur) >= 500 ||
          ['BREACHED', 'RECONCILING'].includes(o.status) ||
          (o.status === 'APPROVED' && remainingSeconds(o) < 15)
      );
    }
    return orders;
  }, [orders, lens]);

  // Pivot data for 'Recovered by currency' lens
  const pivotData = useMemo(() => {
    if (lens !== 'pivot') return null;
    const byCur: Record<string, Order[]> = {};
    orders
      .filter(o => ['HEALED', 'COMPLETED'].includes(o.status))
      .forEach(o => {
        (byCur[o.cur] = byCur[o.cur] || []).push(o);
      });

    return Object.keys(byCur).map(cur => {
      const curOrders = byCur[cur];
      const healed = curOrders.filter(o => o.status === 'HEALED');
      const lats = healed
        .map(o => o.lat ?? 0)
        .filter(l => l > 0)
        .sort((a, b) => a - b);
      const totalAmount = healed.reduce((sum, o) => sum + o.amount, 0);

      return {
        currency: cur,
        paidCount: curOrders.length,
        healedCount: healed.length,
        valueRecovered: formatMoney(totalAmount, cur as any),
        medianRecovery: lats.length ? `${lats[Math.floor(lats.length / 2)]}s` : '—'
      };
    });
  }, [orders, lens]);

  if (lens === 'pivot') {
    return (
      <section className="card tbl">
        <table className="pivot">
          <thead>
            <tr>
              <th>Currency</th>
              <th className="r">Paid</th>
              <th className="r">Recovered</th>
              <th className="r">Value recovered</th>
              <th className="r">Median recovery</th>
            </tr>
          </thead>
          <tbody>
            {pivotData && pivotData.length > 0 ? (
              pivotData.map(p => (
                <tr key={p.currency}>
                  <td className="mono">{p.currency}</td>
                  <td className="mono r">{p.paidCount}</td>
                  <td className="mono r">{p.healedCount}</td>
                  <td className="mono r">{p.valueRecovered}</td>
                  <td className="mono r">{p.medianRecovery}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty">
                  Nothing recovered yet. Arm the simulator and check out.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <section className="card tbl">
      <div className="th">
        <div>Order</div>
        <div>Item</div>
        <div className="r">Amount</div>
        <div>Status</div>
        <div>Confirm by</div>
        <div className="r">Actions</div>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="empty">No payments match this view.</div>
      ) : (
        visibleOrders.map(o => {
          const sla = getSlaCell(o);
          const isSelected = selectedId === o.id;
          const isBreached = o.status === 'BREACHED';

          return (
            <div
              key={o.id}
              className={`tr ${isSelected ? 'sel' : ''} ${isBreached ? 'breach' : ''}`}
              data-id={o.id}
              onClick={() => onSelectOrder(o.id)}
            >
              <div className="c mono">{o.id}</div>
              <div className="c" style={{ color: 'var(--tx-2)' }}>
                {o.item}
              </div>
              <div className="c mono r">{formatMoney(o.amount, o.cur)}</div>
              <div className="c">{getBadge(o)}</div>
              <div className={`c mono sla ${sla.c}`} data-sla={o.id}>
                {sla.t}
              </div>
              <div className="c r" style={{ gap: 6 }}>
                <button
                  className="btn sm"
                  data-act="evidence"
                  data-id={o.id}
                  onClick={e => {
                    e.stopPropagation();
                    onOpenEvidence(o.id, e);
                  }}
                >
                  Evidence
                </button>
                {o.status === 'HEALED' && (
                  <button
                    className="btn sm"
                    data-act="diag"
                    data-id={o.id}
                    onClick={e => {
                      e.stopPropagation();
                      onOpenDiagnosis(o.id, e);
                    }}
                  >
                    Diagnosis
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
};
