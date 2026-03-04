export default function ProcessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-[var(--app-bg)] max-w-app mx-auto">
      {children}
    </div>
  )
}
