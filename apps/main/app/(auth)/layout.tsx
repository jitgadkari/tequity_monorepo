export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Tequity</h1>
          <p className="text-slate-600 mt-1">Secure Document Intelligence</p>
        </div>
        {children}
      </div>
    </div>
  );
}
