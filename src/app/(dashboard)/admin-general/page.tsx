'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminDashboardView } from '@/components/AdminDashboardView';

function AdminGeneralContent() {
  const searchParams = useSearchParams();
  const showAdminNotice = searchParams.get('adminNotice') === 'true';

  return (
    <AdminDashboardView
      forcedRole="ADMIN_GENERAL"
      showAdminNoticeProp={showAdminNotice}
    />
  );
}

export default function AdminGeneralDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminGeneralContent />
    </Suspense>
  );
}
