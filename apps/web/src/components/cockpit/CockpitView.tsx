import React from 'react';
import { Order, LensType } from '../../types';
import { FX_RATE } from '../../data/mockProducts';
import { AiLensBar } from './AiLensBar';
import { OrderGrid } from './OrderGrid';
import { CausalTimeline } from './CausalTimeline';

interface CockpitViewProps {
  orders: Order[];
  selectedId: string | null;
  expandedIds: Set<string>;
  lens: LensType;
  slaSeconds: number;
  onSelectOrder: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onToggleLens: (lens: LensType) => void;
  onOpenDoctor: (id: string, e: React.MouseEvent) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  orders,
  selectedId,
  expandedIds,
  lens,
  slaSeconds,
  onSelectOrder,
  onToggleExpand,
  onToggleLens,
  onOpenDoctor
}) => {
  // Calculate KPI metrics
  const healedOrders = orders.filter(o => o.status === 'HEALED');
  const lats = healedOrders.map(o => o.lat ?? 0).sort((a, b) => a - b);
  const medianLatency = lats.length
    ? lats[Math.floor(lats.length / 2)]
    : 0;

  const totalProtectedUsd = healedOrders.reduce((sum, o) => {
    return sum + (o.amount * FX_RATE[o.cur]) / (o.cur === 'JPY' ? 1 : 100);
  }, 0);

  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(totalProtectedUsd);

  const selectedOrder = orders.find(o => o.id === selectedId) || null;

  return (
    <main className="cock">
      <div className="cockhead">
        <h2>Guardian Cockpit</h2>
        <div className="meta">
          <span>
            Environment <span className="badge">SANDBOX</span>
          </span>
          <span>
            Settlement SLA <span className="mono">{slaSeconds}s</span>
          </span>
        </div>
      </div>

      <section className="kpis">
        <div className="card kpi hl">
          <div className="eyebrow">Contracts closed</div>
          <div className="v">{healedOrders.length}</div>
          <div className="s">auto-healed orders</div>
        </div>

        <div className="card kpi hl">
          <div className="eyebrow">Revenue protected</div>
          <div className="v">{formattedRevenue}</div>
          <div className="s">stranded payments recovered</div>
        </div>

        <div className="card kpi">
          <div className="eyebrow">Median detection latency</div>
          <div className="v">{medianLatency}s</div>
          <div className="s">breach → ledger healed</div>
        </div>

        <div className="card kpi">
          <div className="eyebrow">Human interventions</div>
          <div className="v">0</div>
          <div className="s">no one was paged</div>
        </div>
      </section>

      <AiLensBar currentLens={lens} onToggleLens={onToggleLens} />

      <OrderGrid
        orders={orders}
        selectedId={selectedId}
        expandedIds={expandedIds}
        lens={lens}
        onSelectOrder={onSelectOrder}
        onToggleExpand={onToggleExpand}
        onOpenDoctor={onOpenDoctor}
      />

      <CausalTimeline selectedOrder={selectedOrder} />
    </main>
  );
};
