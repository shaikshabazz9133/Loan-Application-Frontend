import { STATUS } from './constants'
import { creditScoreFor, makeDemoAadhaar, makeDemoPan } from './kyc'
import { bankFromIfsc } from './bank'
import { DOC_TYPES, allCheckKeys, isDocRequired } from './verification'

const daysAgo = (d, h = 10) => {
  const t = new Date()
  t.setDate(t.getDate() - d)
  t.setHours(h, (d * 7) % 60, 0, 0)
  return t.toISOString()
}

const PASSWORD = 'demo123'

export const seedUsers = () => [
  { id: 'u_mgr1', role: 'manager', name: 'Neha Kapoor', email: 'manager@demo.com', mobile: '9000000001', password: PASSWORD, createdAt: daysAgo(400) },

  { id: 'u_ag1', role: 'agent', name: 'Ravi Kumar', email: 'agent@demo.com', mobile: '9000000011', password: PASSWORD, active: true, employeeCode: 'AG-1001', area: 'Banjara Hills', city: 'Hyderabad', location: { lat: 17.4126, lng: 78.4482 }, createdAt: daysAgo(320) },
  { id: 'u_ag2', role: 'agent', name: 'Priya Sharma', email: 'priya.agent@demo.com', mobile: '9000000012', password: PASSWORD, active: true, employeeCode: 'AG-1002', area: 'Madhapur', city: 'Hyderabad', location: { lat: 17.4483, lng: 78.3915 }, createdAt: daysAgo(300) },
  { id: 'u_ag3', role: 'agent', name: 'Arjun Reddy', email: 'arjun.agent@demo.com', mobile: '9000000013', password: PASSWORD, active: true, employeeCode: 'AG-1003', area: 'Kukatpally', city: 'Hyderabad', location: { lat: 17.4948, lng: 78.3996 }, createdAt: daysAgo(260) },
  { id: 'u_ag4', role: 'agent', name: 'Sneha Iyer', email: 'sneha.agent@demo.com', mobile: '9000000014', password: PASSWORD, active: true, employeeCode: 'AG-1004', area: 'Secunderabad', city: 'Hyderabad', location: { lat: 17.4399, lng: 78.4983 }, createdAt: daysAgo(210) },
  { id: 'u_ag6', role: 'agent', name: 'Anil Varma', email: 'agent2@demo.com', mobile: '9000000016', password: PASSWORD, active: true, employeeCode: 'AG-1006', area: 'Banjara Hills', city: 'Hyderabad', location: { lat: 17.4185, lng: 78.4428 }, createdAt: daysAgo(120) },
  { id: 'u_ag5', role: 'agent', name: 'Kiran Rao', email: 'kiran.agent@demo.com', mobile: '9000000015', password: PASSWORD, active: false, employeeCode: 'AG-1005', area: 'Gachibowli', city: 'Hyderabad', location: { lat: 17.4401, lng: 78.3489 }, createdAt: daysAgo(150) },

  { id: 'u_c1', role: 'customer', name: 'Aarav Mehta', email: 'customer@demo.com', mobile: '9876543210', password: PASSWORD, createdAt: daysAgo(190) },
  { id: 'u_c2', role: 'customer', name: 'Ananya Gupta', email: 'ananya@example.com', mobile: '9876543211', password: PASSWORD, createdAt: daysAgo(170) },
  { id: 'u_c3', role: 'customer', name: 'Rohan Verma', email: 'rohan@example.com', mobile: '9876543212', password: PASSWORD, createdAt: daysAgo(160) },
  { id: 'u_c4', role: 'customer', name: 'Fatima Khan', email: 'fatima@example.com', mobile: '9876543213', password: PASSWORD, createdAt: daysAgo(140) },
  { id: 'u_c5', role: 'customer', name: 'Vikram Singh', email: 'vikram@example.com', mobile: '9876543214', password: PASSWORD, createdAt: daysAgo(120) },
  { id: 'u_c6', role: 'customer', name: 'Meera Nair', email: 'meera@example.com', mobile: '9876543215', password: PASSWORD, createdAt: daysAgo(100) },
  { id: 'u_c7', role: 'customer', name: 'Siddharth Joshi', email: 'sid@example.com', mobile: '9876543216', password: PASSWORD, createdAt: daysAgo(80) },
  { id: 'u_c9', role: 'customer', name: 'Deepak Malhotra', email: 'deepak@example.com', mobile: '9876543218', password: PASSWORD, createdAt: daysAgo(20) },
  { id: 'u_c8', role: 'customer', name: 'Lakshmi Prasad', email: 'lakshmi@example.com', mobile: '9876543217', password: PASSWORD, createdAt: daysAgo(40) },
]


