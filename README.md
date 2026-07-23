# Foggy Nook — Smoke & Vape Shop Management System (v1.0)

A multi-branch retail management system: POS, inventory, sales, expenses,
reports, and role-based access for Super Admin / Admin / Manager.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn-style UI (Radix primitives, hand-wired — see note below)
- Supabase (Auth, Postgres, Row Level Security)
- Zustand · React Hook Form + Zod · TanStack Table · Recharts · Sonner
- jsPDF + `qrcode` (client-side receipt PDF export and on-screen/PDF QR
  rendering) · native ESC/POS commands for thermal printer output

All dependencies were installed at their latest published versions at the time
of writing (Next 16.2.10, React 19.2.4, Tailwind 4, Supabase JS 2.110, etc).
Run `npm outdated` any time to check for newer releases.

## 1. Create your Supabase project

1. Go to https://supabase.com → New Project.
2. Once created, open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret — server-only)

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the three values above:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is only used server-side, inside
`src/app/api/managers/route.ts`, to create Manager logins. It is never sent
to the browser.

## 3. Run the database schema

Open your Supabase project → **SQL Editor** → New Query, paste the entire
contents of `supabase/schema.sql`, and run it. This creates:

- All tables (`profiles`, `branches`, `products`, `branch_inventory`,
  `inventory_logs`, `sales`, `sale_items`, `expenses`, `activity_logs`,
  `notifications`, `settings`, etc.)
- Row Level Security policies enforcing the role rules below
- A `checkout_sale(...)` Postgres function that atomically creates a sale,
  its line items, and decrements branch stock in one transaction
- A trigger that auto-creates a `profiles` row whenever a new Supabase Auth
  user is created (reading `full_name` / `role` / `branch_id` from the
  signup metadata)
- Starter seed data: expense categories, the three example branches, and the
  brand/category lists from the spec

It's safe to re-run the script — it uses `if not exists` / `on conflict do
nothing` guards throughout.

## 4. Create your first Super Admin

You have two options:

### Option A — Seed script (fast, creates a full demo team)

Once `.env.local` is filled in (step 2) and the schema has been run (step 3):

```bash
npm install
npm run seed:users
```

This creates **1 Super Admin, 2 Admins, and 3 Managers** (one per seeded
branch — Vehari, Multan, Lahore) using the Supabase Admin API, and prints
every login email + password at the end:

| Role | Email | Branch |
|---|---|---|
| Super Admin | `superadmin@foggynook.pk` | — (all branches) |
| Admin | `admin.vehari@foggynook.pk` | — (all branches) |
| Admin | `admin.multan@foggynook.pk` | — (all branches) |
| Manager | `manager.vehari@foggynook.pk` | Foggy Nook - Vehari |
| Manager | `manager.multan@foggynook.pk` | Foggy Nook - Multan |
| Manager | `manager.lahore@foggynook.pk` | Foggy Nook - Lahore |

All six share the same default password: `FoggyNook@123` (override it by
setting `SEED_DEFAULT_PASSWORD` in `.env.local` before running the script).
**Change these passwords after first login** — each account can do this from
**Profile → Change Password**.

The script is safe to re-run: existing accounts (matched by email) are left
as-is and just have their role/branch re-synced, so it won't create
duplicates or error out on a second run.

### Option B — Manually, via the Supabase dashboard

1. In Supabase → **Authentication → Users → Add user**, create a user with
   your email + a password, and confirm the email.
2. In **SQL Editor**, run:
   ```sql
   update profiles set role = 'super_admin' where email = 'you@example.com';
   ```
3. Log into the app with that email/password — you'll land on the full
   Super Admin dashboard.

From there, use **Managers** in the sidebar to create additional Manager
accounts through the UI (the Managers page provisions the `manager` role
directly through the API route — promote someone to `admin` the same way as
step 2).

## 5. Install and run

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`.

## 6. (Optional) Generate accurate Supabase TypeScript types

