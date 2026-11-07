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
  if (errors.termsAccepted) errors.terms = errors.termsAccepted
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

async function send(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('Cannot reach the server. Please make sure the backend is running.', { code: 'NETWORK_ERROR' })
  }

  if (res.status === 401 && auth && retry && (await refreshTokens())) return send(path, { method, body, auth, retry: false })

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
export const authApi = {
  register: (data) => send('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (data) => send('/auth/login', { method: 'POST', body: data, auth: false }),
  me: () => send('/auth/me'),
}

export const agentsApi = {
  list: () => send('/agents'),
  create: (data) => send('/agents', { method: 'POST', body: data }),
  update: (id, data) => send(`/agents/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => send(`/agents/${id}`, { method: 'DELETE' }),
}
