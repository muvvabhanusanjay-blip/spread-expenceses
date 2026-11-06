import type { CSSProperties } from 'react';
import { initials } from '../../lib/format';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function Avatar({ name, size = 38, color, className = '' }: AvatarProps) {
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36, ...(color ? ({ '--avatar': color } as CSSProperties) : {}) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
