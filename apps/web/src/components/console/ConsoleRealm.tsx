import React from 'react';
import { ConsolePage, Order, Incident, LensType } from '../../types';
import { KpiRow } from './KpiRow';
import { AskPayPulse } from './AskPayPulse';
import { PaymentsTable } from './PaymentsTable';
import { SettlementTimeline } from './SettlementTimeline';
import { IncidentsTable } from './IncidentsTable';

interface ConsoleRealmProps {
  page: ConsolePage;
  orders: Order[];
  incidents: Incident[];
  selectedId: string | null;
  lens: LensType;
  slaSeconds: number;
  onNavigatePage: (page: ConsolePage) => void;
  onSelectOrder: (id: string) => void;
  onSelectLens: (lens: LensType) => void;
  onOpenEvidence: (id: string, e: React.MouseEvent) => void;
  onOpenDiagnosis: (id: string, e?: React.MouseEvent) => void;
}

export const ConsoleRealm: React.FC<ConsoleRealmProps> = ({
  page,
  orders,
  incidents,
  selectedId,
  lens,
  slaSeconds,
  onNavigatePage,
  onSelectOrder,
  onSelectLens,
  onOpenEvidence,
  onOpenDiagnosis
}) => {
  const selectedOrder = orders.find(o => o.id === selectedId) || null;

  const titles: Record<ConsolePage, string> = {
    overview: 'Overview',
    payments: 'Payments',
    incidents: 'Incidents'
  };

  return (
    <div id="console" className="cshell">
      {/* Sidebar */}
      <aside className="side">
        <div className="brand">
          <i />
          PayPulse
        </div>

        <button
          className="nv"
          data-cp="overview"
          aria-current={page === 'overview' ? 'page' : 'false'}
          onClick={() => onNavigatePage('overview')}
        >
          Overview
        </button>

        <button
          className="nv"
          data-cp="payments"
          aria-current={page === 'payments' ? 'page' : 'false'}
          onClick={() => onNavigatePage('payments')}
        >
          Payments <span className="badge" id="navPay">{orders.length}</span>
        </button>

        <button
          className="nv"
          data-cp="incidents"
          aria-current={page === 'incidents' ? 'page' : 'false'}
          onClick={() => onNavigatePage('incidents')}
        >
          Incidents <span className="badge" id="navInc">{incidents.length}</span>
        </button>

        <div className="foot2">
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Environment
          </div>
          <span className="badge">Sandbox</span>
        </div>
      </aside>

      {/* Main Console View */}
      <main className="cmain" id="cmain">
        {/* Header */}
        <div className="chead">
          <h1>{titles[page]}</h1>
          <div className="meta">
            <span className="badge">Sandbox</span>
            <span>
              Confirmation window <span className="mono">{slaSeconds}s</span>
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="dot ping" />
              Realtime
            </span>
          </div>
        </div>

        {/* Content depending on page */}
        {page === 'overview' ? (
          <>
            <KpiRow orders={orders} />
            <AskPayPulse
              currentLens={lens}
              onSelectLens={onSelectLens}
              onOpenLatestIncident={() => {
                const latest = incidents[0];
                if (latest) {
                  onSelectOrder(latest.order);
                  onOpenDiagnosis(latest.order);
                }
              }}
            />
            <PaymentsTable
              orders={orders}
              selectedId={selectedId}
              lens={lens}
              onSelectOrder={onSelectOrder}
              onOpenEvidence={onOpenEvidence}
              onOpenDiagnosis={onOpenDiagnosis}
            />
            <SettlementTimeline selectedOrder={selectedOrder} />
          </>
        ) : page === 'payments' ? (
          <>
            <AskPayPulse
              currentLens={lens}
              onSelectLens={onSelectLens}
              onOpenLatestIncident={() => {
                const latest = incidents[0];
                if (latest) {
                  onSelectOrder(latest.order);
                  onOpenDiagnosis(latest.order);
                }
              }}
            />
            <PaymentsTable
              orders={orders}
              selectedId={selectedId}
              lens={lens}
              onSelectOrder={onSelectOrder}
              onOpenEvidence={onOpenEvidence}
              onOpenDiagnosis={onOpenDiagnosis}
            />
          </>
        ) : (
          <IncidentsTable
            incidents={incidents}
            onOpenDiagnosis={onOpenDiagnosis}
          />
        )}
      </main>
    </div>
  );
};
