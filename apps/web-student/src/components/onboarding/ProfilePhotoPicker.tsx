'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { PROFILE_PHOTO_ACCEPT, validateProfilePhotoFile } from '@/lib/profile-photo';

interface ProfilePhotoPickerProps {
  fullName: string;
  profilePhotoUrl: string;
  onPhotoChange: (url: string) => void;
}

export function ProfilePhotoPicker({
  fullName,
  profilePhotoUrl,
  onPhotoChange,
}: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      const response = await api.users.uploadProfilePhoto(file, file.name);
      onPhotoChange(response.profilePhotoUrl);
    } catch {
      setError('Could not upload your profile photo. Check your connection and try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="md:col-span-2">
      <p className="mb-3 text-sm font-medium text-foreground">Profile Picture</p>
      <div className="flex items-center gap-4">
        <CandidateAvatar
          fullName={fullName}
          profilePhotoUrl={profilePhotoUrl || null}
          className="h-20 w-20 border-2 border-[#00fad0]/30 bg-muted text-lg font-bold text-[#00fad0]"
          fallbackClassName="bg-muted text-lg font-bold text-[#00fad0]"
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-[#00fad0]/40 hover:bg-muted disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#00fad0]" />
            ) : (
              <Camera className="h-4 w-4 text-[#00fad0]" />
            )}
            {profilePhotoUrl ? 'Change photo' : 'Upload photo'}
          </button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 2MB. Optional.</p>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        className="hidden"
        onChange={(event) => void handleSelect(event.target.files?.[0])}
      />
    </div>
  );
}
