/** Document helpers. Files are uploaded with the application (POST /applications) and stored by the backend. */

/** rules = options.documents from GET /applications/options ({ maxSizeMb, allowedMimeTypes }). */
export function validateDocFile(file, rules) {
  if (!rules.allowedMimeTypes.includes(file.type)) return 'Upload a JPG, PNG, WEBP or PDF file.'
  if (file.size > rules.maxSizeMb * 1024 * 1024) return `File is larger than ${rules.maxSizeMb} MB.`
  return null
}

export const formatBytes = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

/** Placeholder image for seeded demo documents. */
export function sampleDocSvg(docLabel, customerName, appId) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="640" height="420" rx="24" fill="#f8fafc"/><rect x="24" y="24" width="592" height="372" rx="16" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="24" y="24" width="592" height="64" rx="16" fill="#0f766e"/><rect x="24" y="72" width="592" height="16" fill="#0f766e"/>
  <text x="52" y="66" font-family="Arial" font-size="24" font-weight="700" fill="#fff">${docLabel}</text>
  <rect x="52" y="120" width="120" height="150" rx="10" fill="#e2e8f0"/><circle cx="112" cy="175" r="28" fill="#cbd5e1"/><rect x="77" y="212" width="70" height="40" rx="20" fill="#cbd5e1"/>
  <text x="200" y="145" font-family="Arial" font-size="15" fill="#64748b">Name</text><text x="200" y="170" font-family="Arial" font-size="22" font-weight="700" fill="#0f172a">${customerName}</text>
  <text x="200" y="210" font-family="Arial" font-size="15" fill="#64748b">Application</text><text x="200" y="235" font-family="Arial" font-size="20" font-weight="700" fill="#0f172a">${appId}</text>
  <rect x="52" y="300" width="536" height="12" rx="6" fill="#e2e8f0"/><rect x="52" y="324" width="400" height="12" rx="6" fill="#e2e8f0"/>
  <text x="320" y="380" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#dc2626" letter-spacing="4">SAMPLE DOCUMENT · DEMO DATA</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
