import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StoreProvider, useStore } from '@/lib/store'
import { ROLE_HOME } from '@/lib/constants'
import AppShell from '@/layouts/AppShell'
import Login from '@/pages/auth/Login'
import Landing from '@/pages/customer/Landing'
import ApplyLoan from '@/pages/customer/ApplyLoan'
import Track from '@/pages/customer/Track'
import Status from '@/pages/customer/Status'
import AgentDashboard from '@/pages/agent/Dashboard'
import AgentApplications from '@/pages/agent/Applications'
import AgentApplicationDetail from '@/pages/agent/ApplicationDetail'
import ManagerDashboard from '@/pages/manager/Dashboard'
import ManagerApplications from '@/pages/manager/Applications'
import ManagerApplicationDetail from '@/pages/manager/ApplicationDetail'
import Customers from '@/pages/manager/Customers'
import CustomerDetail from '@/pages/manager/CustomerDetail'
import Agents from '@/pages/manager/Agents'
import AgentDetail from '@/pages/manager/AgentDetail'

function RequireRole({ role }) {
  const { currentUser } = useStore()
  const location = useLocation()
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (currentUser.role !== role) return <Navigate to={ROLE_HOME[currentUser.role] || '/'} replace />
  return <AppShell />
}

function GuestOnly({ children }) {
  const { currentUser } = useStore()
  return currentUser && ROLE_HOME[currentUser.role] ? <Navigate to={ROLE_HOME[currentUser.role]} replace /> : children
}

/** Customers: "/" -> apply -> status. Staff who are signed in go straight to their portal. */
function Home() {
  const { currentUser } = useStore()
  return currentUser && ROLE_HOME[currentUser.role] ? <Navigate to={ROLE_HOME[currentUser.role]} replace /> : <Landing />
}

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<ApplyLoan />} />
        <Route path="/track" element={<Track />} />
        <Route path="/status/:id" element={<Status />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />

        <Route path="/agent" element={<RequireRole role="agent" />}>
          <Route index element={<AgentDashboard />} />
          <Route path="applications" element={<AgentApplications />} />
          <Route path="applications/:id" element={<AgentApplicationDetail />} />
        </Route>

        <Route path="/manager" element={<RequireRole role="manager" />}>
          <Route index element={<ManagerDashboard />} />
          <Route path="applications" element={<ManagerApplications />} />
          <Route path="applications/:id" element={<ManagerApplicationDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agents/:id" element={<AgentDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </StoreProvider>
  )
}
