import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ASSIGNMENT_RADIUS_KM, STATUS } from './constants'
import { agentsApi, applicationsApi, authApi, clearSession, customersApi, getSession, saveSession, setSessionEndedHandler } from './api'
import { distanceKm, uid } from './utils'
import { MIN_CREDIT_SCORE, creditScoreFor } from './kyc'
import { bankLabel, makeUtr } from './bank'
import { creditOk, recommendBlocker, verificationProgress } from './verification'

/**
 * App data layer - components only use the useStore() hook below.
 *
 * From the backend API (src/lib/api.js): sign up, sign in, session, agents, customers, and loan applications
 * (submit + list + documents). `users` is a local cache of accounts loaded from the API so pages can show names.
 *
 * Still local (no backend APIs yet): the agent/manager workflow after submission - accept, decline, verify,
 * recommend, approve, reject, disburse. Those changes are kept in localStorage and layered over the server
 * copy of each application (see WORKFLOW_FIELDS), so they survive a reload in this browser.
 */

const DB_KEY = 'lendwise.db.v6'

/** Fields changed by the local workflow. Everything else (what the customer submitted) comes from the server. */
const WORKFLOW_FIELDS = ['status', 'agentId', 'agentDistanceKm', 'declinedBy', 'creditCheck', 'verification', 'agentDecision', 'managerDecision', 'disbursement', 'history', 'updatedAt']

/** Server applications don't carry workflow state yet - give them the empty defaults the pages expect. */
const withWorkflowDefaults = (app) => ({
  agentId: null,
  agentDistanceKm: null,
  declinedBy: [],
  creditCheck: null,
  verification: { checks: {}, comments: [] },
  agentDecision: null,
  managerDecision: null,
  disbursement: null,
  history: [],
  ...app,
})

/** Server copy + this browser's workflow progress for the same application. */
function mergeApplications(local, server) {
  const byId = new Map(local.map((a) => [a.id, a]))
  const merged = server.map((s) => {
    const mine = byId.get(s.id)
    const base = withWorkflowDefaults(s)
    if (!mine) return base
    return { ...base, ...Object.fromEntries(WORKFLOW_FIELDS.filter((k) => mine[k] !== undefined).map((k) => [k, mine[k]])) }
  })
  const serverIds = new Set(server.map((a) => a.id))
  // Keep applications this browser knows but the current user can't list (e.g. another role's view in another tab).
  return [...merged, ...local.filter((a) => !serverIds.has(a.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const freshDb = () => ({ users: [], applications: [] })

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

  // Managers: every registered customer (they appear as soon as they sign up).
  const loadCustomers = useCallback(async () => {
    const customers = await customersApi.list()
    setDb((d) => ({ ...d, users: [...d.users.filter((u) => u.role !== 'customer' || u.id === currentUser?.id), ...customers] }))
  }, [currentUser?.id])

  // Everyone: applications this user may see (own / open in agent's area / all for managers).
  const loadApplications = useCallback(async () => {
    const list = await applicationsApi.list()
    setDb((d) => ({ ...d, applications: mergeApplications(d.applications, list) }))
  }, [])

  const refresh = useCallback(() => {
    if (!getSession()) return Promise.resolve()
    const role = getSession().user?.role
    return Promise.all([loadApplications(), ...(role === 'manager' ? [loadAgents(), loadCustomers()] : [])])
  }, [loadApplications, loadAgents, loadCustomers])

  useEffect(() => {
    if (!currentUser) return
    refresh().catch((err) => toast.error(err.message))
    // Pick up new sign-ups and submissions when the user comes back to the tab.
    const onVisible = () => document.visibilityState === 'visible' && refresh().catch(() => {})
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [currentUser?.id, currentUser?.role, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

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
  /** Sends the form + documents to the API (formData built by the apply form). Throws ApiError with per-field details. */
  const submitApplication = useCallback(async (formData) => {
    const { application, areaAgents } = await applicationsApi.submit(formData)
    const app = withWorkflowDefaults(application)
    setDb((d) => ({ ...d, applications: [app, ...d.applications.filter((a) => a.id !== app.id)] }))
    return { app, areaAgents }
  }, [])

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
      const score = app.creditScore ?? creditScoreFor(app.pan) // score pulled when the customer applied
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

  /** Clears this browser's local workflow progress and reloads everything from the server. */
  const resetDemo = useCallback(() => {
    setDb({ ...freshDb(), users: currentUser ? [currentUser] : [] })
    refresh().catch(() => {})
  }, [currentUser, refresh])

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
    refresh,
    resetDemo,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
