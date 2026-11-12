import React from 'react';
import { Order } from '../../types';
import { normalizeToUsd } from '../../data/mockProducts';

interface KpiRowProps {
  orders: Order[];
}

export const KpiRow: React.FC<KpiRowProps> = ({ orders }) => {
  const healedOrders = orders.filter(o => o.status === 'HEALED');
  const latencies = healedOrders
    .map(o => o.lat ?? 0)
    .filter(l => l > 0)
    .sort((a, b) => a - b);

  const medianLatency = latencies.length
    ? latencies[Math.floor(latencies.length / 2)]
    : 0;

  const totalRecoveredUsd = healedOrders.reduce(
    (acc, o) => acc + normalizeToUsd(o.amount, o.cur),
    0
  );

  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(totalRecoveredUsd);

  const cards = [
    {
      title: 'Orders recovered',
      value: healedOrders.length,
      subtitle: 'confirmations that never arrived, fixed automatically',
      highlight: true
    },
    {
      title: 'Revenue recovered',
      value: formattedRevenue,
      subtitle: 'paid orders that would have stalled',
      highlight: true
    },
    {
      title: 'Median time to recover',
      value: `${medianLatency}s`,
      subtitle: 'from missed deadline to order fixed',
      highlight: false
    },
    {
      title: 'Pages sent to humans',
      value: '0',
      subtitle: 'every recovery was autonomous',
      highlight: false
    }
  ];

  return (
    <section className="kpis">
      {cards.map(c => (
        <div key={c.title} className={`card kpi ${c.highlight ? 'hl' : ''}`}>
          <div className="eyebrow">{c.title}</div>
          <div className="v">{c.value}</div>
          <div className="s">{c.subtitle}</div>
        </div>
      ))}
    </section>
  );
};
