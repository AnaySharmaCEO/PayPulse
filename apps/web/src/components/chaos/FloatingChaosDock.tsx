import React from 'react';

interface FloatingChaosDockProps {
  isArmed: boolean;
  onToggleChaos: () => void;
  onResetDemo: () => void;
}

export const FloatingChaosDock: React.FC<FloatingChaosDockProps> = ({
  isArmed,
  onToggleChaos,
  onResetDemo
}) => {
  return (
    <div className={`dock ${isArmed ? 'armed' : ''}`}>
      <div className="t">
        <span className={`dot ${isArmed ? 'bad ping' : 'mute'}`} />
        Chaos mode
      </div>

      <button
        className="sw"
        role="switch"
        aria-checked={isArmed}
        aria-label="Arm chaos mode"
        onClick={onToggleChaos}
      />

      <select aria-label="Chaos scenario selection">
        <option>Drop webhook (silent delivery failure)</option>
        <option disabled>Corrupt payload — soon</option>
        <option disabled>Delay delivery — soon</option>
      </select>

      <span className={`badge ${isArmed ? 'bad' : ''}`}>
        {isArmed ? 'ARMED' : 'DISARMED'}
      </span>

      <span className="hint">
        One-shot · auto-disarms on trigger · <kbd>C</kbd>
      </span>

      <button className="btn sm" onClick={onResetDemo}>
        Reset demo
      </button>
    </div>
  );
};
