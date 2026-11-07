export const ASSIGNMENT_RADIUS_KM = 2

export const STATUS = {
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  IN_VERIFICATION: 'in_verification',
  AGENT_APPROVED: 'agent_approved',
  AGENT_REJECTED: 'agent_rejected',
  APPROVED: 'approved',
  DISBURSED: 'disbursed',
  REJECTED: 'rejected',
}

export const STATUS_META = {
  unassigned: { label: 'Open request', short: 'Open', variant: 'warning', customer: 'Finding an agent' },
  assigned: { label: 'Accepted', short: 'Accepted', variant: 'info', customer: 'Agent assigned' },
  in_verification: { label: 'In verification', short: 'Verifying', variant: 'violet', customer: 'Under verification' },
  agent_approved: { label: 'Agent approved', short: 'Agent approved', variant: 'info', customer: 'Awaiting final approval' },
  agent_rejected: { label: 'Rejected by agent', short: 'Rejected', variant: 'danger', customer: 'Rejected' },
  approved: { label: 'Approved · to disburse', short: 'Approved', variant: 'success', customer: 'Approved' },
  disbursed: { label: 'Disbursed', short: 'Disbursed', variant: 'success', customer: 'Amount credited' },
  rejected: { label: 'Rejected', short: 'Rejected', variant: 'danger', customer: 'Rejected' },
}

/** Grouping used by dashboards. */
export const isPending = (s) => [STATUS.UNASSIGNED, STATUS.ASSIGNED, STATUS.IN_VERIFICATION, STATUS.AGENT_APPROVED].includes(s)
export const isRejected = (s) => s === STATUS.REJECTED || s === STATUS.AGENT_REJECTED
export const isApproved = (s) => s === STATUS.APPROVED || s === STATUS.DISBURSED

export const LOAN_PURPOSES = ['Personal', 'Home renovation', 'Education', 'Medical', 'Business', 'Vehicle', 'Wedding', 'Debt consolidation']
export const EMPLOYMENT_TYPES = ['Salaried', 'Self-employed', 'Business owner', 'Freelancer', 'Retired']


export const ROLE_HOME = { customer: '/customer', agent: '/agent', manager: '/manager' }
