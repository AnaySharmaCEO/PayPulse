import React, { useState } from 'react';
import { LensType } from '../../types';

interface AiLensBarProps {
  currentLens: LensType;
  onToggleLens: (lens: LensType) => void;
}

export const AiLensBar: React.FC<AiLensBarProps> = ({
  currentLens,
  onToggleLens
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const v = searchValue.toLowerCase();
    const l: LensType = /risk|expos/.test(v)
      ? 'risk'
      : /pivot|recover|settle/.test(v)
      ? 'pivot'
      : /incident|detail|critical/.test(v)
      ? 'incident'
      : null;

    if (l) {
      onToggleLens(l);
    }
    setSearchValue('');
  };

  return (
    <section className="lensbar">
      <input
        className="search"
        placeholder="Ask the guardian…  try “risk”, “pivot”, “incident”"
        value={searchValue}
        onChange={e => setSearchValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Ask the guardian search query"
      />
      <button
        className="pill"
        data-lens="risk"
        aria-pressed={currentLens === 'risk'}
        onClick={() => onToggleLens('risk')}
      >
        Show high-risk exposure
      </button>
      <button
        className="pill"
        data-lens="pivot"
        aria-pressed={currentLens === 'pivot'}
        onClick={() => onToggleLens('pivot')}
      >
        Show recovered settlement pivot
      </button>
      <button
        className="pill"
        data-lens="incident"
        aria-pressed={currentLens === 'incident'}
        onClick={() => onToggleLens('incident')}
      >
        Show critical incident detail
      </button>
    </section>
  );
};
