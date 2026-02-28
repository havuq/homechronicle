import clsx from 'clsx';

export default function BrandLogo({ className }) {
  return (
    <svg
      viewBox="0 0 420 120"
      role="img"
      aria-label="Home Chronical"
      className={clsx('hc-brand-logo', className)}
    >
      <defs>
        <linearGradient id="hcBrandAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--hc-accent-strong)" />
          <stop offset="100%" stopColor="var(--hc-accent-stronger)" />
        </linearGradient>
      </defs>

      <g transform="translate(4 8)">
        <path
          d="M18 45.5L62 12.5C64.6 10.5 68.2 10.5 70.8 12.5L114.8 45.5"
          fill="none"
          stroke="url(#hcBrandAccent)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 53V84C24 89.5 28.5 94 34 94H100C105.5 94 110 89.5 110 84V53"
          fill="none"
          stroke="url(#hcBrandAccent)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M40 74L57 57L74 67L91 49"
          fill="none"
          stroke="url(#hcBrandAccent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="57" cy="57" r="5.5" fill="var(--hc-panel)" stroke="url(#hcBrandAccent)" strokeWidth="5" />
        <circle cx="74" cy="67" r="5.5" fill="var(--hc-panel)" stroke="url(#hcBrandAccent)" strokeWidth="5" />
        <circle cx="91" cy="49" r="5.5" fill="var(--hc-panel)" stroke="url(#hcBrandAccent)" strokeWidth="5" />
      </g>

      <text
        x="136"
        y="58"
        fontSize="50"
        fontWeight="700"
        letterSpacing="0.2"
        fill="var(--hc-fg)"
      >
        home
      </text>
      <text
        x="136"
        y="98"
        fontSize="50"
        fontWeight="700"
        letterSpacing="0.2"
        fill="var(--hc-accent-strong)"
      >
        chronical
      </text>
    </svg>
  );
}
