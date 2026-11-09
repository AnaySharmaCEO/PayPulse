import React, { useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  ICellRendererParams,
  RowClickedEvent
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Order, LensType, Currency } from '../../types';
import { formatMoney, FX_RATE } from '../../data/mockProducts';

ModuleRegistry.registerModules([AllCommunityModule]);

interface OrderGridProps {
  orders: Order[];
  selectedId: string | null;
  expandedIds: Set<string>;
  lens: LensType;
  onSelectOrder: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onOpenDoctor: (id: string, e: React.MouseEvent) => void;
}

export const OrderGrid: React.FC<OrderGridProps> = ({
  orders,
  selectedId,
  expandedIds,
  lens,
  onSelectOrder,
  onToggleExpand,
  onOpenDoctor
}) => {
  const gridApiRef = useRef<GridApi<Order> | null>(null);

  const mmss = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, '0') +
    ':' +
    String(s % 60).padStart(2, '0');

  const remaining = (o: Order) =>
    o.deadlineAt ? Math.max(0, Math.ceil((o.deadlineAt - Date.now()) / 1000)) : 0;

  const getSlaCell = (o: Order) => {
    if (o.status === 'APPROVED') {
      const r = remaining(o);
      return { t: mmss(r), c: r < 15 ? 'warn' : 'ok' };
    }
    if (o.status === 'BREACHED' || o.status === 'RECONCILING') {
      return { t: '00:00', c: 'bad' };
    }
    if (o.status === 'HEALED') {
      return { t: `closed +${o.lat ?? 44}s`, c: 'mute' };
    }
    return { t: 'fulfilled', c: 'mute' };
  };

  const getBadge = (o: Order) => {
    switch (o.status) {
      case 'APPROVED':
        return <span className="badge">AWAITING SETTLEMENT</span>;
      case 'COMPLETED':
        return <span className="badge ok">COMPLETED</span>;
      case 'BREACHED':
        return <span className="badge bad pulse">BREACHED</span>;
      case 'RECONCILING':
        return <span className="badge warn pulse">RECONCILING</span>;
      case 'HEALED':
        return <span className="badge ok">HEALED</span>;
    }
  };

  const renderDetail = (o: Order) => {
    return (
      <div className="detail">
        <div className="pane">
          <h5>
            <span>Inbound packet · PayPulse edge</span>
            {o.dropped ? (
              <span className="badge bad">DROPPED</span>
            ) : (
              <span className="badge ok">VERIFIED</span>
            )}
          </h5>
          <pre>
            {o.dropped ? (
              <>
                <span className="d">POST /api/webhooks/paypal</span>
                <span className="d">x-paypulse-chaos: drop</span>
                <span className="d">event: PAYMENT.CAPTURE.COMPLETED</span>
                <span className="d del">journal.status: CHAOS_DROPPED</span>
                <span className="d del">body: ∅  (never delivered)</span>
              </>
            ) : (
              <>
                <span className="d">POST /api/webhooks/paypal</span>
                <span className="d">signature_verified: true</span>
                <span className="d">event: PAYMENT.CAPTURE.COMPLETED</span>
                <span className="d">journal.status: PROCESSED</span>
                <span className="d">event_id: WH-7QX20A9</span>
              </>
            )}
          </pre>
        </div>

        <div className="pane">
          <h5>
            <span>PayPal Orders v2 · ground truth</span>
            <span className="badge">LEDGER</span>
          </h5>
          <pre>
            {o.status === 'APPROVED' ? (
              <span className="d">not queried — SLA still running</span>
            ) : (
              <>
                <span className="d">GET /v2/checkout/orders/{o.id}</span>
                <span className="d">status: COMPLETED</span>
                <span className="d">capture: {o.cap} · COMPLETED</span>
                <span className="d">amount: {formatMoney(o.amount, o.cur)}</span>
                {o.dropped && (
                  <>
                    <span className="d add">event_id: REC_CAPTURE_{o.cap}</span>
                    <span className="d add">source: RECONCILER</span>
                  </>
                )}
              </>
            )}
          </pre>
        </div>
      </div>
    );
  };

  // AG Grid Column Definitions
  const colDefs: ColDef<Order>[] = [
    {
      headerName: 'Order',
      field: 'id',
      width: 150,
      cellRenderer: (params: ICellRendererParams<Order>) => {
        if (!params.data) return null;
        const isExp = expandedIds.has(params.data.id);
        return (
          <div className="c mono">
            <span className="chev">{isExp ? '▾' : '▸'}</span>
            {params.data.id}
          </div>
        );
      }
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 130,
      cellClass: 'mono r',
      valueFormatter: params => {
        if (!params.data) return '';
        return formatMoney(params.data.amount, params.data.cur);
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 150,
      cellRenderer: (params: ICellRendererParams<Order>) => {
        if (!params.data) return null;
        return <div className="c">{getBadge(params.data)}</div>;
      }
    },
    {
      headerName: 'SLA countdown',
      field: 'sla',
      width: 150,
      cellRenderer: (params: ICellRendererParams<Order>) => {
        if (!params.data) return null;
        const sla = getSlaCell(params.data);
        return <div className={`c mono sla ${sla.c}`}>{sla.t}</div>;
      }
    },
    {
      headerName: 'Prevention',
      width: 160,
      cellRenderer: (params: ICellRendererParams<Order>) => {
        if (!params.data) return null;
        return (
          <div className="c">
            {params.data.status === 'HEALED' ? (
              params.data.patch ? (
                <span className="badge ok pulse">PREVENTION READY</span>
              ) : (
                <span className="badge warn">DIAGNOSING</span>
              )
            ) : (
              <span style={{ color: 'var(--tx-3)' }}>—</span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Actions',
      flex: 1,
      cellRenderer: (params: ICellRendererParams<Order>) => {
        if (!params.data) return null;
        const o = params.data;
        return (
          <div className="c act">
            <button
              className="btn sm"
              onClick={e => onToggleExpand(o.id, e)}
            >
              Inspect packet
            </button>
            {o.status === 'HEALED' && (
              <button
                className="btn sm"
                disabled={!o.patch}
                onClick={e => onOpenDoctor(o.id, e)}
              >
                AI Doctor
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // Pivot view rendering
  if (lens === 'pivot') {
    const byCur: Record<Currency, Order[]> = { USD: [], EUR: [], JPY: [] };
    orders
      .filter(o => o.status === 'HEALED' || o.status === 'COMPLETED')
      .forEach(o => {
        if (!byCur[o.cur]) byCur[o.cur] = [];
        byCur[o.cur].push(o);
      });

    const currencies = Object.keys(byCur) as Currency[];

    return (
      <section className="card gridwrap">
        <table className="pivot">
          <thead>
            <tr>
              <th>Currency</th>
              <th className="r">Settled</th>
              <th className="r">Healed</th>
              <th className="r">Recovered value</th>
              <th className="r">Median recovery</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(c => {
              const list = byCur[c];
              const healed = list.filter(o => o.status === 'HEALED');
              const lats = healed.map(o => o.lat ?? 0).sort((a, b) => a - b);
              const median = lats.length ? lats[Math.floor(lats.length / 2)] + 's' : '—';
              const sum = healed.reduce((acc, o) => acc + o.amount, 0);

              return (
                <tr key={c}>
                  <td className="mono">{c}</td>
                  <td className="mono r">{list.length}</td>
                  <td className="mono r">{healed.length}</td>
                  <td className="mono r">{formatMoney(sum, c)}</td>
                  <td className="mono r">{median}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    );
  }

  // Filter for high-risk lens
  const visibleOrders = lens === 'risk'
    ? orders.filter(o => {
        const usdValue = (o.amount * FX_RATE[o.cur]) / (o.cur === 'JPY' ? 1 : 100);
        return (
          usdValue >= 500 ||
          o.status === 'BREACHED' ||
          o.status === 'RECONCILING' ||
          (o.status === 'APPROVED' && remaining(o) < 15)
        );
      })
    : orders;

  const onGridReady = (params: GridReadyEvent<Order>) => {
    gridApiRef.current = params.api;
  };

  const handleRowClicked = (event: RowClickedEvent<Order>) => {
    if (event.data) {
      onSelectOrder(event.data.id);
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedId);
  const isSelectedExpanded = selectedId && expandedIds.has(selectedId);

  return (
    <section className="card gridwrap">
      <div
        className="ag-theme-quartz-dark"
        style={{
          width: '100%',
          height: `${Math.max(200, visibleOrders.length * 48 + 48)}px`,
          backgroundColor: 'transparent'
        }}
      >
        <AgGridReact<Order>
          rowData={visibleOrders}
          columnDefs={colDefs}
          onGridReady={onGridReady}
          onRowClicked={handleRowClicked}
          rowHeight={46}
          headerHeight={36}
          suppressCellFocus={true}
          animateRows={false}
          domLayout="autoHeight"
          rowClassRules={{
            'breach': params => params.data?.status === 'BREACHED',
            'sel': params => params.data?.id === selectedId
          }}
        />
      </div>

      {isSelectedExpanded && selectedOrder && renderDetail(selectedOrder)}
    </section>
  );
};
