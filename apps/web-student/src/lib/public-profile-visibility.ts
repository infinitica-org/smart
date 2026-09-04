export type ProfileSectionVisibility = {
  showSkills: boolean;
  showCertificates: boolean;
  showProjects: boolean;
  showCognitive: boolean;
};

export const DEFAULT_VISIBILITY: ProfileSectionVisibility = {
  showSkills: true,
  showCertificates: true,
  showProjects: true,
  showCognitive: true,
};

export const VISIBILITY_STORAGE_KEY = 'smart_public_profile_visibility';
export const VISIBILITY_CHANGE_EVENT = 'smart_visibility_changed';

export function getVisibilitySettings(): ProfileSectionVisibility {
  if (typeof window === 'undefined') {
    return DEFAULT_VISIBILITY;
  }
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBILITY;
    const parsed = JSON.parse(raw) as Partial<ProfileSectionVisibility>;
    return {
      showSkills: typeof parsed.showSkills === 'boolean' ? parsed.showSkills : true,
      showCertificates:
        typeof parsed.showCertificates === 'boolean' ? parsed.showCertificates : true,
      showProjects: typeof parsed.showProjects === 'boolean' ? parsed.showProjects : true,
      showCognitive: typeof parsed.showCognitive === 'boolean' ? parsed.showCognitive : true,
    };
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

export function saveVisibilitySettings(settings: ProfileSectionVisibility): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(VISIBILITY_CHANGE_EVENT, { detail: settings }));
  } catch {
    // Ignore storage errors
  }
}

export function subscribeVisibilitySettings(
  callback: (settings: ProfileSectionVisibility) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<ProfileSectionVisibility>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getVisibilitySettings());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === VISIBILITY_STORAGE_KEY) {
      callback(getVisibilitySettings());
    }
  };

  window.addEventListener(VISIBILITY_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(VISIBILITY_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export function parseLoomEmbedUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Match Loom share link: https://www.loom.com/share/{videoId}
  const shareMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (shareMatch && shareMatch[1]) {
    return `https://www.loom.com/embed/${shareMatch[1]}`;
  }

  // Match Loom embed link: https://www.loom.com/embed/{videoId}
  const embedMatch = trimmed.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
  if (embedMatch && embedMatch[1]) {
    return `https://www.loom.com/embed/${embedMatch[1]}`;
  }

  return null;
}
