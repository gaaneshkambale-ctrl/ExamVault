const palette = ['#4f46e5', '#0ea5e9', '#16a34a', '#ea580c', '#db2777'];

export default function OrgAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = palette[name.charCodeAt(0) % palette.length];
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-2 fw-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
