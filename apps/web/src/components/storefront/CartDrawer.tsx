import React from 'react';
import { CartItem, Order } from '../../types';
import { calcTotal, formatMoney } from '../../data/mockProducts';
import { ShoeIllustration } from './StorefrontView';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem | null;
  checkoutState: 'idle' | 'processing' | 'confirmed';
  activeOrder: Order | null;
  waitSeconds: number;
  onInitiatePayPal: () => void;
  onDoneOrder: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  checkoutState,
  activeOrder,
  waitSeconds,
  onInitiatePayPal,
  onDoneOrder
}) => {
  return (
    <>
      {isOpen && <div className="scrim" onClick={onClose} />}
      <aside className={`drawer ${isOpen ? 'open' : ''}`} aria-label="Bag">
        <header>
          <span>Bag</span>
          <button className="btn sm" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="body">
          {checkoutState === 'processing' && (
            <div className="status">
              <div className="spin" />
              <h2>Processing payment with gateway…</h2>
              <p>
                Your PayPal payment was approved. Waiting for the merchant to
                confirm your order.
              </p>
              <span className="mono" style={{ color: 'var(--tx-3)' }}>
                waiting <span>{waitSeconds}s</span>
              </span>
            </div>
          )}

          {checkoutState === 'confirmed' && activeOrder && (
            <div className="status">
              <div className="check">✓</div>
              <h2>Order confirmed &amp; fulfillment dispatched</h2>
              <p>Tracking #{activeOrder.id}</p>

              <div className="kv">
                <div>
                  <span>Item</span>
                  <span>{activeOrder.item}</span>
                </div>
                <div>
                  <span>Paid</span>
                  <span className="mono">
                    {formatMoney(activeOrder.amount, activeOrder.cur)}
                  </span>
                </div>
                <div>
                  <span>Capture</span>
                  <span className="mono">{activeOrder.cap}</span>
                </div>
              </div>

              {activeOrder.status === 'HEALED' && (
                <span className="badge ok">
                  Recovered autonomously · +{activeOrder.lat ?? 44}s · 0 humans
                </span>
              )}

              <button className="btn" onClick={onDoneOrder}>
                Back to store
              </button>
            </div>
          )}

          {checkoutState === 'idle' && !cart && (
            <div className="status">
              <p>Your bag is empty.</p>
            </div>
          )}

          {checkoutState === 'idle' && cart && (
            <>
              <div className="item">
                <div className="art">
                  <ShoeIllustration fill={cart.prod.fill} />
                </div>
                <div>
                  <b>
                    {cart.prod.brand} {cart.prod.name}
                  </b>
                  <div style={{ color: 'var(--tx-3)' }}>
                    US {cart.size} · {cart.prod.origin}
                  </div>
                </div>
              </div>

              <div>
                <div className="line">
                  <span>Item</span>
                  <span className="mono">
                    {formatMoney(cart.prod.base, cart.prod.cur)}
                  </span>
                </div>
                <div className="line">
                  <span>International shipping</span>
                  <span className="mono">
                    {formatMoney(cart.prod.ship, cart.prod.cur)}
                  </span>
                </div>
                <div className="line">
                  <span>Import duty</span>
                  <span className="mono">
                    {formatMoney(cart.prod.duty, cart.prod.cur)}
                  </span>
                </div>
              </div>

              <div className="line total">
                <span>Total</span>
                <span className="mono">
                  {formatMoney(calcTotal(cart.prod), cart.prod.cur)}
                </span>
              </div>

              <button className="ppbtn" onClick={onInitiatePayPal}>
                PayPal
              </button>
              <div className="origin" style={{ justifyContent: 'center' }}>
                Secure checkout · PayPal Sandbox
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
