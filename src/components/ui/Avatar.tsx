import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DEFAULT_AVATAR_URL, FALLBACK_IMAGE_URL, getImageUrl } from '../../utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className
}) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16',
  };

  const resolvedUrl = src ? getImageUrl(src) : '';
  const showImage = Boolean(resolvedUrl) && resolvedUrl !== FALLBACK_IMAGE_URL && !hasError;

  return (
    <div
      className={cn(
        'relative rounded-none overflow-hidden bg-noir-bg border border-noir-border flex items-center justify-center shrink-0 shadow-2xl select-none',
        sizes[size],
        className
      )}
    >
      {showImage ? (
        <img
          key={resolvedUrl}
          src={resolvedUrl}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="relative h-full w-full bg-noir-card flex items-center justify-center">
          <div className="flex items-center justify-center text-noir-accent/60">
            <UserIcon className={iconSizes[size]} />
          </div>
        </div>
      )}
      
      {/* Subtle Inner Shadow */}
      <div className="absolute inset-0 shadow-inner pointer-events-none" />
    </div>
  );
};
