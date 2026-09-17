'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import { useQueryClient } from '@smart/ui';

import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { api } from '@/lib/api';
import { PROFILE_PHOTO_ACCEPT, validateProfilePhotoFile } from '@/lib/profile-photo';

interface ProfilePhotoEditControlProps {
  fullName: string | undefined;
  profilePhotoUrl: string | null | undefined;
  avatarClassName?: string;
  fallbackClassName?: string;
}

export function ProfilePhotoEditControl({
  fullName,
  profilePhotoUrl,
  avatarClassName,
  fallbackClassName,
}: ProfilePhotoEditControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await api.users.uploadProfilePhoto(file, file.name);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    } catch {
      setError('Could not upload your profile photo. Try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative shrink-0">
      <CandidateAvatar
        fullName={fullName}
        profilePhotoUrl={profilePhotoUrl}
        className={
          avatarClassName ??
          'h-[72px] w-[72px] shrink-0 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-xl font-semibold text-[var(--ds-text)]'
        }
        fallbackClassName={
          fallbackClassName ??
          'rounded-full bg-[var(--ds-green-soft)] text-xl font-semibold text-[var(--ds-green)]'
        }
      />
      <button
        type="button"
        disabled={uploading}
        aria-label={profilePhotoUrl ? 'Change profile photo' : 'Upload profile photo'}
        onClick={() => inputRef.current?.click()}
        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-icon)] shadow-[var(--ds-card-shadow)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        className="hidden"
        onChange={(event) => void handleSelect(event.target.files?.[0])}
      />
      {error ? (
        <p className="absolute left-0 top-full z-10 mt-1 max-w-[12rem] text-xs text-[var(--ds-coral)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
