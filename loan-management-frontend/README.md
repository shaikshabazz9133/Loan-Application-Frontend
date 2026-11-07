# LendWise — Loan Management System (Frontend)

One React app with three role-based portals: **Customer** (apply & track), **Agent** (review & decide), **Manager** (manage & approve).

**Stack:** React 18 + Vite · Tailwind CSS · shadcn/ui components (Radix) · Lucide icons · Recharts · Google Maps (`@vis.gl/react-google-maps`)

## Run

```bash
npm install
npm run dev
```

Demo accounts (password `demo123`), also available as one-click buttons on the login page:

| Role | Email |
|---|---|
| Customer | customer@demo.com |
| Agent 1 (Banjara Hills) | agent@demo.com |
| Agent 2 (Banjara Hills) | agent2@demo.com |
| Manager | manager@demo.com |

Use **Reset demo data** in the user menu (top right) to restore the sample data.

## Google Maps (optional)

Copy `.env.example` to `.env` and set `VITE_GOOGLE_MAPS_API_KEY` (Maps JavaScript API enabled). Without a key, a built-in preview map is shown; it still supports click-to-pick locations and the 2 km radius.

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

**Testing credit outcomes:** on the apply form use *Fill test IDs · good credit* or *· low credit*. In the demo data, Vikram Singh (LN-1012, Ravi's queue) and Deepak Malhotra (LN-1018, open in Banjara Hills) have low scores.

**Try "first to accept":** log in as `agent@demo.com` in one tab and `agent2@demo.com` in another (both cover Banjara Hills). Tabs stay in sync, so when one accepts, the other sees "Accepted by another agent".

## Project structure

```
src/
  lib/            store.jsx (data layer + business rules), constants, seed data, utils
  components/ui/  shadcn-style primitives (button, card, dialog, tabs, table…)
  components/shared/  MapView, StatusTimeline, ActivityLog, VerificationPanel, charts…
  layouts/        AppShell (sidebar + topbar)
  pages/auth|customer|agent|manager
```

## Note — frontend only

All data lives in `localStorage` (see `src/lib/store.jsx`). That is fine for a demo but **not secure**: passwords are stored in plain text and every rule is enforced in the browser. When you build the backend, move authentication, the 2 km assignment and the approval rules to the server, and replace the store functions with API calls (the pages only use `useStore()`).
