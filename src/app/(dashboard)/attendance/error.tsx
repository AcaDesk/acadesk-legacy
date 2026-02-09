'use client';

import { useEffect } from 'react';
import { Button } from '@ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Attendance page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-destructive mb-2">
          출석 페이지 로딩 오류
        </h2>
        <p className="text-destructive mb-4">{error.message}</p>
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
      </div>
    </div>
  );
}
