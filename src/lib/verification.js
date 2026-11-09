/** Document types (labels for the document list). The apply form gets the same list from GET /applications/options. */
export const DOC_TYPES = [
  { key: 'pan', label: 'PAN card', hint: 'Front side, clearly readable' },
  { key: 'aadhaar', label: 'Aadhaar card', hint: 'Front & back in one file' },
  { key: 'salary', label: 'Salary slips', hint: 'Last 3 months', onlyFor: 'Salaried' },
  { key: 'bank', label: 'Bank statements', hint: 'Last 6 months' },
  { key: 'address', label: 'Address proof', hint: 'Utility bill, rent agreement or passport' },
]

/** A document with onlyFor (e.g. salary slips) is required only for that employment type. */
export const isDocRequired = (doc, employment) => !doc.onlyFor || doc.onlyFor === employment
