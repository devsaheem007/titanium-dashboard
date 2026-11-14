import { useAuth } from "../context/AuthContext";

export default function AuthShell({ title, subtitle, children, footer }) {
  const { settings } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-silver/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Saheem Panel"
              className="h-12 w-12 rounded-full object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-ink">
              {settings.appName}
            </span>
          </div>
        </div>

        <div className="glass p-7 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>

          {subtitle && <p className="mt-1.5 text-sm text-mute">{subtitle}</p>}

          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-mute">{footer}</p>
        )}
      </div>
    </div>
  );
}
