interface BrandMarkProps {
  size?: number;
}

export default function BrandMark({ size = 32 }: BrandMarkProps) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-2 text-white"
      style={{ width: size, height: size, background: 'linear-gradient(160deg, #6366f1, #4338ca)' }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="2" width="18" height="20" rx="2.5" fill="rgba(255,255,255,0.2)" />
        <path d="M8 7h8M8 11h8M8 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}
