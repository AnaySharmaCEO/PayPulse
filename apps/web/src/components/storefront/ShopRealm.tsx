import React from 'react';
import { Product } from '../../types';
import { calcTotal, formatMoney, PRODUCTS, SIZES } from '../../data/mockProducts';

interface ShopRealmProps {
  page: 'home' | 'pdp';
  selectedProductId: string | null;
  selectedCity: string;
  selectedSizes: Record<string, number>;
  cartCount: number;
  onNavigateHome: (city?: string) => void;
  onSelectCity: (city: string) => void;
  onOpenProduct: (productId: string) => void;
  onSelectSize: (productId: string, size: number) => void;
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
}

export const ShopRealm: React.FC<ShopRealmProps> = ({
  page,
  selectedProductId,
  selectedCity,
  selectedSizes,
  cartCount,
  onNavigateHome,
  onSelectCity,
  onOpenProduct,
  onSelectSize,
  onAddToCart,
  onOpenCart
}) => {
  const filteredProducts = PRODUCTS.filter(
    p => selectedCity === 'All' || p.city === selectedCity
  );

  const activeProduct = PRODUCTS.find(p => p.id === selectedProductId) || PRODUCTS[0];
  const activeSize = activeProduct ? selectedSizes[activeProduct.id] : undefined;

  const renderShoeSvg = (fill: string, shape: number = 0) => {
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

  const icons = {
    tag: (
      <svg viewBox="0 0 24 24">
        <path d="M3 12V4h8l10 10-8 8z" />
        <circle cx="7.5" cy="8.5" r="1.2" />
      </svg>
    ),
    ship: (
      <svg viewBox="0 0 24 24">
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="17.5" r="1.8" />
        <circle cx="17" cy="17.5" r="1.8" />
      </svg>
    ),
    ret: (
      <svg viewBox="0 0 24 24">
        <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    )
  };

  return (
    <div id="shop">
      {/* Announcement Bar */}
      <div className="ann">
        Duties and shipping are included in every price you see · Free returns within 30 days
      </div>

      {/* Navigation Bar */}
      <div className="nav">
        <div className="in">
          <nav>
            <a onClick={() => onNavigateHome('All')}>New in</a>
            <a onClick={() => onNavigateHome('All')}>Sneakers</a>
            <a onClick={() => onNavigateHome('Tokyo')}>Tokyo</a>
            <a onClick={() => onNavigateHome('Berlin')}>Berlin</a>
            <a onClick={() => onNavigateHome('Osaka')}>Osaka</a>
          </nav>
          <div className="logo" onClick={() => onNavigateHome('All')}>
            Meridian
          </div>
          <div className="r">
            <button className="iconbtn" onClick={onOpenCart} aria-label="Open cart">
              Cart <b id="cartCount">{cartCount}</b>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main id="shopMain">
        {page === 'home' ? (
          <div className="wrap">
            {/* Hero Section */}
            <section className="hero">
              <div>
                <div className="eyebrow" style={{ marginBottom: 14 }}>
                  New arrivals · Autumn drop
                </div>
                <h1>
                  The world’s best sneakers, <em>delivered to your door.</em>
                </h1>
                <p>
                  Independent boutiques in Tokyo, Berlin and Osaka. One checkout, one price.
                  Shipping and import duty are already in it.
                </p>
                <div className="cta">
                  <button
                    className="btn primary lg"
                    onClick={() => onOpenProduct('am90')}
                  >
                    Shop the Air Max 90
                  </button>
                  <button
                    className="btn lg"
                    onClick={() => {
                      document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Browse all
                  </button>
                </div>
              </div>

              <div className="art">
                {renderShoeSvg('#e9e2cf', 0)}
                <div className="tag">
                  <b>Air Max 90</b>
                  <div style={{ color: 'var(--tx-3)' }}>
                    From {formatMoney(calcTotal(PRODUCTS[0]), 'USD')} delivered
                  </div>
                </div>
              </div>
            </section>

            {/* Trust Strip */}
            <section className="trust">
              <div>
                {icons.tag}
                <p>
                  <b>Price you see is the price you pay</b>
                  <span>Duty and shipping included</span>
                </p>
              </div>
              <div>
                {icons.ship}
                <p>
                  <b>Tracked international delivery</b>
                  <span>4–8 days door to door</span>
                </p>
              </div>
              <div>
                {icons.ret}
                <p>
                  <b>Free 30-day returns</b>
                  <span>We cover the return label</span>
                </p>
              </div>
              <div>
                {icons.lock}
                <p>
                  <b>Protected by PayPal</b>
                  <span>Pay without sharing card details</span>
                </p>
              </div>
            </section>

            {/* Product Grid Section */}
            <section id="grid">
              <div className="sechead">
                <h2>Fresh from the boutiques</h2>
                <div className="chips">
                  {['All', 'Tokyo', 'Berlin', 'Osaka'].map(city => (
                    <button
                      key={city}
                      className="chip"
                      aria-pressed={selectedCity === city}
                      onClick={() => onSelectCity(city)}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pgrid">
                {filteredProducts.map(p => (
                  <article
                    key={p.id}
                    className="pcard"
                    onClick={() => onOpenProduct(p.id)}
                  >
                    <div className="img">
                      <span className="loc">
                        <span className="dot" />
                        {p.city}
                      </span>
                      {renderShoeSvg(p.fill, p.shape)}
                      <button
                        className="qa"
                        onClick={e => {
                          e.stopPropagation();
                          onOpenProduct(p.id);
                        }}
                      >
                        Choose size
                      </button>
                    </div>

                    <div className="meta">
                      <div>
                        <h3>
                          {p.brand} {p.name}
                        </h3>
                        <div className="sub">{p.colour}</div>
                      </div>
                      <div className="pr">
                        <b>{formatMoney(calcTotal(p), p.cur)}</b>
                        <span>delivered</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Transparent Pricing Section */}
            <section className="how">
              <div>
                <div className="eyebrow">Transparent pricing</div>
                <h2>No surprise fees at your door.</h2>
                <p>
                  Cross-border shopping usually hides import duty until the courier arrives.
                  We add it up front, so the total in your cart is the total you pay.
                </p>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <div className="line">
                  <span>Item</span>
                  <span className="mono">{formatMoney(PRODUCTS[0].base, 'USD')}</span>
                </div>
                <div className="line">
                  <span>International shipping</span>
                  <span className="mono">{formatMoney(PRODUCTS[0].ship, 'USD')}</span>
                </div>
                <div className="line">
                  <span>Import duty</span>
                  <span className="mono">{formatMoney(PRODUCTS[0].duty, 'USD')}</span>
                </div>
                <div className="line total" style={{ marginTop: 12 }}>
                  <span>Total, delivered</span>
                  <span className="mono">{formatMoney(calcTotal(PRODUCTS[0]), 'USD')}</span>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="foot">
              <span>© Meridian · A PayPulse demo merchant</span>
              <span>Payments by PayPal (sandbox)</span>
            </footer>
          </div>
        ) : (
          /* Product Detail Page (PDP) */
          <div className="wrap">
            <div className="crumb">
              <a onClick={() => onNavigateHome('All')}>All sneakers</a> / {activeProduct.city} /{' '}
              {activeProduct.brand} {activeProduct.name}
            </div>

            <div className="pdp">
              <div className="gal">
                <div className="thumbs">
                  {[activeProduct.fill, '#cfc9ba', '#bfc3c2'].map((fill, index) => (
                    <button
                      key={index}
                      aria-pressed={index === 0}
                      aria-label={`View thumbnail ${index + 1}`}
                    >
                      {renderShoeSvg(fill, activeProduct.shape)}
                    </button>
                  ))}
                </div>
                <div className="main">
                  {renderShoeSvg(activeProduct.fill, activeProduct.shape)}
                </div>
              </div>

              <div>
                <div className="eyebrow">
                  {activeProduct.brand} · {activeProduct.origin}
                </div>
                <h1>{activeProduct.name}</h1>
                <div style={{ color: 'var(--tx-3)' }}>{activeProduct.colour}</div>

                <div className="price">{formatMoney(calcTotal(activeProduct), activeProduct.cur)}</div>
                <div className="incl">✓ Delivered price · duty and shipping included</div>

                <div className="row2" style={{ marginTop: 26 }}>
                  <b>Select size (US)</b>
                  <a style={{ color: 'var(--tx-3)', fontSize: 12 }}>Size guide</a>
                </div>

                <div className="sizes">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      className="size"
                      aria-pressed={activeSize === s}
                      onClick={() => onSelectSize(activeProduct.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  className="btn primary lg"
                  style={{ width: '100%' }}
                  onClick={() => onAddToCart(activeProduct)}
                >
                  {activeSize ? 'Add to cart' : 'Select a size to continue'}
                </button>

                <div className="assure">
                  <span>Arrives in {activeProduct.eta}</span>
                  <span>Free returns</span>
                  <span>Secure checkout</span>
                </div>

                <div className="acc">
                  <details open>
                    <summary>What you’ll pay</summary>
                    <div className="ln">
                      <span>Item</span>
                      <span className="mono">{formatMoney(activeProduct.base, activeProduct.cur)}</span>
                    </div>
                    <div className="ln">
                      <span>International shipping</span>
                      <span className="mono">{formatMoney(activeProduct.ship, activeProduct.cur)}</span>
                    </div>
                    <div className="ln">
                      <span>Import duty</span>
                      <span className="mono">{formatMoney(activeProduct.duty, activeProduct.cur)}</span>
                    </div>
                    <div className="ln t">
                      <span>Total</span>
                      <span className="mono">{formatMoney(calcTotal(activeProduct), activeProduct.cur)}</span>
                    </div>
                  </details>

                  <details>
                    <summary>Delivery</summary>
                    <p>
                      Tracked shipping from {activeProduct.city}. Estimated {activeProduct.eta}.
                      Customs are cleared on your behalf.
                    </p>
                  </details>

                  <details>
                    <summary>Returns</summary>
                    <p>Return unworn pairs within 30 days. We provide the label.</p>
                  </details>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
