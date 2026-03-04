import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MedFlow Worker Dashboard',
  description: 'Staff dashboard for managing patient orders',
}

export default function WorkerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
