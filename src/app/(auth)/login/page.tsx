import { LoginForm } from "@/components/layout/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <SmokeArt />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-[#c9a227]/40 text-[#c9a227] font-display text-lg">
            F
          </div>
          <span className="font-display text-lg tracking-wide text-[#ece6d6]">
            Foggy Nook
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl leading-tight text-[#ece6d6]">
            Every branch, every pack,
            <br />
            one ledger.
          </p>
          <p className="mt-4 text-sm text-[#a89f88]">
            Sales, stock, and staff across Vehari, Multan and Lahore — tracked
            down to the loose cigarette.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[#6b6250]">
          &copy; {new Date().getFullYear()} Foggy Nook. Internal use only.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-1 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground font-display text-base">
                F
              </div>
              <span className="font-display text-lg">Foggy Nook</span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Enter your credentials to access your branch dashboard.
          </p>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Accounts are created by your Admin or Super Admin — contact them
            if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

function SmokeArt() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      viewBox="0 0 600 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M120 800C160 700 60 640 100 560C140 480 240 460 220 380C200 300 100 280 130 200C155 135 240 110 260 40"
        stroke="#c9a227"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M260 800C310 690 200 630 250 540C300 450 400 440 380 350C360 260 260 250 300 160C333 88 420 70 440 0"
        stroke="#c9a227"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M420 800C470 680 360 610 420 510C480 410 560 420 540 320C520 220 430 220 470 120C503 40 560 20 560 -40"
        stroke="#c9a227"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <circle cx="300" cy="40" r="2.5" fill="#c9a227" fillOpacity="0.5" />
      <circle cx="440" cy="0" r="2" fill="#c9a227" fillOpacity="0.4" />
      <circle cx="260" cy="40" r="1.8" fill="#c9a227" fillOpacity="0.4" />
    </svg>
  );
}
