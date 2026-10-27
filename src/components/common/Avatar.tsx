import React from 'react';
import { getAvatarInitials, getAvatarColor } from '../../utils/avatar';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'away' | 'offline';
  className?: string;
  objectPosition?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  className = '',
  objectPosition = 'top center',
}) => {
  const sizeMap = {
    sm: { dimension: '28px', fontSize: '0.75rem', dotSize: '7px' },
    md: { dimension: '36px', fontSize: '0.8125rem', dotSize: '9px' },
    lg: { dimension: '44px', fontSize: '0.9375rem', dotSize: '11px' },
    xl: { dimension: '56px', fontSize: '1.125rem', dotSize: '13px' },
  };

  const statusColorMap = {
    online: '#10b981',
    busy: '#ef4444',
    away: '#f59e0b',
    offline: '#94a3b8',
  };

  const initials = getAvatarInitials(name);
  const colorStyle = getAvatarColor(name);
  const currentSize = sizeMap[size];

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: currentSize.dimension,
        height: currentSize.dimension,
        borderRadius: '50%',
        fontWeight: 700,
        fontSize: currentSize.fontSize,
        flexShrink: 0,
        userSelect: 'none',
      }}
      className={`${colorStyle.bg} ${colorStyle.text} border ${colorStyle.border} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            objectPosition,
          }}
        />
      ) : (
        <span>{initials}</span>
      )}

      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: currentSize.dotSize,
            height: currentSize.dotSize,
            borderRadius: '50%',
            backgroundColor: statusColorMap[status],
            border: '2px solid #ffffff',
          }}
        />
      )}
    </div>
  );
};

export { getAvatarInitials, getAvatarColor };
