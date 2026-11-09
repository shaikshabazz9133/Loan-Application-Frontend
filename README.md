# LendWise — Loan Management System (Frontend)

One React app with three role-based portals: **Customer** (apply & track), **Agent** (review & decide), **Manager** (manage & approve).

**Stack:** React 18 + Vite · Tailwind CSS · shadcn/ui components (Radix) · Lucide icons · Recharts · Google Maps (`@vis.gl/react-google-maps`)

## Run with Docker (recommended - no Node.js install needed)

Start the backend first: in `loan-management-backend`, run `docker compose up -d` (see its README). Then here:

```bash
docker compose up -d      # first run installs packages (about 2 minutes) -> http://localhost:5173
```

- Your code is shared live with the container: save a file and the browser updates.
- The app calls the API at `http://localhost:8000/api/v1`. To use the shared office backend instead:
  `VITE_API_URL=http://192.168.1.4:8000/api/v1 docker compose up -d`
- Port 5173 busy (e.g. `npm run dev` already running)? `WEB_PORT=5174 docker compose up -d`, and add
  `http://localhost:5174` to `CORS_ORIGINS` in the backend `.env`.

| Command | What it does |
|---|---|
| `docker compose up -d` | Start the frontend |
| `docker compose logs -f web` | Follow the Vite logs and errors |
| `docker compose up -d --build` | Rebuild after `package.json` changes (a new package) |
| `docker compose down` | Stop |

Add a package with `docker compose exec web npm install <package>`, so `package.json` and `package-lock.json` are updated, then rebuild.

## Run without Docker

```bash
npm install
npm run dev        # http://localhost:5173
```

The API address comes from `VITE_API_URL` (default `http://localhost:8000/api/v1`, set in `.env.development`).
To point only your own laptop somewhere else, put `VITE_API_URL=...` in `.env.development.local` (ignored by Git).

## Accounts

- **Customer:** no account. Open `/`, click *Apply for loan*, and see the status afterwards (or track it at `/track` with the application ID + mobile).
- **Manager:** created automatically by the backend from `MANAGER_EMAIL` / `MANAGER_MOBILE` / `MANAGER_PASSWORD` in the backend `.env` (fresh Docker setup: `manager@example.com` / `manager123`). Signs in at `/login`.
- **Agent:** the manager adds agents under *Agents → Add agent*; the agent then signs in at `/login` with that email/mobile and password. Deactivated agents can't sign in.

## Business rules implemented

- **Submit:** a new application goes to the **manager** (who sees all customers and applications) and is shared as an **open request** with every active agent whose location is within **2 km** of the customer. Nothing is auto-assigned.
- **Agent area:** an agent only sees requests from customers within 2 km of the location the manager set for them.
- **Accept or decline:** before accepting, an agent sees only the **loan amount, address and location**. The **first agent to accept** gets the customer; the request disappears for everyone else and only that agent can see full details and verify. Declining hides the request from that agent only; the manager can see who declined.
- **Agent verification:** all 4 checks (identity, income, address, location) must be ticked before **Approve & recommend** is enabled. Rejection requires a reason. Agent approval is a recommendation only.
- **Manager approval:** **Approve loan** stays locked until the agent has verified and recommended. Manager rejection requires a reason. The manager does **not** assign agents.
- **Agent CRUD:** the manager can add / edit / activate-deactivate / delete agents, including their location. Deactivating an agent returns their unfinished applications to open requests. Agents with applications can't be deleted.
- **KYC on apply:** date of birth (age 21–60), Aadhaar (12 digits + Verhoeff checksum), PAN (individual format `AAAPA9999A`), loan tenure (6–84 months, with live EMI at an indicative 12% p.a.).
- **Documents:** PAN card, Aadhaar card, bank statements and address proof are required; salary slips are required for salaried applicants. JPG/PNG/WEBP/PDF up to 5 MB, stored in the browser's IndexedDB (`src/lib/docs.js`).
- **Credit score:** the agent runs a credit check (simulated bureau, 300–900, deterministic per PAN — `src/lib/kyc.js`). Below **650** the agent can't recommend and the manager can't approve; the agent rejects with a pre-filled reason.
- **Agent verification:** 8 customer fields + every required document must be ticked, and the credit score must pass, before **Approve & recommend** unlocks.
- **Disbursement:** the customer gives a bank account when applying (holder, account number entered twice, IFSC → bank name). The agent verifies it as one of the checks. After the manager approves, they click **Disburse** (IMPS / NEFT / RTGS) and a UTR reference is recorded. The customer sees "Loan approved & amount sent to HDFC Bank •••• 1234" with the UTR, and a 6th timeline step. (Transfers are simulated — connect a payout API such as your bank's or Razorpay/Cashfree payouts in production.)
- Full application history is recorded for every action.

**Testing credit outcomes:** on the apply form use *Fill test IDs · good credit* or *· low credit*.

**Try "first to accept":** create two agents near the same location, sign in as each in separate tabs of the same browser. Tabs stay in sync, so when one accepts, the other sees "Accepted by another agent".

## Project structure

```
src/
  lib/            api.js (backend calls + session), store.jsx (data layer + business rules), constants, utils
  components/ui/  shadcn-style primitives (button, card, dialog, tabs, table…)
  components/shared/  MapView, StatusTimeline, ActivityLog, VerificationPanel, charts…
  layouts/        AppShell (sidebar + topbar)
  pages/auth|customer|agent|manager
```

## What uses the backend

| Feature | Where the data lives |
|---|---|
| Sign up, sign in, session (tokens, auto-refresh) | Backend API (MongoDB) |
| Agents: add, edit, activate/deactivate, delete | Backend API (MongoDB) |
| Loan applications, verification, approval, disbursement | Still in this browser's `localStorage` - backend APIs not built yet |

Because applications are still stored per browser, a customer's application is only visible to agents and the manager signed in on the **same browser**, until the application APIs are added.
