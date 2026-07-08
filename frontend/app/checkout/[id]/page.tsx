'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { orderApi } from '@/services/api';
import RequireAuth from '@/components/RequireAuth';
import Stepper from '@/components/ui/Stepper';
import OrderSummaryCard from './_components/OrderSummaryCard';
import PaymentMethods from './_components/PaymentMethods';
import type { Order } from '@/types';

const STEPS = ['Chọn sự kiện', 'Chọn ghế', 'Thanh toán'];

function CheckoutInner() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('MOMO');
  const paidRef = useRef(false);

  useEffect(() => {
    orderApi
      .get(id)
      .then(setOrder)
      .catch((err) => setError(err.message));
  }, [id]);

  // Release seat locks when the user navigates away (SPA) without paying.
  // Browser close / hard refresh: the sweeper releases after the 10-min TTL.
  useEffect(() => {
    return () => {
      if (!paidRef.current) orderApi.cancel(id).catch(() => {});
    };
  }, [id]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const paid = await orderApi.pay(id, method);
      paidRef.current = true;
      setOrder(paid);
      router.push(`/tickets?justPaid=${paid.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !order) return <div className="text-danger-600">Không thể tải: {error}</div>;
  if (!order) return <div className="text-ink-subtle">Đang tải…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Thanh toán</h1>
        <Link href={`/events/${order.eventId}`} className="text-sm text-brand-700 hover:underline">
          ← Quay lại sự kiện
        </Link>
      </div>

      <Stepper steps={STEPS} current={3} />
      <OrderSummaryCard order={order} />
      <PaymentMethods
        order={order}
        method={method}
        onSelect={setMethod}
        isPaid={order.status === 'PAID'}
        busy={busy}
        error={error}
        onPay={pay}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutInner />
    </RequireAuth>
  );
}
