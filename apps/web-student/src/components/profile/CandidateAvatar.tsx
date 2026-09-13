'use client';

import { Avatar, AvatarFallback, AvatarImage, cn } from '@smart/ui';
import { initialsOf } from '@/lib/candidate-identity';

export interface CandidateAvatarProps {
  fullName?: string;
  profilePhotoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
}

export function CandidateAvatar({
  fullName,
  profilePhotoUrl,
  className,
  fallbackClassName,
  imageClassName,
}: CandidateAvatarProps) {
  const initials = initialsOf(fullName);

  return (
    <Avatar className={className}>
      {profilePhotoUrl ? (
        <AvatarImage
          src={profilePhotoUrl}
          alt={fullName ? `${fullName} profile photo` : 'Profile photo'}
          className={imageClassName}
        />
      ) : null}
      <AvatarFallback className={cn(fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
