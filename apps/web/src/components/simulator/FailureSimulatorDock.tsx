import React from 'react';
import { SimulatorScenario } from '../../types';

interface FailureSimulatorDockProps {
  isArmed: boolean;
  isOpen: boolean;
  selectedScenario: SimulatorScenario;
  onToggleOpen: () => void;
  onToggleArm: () => void;
  onSelectScenario: (scenario: SimulatorScenario) => void;
}

export const SCENARIOS: Record<
  SimulatorScenario,
  { title: string; desc: string; mapping: string; hint: string }
> = {
  drop: {
    title: 'Drop the next webhook',
    desc: 'The payment succeeds, but PayPal’s confirmation never reaches us.',
    mapping: 'DROP_WEBHOOK · x-paypulse-chaos: drop',
    hint: 'webhook will be dropped'
  },
  forge: {
    title: 'Forge a signature',
    desc: 'A tampered webhook arrives. It must be rejected and logged.',
    mapping: 'CORRUPT_PAYLOAD · HTTP 400 SIGNATURE_VERIFICATION_FAILED',
    hint: 'a forged webhook will be sent'
  },
  ooo: {
    title: 'Deliver events out of order',
    desc: 'The capture confirmation arrives before the approval event.',
    mapping: 'DELAY_DELIVERY · CREATED → COMPLETED accelerated',
    hint: 'events will arrive out of order'
  }
};

export const FailureSimulatorDock: React.FC<FailureSimulatorDockProps> = ({
  isArmed,
  isOpen,
  selectedScenario,
  onToggleOpen,
  onToggleArm,
  onSelectScenario
}) => {
  const currentHint = SCENARIOS[selectedScenario].hint;

  return (
    <div className={`dock ${isArmed ? 'armed' : ''}`} id="dock">
      {/* Expanded Selection Panel */}
      <div className="panel" id="dockPanel" hidden={!isOpen}>
        <div>
          <h4>Failure simulator</h4>
          <p>
            Break one thing on the next checkout and watch PayPulse recover.
            One-shot: it disarms itself after it fires.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Failure scenario"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          id="scList"
        >
          {(Object.keys(SCENARIOS) as SimulatorScenario[]).map(key => {
            const sc = SCENARIOS[key];
            const isSelected = selectedScenario === key;

            return (
              <button
                key={key}
                className="sc"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectScenario(key)}
              >
                <span className="rd" />
                <span>
                  <b>{sc.title}</b>
                  <span>{sc.desc}</span>
                  <em>{sc.mapping}</em>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsed Pill Bar */}
      <div className="bar">
        <button
          className="tt"
          id="dockToggle"
          aria-expanded={isOpen}
          onClick={onToggleOpen}
        >
          <span className={`dot ${isArmed ? 'bad ping' : 'mute'}`} id="dockDot" />
          <span>Failure simulator</span>
          <small id="dockSub">
            {isArmed ? `Next checkout: ${currentHint}` : 'Off'}
          </small>
        </button>

        <span className={`badge ${isArmed ? 'bad' : ''}`} id="dockBadge">
          {isArmed ? 'Armed' : 'Off'}
        </span>

        <button
          className="btn arm"
          id="armBtn"
          onClick={onToggleArm}
        >
          {isArmed ? 'Disarm' : 'Arm'}
        </button>

        <kbd title="Keyboard shortcut">C</kbd>
      </div>
    </div>
  );
};
