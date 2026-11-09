import { STATUS } from './constants'
import { MAX_FOIR, MIN_CREDIT_SCORE, ageFrom, emiOf, formatAadhaar, isValidAadhaar, tenureLabel } from './kyc'
import { formatDate, formatINR } from './utils'
import { holderMatches } from './bank'

export const DOC_TYPES = [
  { key: 'pan', label: 'PAN card', hint: 'Front side, clearly readable' },
  { key: 'aadhaar', label: 'Aadhaar card', hint: 'Front & back in one file' },
  { key: 'salary', label: 'Salary slips', hint: 'Last 3 months', onlyFor: 'Salaried' },
  { key: 'bank', label: 'Bank statements', hint: 'Last 6 months' },
  { key: 'address', label: 'Address proof', hint: 'Utility bill, rent agreement or passport' },
]

/** Salary slips are mandatory only for salaried applicants. */
export const isDocRequired = (doc, employment) => !doc.onlyFor || doc.onlyFor === employment

export const requiredDocs = (app) => DOC_TYPES.filter((d) => isDocRequired(d, app.employment))

/** Every customer field the agent must verify, with the value shown next to it. */
export function fieldChecks(app) {
  const emi = emiOf(app)
  const foir = app.income ? emi / app.income : 0
  return [
    { key: 'identity', label: 'Name & date of birth', value: `${app.fullName} · ${formatDate(app.dob)} (${ageFrom(app.dob)} yrs)` },
    { key: 'aadhaar', label: 'Aadhaar number', value: formatAadhaar(app.aadhaar), sensitive: true, warn: app.aadhaar && !isValidAadhaar(app.aadhaar) ? 'Fails UIDAI checksum (accepted in demo mode). Verify against the physical card.' : null },
    { key: 'pan', label: 'PAN number', value: app.pan, sensitive: true },
    { key: 'contact', label: 'Mobile & email', value: `${app.mobile} · ${app.email}` },
    { key: 'income', label: 'Income & employment', value: `${formatINR(app.income)}/month · ${app.employment}` },
    {
      key: 'loan',
      label: 'Loan amount & tenure',
      value: `${formatINR(app.amount)} · ${tenureLabel(app.tenure)} · ${app.interestRatePa}% p.a. · EMI ${formatINR(emi)}`,
      warn: foir > MAX_FOIR ? `EMI is ${Math.round(foir * 100)}% of income (limit ${MAX_FOIR * 100}%)` : null,
    },
    {
      key: 'bank',
      label: 'Disbursement bank account',
      value: app.bank ? `${app.bank.holder} · ${app.bank.bankName} · A/c ${app.bank.account} · ${app.bank.ifsc} (${app.bank.type})` : '—',
      sensitive: true,
      warn: app.bank && !holderMatches(app.bank.holder, app.fullName) ? 'Account holder name differs from the applicant name' : null,
    },
    { key: 'address', label: 'Address & pincode', value: `${app.address}, ${app.city} - ${app.pincode}` },
    { key: 'location', label: 'GPS location visited', value: app.location ? `${app.location.lat.toFixed(5)}, ${app.location.lng.toFixed(5)}` : '—' },
  ]
}

export const docCheckKey = (docKey) => `doc_${docKey}`

export function allCheckKeys(app) {
  return [...fieldChecks(app).map((c) => c.key), ...requiredDocs(app).map((d) => docCheckKey(d.key))]
}

export function verificationProgress(app) {
  const keys = allCheckKeys(app)
  const checks = app.verification?.checks || {}
  const done = keys.filter((k) => checks[k]).length
  return { done, total: keys.length, complete: done === keys.length }
}

export const creditChecked = (app) => app.creditCheck?.score != null
export const creditOk = (app) => creditChecked(app) && app.creditCheck.score >= MIN_CREDIT_SCORE

/** Why the agent can't recommend yet (null when allowed). */
export function recommendBlocker(app) {
  if (![STATUS.ASSIGNED, STATUS.IN_VERIFICATION].includes(app.status)) return 'This application is no longer open for verification.'
  if (!creditChecked(app)) return 'Run the credit score check first.'
  if (!creditOk(app)) return `Credit score ${app.creditCheck.score} is below the minimum of ${MIN_CREDIT_SCORE}. This application must be rejected.`
  const missing = requiredDocs(app).filter((d) => !app.documents?.[d.key])
  if (missing.length) return `Missing documents: ${missing.map((d) => d.label).join(', ')}.`
  const p = verificationProgress(app)
  if (!p.complete) return `Verify all fields and documents (${p.done}/${p.total} done).`
  return null
}