/**
 * Compact seed spec → full application records with consistent history.
 * [no, customerId, agentId, amount, purpose, income, employment, address, pincode, lat, lng, status, daysAgo]
 */
const SPEC = [
  [1001, 'u_c1', 'u_ag1', 250000, 'Home renovation', 85000, 'Salaried', 'Road No. 12, Banjara Hills', '500034', 17.4156, 78.4395, STATUS.DISBURSED, 175],
  [1002, 'u_c2', 'u_ag2', 150000, 'Education', 62000, 'Salaried', 'Ayyappa Society, Madhapur', '500081', 17.4435, 78.3912, STATUS.DISBURSED, 160],
  [1003, 'u_c3', 'u_ag3', 500000, 'Business', 140000, 'Business owner', 'KPHB Colony, Kukatpally', '500072', 17.4889, 78.3925, STATUS.REJECTED, 150],
  [1004, 'u_c4', 'u_ag4', 80000, 'Medical', 45000, 'Salaried', 'SD Road, Secunderabad', '500003', 17.4425, 78.4955, STATUS.DISBURSED, 130],
  [1005, 'u_c5', 'u_ag1', 300000, 'Vehicle', 95000, 'Self-employed', 'Road No. 3, Banjara Hills', '500034', 17.4182, 78.4501, STATUS.AGENT_REJECTED, 118],
  [1006, 'u_c6', 'u_ag2', 120000, 'Wedding', 58000, 'Salaried', 'Hitech City Road, Madhapur', '500081', 17.4502, 78.3815, STATUS.DISBURSED, 96],
  [1007, 'u_c7', 'u_ag3', 75000, 'Personal', 40000, 'Freelancer', 'Moosapet, Kukatpally', '500018', 17.4710, 78.4280, STATUS.DISBURSED, 85],
  [1008, 'u_c2', 'u_ag2', 200000, 'Debt consolidation', 64000, 'Salaried', 'Ayyappa Society, Madhapur', '500081', 17.4435, 78.3912, STATUS.REJECTED, 70],
  [1009, 'u_c4', 'u_ag4', 60000, 'Personal', 47000, 'Salaried', 'SD Road, Secunderabad', '500003', 17.4425, 78.4955, STATUS.APPROVED, 55],
  [1010, 'u_c1', 'u_ag1', 100000, 'Personal', 85000, 'Salaried', 'Road No. 12, Banjara Hills', '500034', 17.4156, 78.4395, STATUS.AGENT_APPROVED, 34],
  [1011, 'u_c8', 'u_ag3', 450000, 'Business', 120000, 'Business owner', 'JNTU Road, Kukatpally', '500085', 17.4955, 78.3910, STATUS.AGENT_APPROVED, 22],
  [1012, 'u_c5', 'u_ag1', 180000, 'Medical', 95000, 'Self-employed', 'Road No. 3, Banjara Hills', '500034', 17.4182, 78.4501, STATUS.IN_VERIFICATION, 12],
  [1013, 'u_c6', 'u_ag2', 90000, 'Education', 60000, 'Salaried', 'Hitech City Road, Madhapur', '500081', 17.4502, 78.3815, STATUS.IN_VERIFICATION, 8],
  [1014, 'u_c1', 'u_ag1', 50000, 'Medical', 85000, 'Salaried', 'Road No. 12, Banjara Hills', '500034', 17.4156, 78.4395, STATUS.ASSIGNED, 3],
  [1015, 'u_c7', null, 220000, 'Home renovation', 52000, 'Freelancer', 'Uppal Main Road, Uppal', '500039', 17.4058, 78.5591, STATUS.UNASSIGNED, 2],
  [1016, 'u_c3', 'u_ag4', 130000, 'Vehicle', 140000, 'Business owner', 'Paradise Circle, Secunderabad', '500003', 17.4430, 78.4870, STATUS.ASSIGNED, 1],
  [1017, 'u_c8', null, 350000, 'Business', 120000, 'Business owner', 'LB Nagar Ring Road', '500074', 17.3457, 78.5522, STATUS.UNASSIGNED, 0],
  [1018, 'u_c9', null, 175000, 'Home renovation', 47000, 'Salaried', 'Road No. 2, Banjara Hills', '500034', 17.4140, 78.4460, STATUS.UNASSIGNED, 0],
  [1019, 'u_c6', null, 65000, 'Medical', 60000, 'Salaried', 'Kavuri Hills, Madhapur', '500081', 17.4440, 78.3960, STATUS.UNASSIGNED, 1],
]

