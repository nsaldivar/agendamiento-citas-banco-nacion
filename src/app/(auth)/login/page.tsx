'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginDrawer } from '@/components/auth/LoginDrawer';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/';
  const tramiteId = searchParams.get('tramiteId') ? Number(searchParams.get('tramiteId')) : null;
  const agenciaId = searchParams.get('agenciaId') ? Number(searchParams.get('agenciaId')) : null;

  return (
    <div className="min-h-screen bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <LoginDrawer
        isOpen={true}
        onClose={() => router.push(redirectUrl === '/agendar' ? '/' : redirectUrl)}
        redirectUrl={redirectUrl}
        tramiteId={tramiteId}
        agenciaId={agenciaId}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
