interface BrandMarkProps {
  size?: number;
  variant?: 'icon' | 'full';
}

export default function BrandMark({ size = 32, variant = 'icon' }: BrandMarkProps) {
  if (variant === 'full') {
    return (
      <img
        src="/examvault-logo.png"
        alt="ExamVault"
        style={{ height: size, width: 'auto' }}
      />
    );
  }

  const padding = size * 0.12;

  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
      style={{ width: size, height: size, background: '#f8fafc', padding }}
    >
      <span
        className="d-block w-100 h-100"
        style={{
          backgroundImage: 'url(/examvault-logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          backgroundSize: 'auto 100%',
        }}
        aria-hidden="true"
      />
    </span>
  );
}
