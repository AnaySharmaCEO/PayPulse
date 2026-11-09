import React, { useState, useEffect, useRef } from 'react';
import { Realm, Order, CartItem, LensType, Product } from './types';
import { calcTotal } from './data/mockProducts';
import { Header } from './components/common/Header';
import { StorefrontView } from './components/storefront/StorefrontView';
import { CartDrawer } from './components/storefront/CartDrawer';
import { PayPalMockModal } from './components/storefront/PayPalMockModal';
import { CockpitView } from './components/cockpit/CockpitView';
import { AiDoctorSlideOver } from './components/cockpit/AiDoctorSlideOver';
import { FloatingChaosDock } from './components/chaos/FloatingChaosDock';

const urlParams = new URLSearchParams(window.location.search);
const SLA_SECONDS = Number(urlParams.get('sla')) || 25;

export const App: React.FC = () => {
  const [realm, setRealm] = useState<Realm>('store');
  const [chaosArmed, setChaosArmed] = useState(false);
  const [cart, setCart] = useState<CartItem | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
  const [checkoutState, setCheckoutState] = useState<'idle' | 'processing' | 'confirmed'>('idle');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lens, setLens] = useState<LensType>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>('PP-9918');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [doctorOrderId, setDoctorOrderId] = useState<string | null>(null);
  const [nextId, setNextId] = useState(9922);
  const [waitSeconds, setWaitSeconds] = useState(0);

  // Sync realm with DOM attribute
  useEffect(() => {
    document.body.dataset.realm = realm;
  }, [realm]);

  // Seed initial orders matching mock data
  const seedOrders = () => {
    const now = Date.now();
    const initialOrders: Order[] = [
      {
        id: 'PP-9921',
        amount: 54900,
        cur: 'USD',
        status: 'APPROVED',
        sla: SLA_SECONDS,
        deadlineAt: now + SLA_SECONDS * 1000 * 0.9,
        dropped: false,
        patch: false,
        item: 'Jordan 4 Retro ×1',
        cap: 'CAP-7QX20'
      },
      {
        id: 'PP-9920',
        amount: 21400,
        cur: 'USD',
        status: 'COMPLETED',
        sla: SLA_SECONDS,
        dropped: false,
        patch: false,
        item: 'Air Max 90 ×1',
        cap: 'CAP-4MN88'
      },
      {
        id: 'PP-9918',
        amount: 36800,
        cur: 'USD',
        status: 'HEALED',
        sla: 90,
        lat: 44,
        dropped: true,
        patch: true,
        item: 'Samba OG ×2',
        cap: 'CAP-9D3LA'
      },
      {
        id: 'PP-9917',
        amount: 28900,
        cur: 'USD',
        status: 'HEALED',
        sla: 90,
        lat: 51,
        dropped: true,
        patch: true,
        item: '990v6 ×1',
        cap: 'CAP-8F2K1'
      }
    ];

    setOrders(initialOrders);
    setSelectedId('PP-9918');
    setExpandedIds(new Set());
    setLens(null);
    setNextId(9922);
    setCart(null);
    setCheckoutState('idle');
    setCurrentOrderId(null);
    setChaosArmed(false);
    setIsCartOpen(false);
    setIsDoctorOpen(false);
    setIsPayPalModalOpen(false);

    // Simulate standard completion for PP-9921 after SLA*700
    setTimeout(() => {
      setOrders(prev =>
        prev.map(o => (o.id === 'PP-9921' && o.status === 'APPROVED' ? { ...o, status: 'COMPLETED' } : o))
      );
    }, SLA_SECONDS * 700);
  };

  useEffect(() => {
    seedOrders();
  }, []);

  // Tick interval for SLA & state transitions
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const currentOrderIdRef = useRef(currentOrderId);
  currentOrderIdRef.current = currentOrderId;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentList = ordersRef.current;

      // Update wait seconds for storefront
      if (currentOrderIdRef.current) {
        const curOrder = currentList.find(x => x.id === currentOrderIdRef.current);
        if (curOrder && curOrder.deadlineAt) {
          const start = curOrder.deadlineAt - curOrder.sla * 1000;
          setWaitSeconds(Math.max(0, Math.round((now - start) / 1000)));
        }
      }

      // Check for SLA breach triggers
      currentList.forEach(o => {
        const rem = o.deadlineAt ? Math.max(0, Math.ceil((o.deadlineAt - now) / 1000)) : 0;
        if (o.status === 'APPROVED' && o.dropped && rem === 0 && !o._b) {
          o._b = 1;
          setOrders(prev =>
            prev.map(item => (item.id === o.id ? { ...item, _b: 1, status: 'BREACHED' } : item))
          );

          // Progress to RECONCILING
          setTimeout(() => {
            setOrders(prev =>
              prev.map(item => (item.id === o.id ? { ...item, status: 'RECONCILING' } : item))
            );
          }, 1500);

          // Progress to HEALED
          setTimeout(() => {
            const lat = Math.max(1, Math.round((Date.now() - (o.deadlineAt ?? Date.now())) / 1000));
            setOrders(prev =>
              prev.map(item =>
                item.id === o.id ? { ...item, status: 'HEALED', lat } : item
              )
            );

            if (currentOrderIdRef.current === o.id) {
              setCheckoutState('confirmed');
            }

            // Progress to Prevention Ready after 5s
            setTimeout(() => {
              setOrders(prev =>
                prev.map(item => (item.id === o.id ? { ...item, patch: true } : item))
              );
            }, 5000);
          }, 4200);
        }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Global Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'c') {
        setChaosArmed(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsDoctorOpen(false);
        setIsCartOpen(false);
        setIsPayPalModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actions
  const handleSelectSize = (productId: string, size: number) => {
    setSelectedSizes(prev => ({ ...prev, [productId]: size }));
  };

  const handleAddToCart = (product: Product) => {
    const size = selectedSizes[product.id] || 9;
    setCart({ prod: product, size });
    setCheckoutState('idle');
    setIsCartOpen(true);
  };

  const handleApprovePayment = () => {
    if (!cart) return;
    setIsPayPalModalOpen(false);

    const isDropped = chaosArmed;
    setChaosArmed(false); // one-shot auto-disarm

    const randId = Math.random().toString(36).slice(2, 7).toUpperCase();
    const orderId = `PP-${nextId}`;
    setNextId(prev => prev + 1);

    const newOrder: Order = {
      id: orderId,
      amount: calcTotal(cart.prod),
      cur: cart.prod.cur,
      status: 'APPROVED',
      sla: SLA_SECONDS,
      deadlineAt: Date.now() + SLA_SECONDS * 1000,
      dropped: isDropped,
      patch: false,
      item: `${cart.prod.brand} ${cart.prod.name} ×1`,
      cap: `CAP-${randId}`
    };

    setOrders(prev => [newOrder, ...prev]);
    setCurrentOrderId(orderId);
    setSelectedId(orderId);
    setCheckoutState('processing');

    if (!isDropped) {
      setTimeout(() => {
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, status: 'COMPLETED' } : o))
        );
        setCheckoutState('confirmed');
      }, 2200);
    }
  };

  const handleToggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedId(id);
  };

  const handleOpenDoctor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDoctorOrderId(id);
    setIsDoctorOpen(true);
  };

  const handleToggleLens = (selectedLens: LensType) => {
    const nextLens = lens === selectedLens ? null : selectedLens;
    setLens(nextLens);

    if (nextLens === 'incident') {
      const healed = orders.find(o => o.status === 'HEALED');
      if (healed) {
        setExpandedIds(prev => new Set(prev).add(healed.id));
        setSelectedId(healed.id);
        setDoctorOrderId(healed.id);
        setIsDoctorOpen(true);
      }
    }
  };

  const activeOrder = orders.find(o => o.id === currentOrderId) || null;
  const doctorOrder = orders.find(o => o.id === doctorOrderId) || null;

  return (
    <>
      <Header
        realm={realm}
        onSetRealm={r => {
          setRealm(r);
          if (r !== 'store') setIsCartOpen(false);
        }}
        cartCount={cart ? 1 : 0}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {realm === 'store' && (
        <StorefrontView
          selectedSizes={selectedSizes}
          onSelectSize={handleSelectSize}
          onAddToCart={handleAddToCart}
        />
      )}

      {realm === 'cockpit' && (
        <CockpitView
          orders={orders}
          selectedId={selectedId}
          expandedIds={expandedIds}
          lens={lens}
          slaSeconds={SLA_SECONDS}
          onSelectOrder={id => setSelectedId(id)}
          onToggleExpand={handleToggleExpand}
          onToggleLens={handleToggleLens}
          onOpenDoctor={handleOpenDoctor}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        checkoutState={checkoutState}
        activeOrder={activeOrder}
        waitSeconds={waitSeconds}
        onInitiatePayPal={() => setIsPayPalModalOpen(true)}
        onDoneOrder={() => {
          setCart(null);
          setCheckoutState('idle');
          setIsCartOpen(false);
        }}
      />

      <PayPalMockModal
        isOpen={isPayPalModalOpen}
        amount={cart ? calcTotal(cart.prod) : 0}
        currency={cart ? cart.prod.cur : 'USD'}
        onApprove={handleApprovePayment}
        onCancel={() => setIsPayPalModalOpen(false)}
      />

      <AiDoctorSlideOver
        isOpen={isDoctorOpen}
        order={doctorOrder}
        onClose={() => setIsDoctorOpen(false)}
      />

      <FloatingChaosDock
        isArmed={chaosArmed}
        onToggleChaos={() => setChaosArmed(prev => !prev)}
        onResetDemo={seedOrders}
      />
    </>
  );
};
