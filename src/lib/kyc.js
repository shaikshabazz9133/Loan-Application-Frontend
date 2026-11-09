/** KYC helpers: Aadhaar (Verhoeff), PAN, age, EMI and credit score bands. */

// ---------- Aadhaar: 12 digits, first digit 2-9, Verhoeff checksum ----------
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 1, 0], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

/** Generic Verhoeff validation (last digit is the check digit). */
export function verhoeffValid(digits) {
  let c = 0
  ;[...digits].reverse().forEach((ch, i) => (c = D[c][P[i % 8][+ch]]))
  return c === 0
}

export const isValidAadhaar = (num) => /^[2-9]\d{11}$/.test(num) && verhoeffValid(num)


export const formatAadhaar = (n = '') => n.replace(/(\d{4})(?=\d)/g, '$1 ')
export const maskAadhaar = (n = '') => (n.length === 12 ? `XXXX XXXX ${n.slice(8)}` : n)

// ---------- PAN: AAAPA9999A — 4th char 'P' marks an individual ----------
export const PAN_RE = /^[A-Z]{3}P[A-Z]\d{4}[A-Z]$/
export const isValidPan = (pan) => PAN_RE.test(pan)
export const maskPan = (pan = '') => (pan.length === 10 ? `${pan.slice(0, 2)}XXXXX${pan.slice(7)}` : pan)

// ---------- Age ----------
export function ageFrom(dob) {
  if (!dob) return null
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
  return age
}
export const MIN_AGE = 21
export const MAX_AGE = 60

// ---------- Loan terms ----------
export const MAX_FOIR = 0.5 // EMI should be at most 50% of monthly income

/** Reducing-balance EMI: P x r x (1+r)^n / ((1+r)^n - 1), r = monthly rate. */
export function emiFor(amount, months, ratePa) {
  const P = Number(amount) || 0
  const n = Number(months) || 0
  if (!P || !n || ratePa == null) return 0
  const r = ratePa / 12 / 100
  if (!r) return Math.round(P / n)
  return Math.round((P * r * (1 + r) ** n) / ((1 + r) ** n - 1))
}

/** EMI saved on an application (calculated by the server with that application's rate). */
export const emiOf = (app) => app?.emi ?? emiFor(app?.amount, app?.tenure, app?.interestRatePa)
export const tenureLabel = (m) => (m ? (m % 12 === 0 ? `${m} months (${m / 12} yr${m > 12 ? 's' : ''})` : `${m} months`) : '—')

// ---------- Credit score (the score itself comes from the server) ----------
export const MIN_CREDIT_SCORE = 650

export function creditBand(score) {
  if (score == null) return null
  if (score < MIN_CREDIT_SCORE) return { label: 'Poor', tone: 'danger', ok: false }
  if (score < 700) return { label: 'Fair', tone: 'warning', ok: true }
  if (score < 750) return { label: 'Good', tone: 'info', ok: true }
  return { label: 'Excellent', tone: 'success', ok: true }
}
