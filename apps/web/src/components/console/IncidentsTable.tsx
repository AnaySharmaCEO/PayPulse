import React from 'react';
import { Incident } from '../../types';

interface IncidentsTableProps {
  incidents: Incident[];
  onOpenDiagnosis: (orderId: string) => void;
}

export const IncidentsTable: React.FC<IncidentsTableProps> = ({
  incidents,
  onOpenDiagnosis
}) => {
  return (
    <section className="card tbl">
      <div className="th" style={{ gridTemplateColumns: '110px 1.2fr 120px 150px 1fr 120px' }}>
        <div>Incident</div>
        <div>Category</div>
        <div>Severity</div>
        <div>Status</div>
        <div>Order</div>
        <div className="r">Open</div>
      </div>

      {incidents.length === 0 ? (
        <div className="empty">No incidents. Quiet is good.</div>
      ) : (
        incidents.map(inc => (
          <div
            key={inc.id}
            className="tr"
            style={{ gridTemplateColumns: '110px 1.2fr 120px 150px 1fr 120px' }}
            onClick={() => onOpenDiagnosis(inc.order)}
          >
            <div className="c mono">{inc.id}</div>
            <div className="c mono" style={{ color: 'var(--tx-2)' }}>
              {inc.cat}
            </div>
            <div className="c">
              <span className={`badge ${inc.sev === 'HIGH' ? 'bad' : 'warn'}`}>
                {inc.sev}
              </span>
            </div>
            <div className="c">
              <span className={`badge ${inc.status === 'HEALED' ? 'ok' : 'warn pulse'}`}>
                <i />
                {inc.status === 'HEALED' ? 'Contained' : 'Diagnosing'}
              </span>
            </div>
            <div className="c mono">{inc.order}</div>
            <div className="c r">
              <button
                className="btn sm"
                data-act="diag"
                onClick={e => {
                  e.stopPropagation();
                  onOpenDiagnosis(inc.order);
                }}
              >
                Diagnosis
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
};
