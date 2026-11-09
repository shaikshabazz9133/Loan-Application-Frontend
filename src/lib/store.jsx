import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { STATUS } from './constants'
import { agentsApi, applicationsApi, authApi, clearSession, customersApi, getSession, saveSession, setSessionEndedHandler } from './api'

/**
 * Staff data layer (agents and managers) - components only use the useStore() hook below.
 * Everything comes from the backend: the session, applications, agents and customers.
 * Every workflow step (accept, approve, reject, disburse) is one API call; the server enforces the rules.
 *
 * Applicants don't use this store: they apply and track their application without an account
 * (see src/pages/customer/).
 */

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [session, setSession] = useState(getSession)
  const [applications, setApplications] = useState([])
  const [agents, setAgents] = useState([])
  const [customers, setCustomers] = useState([])
  const currentUser = session?.user || null

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

  // ---------- loading ----------
  const refresh = useCallback(async () => {
    const role = getSession()?.user?.role
    if (!role) return
    if (role === 'manager') {
      const [apps, agentList, customerList] = await Promise.all([applicationsApi.list(), agentsApi.list(), customersApi.list()])
      setApplications(apps)
      setAgents(agentList)
      setCustomers(customerList)
    } else {
      setApplications(await applicationsApi.list())
    }
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setApplications([])
      setAgents([])
      setCustomers([])
      return
    }
    refresh().catch((err) => toast.error(err.message))
    // Pick up new applications and other staff's changes when the user comes back to the tab.
    const onVisible = () => document.visibilityState === 'visible' && refresh().catch(() => {})
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [currentUser?.id, currentUser?.role, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const replaceApp = (app) => setApplications((list) => list.map((a) => (a.id === app.id ? app : a)))

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

  // ---------- workflow (one API, server checks every rule) ----------
  /** If another staff member changed the application first, reload so the screen shows the truth. */
  const act = useCallback(
    async (appId, action, extra) => {
      try {
        const app = await applicationsApi.act(appId, action, extra)
        replaceApp(app)
        return app
      } catch (err) {
        if (err.status === 409) refresh().catch(() => {})
        throw err
      }
    },
    [refresh]
  )

  const acceptApplication = useCallback((appId) => act(appId, 'accept'), [act])
  const approveApplication = useCallback((appId, note) => act(appId, 'approve', { note }), [act])
  const rejectApplication = useCallback((appId, reason) => act(appId, 'reject', { reason }), [act])
  const disburseApplication = useCallback((appId, mode) => act(appId, 'disburse', { mode }), [act])

  // ---------- manager: agents ----------
  /** Create (no id) or edit (with id) an agent. Throws ApiError with field details. */
  const saveAgent = useCallback(async ({ id, ...data }) => {
    const saved = id ? await agentsApi.update(id, data) : await agentsApi.create(data)
    setAgents((list) => (id ? list.map((a) => (a.id === id ? saved : a)) : [saved, ...list]))
    return saved
  }, [])

  /** Deactivating returns the agent's in-progress applications to the open pool (done by the server). */
  const setAgentActive = useCallback(
    async (agentId, active) => {
      const released = active ? 0 : applications.filter((a) => a.agentId === agentId && a.status === STATUS.ASSIGNED).length
      const saved = await agentsApi.update(agentId, { active })
      setAgents((list) => list.map((a) => (a.id === agentId ? saved : a)))
      if (released) await refresh()
      return released
    },
    [applications, refresh]
  )

  const deleteAgent = useCallback(async (agentId) => {
    await agentsApi.remove(agentId)
    setAgents((list) => list.filter((a) => a.id !== agentId))
  }, [])

  const users = [...agents, ...customers, ...(currentUser ? [currentUser] : [])]
  const value = {
    currentUser,
    applications,
    agents,
    customers,
    users,
    getUser: (id) => users.find((u) => u.id === id),
    refresh,
    login,
    logout,
    acceptApplication,
    approveApplication,
    rejectApplication,
    disburseApplication,
    saveAgent,
    setAgentActive,
    deleteAgent,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
