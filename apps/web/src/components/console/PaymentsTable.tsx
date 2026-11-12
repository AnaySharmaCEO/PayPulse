import React, { useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  ICellRendererParams,
  RowClickedEvent
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Order, LensType } from '../../types';
import { formatMoney, normalizeToUsd } from '../../data/mockProducts';
import { getOrderDisplayStatus, formatTimeMMSS } from '../../lib/labels';

ModuleRegistry.registerModules([AllCommunityModule]);

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
  const gridApiRef = useRef<GridApi<Order> | null>(null);

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
      const lats = healed.map(o => o.lat ?? 0).filter(l => l > 0).sort((a, b) => a - b);
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

  const columnDefs = useMemo<ColDef<Order>[]>(() => {
    return [
      {
        headerName: 'Order',
        field: 'id',
        width: 140,
        cellRenderer: (params: ICellRendererParams<Order>) => (
          <span className="mono">{params.value}</span>
        )
      },
      {
        headerName: 'Item',
        field: 'item',
        flex: 1.3,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<Order>) => (
          <span style={{ color: 'var(--tx-2)' }}>{params.value}</span>
        )
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 130,
        headerClass: 'r',
        cellClass: 'mono r',
        cellRenderer: (params: ICellRendererParams<Order>) =>
          params.data ? formatMoney(params.data.amount, params.data.cur) : ''
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 190,
        cellRenderer: (params: ICellRendererParams<Order>) => {
          if (!params.data) return null;
          const { badgeClass, label } = getOrderDisplayStatus(
            params.data.status,
            params.data.status === 'HEALED'
          );
          return (
            <span className={`badge ${badgeClass}`}>
              <i />
              {label}
            </span>
          );
        }
      },
      {
        headerName: 'Confirm by',
        width: 150,
        cellRenderer: (params: ICellRendererParams<Order>) => {
          if (!params.data) return null;
          const c = getSlaCell(params.data);
          return (
            <span className={`mono sla ${c.c}`} data-sla={params.data.id}>
              {c.t}
            </span>
          );
        }
      },
      {
        headerName: 'Actions',
        width: 190,
        headerClass: 'r',
        cellClass: 'r',
        cellRenderer: (params: ICellRendererParams<Order>) => {
          if (!params.data) return null;
          const order = params.data;
          return (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button
                className="btn sm"
                data-act="evidence"
                onClick={e => onOpenEvidence(order.id, e)}
              >
                Evidence
              </button>
              {order.status === 'HEALED' && (
                <button
                  className="btn sm"
                  data-act="diag"
                  onClick={e => onOpenDiagnosis(order.id, e)}
                >
                  Diagnosis
                </button>
              )}
            </div>
          );
        }
      }
    ];
  }, [onOpenEvidence, onOpenDiagnosis]);

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
    <section className="card tbl ag-theme-quartz-dark" style={{ width: '100%' }}>
      {visibleOrders.length === 0 ? (
        <div className="empty">No payments match this view.</div>
      ) : (
        <div style={{ height: Math.min(520, Math.max(220, visibleOrders.length * 54 + 44)) }}>
          <AgGridReact<Order>
            rowData={visibleOrders}
            columnDefs={columnDefs}
            rowHeight={52}
            headerHeight={38}
            animateRows={false}
            rowSelection="single"
            onGridReady={params => {
              gridApiRef.current = params.api;
            }}
            onRowClicked={(event: RowClickedEvent<Order>) => {
              if (event.data?.id) {
                onSelectOrder(event.data.id);
              }
            }}
            getRowClass={params => {
              if (!params.data) return '';
              const classes: string[] = ['tr'];
              if (params.data.id === selectedId) classes.push('sel');
              if (params.data.status === 'BREACHED') classes.push('breach');
              return classes.join(' ');
            }}
          />
        </div>
      )}
    </section>
  );
};
