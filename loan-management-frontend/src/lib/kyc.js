/** KYC helpers: Aadhaar (Verhoeff), PAN, age, EMI and a simulated credit bureau. */

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
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

/** Generic Verhoeff validation (last digit is the check digit). */
export function verhoeffValid(digits) {
  let c = 0
  ;[...digits].reverse().forEach((ch, i) => (c = D[c][P[i % 8][+ch]]))
  return c === 0
}

export const isValidAadhaar = (num) => /^[2-9]\d{11}$/.test(num) && verhoeffValid(num)

/** Demo mode (set VITE_AADHAAR_DEMO_MODE=true): accept any 12-digit number starting 2-9, checksum becomes a warning. */
export const AADHAAR_DEMO_MODE = import.meta.env?.VITE_AADHAAR_DEMO_MODE === 'true'
export const isAcceptableAadhaar = (num) => /^[2-9]\d{11}$/.test(num) && (AADHAAR_DEMO_MODE || verhoeffValid(num))

/** Append a Verhoeff check digit to an 11-digit string. */
export function withAadhaarCheckDigit(eleven) {
  let c = 0
  ;[...eleven].reverse().forEach((ch, i) => (c = D[c][P[(i + 1) % 8][+ch]]))
  return eleven + INV[c]
}

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
export const TENURES = [6, 12, 18, 24, 36, 48, 60, 72, 84]
export const INTEREST_RATE = 12 // % p.a., indicative
export const MAX_FOIR = 0.5 // EMI should be at most 50% of monthly income

export function emiFor(amount, months, ratePa = INTEREST_RATE) {
  const P = Number(amount) || 0
  const n = Number(months) || 0
  if (!P || !n) return 0
  const r = ratePa / 12 / 100
  return Math.round((P * r * (1 + r) ** n) / ((1 + r) ** n - 1))
}
export const tenureLabel = (m) => (m ? (m % 12 === 0 ? `${m} months (${m / 12} yr${m > 12 ? 's' : ''})` : `${m} months`) : '—')

// ---------- Simulated credit bureau (CIBIL-style 300–900) ----------
export const MIN_CREDIT_SCORE = 650

/** Deterministic per PAN, so the same customer always gets the same score. ~25% of PANs score below 650. */
export function creditScoreFor(pan) {
  let h = 2166136261
  for (const ch of pan) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h % 1000 < 250 ? 480 + ((h >>> 10) % 170) : 650 + ((h >>> 10) % 231)
}

export function creditBand(score) {
  if (score == null) return null
  if (score < MIN_CREDIT_SCORE) return { label: 'Poor', tone: 'danger', ok: false }
  if (score < 700) return { label: 'Fair', tone: 'warning', ok: true }
  if (score < 750) return { label: 'Good', tone: 'info', ok: true }
  return { label: 'Excellent', tone: 'success', ok: true }
}

// ---------- Demo helpers ----------
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
/** Build a valid PAN for a surname initial whose simulated score is low or high. */
export function makeDemoPan(surnameInitial = 'K', wantLow = false, seed = Math.floor(Math.random() * 1e6)) {
  for (let j = 0; j < 20000; j++) {
    const s = seed + j * 7919
    const pre = LETTERS[s % 23] + LETTERS[(s >> 3) % 23] + LETTERS[(s >> 6) % 23]
    const pan = `${pre}P${surnameInitial.toUpperCase()}${String((s * 13) % 10000).padStart(4, '0')}${LETTERS[(s >> 9) % 23]}`
    if (isValidPan(pan) && creditScoreFor(pan) < MIN_CREDIT_SCORE === wantLow) return pan
  }
  return 'ABCPK1234Z'
}
export function makeDemoAadhaar(seed = Math.floor(Math.random() * 1e9)) {
  const base = String(2 + (seed % 8)) + String((seed * 7919) % 1e10).padStart(10, '0')
  return withAadhaarCheckDigit(base)
}
