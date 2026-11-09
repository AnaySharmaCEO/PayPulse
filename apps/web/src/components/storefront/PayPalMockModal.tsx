import React from 'react';
import { Currency } from '../../types';
import { formatMoney } from '../../data/mockProducts';

interface PayPalMockModalProps {
  isOpen: boolean;
  amount: number;
  currency: Currency;
  onApprove: () => void;
  onCancel: () => void;
}

export const PayPalMockModal: React.FC<PayPalMockModalProps> = ({
  isOpen,
  amount,
  currency,
  onApprove,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="PayPal Checkout Modal">
      <div className="pp">
        <h4>
          PayPal{' '}
          <small style={{ fontWeight: 400, fontStyle: 'normal' }}>
            Sandbox mock
          </small>
        </h4>
        <div>
          <small>Pay Pulse Commerce Labs</small>
          <div className="amt mono">{formatMoney(amount, currency)}</div>
        </div>
        <button className="go" onClick={onApprove}>
          Approve payment
        </button>
        <button className="x" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
