import type { CSSProperties } from 'react';
import { Layers } from 'lucide-react';
import { CATEGORY_ICONS, categoryMeta } from '../../lib/categories';

interface CategoryIconProps {
  category: string;
  size?: number;
  color?: string;
  iconSize?: number;
  className?: string;
}

export function CategoryIcon({ category, size = 40, color, iconSize, className = '' }: CategoryIconProps) {
  const meta = categoryMeta(category);
  const Icon = CATEGORY_ICONS[category] || Layers;
  return (
    <span
      className={`cat-icon ${className}`}
      style={{
        '--cat': color || meta.color,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
      } as CSSProperties}
      aria-hidden="true"
    >
      <Icon size={iconSize || Math.round(size * 0.44)} />
    </span>
  );
}
