export const STATUS = {
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  AGENT_APPROVED: 'agent_approved',
  AGENT_REJECTED: 'agent_rejected',
  APPROVED: 'approved',
  DISBURSED: 'disbursed',
  REJECTED: 'rejected',
}

export const STATUS_META = {
  unassigned: { label: 'Open', short: 'Open', variant: 'warning', customer: 'Waiting for an agent' },
  assigned: { label: 'With agent', short: 'With agent', variant: 'info', customer: 'Agent reviewing' },
  agent_approved: { label: 'Agent approved', short: 'Agent approved', variant: 'info', customer: 'Awaiting final approval' },
  agent_rejected: { label: 'Rejected by agent', short: 'Rejected', variant: 'danger', customer: 'Rejected' },
  approved: { label: 'Approved · to disburse', short: 'Approved', variant: 'success', customer: 'Approved' },
  disbursed: { label: 'Disbursed', short: 'Disbursed', variant: 'success', customer: 'Amount credited' },
  rejected: { label: 'Rejected', short: 'Rejected', variant: 'danger', customer: 'Rejected' },
}

/** Grouping used by dashboards. */
export const isPending = (s) => [STATUS.UNASSIGNED, STATUS.ASSIGNED, STATUS.AGENT_APPROVED].includes(s)
export const isRejected = (s) => s === STATUS.REJECTED || s === STATUS.AGENT_REJECTED
export const isApproved = (s) => s === STATUS.APPROVED || s === STATUS.DISBURSED

export const ROLE_HOME = { agent: '/agent', manager: '/manager' }
