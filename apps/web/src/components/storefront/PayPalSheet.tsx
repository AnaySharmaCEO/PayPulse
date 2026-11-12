import React from 'react';
import { formatMoney } from '../../data/mockProducts';
import { Currency } from '../../types';

interface PayPalSheetProps {
  isOpen: boolean;
  totalMinor: number;
  currency: Currency;
  onApprove: () => void;
  onCancel: () => void;
}

export const PayPalSheet: React.FC<PayPalSheetProps> = ({
  isOpen,
  totalMinor,
  currency,
  onApprove,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal" id="ppModal">
      <div className="pp">
        <h4>
          PayPal <small style={{ fontWeight: 400, fontStyle: 'normal' }}>Sandbox</small>
        </h4>
        <div>
          <small>Pay Meridian</small>
          <div className="amt" id="ppAmt">
            {formatMoney(totalMinor, currency)}
          </div>
        </div>
        <button className="go" id="ppApprove" onClick={onApprove}>
          Pay now
        </button>
        <button className="x" id="ppCancel" onClick={onCancel}>
          Cancel and return to merchant
        </button>
      </div>
    </div>
  );
};
