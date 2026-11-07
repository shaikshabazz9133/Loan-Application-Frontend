import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ASSIGNMENT_RADIUS_KM, STATUS } from './constants'
import { agentsApi, authApi, clearSession, getSession, saveSession, setSessionEndedHandler } from './api'
import { distanceKm, uid } from './utils'
import { MIN_CREDIT_SCORE, creditScoreFor, isAcceptableAadhaar, isValidPan } from './kyc'
import { bankLabel, isValidAccount, isValidIfsc, makeUtr } from './bank'
import { creditOk, recommendBlocker, verificationProgress } from './verification'

/**
 * App data layer - components only use the useStore() hook below.
 *
 * From the backend API (src/lib/api.js):  sign up, sign in, session, and manager agent management.
 * Still in localStorage (no backend APIs yet): loan applications. `users` here is a local cache of
 * accounts the app has seen (signed-in user + agents loaded from the API) so applications can show names.
 */

const DB_KEY = 'lendwise.db.v5'

const freshDb = () => ({ users: [], applications: [], seq: 1020 })

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore corrupt / blocked storage */
  }
  return freshDb()
}

const now = () => new Date().toISOString()

/** Active agents with a location, sorted by distance to a point. */
export function rankAgents(users, point, { activeOnly = true } = {}) {
  return users
    .filter((u) => u.role === 'agent' && u.location && (!activeOnly || u.active))
    .map((u) => ({ agent: u, distance: distanceKm(point, u.location) }))
    .sort((a, b) => a.distance - b.distance)
}

/** An application is in an agent's area when it lies within the agent's 2 km radius. */
export const inAgentArea = (app, agent) => !!agent?.location && distanceKm(app.location, agent.location) <= ASSIGNMENT_RADIUS_KM