`src/types/database.ts` ships as a permissive placeholder so the app runs
immediately. For fully-typed Supabase queries generated from your live
schema:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase gen types typescript --linked > src/types/database.ts
```

## Role permissions (enforced by RLS + UI)

| Area | Super Admin | Admin | Manager |
|---|---|---|---|
| Branches | Full | View | — |
| Brands / Categories | Full | Full | View |
| Products (global catalog) | Full | Full | View |
| Inventory / stock adjustments | All branches | All branches | Own branch only |
| POS / Sales | All branches | All branches | Own branch only |
| Expenses | All branches | All branches | Own branch only |
| Reports / Analytics | Full | Full | Own branch (Reports only) |
| Managers (user accounts) | Full | Full | — |
| Settings | Full | Full | — |
| Activity Logs | All branches | All branches | Own branch |

## Thermal Receipt Printing

Full ESC/POS printing support lives under `src/lib/escpos/` and
`src/components/receipt/`:

- **Connections**: USB (WebUSB), Network/LAN (via a server-side TCP relay at
  `/api/print/network`, since browsers can't open raw sockets), and
  Bluetooth (Web Bluetooth GATT — see the caveat below). A plain **Browser
  Print** mode is always available as the default/fallback.
- **Per-branch configuration**: `branch_printers` (one row per branch) holds
  the connection type, paper width (58mm/80mm), auto-print, print-preview,
  cash-drawer, font size, margin, footer message, and QR code settings.
  Configure it from **Printer Settings** in the sidebar (Admin/Super Admin
  only) — pair a USB or Bluetooth device with one click, or enter a network
  printer's IP:port.
- **POS flow**: after checkout, the app reads the branch's printer config —
  if `auto_print` is on it attempts direct ESC/POS printing immediately; if
  that isn't possible (no direct printer configured, unsupported browser,
  pairing lost, etc.) it **automatically falls back to the browser print
  dialog** so a printer hiccup never blocks a sale. If `print_preview` is
  on, the receipt preview modal shows first with Print / Download PDF /
  WhatsApp buttons.
- **Reprint**: every row in **Sales** has a Reprint button that re-fetches
  the sale's line items and opens the same preview/print flow.
- **Cash drawer**: `openCashDrawer()` sends the ESC/POS kick-out pulse over
  the same connection as printing (USB/Network/Bluetooth) — there's a "Test
  Cash Drawer" button in Printer Settings once a direct printer is
  configured for a branch.
- **Barcode scanning**: `useBarcodeScanner()` (`src/hooks/`) listens
  globally for the rapid keystroke-then-Enter pattern that USB
  keyboard-wedge barcode scanners produce — no drivers or scanner-specific
  setup needed, and it works anywhere on the POS page, not just when a
  search box is focused.

### Browser/platform caveats (these are real platform limits, not app bugs)

- **WebUSB and Web Bluetooth only work in Chromium browsers** (Chrome,
  Edge) on desktop, and only over HTTPS or `http://localhost`. Safari and
  Firefox don't implement these APIs — those branches should use Network or
  plain Browser Print instead.
- **Network printing requires the Next.js server to reach the printer's
  IP** — i.e. same LAN, a VPN, or a port-forward. If you deploy to a cloud
  host (Vercel, etc.), it cannot reach a printer sitting inside a shop's
  local network; run the app on a local machine/server at that branch
  instead for Network mode to work there.
- **Most cheap Bluetooth thermal printers use classic Bluetooth SPP**,
  which browsers cannot access at all (Web Bluetooth is BLE/GATT-only).
  Only newer BLE-based printers work with the Bluetooth connection type —
  for classic SPP printers, use USB or Network instead, or print via the
  phone/Windows native print driver outside the browser.

## Architecture notes

- **Products are a global catalog**; `branch_inventory` holds per-branch
  stock counts (`stock` = packs, `loose_stock` = individual pieces broken
  out of a pack). A product is created once and every branch gets its own
  stock row automatically the first time stock is adjusted or a sale
  touches it.
- **Loose / manual selling** (e.g. selling 2 cigarettes out of a 20-pack) is
  modeled with `is_loose_saleable`, `loose_selling_price`, and
  `quantity_per_pack` on `products`, and `loose_stock` on
  `branch_inventory`. The POS lets you add either a full pack or a loose
  quantity of the same product as separate cart lines.
- **Checkout is atomic**: `checkoutSale()` (in `src/services/sales.ts`) calls
  the `checkout_sale` Postgres function via `supabase.rpc(...)`, which
  inserts the sale + sale_items, decrements `branch_inventory`, writes an
  `inventory_logs` row per line item, and logs the action — all in one
  database transaction, so stock counts can never drift from sales history.
- **Branch switching**: Admin/Super Admin see a branch switcher in the top
  bar ("All Branches" or a specific one). Managers never see the switcher —
  they're pinned to their own `branch_id`.

## UI components

`src/components/ui/*` are hand-written, shadcn-style components built
directly on Radix UI primitives + `class-variance-authority` (the same
approach the `shadcn` CLI generates, wired up manually here since the CLI's
interactive `init` doesn't run non-interactively in this environment). They
follow `components.json`, so if you have the shadcn CLI available locally,
`npx shadcn@latest add <component>` will still work against this project.

## Known items for a v1.1 pass

- `next/font/google` needs outbound internet access to fetch Inter/Playfair
  Display at build time — this works out of the box on Vercel or any normal
  dev machine with internet access.
- The Managers page provisions accounts with the `manager` role only;
  promoting someone to `admin` is a one-line SQL update for now (see step 4).
- See the **Future Features (Version 2)** list from the original spec:
  barcode/QR label printing (as physical stickers — barcode *scanning* is
  already supported), WhatsApp Business API, AI sales/inventory
  forecasting, loyalty program, employee attendance, and supplier purchase
  orders.