/** Fixed KYC per customer. `low` customers get a PAN whose simulated credit score is below 650. */
const KYC = {
  u_c1: { dob: '1990-04-12' }, u_c2: { dob: '1994-09-03' }, u_c3: { dob: '1982-01-27' }, u_c4: { dob: '1988-11-15' },
  u_c5: { dob: '1985-06-30', low: true }, u_c6: { dob: '1996-02-08' }, u_c7: { dob: '1992-12-19' }, u_c8: { dob: '1979-07-22' },
  u_c9: { dob: '1987-03-11', low: true },
}
const IFSCS = ['HDFC0001234', 'ICIC0000456', 'SBIN0020345', 'UTIB0000789', 'KKBK0007321', 'HDFC0004521', 'SBIN0011223', 'ICIC0006654', 'UTIB0003310']
const kycFor = (c, i) => {
  const k = KYC[c.id]
  const surname = c.name.split(' ').pop()
  const ifsc = IFSCS[i % IFSCS.length]
  return {
    dob: k.dob,
    pan: makeDemoPan(surname[0], !!k.low, 1000 + i * 4099),
    aadhaar: makeDemoAadhaar(73000 + i * 1543),
    bank: { holder: c.name, account: String(50100000000000 + i * 7340013 + 4821), ifsc, bankName: bankFromIfsc(ifsc), type: 'Savings' },
  }
}
const TENURE_CYCLE = [24, 36, 12, 48, 18, 60]

