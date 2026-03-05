export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md px-4 has-[[data-wide]]:max-w-3xl">
        {children}
      </div>
    </div>
  );
}