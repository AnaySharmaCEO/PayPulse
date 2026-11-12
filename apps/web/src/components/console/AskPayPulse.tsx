import React, { useState } from 'react';
import { LensType } from '../../types';

interface AskPayPulseProps {
  currentLens: LensType;
  onSelectLens: (lens: LensType) => void;
  onOpenLatestIncident: () => void;
}

export const AskPayPulse: React.FC<AskPayPulseProps> = ({
  currentLens,
  onSelectLens,
  onOpenLatestIncident
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const v = inputValue.toLowerCase().trim();

    if (/risk|expos/.test(v)) {
      onSelectLens('risk');
    } else if (/pivot|recover|currenc|settle/.test(v)) {
      onSelectLens('pivot');
    } else if (/incident|detail|critical|latest/.test(v)) {
      onOpenLatestIncident();
    }
    setInputValue('');
  };

  return (
    <section className="ask">
      <input
        id="lensInput"
        placeholder="Ask PayPulse… try “orders at risk” or “recovered by currency”"
        aria-label="Ask PayPulse"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        className="pill"
        data-lens="risk"
        aria-pressed={currentLens === 'risk'}
        onClick={() => onSelectLens(currentLens === 'risk' ? null : 'risk')}
      >
        Orders at risk
      </button>

      <button
        className="pill"
        data-lens="pivot"
        aria-pressed={currentLens === 'pivot'}
        onClick={() => onSelectLens(currentLens === 'pivot' ? null : 'pivot')}
      >
        Recovered by currency
      </button>

      <button
        className="pill"
        data-lens="incident"
        aria-pressed={false}
        onClick={onOpenLatestIncident}
      >
        Latest incident
      </button>
    </section>
  );
};
