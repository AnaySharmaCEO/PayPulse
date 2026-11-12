/**
 * PayPulse Display Status Labels & Presentation Mappings
 * Single Source of Truth for Status Displays (§2 in IDE_AGENT_BRIEF.md)
 * NOTE: Database and Finite State Machine internal values NEVER change.
 */

import { OrderStatus, IncidentStatus } from '../types';

export interface StatusBadgeConfig {
  badgeClass: string;
  label: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, StatusBadgeConfig> = {
  APPROVED: { badgeClass: '', label: 'Awaiting confirmation' },
  COMPLETED: { badgeClass: 'ok', label: 'Paid' },
  BREACHED: { badgeClass: 'bad pulse', label: 'Confirmation overdue' },
  RECONCILING: { badgeClass: 'warn pulse', label: 'Recovering' },
  HEALED: { badgeClass: 'ok', label: 'Recovered' },
  CREATED: { badgeClass: '', label: 'Starting checkout' },
  SAVED: { badgeClass: '', label: 'Starting checkout' },
  VOIDED: { badgeClass: '', label: 'Cancelled' },
  PAYER_ACTION_REQUIRED: { badgeClass: 'warn', label: 'Action needed' }
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, StatusBadgeConfig> = {
  DETECTED: { badgeClass: 'warn pulse', label: 'Detected' },
  DIAGNOSING: { badgeClass: 'warn pulse', label: 'Diagnosing' },
  HEALED: { badgeClass: 'ok', label: 'Contained' },
  MANUAL_INTERVENTION_REQUIRED: { badgeClass: 'bad', label: 'Needs a human' }
};

export function getOrderDisplayStatus(status: OrderStatus, isRecovered?: boolean): StatusBadgeConfig {
  if (isRecovered) {
    return { badgeClass: 'ok', label: 'Recovered' };
  }
  return ORDER_STATUS_LABELS[status] || { badgeClass: '', label: status };
}

export function getIncidentDisplayStatus(status: IncidentStatus): StatusBadgeConfig {
  return INCIDENT_STATUS_LABELS[status] || { badgeClass: '', label: status };
}

export function formatTimeMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
