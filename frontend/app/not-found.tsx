'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Catch-all: replicate the old `<Navigate to="/" replace />` fallback. */
export default function NotFound() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return <div className="text-center py-16 text-ink-subtle">Đang chuyển hướng…</div>;
}
