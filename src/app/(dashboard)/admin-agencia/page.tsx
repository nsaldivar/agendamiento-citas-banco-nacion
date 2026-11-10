'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminAgenciaView } from '@/components/AdminAgenciaView';

function AdminAgenciaContent() {
  const searchParams = useSearchParams();
  const showAdminNotice = searchParams.get('adminNotice') === 'true';

  return <AdminAgenciaView showAdminNoticeProp={showAdminNotice} />;
}

export default function AdminAgenciaDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminAgenciaContent />
    </Suspense>
  );
}
