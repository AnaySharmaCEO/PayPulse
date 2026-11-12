import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Realm,
  Order,
  Incident,
  CartItem,
  LensType,
  ConsolePage,
  SimulatorScenario
} from './types';
import { calcTotal } from './data/mockProducts';
import { DemoBar } from './components/common/DemoBar';
import { ShopRealm } from './components/storefront/ShopRealm';
import { CartDrawer } from './components/storefront/CartDrawer';
import { PayPalSheet } from './components/storefront/PayPalSheet';
import { ConsoleRealm } from './components/console/ConsoleRealm';
import { DetailDrawer } from './components/console/DetailDrawer';
import { FailureSimulatorDock } from './components/simulator/FailureSimulatorDock';

const urlParams = new URLSearchParams(window.location.search);
const SLA_SECONDS = Number(urlParams.get('sla')) || 25;

export const App: React.FC = () => {
  // Navigation & Realm
  const [realm, setRealm] = useState<Realm>('shop');
  const [shopPage, setShopPage] = useState<'home' | 'pdp'>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>('am90');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
  const [consolePage, setConsolePage] = useState<ConsolePage>('overview');

  // Commerce & Cart State
  const [cart, setCart] = useState<CartItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPayPalSheetOpen, setIsPayPalSheetOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'processing' | 'confirmed'>('idle');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Orders & SRE Console Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('PP-9918');
  const [lens, setLens] = useState<LensType>(null);
  const [nextOrderId, setNextOrderId] = useState(9922);

  // Detail Drawer (Evidence & Diagnosis)
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'evidence' | 'diag'>('evidence');
  const [detailOrderId, setDetailOrderId] = useState<string | null>('PP-9918');

  // Failure Simulator Dock
  const [isSimulatorArmed, setIsSimulatorArmed] = useState(false);
  const [isSimulatorDockOpen, setIsSimulatorDockOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<SimulatorScenario>('drop');

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'ok' | 'bad' | ''>('');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, kind: 'ok' | 'bad' | '' = '') => {
    setToastMessage(msg);
    setToastKind(kind);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  }, []);

  // Sync realm attribute on document.body
  useEffect(() => {
    document.body.dataset.realm = realm;
  }, [realm]);

  // Seed initial mock state matching paypulse-remaster.html
  const seedDemoState = useCallback(() => {
    const now = Date.now();

    const orderA: Order = {
      id: 'PP-9921',
      amount: 54900,
      cur: 'USD',
      status: 'APPROVED',
      sla: SLA_SECONDS,
      createdAt: now - 3000,
      deadlineAt: now + SLA_SECONDS * 900,
      dropped: false,
      patch: false,
      item: 'Jordan 4 Retro × 1',
      cap: 'CAP-7QX20',
      events: [
        { at: now - 3000, label: 'Checkout started', kind: 'n' },
        { at: now - 1900, label: 'PayPal approved the payment', kind: 'ok' },
        { at: now - 1200, label: 'Capture completed on PayPal', kind: 'ok' }
      ]
    };

    const orderB: Order = {
      id: 'PP-9920',
      amount: 21400,
      cur: 'USD',
      status: 'COMPLETED',
      sla: SLA_SECONDS,
      createdAt: now - 120000,
      dropped: false,
      patch: false,
      item: 'Air Max 90 × 1',
      cap: 'CAP-4MN88',
      events: [
        { at: now - 120000, label: 'Checkout started', kind: 'n' },
        { at: now - 118800, label: 'PayPal approved the payment', kind: 'ok' },
        { at: now - 118000, label: 'Webhook verified and journaled', kind: 'ok' },
        { at: now - 117700, label: 'Order marked Paid', kind: 'ok' }
      ]
    };

    const orderC: Order = {
      id: 'PP-9918',
      amount: 36800,
      cur: 'USD',
      status: 'HEALED',
      sla: 90,
      lat: 44,
      createdAt: now - 240000,
      dropped: true,
      scenario: 'drop',
      patch: true,
      item: 'Samba OG × 2',
      cap: 'CAP-9D3LA',
      events: [
        { at: now - 240000, label: 'Checkout started', kind: 'n' },
        { at: now - 238900, label: 'PayPal approved the payment', kind: 'ok' },
        { at: now - 238200, label: 'Capture completed on PayPal', kind: 'ok' },
        { at: now - 238000, label: 'Webhook dropped before reaching us', kind: 'bad' },
        { at: now - 148000, label: 'Confirmation window expired', kind: 'bad' },
        { at: now - 146500, label: 'Asked PayPal directly for the order', kind: 'warn' },
        { at: now - 104000, label: 'Capture found · order recovered', kind: 'ok' }
      ]
    };

    const orderD: Order = {
      id: 'PP-9917',
      amount: 28900,
      cur: 'USD',
      status: 'HEALED',
      sla: 90,
      lat: 51,
      createdAt: now - 300000,
      dropped: true,
      scenario: 'drop',
      patch: true,
      item: '990v6 × 1',
      cap: 'CAP-8F2K1',
      events: [
        { at: now - 300000, label: 'Checkout started', kind: 'n' },
        { at: now - 298800, label: 'PayPal approved the payment', kind: 'ok' },
        { at: now - 298000, label: 'Webhook dropped before reaching us', kind: 'bad' },
        { at: now - 208000, label: 'Confirmation window expired', kind: 'bad' },
        { at: now - 157000, label: 'Capture found · order recovered', kind: 'ok' }
      ]
    };

    const initialIncidents: Incident[] = [
      {
        id: 'INC-0412',
        order: 'PP-9918',
        cat: 'OVERDUE_CAPTURE',
        sev: 'MEDIUM',
        status: 'HEALED',
        lat: 44,
        patch: true,
        at: now - 90000
      },
      {
        id: 'INC-0411',
        order: 'PP-9917',
        cat: 'OVERDUE_CAPTURE',
        sev: 'MEDIUM',
        status: 'HEALED',
        lat: 51,
        patch: true,
        at: now - 200000
      }
    ];

    setOrders([orderA, orderB, orderC, orderD]);
    setIncidents(initialIncidents);
    setSelectedOrderId('PP-9918');
    setDetailOrderId('PP-9918');
    setLens(null);
    setCart(null);
    setCheckoutState('idle');
    setCurrentOrderId(null);
    setIsSimulatorArmed(false);
    setIsCartOpen(false);
    setIsDetailOpen(false);

    // Auto-complete orderA after SLA * 0.7
    setTimeout(() => {
      setOrders(prev =>
        prev.map(o => {
          if (o.id === 'PP-9921' && o.status === 'APPROVED') {
            const updatedEvents = [
              ...o.events,
              {
                at: Date.now(),
                label: 'Webhook verified and journaled',
                kind: 'ok' as const
              }
            ];
            return { ...o, status: 'COMPLETED', events: updatedEvents };
          }
          return o;
        })
      );
    }, SLA_SECONDS * 700);
  }, []);

  useEffect(() => {
    seedDemoState();
  }, [seedDemoState]);

  // Periodic Lifecycle Tick (250ms)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      // Update elapsed counter for processing order
      if (currentOrderId && checkoutState === 'processing') {
        const active = orders.find(o => o.id === currentOrderId);
        if (active) {
          setElapsedSeconds(Math.max(0, Math.round((now - active.createdAt) / 1000)));
        }
      }

      // Check SLA breach on dropped orders
      setOrders(prevOrders => {
        let hasChanges = false;
        const updated = prevOrders.map(o => {
          if (
            o.status === 'APPROVED' &&
            o.dropped &&
            o.deadlineAt &&
            o.deadlineAt <= now &&
            !o._b
          ) {
            hasChanges = true;
            const updatedEvents = [
              ...o.events,
              { at: now, label: 'Confirmation window expired', kind: 'bad' as const }
            ];

            // Schedule transition to RECONCILING in 1.5s
            setTimeout(() => {
              setOrders(curr =>
                curr.map(item => {
                  if (item.id === o.id) {
                    return {
                      ...item,
                      status: 'RECONCILING',
                      events: [
                        ...item.events,
                        {
                          at: Date.now(),
                          label: 'Asked PayPal directly for the order',
                          kind: 'warn' as const
                        }
                      ]
                    };
                  }
                  return item;
                })
              );
            }, 1500);

            // Schedule self-healing in 4.2s
            setTimeout(() => {
              const healTime = Date.now();
              const recoveryLatency = Math.max(
                1,
                Math.round((healTime - (o.deadlineAt ?? healTime)) / 1000)
              );

              setOrders(curr =>
                curr.map(item => {
                  if (item.id === o.id) {
                    return {
                      ...item,
                      status: 'HEALED',
                      lat: recoveryLatency,
                      events: [
                        ...item.events,
                        {
                          at: healTime,
                          label: 'Capture found · order recovered',
                          kind: 'ok' as const
                        }
                      ]
                    };
                  }
                  return item;
                })
              );

              // Create incident
              const newInc: Incident = {
                id: `INC-04${Math.floor(Math.random() * 80 + 13)}`,
                order: o.id,
                cat: 'OVERDUE_CAPTURE',
                sev: 'MEDIUM',
                status: 'DIAGNOSING',
                lat: recoveryLatency,
                patch: false,
                at: healTime
              };

              setIncidents(prevInc => [newInc, ...prevInc]);

              if (currentOrderId === o.id) {
                setCheckoutState('confirmed');
              }

              showToast(
                `Order ${o.id} recovered automatically in +${recoveryLatency}s.`,
                'ok'
              );

              // In 5s, Gemini completes code patch
              setTimeout(() => {
                setOrders(c =>
                  c.map(it => (it.id === o.id ? { ...it, patch: true } : it))
                );
                setIncidents(prevInc =>
                  prevInc.map(it =>
                    it.order === o.id
                      ? { ...it, patch: true, status: 'HEALED' }
                      : it
                  )
                );
              }, 5000);
            }, 4200);

            return { ...o, _b: 1, status: 'BREACHED' as const, events: updatedEvents };
          }
          return o;
        });

        return hasChanges ? updated : prevOrders;
      });
    }, 250);

    return () => clearInterval(timer);
  }, [orders, currentOrderId, checkoutState, showToast]);

  // Checkout execution logic
  const handlePlaceOrder = () => {
    if (!cart) return;
    const now = Date.now();
    const product = cart.prod;
    const scenario = isSimulatorArmed ? selectedScenario : null;
    setIsSimulatorArmed(false); // One-shot auto-disarm

    const newOrder: Order = {
      id: `PP-${nextOrderId}`,
      amount: calcTotal(product),
      cur: product.cur,
      status: 'APPROVED',
      sla: SLA_SECONDS,
      createdAt: now,
      deadlineAt: now + SLA_SECONDS * 1000,
      dropped: scenario === 'drop',
      scenario,
      patch: false,
      item: `${product.brand} ${product.name} × 1`,
      cap: `CAP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      events: [
        { at: now, label: 'Checkout started', kind: 'n' },
        { at: now + 500, label: 'PayPal approved the payment', kind: 'ok' },
        { at: now + 900, label: 'Capture completed on PayPal', kind: 'ok' }
      ]
    };

    setNextOrderId(prev => prev + 1);
    setCurrentOrderId(newOrder.id);
    setSelectedOrderId(newOrder.id);
    setOrders(prev => [newOrder, ...prev]);
    setCheckoutState('processing');
    setElapsedSeconds(0);
    setIsCartOpen(true);

    if (scenario === 'drop') {
      newOrder.events.push({
        at: now + 1200,
        label: 'Webhook dropped before reaching us (simulated)',
        kind: 'bad'
      });
      showToast('Simulator fired: webhook dropped. Watch the countdown.', 'bad');
    } else if (scenario === 'forge') {
      setTimeout(() => {
        newOrder.events.push({
          at: Date.now(),
          label: 'Webhook rejected · signature invalid · quarantined',
          kind: 'bad'
        });
        const forgeInc: Incident = {
          id: `INC-04${Math.floor(Math.random() * 80 + 20)}`,
          order: newOrder.id,
          cat: 'SIGNATURE_FAILURE',
          sev: 'HIGH',
          status: 'HEALED',
          patch: false,
          at: Date.now()
        };
        setIncidents(prev => [forgeInc, ...prev]);
        showToast('Forged webhook rejected. Order ledger untouched.', 'ok');
      }, 1100);

      setTimeout(() => {
        setOrders(curr =>
          curr.map(o => {
            if (o.id === newOrder.id && o.status === 'APPROVED') {
              return {
                ...o,
                status: 'COMPLETED',
                events: [
                  ...o.events,
                  {
                    at: Date.now(),
                    label: 'Genuine webhook verified and journaled',
                    kind: 'ok'
                  }
                ]
              };
            }
            return o;
          })
        );
        setCheckoutState('confirmed');
      }, 3200);
    } else if (scenario === 'ooo') {
      setTimeout(() => {
        newOrder.events.push({
          at: Date.now(),
          label: 'CAPTURE.COMPLETED arrived before ORDER.APPROVED',
          kind: 'warn'
        });
        setOrders(curr =>
          curr.map(o => {
            if (o.id === newOrder.id && o.status === 'APPROVED') {
              return {
                ...o,
                status: 'COMPLETED',
                events: [
                  ...o.events,
                  {
                    at: Date.now(),
                    label: 'Order accelerated to Paid without error',
                    kind: 'ok'
                  }
                ]
              };
            }
            return o;
          })
        );
        setCheckoutState('confirmed');
        showToast('Out-of-order delivery handled. No exception thrown.', 'ok');
      }, 1400);

      setTimeout(() => {
        setOrders(curr =>
          curr.map(o => {
            if (o.id === newOrder.id) {
              return {
                ...o,
                events: [
                  ...o.events,
                  {
                    at: Date.now(),
                    label: 'Late ORDER.APPROVED absorbed as a no-op',
                    kind: 'ok'
                  }
                ]
              };
            }
            return o;
          })
        );
      }, 3000);
    } else {
      // Normal happy path
      setTimeout(() => {
        setOrders(curr =>
          curr.map(o => {
            if (o.id === newOrder.id && o.status === 'APPROVED') {
              return {
                ...o,
                status: 'COMPLETED',
                events: [
                  ...o.events,
                  {
                    at: Date.now(),
                    label: 'Webhook verified and journaled',
                    kind: 'ok'
                  }
                ]
              };
            }
            return o;
          })
        );
        setCheckoutState('confirmed');
      }, 2200);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
        setIsSimulatorArmed(prev => {
          const next = !prev;
          if (next) {
            showToast(
              realm === 'console'
                ? 'Armed. Switch to Customer view and check out.'
                : 'Armed. Complete a checkout to trigger it.'
            );
          }
          return next;
        });
      }
      if (e.key === 'Escape') {
        setIsCartOpen(false);
        setIsDetailOpen(false);
        setIsPayPalSheetOpen(false);
        setIsSimulatorDockOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [realm, showToast]);

  const currentOrder = orders.find(o => o.id === currentOrderId) || null;
  const detailOrder = orders.find(o => o.id === detailOrderId) || null;
  const detailIncident = incidents.find(i => i.order === detailOrderId);

  return (
    <>
      {/* 1. Top Demo Bar (Fixed 38px, outside products) */}
      <DemoBar
        realm={realm}
        onSelectRealm={r => {
          setRealm(r);
          setIsCartOpen(false);
          setIsDetailOpen(false);
          window.scrollTo(0, 0);
        }}
        slaSeconds={SLA_SECONDS}
        onResetDemo={() => {
          seedDemoState();
          showToast('Demo state reset.', 'ok');
        }}
      />

      {/* 2. Customer View Realm (Meridian Storefront) */}
      <div id="shop" hidden={realm !== 'shop'}>
        <ShopRealm
          page={shopPage}
          selectedProductId={selectedProductId}
          selectedCity={selectedCity}
          selectedSizes={selectedSizes}
          cartCount={cart ? 1 : 0}
          onNavigateHome={city => {
            setShopPage('home');
            if (city) setSelectedCity(city);
            window.scrollTo(0, 0);
          }}
          onSelectCity={setSelectedCity}
          onOpenProduct={pid => {
            setSelectedProductId(pid);
            setShopPage('pdp');
            window.scrollTo(0, 0);
          }}
          onSelectSize={(pid, sz) => {
            setSelectedSizes(prev => ({ ...prev, [pid]: sz }));
          }}
          onAddToCart={product => {
            const size = selectedSizes[product.id];
            if (!size) {
              showToast('Pick a size first.', 'bad');
              return;
            }
            setCart({ prod: product, size });
            setCheckoutState('idle');
            setIsCartOpen(true);
          }}
          onOpenCart={() => setIsCartOpen(true)}
        />
      </div>

      {/* 3. Merchant Console Realm (PayPulse) */}
      <div id="console" hidden={realm !== 'console'}>
        <ConsoleRealm
          page={consolePage}
          orders={orders}
          incidents={incidents}
          selectedId={selectedOrderId}
          lens={lens}
          slaSeconds={SLA_SECONDS}
          onNavigatePage={setConsolePage}
          onSelectOrder={id => setSelectedOrderId(id)}
          onSelectLens={setLens}
          onOpenEvidence={id => {
            setDetailOrderId(id);
            setDetailTab('evidence');
            setIsDetailOpen(true);
          }}
          onOpenDiagnosis={id => {
            setDetailOrderId(id);
            setDetailTab('diag');
            setIsDetailOpen(true);
          }}
        />
      </div>

      {/* 4. Cart Slide-in Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        cart={cart}
        checkoutState={checkoutState}
        currentOrder={currentOrder}
        elapsedSeconds={elapsedSeconds}
        onClose={() => setIsCartOpen(false)}
        onPayWithPayPal={() => {
          setIsPayPalSheetOpen(true);
        }}
        onContinueShopping={() => {
          setCart(null);
          setCheckoutState('idle');
          setShopPage('home');
          setIsCartOpen(false);
        }}
      />

      {/* 5. PayPal Sandbox Modal */}
      {cart && (
        <PayPalSheet
          isOpen={isPayPalSheetOpen}
          totalMinor={calcTotal(cart.prod)}
          currency={cart.prod.cur}
          onApprove={() => {
            setIsPayPalSheetOpen(false);
            handlePlaceOrder();
          }}
          onCancel={() => setIsPayPalSheetOpen(false)}
        />
      )}

      {/* 6. Console Detail Drawer (Evidence & Diagnosis) */}
      <DetailDrawer
        isOpen={isDetailOpen}
        order={detailOrder}
        incident={detailIncident}
        activeTab={detailTab}
        onSelectTab={setDetailTab}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* 7. Failure Simulator Dock (Fixed Bottom-Center, Both Realms) */}
      <FailureSimulatorDock
        isArmed={isSimulatorArmed}
        isOpen={isSimulatorDockOpen}
        selectedScenario={selectedScenario}
        onToggleOpen={() => setIsSimulatorDockOpen(prev => !prev)}
        onToggleArm={() => {
          setIsSimulatorArmed(prev => {
            const next = !prev;
            if (next) {
              showToast(
                realm === 'console'
                  ? 'Armed. Switch to Customer view and check out.'
                  : 'Armed. Complete a checkout to trigger it.'
              );
            }
            return next;
          });
        }}
        onSelectScenario={setSelectedScenario}
      />

      {/* 8. Toast Banner */}
      <div className={`toast ${toastMessage ? 'on' : ''} ${toastKind}`}>
        {toastMessage}
      </div>
    </>
  );
};
