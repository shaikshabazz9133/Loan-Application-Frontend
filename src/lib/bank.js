/** Disbursement bank account helpers. */

export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const isValidIfsc = (v) => IFSC_RE.test(v)
export const isValidAccount = (v) => /^\d{9,18}$/.test(v)

const BANKS = {
  SBIN: 'State Bank of India', HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank', BARB: 'Bank of Baroda', CNRB: 'Canara Bank', UBIN: 'Union Bank of India', IDIB: 'Indian Bank',
  YESB: 'Yes Bank', INDB: 'IndusInd Bank', IDFB: 'IDFC FIRST Bank', FDRL: 'Federal Bank', BKID: 'Bank of India', IOBA: 'Indian Overseas Bank',
}
export const bankFromIfsc = (ifsc = '') => BANKS[ifsc.slice(0, 4)] || (isValidIfsc(ifsc) ? `${ifsc.slice(0, 4)} Bank` : '')

export const ACCOUNT_TYPES = ['Savings', 'Current']

export const maskAccount = (acc = '') => (acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc)

/** "HDFC Bank •••• 1234" */
export const bankLabel = (bank) => (bank ? `${bank.bankName} ${maskAccount(bank.account)}` : '—')

/** Simulated bank transfer reference (UTR). */
export const makeUtr = (ifsc = 'XXXX', seed = Date.now()) =>
  `${ifsc.slice(0, 4)}N${String(seed).slice(-6)}${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`

const norm = (s = '') => s.toLowerCase().replace(/[^a-z]/g, '')
export const holderMatches = (holder, fullName) => !!holder && norm(holder) === norm(fullName)
