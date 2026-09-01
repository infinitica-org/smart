import type { StudentProfileData } from '@smart/contracts';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface OnboardingProfileForm {
  firstName: string;
  lastName: string;
  gender: string;
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  phoneCountryCode: string;
  phoneNumber: string;
  linkedinUrl: string;
  languages: { id: string; language: string; proficiency: string }[];
  preferences: string[];
  codingProficiencies: { id: string; language: string; proficiency: string }[];
  dpdpConsent: boolean;
}

function toIsoDate(monthName: string, day: string, year: string): string | undefined {
  const monthIndex = MONTHS.indexOf(monthName) + 1;
  if (!year || monthIndex < 1 || !day) return undefined;
  return `${year}-${String(monthIndex).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
}

function withHttps(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function asProficiency(value: string): StudentProfileData['skills'][number]['proficiency'] {
  const allowed: StudentProfileData['skills'][number]['proficiency'][] = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Expert',
    'Fluent',
    'Native',
    'Basic',
    'Native or Bilingual',
    'Conversational',
  ];
  return allowed.includes(value as StudentProfileData['skills'][number]['proficiency'])
    ? (value as StudentProfileData['skills'][number]['proficiency'])
    : 'Beginner';
}

export function emptyOnboardingForm(): OnboardingProfileForm {
  return {
    firstName: '',
    lastName: '',
    gender: '',
    dobMonth: '',
    dobDay: '',
    dobYear: '',
    phoneCountryCode: '+1',
    phoneNumber: '',
    linkedinUrl: '',
    languages: [],
    preferences: [],
    codingProficiencies: [],
    dpdpConsent: false,
  };
}

export function onboardingToProfile(form: OnboardingProfileForm): StudentProfileData {
  return {
    basicInfo: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dob: toIsoDate(form.dobMonth, form.dobDay, form.dobYear),
      gender: form.gender || undefined,
      phoneNumber: form.phoneNumber.trim() || undefined,
      phoneCountryCode: form.phoneCountryCode.trim() || undefined,
      linkedinUrl: withHttps(form.linkedinUrl),
    },
    education: [],
    skills: [
      ...form.languages
        .filter((row) => row.language.trim())
        .map((row) => ({
          id: row.id,
          language: row.language.trim(),
          proficiency: asProficiency(row.proficiency),
          verified: false,
          type: 'language' as const,
        })),
      ...form.codingProficiencies
        .filter((row) => row.language.trim())
        .map((row) => ({
          id: row.id,
          language: row.language.trim(),
          proficiency: asProficiency(row.proficiency),
          verified: false,
          type: 'technical' as const,
        })),
    ],
    projects: [],
    certifications: [],
    preferences: form.preferences,
    dpdpConsent: form.dpdpConsent,
  };
}

export function mergeOnboardingIntoProfile(
  existing: StudentProfileData,
  form: OnboardingProfileForm,
): StudentProfileData {
  const mapped = onboardingToProfile(form);
  return {
    ...existing,
    basicInfo: mapped.basicInfo,
    skills: mapped.skills,
    preferences: mapped.preferences,
    dpdpConsent: mapped.dpdpConsent,
  };
}

export function profileToOnboarding(
  profile: StudentProfileData,
  fallbackFullName?: string | null,
): OnboardingProfileForm {
  const [firstFromName, ...rest] = (fallbackFullName ?? '').trim().split(/\s+/);
  const basic = profile.basicInfo;
  let dobMonth = '';
  let dobDay = '';
  let dobYear = '';
  if (basic?.dob) {
    const [year, month, day] = basic.dob.split('-');
    dobYear = year ?? '';
    dobMonth = MONTHS[Number(month) - 1] ?? '';
    dobDay = day ? String(Number(day)) : '';
  }

  return {
    firstName: basic?.firstName || firstFromName || '',
    lastName: basic?.lastName || rest.join(' ') || '',
    gender: basic?.gender ?? '',
    dobMonth,
    dobDay,
    dobYear,
    phoneCountryCode: basic?.phoneCountryCode || '+1',
    phoneNumber: basic?.phoneNumber ?? '',
    linkedinUrl: basic?.linkedinUrl ?? '',
    languages: profile.skills
      .filter((skill) => skill.type === 'language')
      .map((skill) => ({
        id: skill.id,
        language: skill.language,
        proficiency: skill.proficiency,
      })),
    preferences: profile.preferences ?? [],
    codingProficiencies: profile.skills
      .filter((skill) => skill.type === 'technical')
      .map((skill) => ({
        id: skill.id,
        language: skill.language,
        proficiency: skill.proficiency,
      })),
    dpdpConsent: profile.dpdpConsent ?? false,
  };
}
