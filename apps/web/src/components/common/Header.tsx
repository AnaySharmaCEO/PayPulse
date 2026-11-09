import React from 'react';
import { Realm } from '../../types';

interface HeaderProps {
  realm: Realm;
  onSetRealm: (realm: Realm) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  realm,
  onSetRealm,
  cartCount,
  onOpenCart
}) => {
  return (
    <header className="top">
      <div className="brand">
        <i />
        <span>{realm === 'store' ? 'PULSE COMMERCE' : 'PAYPULSE'}</span>
      </div>

      <div className="tabs" role="tablist">
        <button
          className="tab"
          role="tab"
          data-realm="store"
          aria-selected={realm === 'store'}
          onClick={() => onSetRealm('store')}
        >
          Storefront
        </button>
        <button
          className="tab"
          role="tab"
          data-realm="cockpit"
          aria-selected={realm === 'cockpit'}
          onClick={() => onSetRealm('cockpit')}
        >
          Guardian Cockpit
        </button>
      </div>

      <div className="sp" />

      <div className="live">
        <span className="dot ping" />
        <span>Realtime connected</span>
      </div>

      {realm === 'store' && (
        <button className="cartbtn" onClick={onOpenCart} aria-label="View bag">
          Bag <b>{cartCount}</b>
        </button>
      )}
    </header>
  );
};
