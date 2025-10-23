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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          출석 페이지 로딩 오류
        </h2>
        <p className="text-red-700 mb-4">{error.message}</p>
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
      </div>
    </div>
  );
}
