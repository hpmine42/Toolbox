import type { ReactNode } from 'react'

export const iconNames = [
  'toolbox',
  'search',
  'sun',
  'moon',
  'settings',
  'dice',
  'timer',
  'ruler',
  'leaf',
  'swap',
  'close',
] as const

export type IconName = (typeof iconNames)[number]

const paths: Record<IconName, ReactNode> = {
  toolbox: (
    <>
      <path d="M4.5 10.5h15v7.2a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7.2Z" />
      <path d="M8.5 10.5V8.2a3.5 3.5 0 0 1 7 0v2.3" />
      <path d="M4.5 14.25h15" />
      <path d="M11 13.15h2v2.3h-2Z" className="icon-dot" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16.5 4 4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 3.25v1.9M12 18.85v1.9M3.25 12h1.9M18.85 12h1.9M5.7 5.7l1.35 1.35M16.95 16.95l1.35 1.35M18.3 5.7l-1.35 1.35M7.05 16.95 5.7 18.3" />
    </>
  ),
  moon: <path d="M15.4 3.7a7.3 7.3 0 1 0 4.9 12.6A8.1 8.1 0 0 1 15.4 3.7Z" />,
  settings: (
    <>
      <path d="M4 8h16M4 16h16" />
      <circle className="icon-knob" cx="9" cy="8" r="2.15" />
      <circle className="icon-knob" cx="15" cy="16" r="2.15" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <circle className="icon-dot" cx="8.5" cy="8.5" r="1.05" />
      <circle className="icon-dot" cx="12" cy="12" r="1.05" />
      <circle className="icon-dot" cx="15.5" cy="15.5" r="1.05" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.25" />
      <path d="M12 13V9.4M12 13l2.8 2" />
      <path d="M9 3.5h6M12 3.5V5.6" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M7 8v3.2M10.5 8v4.4M14 8v3.2M17.5 8v4.4" />
    </>
  ),
  leaf: (
    <>
      <path d="M19.5 4.5C12.3 4.6 6.3 5.8 4 9.5c-1.8 2.9-.6 6.6 2.4 7.5 4.5 1.4 9.5-2.1 11.4-7.4.7-1.8 1.3-3.6 1.7-5.1Z" />
      <path d="M4.8 19.2c2.2-4.2 5.2-7.3 10-10.2" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h12.5L13 4.7" />
      <path d="M20 16H7.5L11 19.3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}
