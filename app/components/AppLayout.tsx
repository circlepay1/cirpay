'use client'

import Sidebar from './Sidebar'
import GiftNotification from './GiftNotification'
import PayrollNotification from './PayrollNotification'
import InvoiceNotification from './InvoiceNotification'
import InvoicePaidNotification from './InvoicePaidNotification'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <main className="flex-1 px-8 pt-[88px] pb-8 overflow-y-auto">
        {children}
      </main>
      <GiftNotification />
      <PayrollNotification />
      <InvoiceNotification />
      <InvoicePaidNotification />
    </div>
  )
}
