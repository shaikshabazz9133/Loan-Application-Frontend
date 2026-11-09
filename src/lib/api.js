/**
 * Talks to the FastAPI backend. Everything network-related lives here:
 *  - base URL (VITE_API_URL, default http://localhost:8000/api/v1)
 *  - the signed-in session { accessToken, refreshToken, user } in localStorage ("Remember me") or sessionStorage
 *  - automatic token refresh when the access token expires (one retry per request)
 *  - turning error responses into ApiError with a readable message and per-field details
 */

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')
const SESSION_KEY = 'lendwise.session'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR', details = {} } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Field errors for a form: validation details plus "email/mobile already used" conflicts. */
export function fieldErrors(err) {
  const errors = { ...(err?.details || {}) }
  if (err?.code === 'EMAIL_TAKEN') errors.email = err.message
  if (err?.code === 'MOBILE_TAKEN') errors.mobile = err.message
  if (errors.lat || errors.lng) errors.location = errors.lat || errors.lng
  return errors
}

// ---------- session storage ----------
function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

let session = readSession()
let onSessionEnded = () => {}

export const getSession = () => session

/** The store registers this so it can sign the user out when the session can't be refreshed. */
export const setSessionEndedHandler = (fn) => {
  onSessionEnded = fn
}

export function saveSession(next) {
  session = next
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    if (next) (next.remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    /* storage blocked - session still works until the tab closes */
  }
}

export const clearSession = () => saveSession(null)

// ---------- requests ----------
let refreshing = null // share one refresh call between requests that fail at the same time

async function refreshTokens() {
  if (!session?.refreshToken) return false
  refreshing ||= send('/auth/refresh', { method: 'POST', body: { refreshToken: session.refreshToken }, auth: false, retry: false })
    .then((res) => (saveSession({ ...session, ...res }), true))
    .catch(() => false)
    .finally(() => (refreshing = null))
  return refreshing
}

/** body: plain object (sent as JSON) or FormData (multipart, for file uploads). as: 'json' | 'blob'. */
async function send(path, { method = 'GET', body, auth = true, retry = true, as = 'json' } = {}) {
  const isForm = body instanceof FormData
  const headers = { Accept: as === 'blob' ? '*/*' : 'application/json' }
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json' // the browser sets the multipart boundary itself
  if (auth && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined || isForm ? body : JSON.stringify(body) })
  } catch {
    throw new ApiError('Cannot reach the server. Please make sure the backend is running.', { code: 'NETWORK_ERROR' })
  }

  if (res.status === 401 && auth && retry && (await refreshTokens())) return send(path, { method, body, auth, retry: false, as })

  if (res.ok && as === 'blob') return res.blob()
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const error = data?.error || {}
    const err = new ApiError(error.message || `Request failed (${res.status})`, { status: res.status, code: error.code, details: error.details })
    // Signed-in request rejected for good (expired, invalid or deactivated account) -> sign out.
    if (auth && (res.status === 401 || (res.status === 403 && err.code === 'ACCOUNT_INACTIVE'))) {
      clearSession()
      onSessionEnded(err)
    }
    throw err
  }
  return data
}

// ---------- endpoints ----------
/** Staff (agents and managers) only. Customers apply and track without an account. */
export const authApi = {
  login: (data) => send('/auth/login', { method: 'POST', body: data, auth: false }),
  me: () => send('/auth/me'),
}

export const agentsApi = {
  list: () => send('/agents'),
  create: (data) => send('/agents', { method: 'POST', body: data }),
  update: (id, data) => send(`/agents/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => send(`/agents/${id}`, { method: 'DELETE' }),
}

export const applicationsApi = {
  // ----- public: applicants have no account -----
  /** Apply-form options: purposes, employment types, tenures, limits, document rules. */
  options: () => send('/applications/options', { auth: false }),
  /** formData: "data" (application JSON) + one file per document type. Returns { application }. */
  submit: (formData) => send('/applications', { method: 'POST', body: formData, auth: false }),
  /** Status for an application id + the applicant's mobile number. */
  track: (applicationId, mobile) => send('/applications/track', { method: 'POST', body: { applicationId, mobile }, auth: false }),

  // ----- staff -----
  /** Agent: open applications + the ones they accepted. Manager: all. */
  list: () => send('/applications'),
  /** action: 'accept' | 'approve' | 'reject' | 'disburse'; extra: { note, reason, mode }. Returns the updated application. */
  act: (appId, action, extra = {}) => send(`/applications/${encodeURIComponent(appId)}/actions`, { method: 'POST', body: { action, ...extra } }),
  document: (appId, docType) => send(`/applications/${encodeURIComponent(appId)}/documents/${docType}`, { as: 'blob' }),
}

export const eligibilityApi = {
  /** { pan } -> simulated credit score; add { amount, income, tenure } for rate, EMI and totals. Public. */
  quote: (data) => send('/eligibility/quote', { method: 'POST', body: data, auth: false }),
}

export const customersApi = {
  /** Everyone who has applied (one customer per mobile number). Manager only. */
  list: () => send('/customers'),
}
