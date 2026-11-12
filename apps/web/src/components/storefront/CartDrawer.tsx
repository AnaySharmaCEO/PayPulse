import React from 'react';
import { CartItem, Order } from '../../types';
import { calcTotal, formatMoney } from '../../data/mockProducts';

interface CartDrawerProps {
  isOpen: boolean;
  cart: CartItem | null;
  checkoutState: 'idle' | 'processing' | 'confirmed';
  currentOrder: Order | null;
  elapsedSeconds: number;
  onClose: () => void;
  onPayWithPayPal: () => void;
  onContinueShopping: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  cart,
  checkoutState,
  currentOrder,
  elapsedSeconds,
  onClose,
  onPayWithPayPal,
  onContinueShopping
}) => {
  const renderShoeThumb = (fill: string, shape: number = 0) => {
    const up = shape === 1
      ? 'M10 66c4-8 22-10 40-16l18-8c10-4 18 0 28 3l50 10c22 5 38 8 38 20v7H10z'
      : 'M10 70c0-10 18-14 34-22l22-12c8-4 20 6 32 9l50 8c20 3 40 10 40 22v7H10z';

    return (
      <svg viewBox="0 0 220 110" fill="none" aria-hidden="true">
        <path d={up} fill={fill} stroke="#00000022" />
        <rect x="10" y="80" width="198" height="10" rx="5" fill="#fff" stroke="#00000018" />
        <rect x="10" y="86" width="198" height="5" rx="2.5" fill="#00000022" />
        <path d="M76 40l9 12M90 43l9 12M104 47l9 12" stroke="#0000003d" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M50 74c30 4 80 4 130-8" stroke="#00000020" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  };

  const getTitle = () => {
    if (checkoutState === 'processing') return 'Checkout';
    if (checkoutState === 'confirmed') return 'Order placed';
    return 'Cart';
  };

  const getProcessingMessage = () => {
    if (!currentOrder) {
      return {
        heading: 'Confirming your order…',
        detail: 'Your payment was approved. Waiting for the merchant to confirm.'
      };
    }
    if (currentOrder.status === 'RECONCILING') {
      return {
        heading: 'Found it. Finalizing your order.',
        detail: 'We confirmed your payment directly with PayPal.'
      };
    }
    if (elapsedSeconds > 6) {
      return {
        heading: 'Still confirming. Your payment is safe.',
        detail:
          'This is taking longer than usual. We’re checking directly with PayPal. No need to refresh or pay again.'
      };
    }
    return {
      heading: 'Confirming your order…',
      detail: 'Your payment was approved. Waiting for the merchant to confirm.'
    };
  };

  return (
    <>
      <div
        className={`scrim ${isOpen ? 'on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`drawer ${isOpen ? 'open' : ''}`} aria-label="Cart">
        <header>
          <span id="drawerTitle">{getTitle()}</span>
          <button className="btn sm" onClick={onClose} id="closeDrawer">
            Close
          </button>
        </header>

        <div className="body" id="drawerBody">
          {checkoutState === 'processing' ? (
            <div className="center">
              <div className="spin" />
              <div id="procMsg">
                <h2>{getProcessingMessage().heading}</h2>
                <p>{getProcessingMessage().detail}</p>
              </div>

              <div className="steps">
                <div className="on">Payment approved</div>
                <div className="act">Confirming order</div>
                <div>Order placed</div>
              </div>

              <span className="mono" style={{ color: 'var(--tx-3)' }}>
                elapsed <span id="waitSecs">{elapsedSeconds}s</span>
              </span>
            </div>
          ) : checkoutState === 'confirmed' && currentOrder ? (
            <div className="center">
              <div className="check">✓</div>
              <h2>Thank you. Your order is confirmed.</h2>
              <p>A receipt is on its way to your inbox.</p>

              <div className="kv">
                <div>
                  <span>Order</span>
                  <span className="mono">{currentOrder.id}</span>
                </div>
                <div>
                  <span>Item</span>
                  <span>{currentOrder.item}</span>
                </div>
                <div>
                  <span>Paid</span>
                  <span className="mono">
                    {formatMoney(currentOrder.amount, currentOrder.cur)}
                  </span>
                </div>
                <div>
                  <span>PayPal capture</span>
                  <span className="mono">{currentOrder.cap}</span>
                </div>
              </div>

              {currentOrder.status === 'HEALED' && (
                <div className="note">
                  A delayed confirmation was detected and recovered automatically in +
                  {currentOrder.lat ?? 44}s. Nobody had to be paged.
                </div>
              )}

              <button className="btn lg" onClick={onContinueShopping} id="doneBtn">
                Continue shopping
              </button>
            </div>
          ) : !cart ? (
            <div className="center">
              <h2>Your cart is empty</h2>
              <p>Pick a pair you love and it will show up here.</p>
              <button className="btn primary lg" onClick={onContinueShopping} id="doneBtn">
                Start shopping
              </button>
            </div>
          ) : (
            <>
              <div className="item">
                <div className="t">
                  {renderShoeThumb(cart.prod.fill, cart.prod.shape)}
                </div>
                <div>
                  <b>
                    {cart.prod.brand} {cart.prod.name}
                  </b>
                  <div style={{ color: 'var(--tx-3)' }}>
                    US {cart.size} · {cart.prod.colour}
                  </div>
                  <div style={{ color: 'var(--tx-3)' }}>{cart.prod.origin}</div>
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
                <span>Total, delivered</span>
                <span className="mono">
                  {formatMoney(calcTotal(cart.prod), cart.prod.cur)}
                </span>
              </div>

              <button className="ppbtn" id="payBtn" onClick={onPayWithPayPal}>
                PayPal Checkout
              </button>

              <div className="assure">
                <span>No hidden fees</span>
                <span>Free returns</span>
                <span>Protected by PayPal</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