/** Open requests an agent may accept: unclaimed, in their area, not declined by them. */
export const openRequestsFor = (agent, applications) =>
  agent?.active
    ? applications.filter((a) => a.status === STATUS.UNASSIGNED && !a.agentId && inAgentArea(a, agent) && !(a.declinedBy || []).some((d) => d.agentId === agent.id))
    : []

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(loadDb)
  const [session, setSession] = useState(getSession)

  useEffect(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      /* storage full or blocked — demo keeps working in memory */
    }
  }, [db])

  // Keep several open tabs (e.g. two agents) in sync, so "first to accept" behaves like a shared system.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== DB_KEY || !e.newValue) return
      try {
        setDb(JSON.parse(e.newValue))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const currentUser = session?.user || null

  /** Add or update users in the local cache (by id). */
  const upsertUsers = useCallback((list) => {
    setDb((d) => {
      const byId = new Map(d.users.map((u) => [u.id, u]))
      list.forEach((u) => byId.set(u.id, { ...byId.get(u.id), ...u }))
      return { ...d, users: [...byId.values()] }
    })
  }, [])

  const startSession = useCallback((res, remember) => {
    const next = { accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user, remember }
    saveSession(next)
    setSession(next)
    return res.user
  }, [])

  // The API signs us out when a session can't be refreshed or the account was deactivated.
  useEffect(() => {
    setSessionEndedHandler((err) => {
      setSession(null)
      toast.error(err.message)
    })
  }, [])

  // On page load, confirm the saved session with the server and get the latest profile.
  useEffect(() => {
    if (!getSession()) return
    authApi
      .me()
      .then((user) => {
        const current = getSession()
        if (!current) return
        const next = { ...current, user }
        saveSession(next)
        setSession(next)
      })
      .catch(() => {
        /* invalid session is handled by the API layer; network errors keep the saved session */
      })
  }, [])

  // Keep the signed-in user in the local cache so applications can show their name.
  useEffect(() => {
    if (currentUser) upsertUsers([currentUser])
  }, [currentUser, upsertUsers])

  // Managers: load the real agent list (replaces any cached agents).
  const loadAgents = useCallback(async () => {
    const agents = await agentsApi.list()
    setDb((d) => ({ ...d, users: [...d.users.filter((u) => u.role !== 'agent'), ...agents] }))
  }, [])

  useEffect(() => {
    if (currentUser?.role === 'manager') loadAgents().catch((err) => toast.error(err.message))
  }, [currentUser?.id, currentUser?.role, loadAgents])

  // ---------- helpers ----------
  const patchApp = useCallback((id, fn) => {
    setDb((d) => ({ ...d, applications: d.applications.map((a) => (a.id === id ? fn(a) : a)) }))
  }, [])

  const historyEntry = (actor, action, note) => ({
    id: uid('h'),
    at: now(),
    actorRole: actor?.role || 'system',
    actorName: actor?.name || 'System',
    action,
    note,
  })

  // ---------- auth ----------
  /** Sign in with email or mobile. Throws ApiError (e.g. wrong password, deactivated agent). */
  const login = useCallback(
    async (identifier, password, remember) => startSession(await authApi.login({ identifier: identifier.trim(), password, remember }), remember),
    [startSession]
  )

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  /** Customer sign-up; the API signs the new customer in straight away. */
  const signup = useCallback(
    async ({ name, email, mobile, password, terms }) =>
      startSession(await authApi.register({ name: name.trim(), email: email.trim(), mobile, password, termsAccepted: terms }), true),
    [startSession]
  )

  // ---------- customer ----------
  const submitApplication = useCallback(
    (form) => {
      // No auto-assignment: the request goes to the manager and is offered to every active agent in the area.
      if (!isAcceptableAadhaar(form.aadhaar)) throw new Error('Invalid Aadhaar number.')
      if (!isValidPan(form.pan)) throw new Error('Invalid PAN number.')
      if (!form.bank || !isValidAccount(form.bank.account) || !isValidIfsc(form.bank.ifsc)) throw new Error('Invalid bank account details.')
      const areaAgents = db.users.filter((u) => u.role === 'agent' && u.active && inAgentArea(form, u))
      const id = `LN-${db.seq}`
      const app = {
        id,
        customerId: currentUser.id,
        agentId: null,
        agentDistanceKm: null,
        declinedBy: [],
        ...form,
        amount: Number(form.amount),
        income: Number(form.income),
        tenure: Number(form.tenure),
        creditCheck: null,
        disbursement: null,
        status: STATUS.UNASSIGNED,
        verification: { checks: {}, comments: [] },
        agentDecision: null,
        managerDecision: null,
        history: [
          historyEntry(currentUser, 'Application submitted', `Loan request for ₹${Number(form.amount).toLocaleString('en-IN')}`),
          historyEntry(
            null,
            'Sent to manager & area agents',
            areaAgents.length
              ? `Visible to the manager and ${areaAgents.length} agent${areaAgents.length > 1 ? 's' : ''} within ${ASSIGNMENT_RADIUS_KM} km`
              : `Visible to the manager. No active agent covers this location yet`
          ),
        ],
        createdAt: now(),
        updatedAt: now(),
      }
      setDb((d) => ({ ...d, seq: d.seq + 1, applications: [app, ...d.applications] }))
      return { app, areaAgents: areaAgents.length }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.users, db.seq, currentUser]
  )

  // ---------- agent ----------
  /** First agent to accept wins. Re-reads storage so another tab's claim is respected. */
  const claimApplication = useCallback(
    (appId) => {
      const me = currentUser
      const latest = loadDb().applications.find((a) => a.id === appId) || db.applications.find((a) => a.id === appId)
      if (!latest) throw new Error('Application not found.')
      if (latest.agentId && latest.agentId !== me.id) throw new Error('Another agent has already accepted this application.')
      if (latest.status !== STATUS.UNASSIGNED) throw new Error('This application is no longer open.')
      if (!inAgentArea(latest, me)) throw new Error('This application is outside your area.')
      let taken = false
      setDb((d) => ({
        ...d,
        applications: d.applications.map((a) => {
          if (a.id !== appId) return a
          if (a.agentId || a.status !== STATUS.UNASSIGNED) {
            taken = true
            return a
          }
          return {
            ...a,
            agentId: me.id,
            agentDistanceKm: +distanceKm(a.location, me.location).toFixed(2),
            status: STATUS.ASSIGNED,
            updatedAt: now(),
            history: [...a.history, historyEntry(me, 'Accepted by agent', `${me.name} accepted this application`)],
          }
        }),
      }))
      if (taken) throw new Error('Another agent has already accepted this application.')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.applications, currentUser]
  )

  /** Agent passes on an open request. It stays open for other agents in the area. */
  const declineApplication = useCallback(
    (appId, reason) =>
      patchApp(appId, (a) =>
        a.status !== STATUS.UNASSIGNED
          ? a
          : {
              ...a,
              updatedAt: now(),
              declinedBy: [...(a.declinedBy || []), { agentId: currentUser.id, name: currentUser.name, reason, at: now() }],
              history: [...a.history, historyEntry(currentUser, 'Declined by agent', reason || 'Agent declined this request')],
            }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  )

  /** Simulated credit bureau pull (CIBIL-style). Runs once per application; the score is kept for the manager. */
  const runCreditCheck = useCallback(
    (appId) => {
      const app = db.applications.find((a) => a.id === appId)
      if (!app || app.agentId !== currentUser.id) throw new Error('Only the assigned agent can run the credit check.')
      if (app.creditCheck) return app.creditCheck.score
      const score = creditScoreFor(app.pan)
      patchApp(appId, (a) => ({
        ...a,
        status: a.status === STATUS.ASSIGNED ? STATUS.IN_VERIFICATION : a.status,
        creditCheck: { score, fetchedAt: now(), by: currentUser.name },
        updatedAt: now(),
        history: [...a.history, historyEntry(currentUser, 'Credit score checked', `Score ${score}${score < MIN_CREDIT_SCORE ? ` — below minimum ${MIN_CREDIT_SCORE}` : ''}`)],
      }))
      return score
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.applications, currentUser]
  )

  const startVerification = useCallback(
    (appId) =>
      patchApp(appId, (a) =>
        a.status !== STATUS.ASSIGNED
          ? a
          : { ...a, status: STATUS.IN_VERIFICATION, updatedAt: now(), history: [...a.history, historyEntry(currentUser, 'Verification started', 'Agent started reviewing customer information')] }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  )

  const setCheck = useCallback(
    (appId, key, value) =>
      patchApp(appId, (a) => {
        const checks = { ...a.verification.checks, [key]: value }
        const status = a.status === STATUS.ASSIGNED ? STATUS.IN_VERIFICATION : a.status
        const history = [...a.history]
        if (a.status === STATUS.ASSIGNED) history.push(historyEntry(currentUser, 'Verification started', 'Agent started reviewing customer information'))
        const next = { ...a, verification: { ...a.verification, checks } }
        if (verificationProgress(next).complete && !verificationProgress(a).complete)
          history.push(historyEntry(currentUser, 'Verification completed', 'All verification checks completed'))
        return { ...a, status, history, updatedAt: now(), verification: { ...a.verification, checks } }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  )

  const addComment = useCallback(
    (appId, text) =>
      patchApp(appId, (a) => ({
        ...a,
        updatedAt: now(),
        verification: { ...a.verification, comments: [...a.verification.comments, { id: uid('c'), at: now(), by: currentUser.name, text }] },
        history: [...a.history, historyEntry(currentUser, 'Verification comment added', text)],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  )

  const agentRecommend = useCallback(
    (appId, note) => {
      const app = db.applications.find((a) => a.id === appId)
      if (!app) throw new Error('Application not found.')
      const blocker = recommendBlocker(app)
      if (blocker) throw new Error(blocker)
      patchApp(appId, (a) => ({
        ...a,
        status: STATUS.AGENT_APPROVED,
        updatedAt: now(),
        agentDecision: { decision: 'recommended', note, at: now(), by: currentUser.name },
        history: [...a.history, historyEntry(currentUser, 'Recommended for approval', note || 'Agent recommended this application to the manager')],
      }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.applications, currentUser]
  )

  const agentReject = useCallback(
    (appId, reason) => {
      if (!reason?.trim()) throw new Error('A rejection reason is required.')
      patchApp(appId, (a) => ({
        ...a,
        status: STATUS.AGENT_REJECTED,
        updatedAt: now(),
        agentDecision: { decision: 'rejected', reason, at: now(), by: currentUser.name },
        history: [...a.history, historyEntry(currentUser, 'Rejected by agent', reason)],
      }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  )

  // ---------- manager ----------
  const managerApprove = useCallback(
    (appId, note) => {
      const app = db.applications.find((a) => a.id === appId)
      // Business rule: a manager can only approve after the agent has verified and recommended.
      if (app?.status !== STATUS.AGENT_APPROVED) throw new Error('This application must be verified and approved by the agent first.')
      if (!creditOk(app)) throw new Error(`Credit score is below the minimum of ${MIN_CREDIT_SCORE}. The loan cannot be approved.`)
      patchApp(appId, (a) => ({
        ...a,
        status: STATUS.APPROVED,
        updatedAt: now(),
        managerDecision: { decision: 'approved', note, at: now(), by: currentUser.name },
        history: [...a.history, historyEntry(currentUser, 'Loan approved', note || 'Final approval granted by manager')],
      }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.applications, currentUser]
  )

  /** Send the approved amount to the customer's verified bank account (simulated NEFT/IMPS). */
  const disburseLoan = useCallback(
    (appId, mode = 'NEFT') => {
      const app = db.applications.find((a) => a.id === appId)
      if (app?.status !== STATUS.APPROVED) throw new Error('Only approved loans can be disbursed.')
      if (!app.bank) throw new Error('No bank account on file for this application.')
      const utr = makeUtr(app.bank.ifsc)
      patchApp(appId, (a) => ({
        ...a,
        status: STATUS.DISBURSED,
        updatedAt: now(),
        disbursement: { amount: a.amount, mode, utr, at: now(), by: currentUser.name },
        history: [...a.history, historyEntry(currentUser, 'Amount disbursed', `₹${a.amount.toLocaleString('en-IN')} sent to ${bankLabel(a.bank)} via ${mode} · UTR ${utr}`)],
      }))
      return utr
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.applications, currentUser]
  )

  const managerReject = useCallback(
    (appId, reason) => {
      if (!reason?.trim()) throw new Error('A rejection reason is required.')
      patchApp(appId, (a) => ({
        ...a,
        status: STATUS.REJECTED,
        updatedAt: now(),
        managerDecision: { decision: 'rejected', reason, at: now(), by: currentUser.name },
        history: [...a.history, historyEntry(currentUser, 'Loan rejected', reason)],
      }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  )

  /** Create (no id) or edit (with id) an agent through the API. Throws ApiError with field details. */
  const saveAgent = useCallback(
    async ({ id, ...data }) => {
      const saved = id ? await agentsApi.update(id, data) : await agentsApi.create(data)
      upsertUsers([saved])
      return saved
    },
    [upsertUsers]
  )

  /** Deactivating an agent (API) also returns their unfinished cases to the open pool so area agents can accept them. */
  const setAgentActive = useCallback(
    async (agentId, active) => {
      await agentsApi.update(agentId, { active })
      const agent = db.users.find((u) => u.id === agentId)
      const releasable = (a) => a.agentId === agentId && [STATUS.ASSIGNED, STATUS.IN_VERIFICATION].includes(a.status)
      const released = active ? 0 : db.applications.filter(releasable).length
      setDb((d) => ({
        ...d,
        users: d.users.map((u) => (u.id === agentId ? { ...u, active } : u)),
        applications: active
          ? d.applications
          : d.applications.map((a) =>
              releasable(a)
                ? {
                    ...a,
                    agentId: null,
                    agentDistanceKm: null,
                    status: STATUS.UNASSIGNED,
                    verification: { ...a.verification, checks: {} },
                    updatedAt: now(),
                    history: [...a.history, historyEntry(currentUser, 'Returned to open requests', `${agent?.name} was deactivated`)],
                  }
                : a
            ),
      }))
      return released
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.users, db.applications, currentUser]
  )

  const deleteAgent = useCallback(
    async (agentId) => {
      if (db.applications.some((a) => a.agentId === agentId))
        throw new Error('This agent has applications assigned. Deactivate the agent instead, or reassign the applications first.')
      await agentsApi.remove(agentId)
      setDb((d) => ({ ...d, users: d.users.filter((u) => u.id !== agentId) }))
    },
    [db.applications]
  )

  /** Clears local application data (accounts live in the backend and are kept). */
  const resetDemo = useCallback(() => {
    setDb({ ...freshDb(), users: currentUser ? [currentUser] : [] })
    if (currentUser?.role === 'manager') loadAgents().catch(() => {})
  }, [currentUser, loadAgents])

  const value = {
    users: db.users,
    applications: db.applications,
    currentUser,
    getUser: (id) => db.users.find((u) => u.id === id),
    login,
    logout,
    signup,
    submitApplication,
    startVerification,
    setCheck,
    addComment,
    agentRecommend,
    agentReject,
    managerApprove,
    managerReject,
    disburseLoan,
    claimApplication,
    runCreditCheck,
    declineApplication,
    saveAgent,
    setAgentActive,
    deleteAgent,
    loadAgents,
    resetDemo,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
