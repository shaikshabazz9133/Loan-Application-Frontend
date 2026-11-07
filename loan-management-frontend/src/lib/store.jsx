import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ASSIGNMENT_RADIUS_KM, STATUS } from './constants'
import { seedApplications, seedUsers } from './seed'
import { distanceKm, uid } from './utils'
import { MIN_CREDIT_SCORE, creditScoreFor, isAcceptableAadhaar, isValidPan } from './kyc'
import { bankLabel, isValidAccount, isValidIfsc, makeUtr } from './bank'
import { creditOk, recommendBlocker, verificationProgress } from './verification'

/**
 * Frontend-only data layer. Everything is persisted to localStorage so the demo
 * behaves like a real app across reloads. Replace these functions with API calls
 * when the backend is ready — the components only use the hook below.
 */

const DB_KEY = 'lendwise.db.v4'
const SESSION_KEY = 'lendwise.session'

const withDistances = (apps, users) =>
  apps.map((a) => {
    const agent = users.find((u) => u.id === a.agentId)
    return { ...a, agentDistanceKm: agent ? +distanceKm(a.location, agent.location).toFixed(2) : null }
  })

function freshDb() {
  const users = seedUsers()
  return { users, applications: withDistances(seedApplications(users), users), seq: 1020 }
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore corrupt / blocked storage */
  }
  return freshDb()
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
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
  const [session, setSession] = useState(loadSession)

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

  const currentUser = useMemo(() => db.users.find((u) => u.id === session?.userId) || null, [db.users, session])

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
  const login = useCallback(
    (identifier, password, remember) => {
      const id = identifier.trim().toLowerCase()
      const user = db.users.find((u) => u.email.toLowerCase() === id || u.mobile === id)
      if (!user || user.password !== password) throw new Error('Invalid email/mobile or password.')
      if (user.role === 'agent' && !user.active) throw new Error('Your agent account is deactivated. Please contact your manager.')
      const s = { userId: user.id }
      try {
        localStorage.removeItem(SESSION_KEY)
        sessionStorage.removeItem(SESSION_KEY)
        ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s))
      } catch {
        /* ignore */
      }
      setSession(s)
      return user
    },
    [db.users]
  )

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }, [])

  const emailOrMobileTaken = (users, email, mobile, exceptId) =>
    users.some((u) => u.id !== exceptId && (u.email.toLowerCase() === email.toLowerCase() || u.mobile === mobile))

  const signup = useCallback(
    ({ name, email, mobile, password }) => {
      if (emailOrMobileTaken(db.users, email, mobile)) throw new Error('An account with this email or mobile number already exists.')
      const user = { id: uid('u'), role: 'customer', name: name.trim(), email: email.trim(), mobile, password, createdAt: now() }
      setDb((d) => ({ ...d, users: [...d.users, user] }))
      return user
    },
    [db.users]
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

  const saveAgent = useCallback(
    (data) => {
      if (emailOrMobileTaken(db.users, data.email, data.mobile, data.id)) throw new Error('Another user already uses this email or mobile number.')
      if (data.id) {
        setDb((d) => ({
          ...d,
          users: d.users.map((u) => (u.id === data.id ? { ...u, ...data, password: data.password || u.password } : u)),
        }))
      } else {
        const code = `AG-${1000 + db.users.filter((u) => u.role === 'agent').length + 1}`
        setDb((d) => ({
          ...d,
          users: [...d.users, { ...data, id: uid('u'), role: 'agent', active: data.active ?? true, employeeCode: code, password: data.password || 'demo123', createdAt: now() }],
        }))
      }
    },
    [db.users]
  )

  /** Deactivating an agent returns their unfinished cases to the open pool so area agents can accept them. */
  const setAgentActive = useCallback(
    (agentId, active) => {
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
    (agentId) => {
      if (db.applications.some((a) => a.agentId === agentId))
        throw new Error('This agent has applications assigned. Deactivate the agent instead, or reassign the applications first.')
      setDb((d) => ({ ...d, users: d.users.filter((u) => u.id !== agentId) }))
    },
    [db.applications]
  )

  const resetDemo = useCallback(() => setDb(freshDb()), [])

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
    resetDemo,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
