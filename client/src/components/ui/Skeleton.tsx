interface SkeletonProps {
  width?: string | number;
  height?: number;
  radius?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 14, radius = 8, className = '' }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, display: 'block' }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRows({ rows = 5, height = 56 }: { rows?: number; height?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <Skeleton width={40} height={40} radius={13} />
          <div className="skeleton-stack">
            <Skeleton width={`${52 + ((index * 13) % 30)}%`} height={12} />
            <Skeleton width={`${34 + ((index * 7) % 18)}%`} height={10} />
          </div>
          <Skeleton width={72} height={12} radius={6} />
        </div>
      ))}
    </div>
  );
}