export function seedApplications(users) {
  const kyc = Object.fromEntries(users.filter((u) => u.role === 'customer').map((c, i) => [c.id, kycFor(c, i)]))
  const byId = Object.fromEntries(users.map((u) => [u.id, u]))
  const manager = users.find((u) => u.role === 'manager')
  const sys = { actorRole: 'system', actorName: 'System' }

  return SPEC.map(([no, cid, aid, amount, purpose, income, employment, address, pincode, lat, lng, status, ago]) => {
    const c = byId[cid]
    const a = aid ? byId[aid] : null
    const created = daysAgo(ago, 9)
    const step = (h) => daysAgo(Math.max(ago - h, 0), 11 + h)
    const h = []
    const agentActor = a ? { actorRole: 'agent', actorName: a.name } : null
    const add = (at, actor, action, note) => h.push({ id: `h_${no}_${h.length}`, at, ...actor, action, note })
    const mgrActor = { actorRole: 'manager', actorName: manager.name }

    add(created, { actorRole: 'customer', actorName: c.name }, 'Application submitted', `Loan request for ₹${amount.toLocaleString('en-IN')}`)
    add(created, sys, 'Sent to manager & area agents', 'Visible to the manager and to active agents within 2 km')
    if (a) add(created, agentActor, 'Accepted by agent', `${a.name} accepted this application`)

    const past = [STATUS.IN_VERIFICATION, STATUS.AGENT_APPROVED, STATUS.AGENT_REJECTED, STATUS.APPROVED, STATUS.DISBURSED, STATUS.REJECTED]
    const k = kyc[cid]
    const tenure = TENURE_CYCLE[no % TENURE_CYCLE.length]
    const documents = Object.fromEntries(
      DOC_TYPES.filter((d) => isDocRequired(d, employment)).map((d) => [
        d.key,
        { key: `sample_${no}_${d.key}`, name: `${d.label.toLowerCase().replace(/\s+/g, '-')}.pdf`, size: 180000 + d.key.length * 23000, type: 'application/pdf', sample: true, uploadedAt: created },
      ])
    )
    const draft = { employment, tenure, amount, income }
    const allChecks = Object.fromEntries(allCheckKeys(draft).map((key) => [key, true]))
    const score = creditScoreFor(k.pan)
    const creditDone = past.includes(status) && status !== STATUS.IN_VERIFICATION
    const creditCheck = creditDone ? { score, fetchedAt: step(0), by: a?.name } : null
    if (creditDone) add(step(0), agentActor, 'Credit score checked', `Score ${score}${score < 650 ? ' — below minimum 650' : ''}`)
    let verification = { checks: {}, comments: [] }
    let agentDecision = null
    let managerDecision = null

    if (past.includes(status)) {
      add(step(0), agentActor, 'Verification started', 'Agent started reviewing customer information')
      const partial = status === STATUS.IN_VERIFICATION
      verification = {
        checks: partial ? { identity: true, aadhaar: true, pan: true, contact: true, doc_pan: true, doc_aadhaar: true } : allChecks,
        comments: [
          { id: `c_${no}_1`, at: step(0), by: a.name, text: 'Called customer and confirmed identity and contact details.' },
          ...(partial ? [] : [{ id: `c_${no}_2`, at: step(1), by: a.name, text: status === STATUS.AGENT_REJECTED ? `Credit score ${score} is below the minimum required 650.` : 'Visited address, documents match declared details.' }]),
        ],
      }
      if (!partial) {
        add(step(1), agentActor, 'Verification completed', 'All verification checks completed')
      }
    }
    if ([STATUS.AGENT_APPROVED, STATUS.APPROVED, STATUS.DISBURSED, STATUS.REJECTED].includes(status)) {
      agentDecision = { decision: 'recommended', note: 'Customer profile verified. Recommended for approval.', at: step(1), by: a.name }
      add(step(1), agentActor, 'Recommended for approval', agentDecision.note)
    }
    if (status === STATUS.AGENT_REJECTED) {
      agentDecision = { decision: 'rejected', reason: `Low credit score (${score}). Minimum required is 650.`, at: step(1), by: a.name }
      add(step(1), agentActor, 'Rejected by agent', agentDecision.reason)
    }
    let disbursement = null
    if (status === STATUS.APPROVED || status === STATUS.DISBURSED) {
      managerDecision = { decision: 'approved', note: 'Approved as per agent recommendation.', at: step(3), by: manager.name }
      add(step(3), mgrActor, 'Loan approved', managerDecision.note)
    }
    if (status === STATUS.DISBURSED) {
      const utr = `${k.bank.ifsc.slice(0, 4)}N${String(no * 7919).slice(-6)}${String(no * 104729).slice(-6)}`
      disbursement = { amount, mode: 'NEFT', utr, at: step(4), by: manager.name }
      add(step(4), mgrActor, 'Amount disbursed', `₹${amount.toLocaleString('en-IN')} sent to ${k.bank.bankName} •••• ${k.bank.account.slice(-4)} · UTR ${utr}`)
    }
    if (status === STATUS.REJECTED) {
      managerDecision = { decision: 'rejected', reason: 'Debt-to-income ratio exceeds policy limit.', at: step(3), by: manager.name }
      add(step(3), mgrActor, 'Loan rejected', managerDecision.reason)
    }

    return {
      id: `LN-${no}`,
      customerId: cid,
      agentId: aid,
      fullName: c.name,
      dob: k.dob,
      aadhaar: k.aadhaar,
      pan: k.pan,
      tenure,
      bank: k.bank,
      disbursement,
      documents,
      creditCheck,
      mobile: c.mobile,
      email: c.email,
      amount,
      purpose,
      income,
      employment,
      address,
      city: 'Hyderabad',
      pincode,
      location: { lat, lng },
      agentDistanceKm: null,
      declinedBy: [],
      status,
      verification,
      agentDecision,
      managerDecision,
      history: h,
      createdAt: created,
      updatedAt: h[h.length - 1].at,
    }
  })
}
