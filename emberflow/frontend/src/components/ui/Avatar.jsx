import { forwardRef } from 'react';

export const Avatar = forwardRef(function Avatar({
  src,
  alt,
  name,
  size = 'md',
  shape = 'circle',
  className = '',
  fallback,
  ...props
}, ref) {
  const sizeClasses = {
    xs: 'avatar--xs',
    sm: 'avatar--sm',
    md: 'avatar--md',
    lg: 'avatar--lg',
    xl: 'avatar--xl',
    '2xl': 'avatar--2xl',
  };

  const shapeClasses = {
    circle: 'avatar--circle',
    square: 'avatar--square',
    rounded: 'avatar--rounded',
  };

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fallbackContent = fallback ?? initials ?? '?';

  const classes = [
    'avatar',
    sizeClasses[size] || sizeClasses.md,
    shapeClasses[shape] || shapeClasses.circle,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props} aria-label={name}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="avatar__image"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.style.setProperty('display', 'flex');
          }}
        />
      ) : (
        <span className="avatar__fallback" style={{ display: 'flex' }}>
          {fallbackContent}
        </span>
      )}
      {!src && (
        <span className="avatar__fallback" style={{ display: 'flex' }}>
          {fallbackContent}
        </span>
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export const AvatarGroup = function AvatarGroup({
  avatars = [],
  max = 5,
  size = 'md',
  overlap = true,
  className = '',
  ...props
}) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={`avatar-group ${overlap ? 'avatar-group--overlap' : ''} ${className}`.trim()} {...props} role="group" aria-label={`${avatars.length} people`}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={avatar.id || avatar.email || index}
          src={avatar.src || avatar.avatar_url}
          name={avatar.name || avatar.full_name}
          size={size}
          className="avatar-group__avatar"
        />
      ))}
      {remainingCount > 0 && (
        <div className={`avatar-group__more avatar--${size}`} aria-label={`${remainingCount} more`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export const LogoPlaceholder = function LogoPlaceholder({
  size = 'md',
  className = '',
  text = 'Logo',
  ...props
}) {
  const sizeClasses = {
    sm: 'logo-placeholder--sm',
    md: '',
    lg: 'logo-placeholder--lg',
    xl: 'logo-placeholder--xl',
  };

  return (
    <div
      className={`logo-placeholder ${sizeClasses[size]} ${className}`.trim()}
      {...props}
      role="img"
      aria-label={text}
    >
      {text}
    </div>
  );
};

export function useInitials(name, maxLength = 2) {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}