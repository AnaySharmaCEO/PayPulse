import React from 'react';
import { Product } from '../../types';
import { PRODUCTS, SIZES, calcTotal, formatMoney } from '../../data/mockProducts';

export const ShoeIllustration: React.FC<{ fill: string }> = ({ fill }) => (
  <svg viewBox="0 0 200 100" fill="none">
    <path
      d="M8 68c0-9 20-12 36-20l24-14c9-5 19 5 30 8l52 8c22 4 38 12 38 22v6H8z"
      fill={fill}
      stroke="#0000001f"
    />
    <rect x="8" y="76" width="182" height="8" rx="4" fill="#00000026" />
    <path
      d="M70 36l8 12M84 40l8 12M98 44l8 10"
      stroke="#0000003a"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

interface StorefrontViewProps {
  selectedSizes: Record<string, number>;
  onSelectSize: (productId: string, size: number) => void;
  onAddToCart: (product: Product) => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  selectedSizes,
  onSelectSize,
  onAddToCart
}) => {
  return (
    <main className="wrap">
      <div className="hero">
        <h1>
          Cross-border drops.
          <br />
          One checkout.
        </h1>
        <p>
          Sourced from independent merchants across Tokyo, Berlin and Osaka.
          Landed cost shown up front.
        </p>
      </div>

      <div className="grid3">
        {PRODUCTS.map(p => {
          const total = calcTotal(p);
          const chosenSize = selectedSizes[p.id] || 9;

          return (
            <article key={p.id} className="card prod">
              <div className="art">
                <ShoeIllustration fill={p.fill} />
              </div>

              <div>
                <div className="brandn">{p.brand}</div>
                <h3>{p.name}</h3>
                <div className="origin">
                  <span className="dot mute" />
                  {p.origin}
                </div>
              </div>

              <div className="sizes">
                {SIZES.map(s => (
                  <button
                    key={s}
                    className="size"
                    aria-pressed={chosenSize === s}
                    onClick={() => onSelectSize(p.id, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="row">
                <span className="price">{formatMoney(total, p.cur)}</span>
                <button
                  className="btn primary"
                  onClick={() => onAddToCart(p)}
                >
                  Add to bag
                </button>
              </div>

              <div className="origin">Landed cost incl. shipping &amp; import duty</div>
            </article>
          );
        })}
      </div>
    </main>
  );
};
