import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { ExternalLink, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export const hasGoogleMaps = Boolean(API_KEY)
export const googleMapsLink = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`

const COLORS = { primary: '#0f766e', agent: '#4f46e5', muted: '#94a3b8', danger: '#dc2626', warning: '#d97706' }

/**
 * markers: [{ id, position:{lat,lng}, label, kind: 'primary'|'agent'|'muted' }]
 * radiusKm: draws a circle around `center`
 * onPick: (latLng) => void — enables click-to-select a location
 */
export function MapView({ center, markers = [], radiusKm, onPick, className, zoom = 13, spanKm }) {
  if (!center) return null
  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-muted', className)}>
      {hasGoogleMaps ? (
        <GoogleMapInner center={center} markers={markers} radiusKm={radiusKm} onPick={onPick} zoom={zoom} />
      ) : (
        <FallbackMap center={center} markers={markers} radiusKm={radiusKm} onPick={onPick} spanKm={spanKm} />
      )}
      <a
        href={googleMapsLink(center)}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 hover:bg-white"
      >
        Open in Google Maps <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

function GoogleMapInner({ center, markers, radiusKm, onPick, zoom }) {
  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        style={{ width: '100%', height: '100%', minHeight: 240 }}
        onClick={(e) => onPick && e.detail.latLng && onPick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })}
      >
        <Recenter center={center} />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={m.position}
            title={m.label}
            label={m.kind === 'agent' ? { text: 'A', color: 'white', fontWeight: '700' } : undefined}
          />
        ))}
        {radiusKm ? <Circle center={center} radius={radiusKm * 1000} /> : null}
      </Map>
    </APIProvider>
  )
}

function Recenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (map) map.panTo(center)
  }, [map, center.lat, center.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function Circle({ center, radius }) {
  const map = useMap()
  const ref = useRef(null)
  useEffect(() => {
    if (!map || !window.google) return
    ref.current = new window.google.maps.Circle({
      map,
      center,
      radius,
      strokeColor: COLORS.primary,
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
      fillColor: COLORS.primary,
      fillOpacity: 0.08,
      clickable: false,
    })
    return () => ref.current?.setMap(null)
  }, [map, center.lat, center.lng, radius]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/**
 * Lightweight map used when no Google Maps key is configured.
 * Projects coordinates onto a local km grid around `center` (accurate enough at city scale).
 */
function FallbackMap({ center, markers, radiusKm, onPick, spanKm }) {
  const boxRef = useRef(null)
  const [aspect, setAspect] = useState(1.6)
  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => e.contentRect.height && setAspect(e.contentRect.width / e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const spanY = spanKm || Math.max((radiusKm || 1.5) * 2.6, 3) // vertical km shown
  const spanX = spanY * aspect // horizontal km shown
  const kmPerDegLat = 110.574
  const kmPerDegLng = 111.32 * Math.cos((center.lat * Math.PI) / 180)
  const toXY = (p) => ({
    x: 50 + (((p.lng - center.lng) * kmPerDegLng) / spanX) * 100,
    y: 50 - (((p.lat - center.lat) * kmPerDegLat) / spanY) * 100,
  })
  const ringHeightPct = radiusKm ? ((radiusKm * 2) / spanY) * 100 : 0

  const streets = useMemo(() => {
    // deterministic decorative street pattern
    const seed = Math.abs(Math.round(center.lat * 1000 + center.lng * 1000))
    return Array.from({ length: 9 }, (_, i) => ({ v: i % 2 === 0, pos: ((seed * (i + 3)) % 90) + 5, w: i % 3 === 0 ? 2.2 : 1 }))
  }, [center.lat, center.lng])

  const handleClick = (e) => {
    if (!onPick) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    onPick({
      lat: +(center.lat - (((y - 50) / 100) * spanY) / kmPerDegLat).toFixed(6),
      lng: +(center.lng + (((x - 50) / 100) * spanX) / kmPerDegLng).toFixed(6),
    })
  }

  return (
    <div
      ref={boxRef}
      className={cn('relative h-full min-h-[240px] w-full bg-[#eef3f1]', onPick && 'cursor-crosshair')}
      onClick={handleClick}
      role={onPick ? 'button' : 'img'}
      aria-label={onPick ? 'Click on the map to choose a location' : 'Map preview'}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <pattern id="blocks" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#eef3f1" />
            <rect x="1" y="1" width="6" height="6" rx=".6" fill="#e2ebe7" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#blocks)" />
        <path d="M0 78 C 25 70, 40 88, 62 80 S 90 70, 100 74 L100 100 L0 100Z" fill="#cfe5f2" opacity=".7" />
        <ellipse cx="22" cy="24" rx="9" ry="6" fill="#d3ead9" />
        {streets.map((s, i) =>
          s.v ? (
            <line key={i} x1={s.pos} y1="0" x2={s.pos + 6} y2="100" stroke="#fff" strokeWidth={s.w} />
          ) : (
            <line key={i} x1="0" y1={s.pos} x2="100" y2={s.pos - 5} stroke="#fff" strokeWidth={s.w} />
          )
        )}
      </svg>

      {radiusKm ? (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-dashed border-primary/60 bg-primary/[.07]"
          style={{ height: `${ringHeightPct}%`, aspectRatio: '1', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
        >
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{radiusKm} km</span>
        </div>
      ) : null}

      {markers.map((m) => {
        const { x, y } = toXY(m.position)
        if (x < -5 || x > 105 || y < -5 || y > 105) return null
        const color = COLORS[m.kind] || COLORS.primary
        return (
          <div key={m.id} className="group absolute -translate-x-1/2 -translate-y-full" style={{ left: `${x}%`, top: `${y}%` }}>
            {m.kind === 'primary' && <span className="absolute bottom-0 left-1/2 size-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary/40 animate-pulse-ring" />}
            <MapPin className="relative size-7 drop-shadow" style={{ color }} fill={color} stroke="white" strokeWidth={1.6} />
            {m.label && (
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100">
                {m.label}
              </span>
            )}
          </div>
        )
      })}

      <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm ring-1 ring-black/5">
        Preview map · add a Google Maps key for live tiles
      </span>
    </div>
  )
}
