import React from 'react';
import { Realm } from '../../types';

interface DemoBarProps {
  realm: Realm;
  onSelectRealm: (realm: Realm) => void;
  slaSeconds: number;
  onResetDemo: () => void;
}

export const DemoBar: React.FC<DemoBarProps> = ({
  realm,
  onSelectRealm,
  slaSeconds,
  onResetDemo
}) => {
  return (
    <div className="demo">
      <div className="lbl">
        <span className="dot ping" />
        PayPulse live demo
      </div>

      <div className="seg" role="tablist" aria-label="Switch view">
        <button
          role="tab"
          data-view="shop"
          aria-selected={realm === 'shop'}
          onClick={() => onSelectRealm('shop')}
        >
          Customer view
        </button>
        <button
          role="tab"
          data-view="console"
          aria-selected={realm === 'console'}
          onClick={() => onSelectRealm('console')}
        >
          Merchant console
        </button>
      </div>

      <div className="sp" />

      <span style={{ color: '#6c7177' }}>
        Confirmation window <span className="mono">{slaSeconds}s</span>
      </span>

      <button className="btn" onClick={onResetDemo}>
        Reset demo
      </button>
    </div>
  );
};
