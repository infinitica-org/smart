import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { CustomSelect } from '../../ui/CustomSelect';
import { api } from '@/lib/api';
import {
  MONTHS,
  LANGUAGE_OPTIONS,
  FLUENCY_OPTIONS,
  buildCompleteOnboardingRequest,
  buildOnboardingDraftPayload,
  clearOnboardingDraft,
  saveOnboardingDraft,
  validateEducationItems,
  validateExperienceItems,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import SocialVerification from './SocialVerification';
import RepoPicker from './RepoPicker';
import SkillDiscovery from './SkillDiscovery';

interface ProfileSetupProps {
  initialForm: OnboardingProfileForm;
  onBack: () => void;
  onComplete: () => void;
}

type TabID =
  | 'profile'
  | 'education'
  | 'experience'
  | 'phone'
  | 'social'
  | 'repo-picks'
  | 'languages'
  | 'skill-discovery'
  | 'preferences'
  | 'consent';

/**
 * "Best repos" only appears once GitHub is confirmed — asking a student to
 * pick favorite repos before we even know whose GitHub it is would be
 * backwards. Every other student (LinkedIn-only) never sees that tab.
 */
function buildTabs(formData: OnboardingProfileForm): { id: TabID; label: string }[] {
  const githubConfirmed = Boolean(formData.socialVerification.github?.verified);
  return [
    { id: 'profile', label: 'Profile' },
    { id: 'education', label: 'Education' },
    { id: 'experience', label: 'Experience' },
    { id: 'phone', label: 'Phone number' },
    { id: 'social', label: 'LinkedIn & GitHub' },
    ...(githubConfirmed ? [{ id: 'repo-picks' as const, label: 'Best repos' }] : []),
    { id: 'languages', label: 'Languages' },
    { id: 'skill-discovery', label: 'Top skills' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'consent', label: 'Consent' },
  ];
}

function tabAt(tabs: { id: TabID; label: string }[], index: number): TabID | undefined {
  return tabs[index]?.id;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
const PROJECT_TYPES = [
  'Coding',
  'Engineering',
  'Mathematics',
  'Voice Acting',
  'Science',
  'Writing',
  'Law',
  'Medicine',
  'Finance',
  'Education',
  'Language',
];

const DEGREE_OPTIONS = [
  { label: 'B.Tech / B.E.', value: 'B.Tech' },
  { label: 'M.Tech / M.E.', value: 'M.Tech' },
  { label: 'B.Sc', value: 'B.Sc' },
  { label: 'M.Sc', value: 'M.Sc' },
  { label: 'MBA', value: 'MBA' },
  { label: 'BBA', value: 'BBA' },
  { label: 'B.Com', value: 'B.Com' },
  { label: 'High School', value: 'High School' },
  { label: 'Other', value: 'Other' },
];

export default function ProfileSetup({ initialForm, onBack, onComplete }: ProfileSetupProps) {
  const [activeTab, setActiveTab] = useState<TabID>('profile');

  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkedinBanner, setLinkedinBanner] = useState<'ok' | 'failed' | null>(null);

  const TABS = useMemo(() => buildTabs(formData), [formData]);
  const router = useRouter();

  useEffect(() => {
    setFormData(initialForm);
  }, [initialForm]);

  useEffect(() => {
    saveOnboardingDraft(formData);
  }, [formData]);

  // Land back here from the LinkedIn OAuth redirect (`?linkedinVerified=1|0`):
  // jump straight to the tab that shows the result and scrub the query string
  // so a refresh doesn't re-trigger this. Read via window.location rather than
  // useSearchParams so this component never forces a Suspense boundary.
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get('linkedinVerified');
    if (flag === null) return;
    setLinkedinBanner(flag === '1' ? 'ok' : 'failed');
    setActiveTab('social');
    router.replace('/onboarding', { scroll: false });
    // Intentionally runs once on mount only — the query string is a one-shot signal.
  }, []);

  const updateField = <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = async () => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);

    setSaveError(null);

    if (activeTab === 'profile' && (!formData.firstName.trim() || !formData.lastName.trim())) {
      setSaveError('First and last name are required.');
      return;
    }
    if (activeTab === 'education') {
      const err = validateEducationItems(formData.education);
      if (err) {
        setSaveError(err);
        return;
      }
    }
    if (activeTab === 'experience') {
      const err = validateExperienceItems(formData.experiences);
      if (err) {
        setSaveError(err);
        return;
      }
    }
    if (activeTab === 'phone' && !formData.phoneNumber.trim()) {
      setSaveError('Phone number is required.');
      return;
    }
    if (activeTab === 'social' && !formData.linkedinUrl.trim()) {
      setSaveError('LinkedIn profile is required.');
      return;
    }
    if (activeTab === 'repo-picks') {
      const count = formData.socialVerification.github?.selectedRepos.length ?? 0;
      if (count < 3) {
        setSaveError(`Pick at least 3 repositories (${String(count)} of 3-5 selected).`);
        return;
      }
    }
    if (
      activeTab === 'languages' &&
      !formData.languages.some((l) => l.language.trim() && l.proficiency.trim())
    ) {
      setSaveError('At least one language is required.');
      return;
    }
    if (
      activeTab === 'skill-discovery' &&
      formData.skillDiscovery.selectedSkillNames.length === 0
    ) {
      setSaveError('Add at least one skill to continue.');
      return;
    }
    if (activeTab === 'preferences' && formData.preferences.length === 0) {
      setSaveError('Please select at least one project preference.');
      return;
    }

    if (currentIndex < TABS.length - 1) {
      const nextTab = tabAt(TABS, currentIndex + 1);
      if (nextTab) setActiveTab(nextTab);
      // Best-effort: persist progress server-side so it survives a lost session
      // or a different device. The local draft (below) remains the UI fallback.
      void api.users.saveOnboarding(buildOnboardingDraftPayload(formData)).catch(() => {});
      return;
    }

    const payload = buildCompleteOnboardingRequest(formData);
    if ('error' in payload) {
      setSaveError(payload.error);
      if (payload.error.includes('DPDP')) setActiveTab('consent');
      else if (payload.error.includes('education')) setActiveTab('education');
      else if (
        payload.error.includes('experience') ||
        payload.error.includes('Role') ||
        payload.error.includes('Company')
      )
        setActiveTab('experience');
      else if (payload.error.includes('language')) setActiveTab('languages');
      else if (payload.error.includes('preference')) setActiveTab('preferences');
      else if (payload.error.includes('LinkedIn')) setActiveTab('social');
      else if (payload.error.includes('Phone')) setActiveTab('phone');
      else setActiveTab('profile');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await api.users.completeOnboarding(payload);
      clearOnboardingDraft();
      onComplete();
    } catch {
      setSaveError(
        'Could not save your profile to the server. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    const previousTab = tabAt(TABS, currentIndex - 1);
    if (previousTab) {
      setActiveTab(previousTab);
    } else {
      onBack();
    }
  };

  const togglePreference = (pref: string) => {
    setFormData((prev) => {
      const exists = prev.preferences.includes(pref);
      return {
        ...prev,
        preferences: exists
          ? prev.preferences.filter((p) => p !== pref)
          : [...prev.preferences, pref],
      };
    });
  };

  // Language handlers
  const addLanguage = () => {
    setFormData((prev) => ({
      ...prev,
      languages: [...prev.languages, { id: Date.now().toString(), language: '', proficiency: '' }],
    }));
  };

  const updateLanguage = (id: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.map((lang) =>
        lang.id === id ? { ...lang, [field]: value } : lang,
      ),
    }));
  };

  const removeLanguage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((lang) => lang.id !== id),
    }));
  };

  // Education handlers
  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          institutionName: '',
          degree: '',
          fieldOfStudy: '',
          startDate: '',
          endDate: '',
          current: false,
          grade: '',
        },
      ],
    }));
  };

  const updateEducation = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeEducation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Experience handlers
  const addExperience = () => {
    setFormData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          role: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          description: '',
          tags: [],
        },
      ],
    }));
  };

  const updateExperience = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      experiences: prev.experiences.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeExperience = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex flex-col w-full max-w-lg">
      <div className="flex flex-wrap gap-1.5 mb-8">
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const currentIndex = TABS.findIndex((t) => t.id === activeTab);
          const isCompleted = idx < currentIndex;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-axiforma transition-colors inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : isCompleted
                    ? 'text-white/70 hover:bg-white/5'
                    : 'text-white/35 hover:text-white/55'
              }`}
            >
              {isCompleted && !isActive && <CheckCircle2 className="w-3 h-3 text-[#00fad0]" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-7">
        <h2 className="text-[32px] leading-tight font-display font-medium tracking-tight text-white mb-2">
          Complete your profile
        </h2>
        <p className="text-sm text-white/45 font-axiforma leading-relaxed">
          Fill in your education, experience, and skills. Review anything pre-filled from your
          resume.
        </p>
      </div>

      <AnimatePresence>
        {linkedinBanner ? (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              linkedinBanner === 'ok'
                ? 'border-[#00fad0]/30 bg-[#00fad0]/[0.06] text-[#00fad0]'
                : 'border-amber-500/30 bg-amber-500/[0.06] text-amber-400'
            }`}
          >
            {linkedinBanner === 'ok'
              ? 'LinkedIn verified successfully.'
              : "Couldn't verify LinkedIn — you can try again or continue without it."}
            <button
              type="button"
              onClick={() => setLinkedinBanner(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Dynamic Content Area based on Tab — animated so each tab feels like a distinct step, not a re-render. */}
      <div className="flex flex-col ">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {activeTab === 'profile' && (
              <div key="profile">
                <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  Profile <span className="text-gray-500 font-normal ml-1">(Required)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-lg">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white/70">
                      Legal First Name <span className="text-[#00fad0]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      autoComplete="given-name"
                      className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white/70">
                      Legal Last Name <span className="text-[#00fad0]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      autoComplete="family-name"
                      className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2 ">
                    <label className="text-sm font-medium text-white/70">
                      Gender <span className="text-[#00fad0]">*</span>
                    </label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(val) => updateField('gender', val)}
                      placeholder="Select Gender"
                      className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3"
                      options={[
                        { label: 'Male', value: 'Male' },
                        { label: 'Female', value: 'Female' },
                        { label: 'Non-binary', value: 'Non-binary' },
                        { label: 'Prefer not to say', value: 'Prefer not to say' },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2 ">
                    <label className="text-sm font-medium text-white/70">
                      Date of Birth <span className="text-[#00fad0]">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <CustomSelect
                        value={formData.dobMonth}
                        onChange={(val) => updateField('dobMonth', val)}
                        placeholder="Month"
                        className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 "
                        options={MONTHS.map((m) => ({ label: m, value: m }))}
                      />
                      <CustomSelect
                        value={formData.dobDay}
                        onChange={(val) => updateField('dobDay', val)}
                        placeholder="Day"
                        className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3  font-display"
                        dropdownClassName="font-display"
                        options={DAYS.map((d) => ({ label: d.toString(), value: d.toString() }))}
                      />
                      <CustomSelect
                        value={formData.dobYear}
                        onChange={(val) => updateField('dobYear', val)}
                        placeholder="Year"
                        className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3  font-display"
                        dropdownClassName="font-display"
                        options={YEARS.map((y) => ({ label: y.toString(), value: y.toString() }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div key="education">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  Education
                </h3>
                <p className="text-sm text-gray-400 mb-5">
                  Add your degree, university or college details.
                </p>

                <div className="flex flex-col gap-4 max-w-lg">
                  {formData.education.map((item, index) => (
                    <div
                      key={index}
                      className="relative flex flex-col gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-[#00fad0]">
                          Education #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEducation(index)}
                          className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-white/70">
                          Institution / University Name <span className="text-[#00fad0]">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.institutionName}
                          onChange={(e) =>
                            updateEducation(index, 'institutionName', e.target.value)
                          }
                          placeholder="e.g. Stanford University or IIT Madras"
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">Degree</label>
                          <CustomSelect
                            value={item.degree ?? ''}
                            onChange={(val) => updateEducation(index, 'degree', val)}
                            placeholder="Select Degree"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm"
                            options={DEGREE_OPTIONS}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">
                            Field of Study
                          </label>
                          <input
                            type="text"
                            value={item.fieldOfStudy ?? ''}
                            onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value)}
                            placeholder="e.g. Computer Science"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">Start Date</label>
                          <input
                            type="text"
                            value={item.startDate ?? ''}
                            onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                            placeholder="YYYY or MM/YYYY"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">End Date</label>
                          <input
                            type="text"
                            disabled={item.current}
                            value={item.current ? 'Present' : (item.endDate ?? '')}
                            onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                            placeholder="YYYY or MM/YYYY"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50 disabled:opacity-50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">Grade / CGPA</label>
                          <input
                            type="text"
                            value={item.grade ?? ''}
                            onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                            placeholder="e.g. 3.8 / 85%"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={item.current ?? false}
                          onChange={(e) => updateEducation(index, 'current', e.target.checked)}
                          className="rounded border-white/20 text-[#00fad0] focus:ring-0"
                        />
                        <span className="text-xs text-white/70">Currently studying here</span>
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addEducation}
                  className="mt-4 text-sm font-medium text-[#00fad0] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add education entry
                </button>
              </div>
            )}

            {activeTab === 'experience' && (
              <div key="experience">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  Work Experience
                </h3>
                <p className="text-sm text-gray-400 mb-5">
                  Add internships, jobs, or research roles.
                </p>

                <div className="flex flex-col gap-4 max-w-lg">
                  {formData.experiences.map((item, index) => (
                    <div
                      key={index}
                      className="relative flex flex-col gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-[#00fad0]">
                          Experience #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExperience(index)}
                          className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">
                            Role / Title <span className="text-[#00fad0]">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.role}
                            onChange={(e) => updateExperience(index, 'role', e.target.value)}
                            placeholder="e.g. Software Engineer Intern"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">
                            Company <span className="text-[#00fad0]">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.company}
                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">Location</label>
                          <input
                            type="text"
                            value={item.location ?? ''}
                            onChange={(e) => updateExperience(index, 'location', e.target.value)}
                            placeholder="e.g. Remote or Bangalore"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">Start Date</label>
                          <input
                            type="text"
                            value={item.startDate ?? ''}
                            onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                            placeholder="MM/YYYY"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-white/70">End Date</label>
                          <input
                            type="text"
                            value={item.endDate ?? ''}
                            onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                            placeholder="MM/YYYY or Present"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-white/70">Description</label>
                        <textarea
                          rows={2}
                          value={item.description ?? ''}
                          onChange={(e) => updateExperience(index, 'description', e.target.value)}
                          placeholder="Key responsibilities and accomplishments..."
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00fad0]/50 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addExperience}
                  className="mt-4 text-sm font-medium text-[#00fad0] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add experience entry
                </button>
              </div>
            )}

            {activeTab === 'phone' && (
              <div key="phone">
                <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  Phone Number <span className="text-gray-500 font-normal ml-1">(Required)</span>
                </h3>

                <div className="flex flex-col gap-2 max-w-sm ">
                  <label className="text-sm font-medium text-white/70">
                    Mobile Number <span className="text-[#00fad0]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <CustomSelect
                      value={formData.phoneCountryCode}
                      onChange={(val) => updateField('phoneCountryCode', val)}
                      className="w-28 shrink-0 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3  font-display"
                      dropdownClassName="font-display"
                      options={[
                        { label: '+1', value: '+1' },
                        { label: '+44', value: '+44' },
                        { label: '+91', value: '+91' },
                      ]}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={formData.phoneNumber}
                      onChange={(e) => updateField('phoneNumber', e.target.value)}
                      placeholder="98765 43210"
                      className="min-w-0 flex-1 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner  font-display"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <SocialVerification formData={formData} updateField={updateField} />
            )}

            {activeTab === 'repo-picks' && (
              <RepoPicker formData={formData} updateField={updateField} />
            )}

            {activeTab === 'languages' && (
              <div key="languages">
                <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                    {TABS.findIndex((t) => t.id === 'languages') + 1}
                  </span>
                  Languages <span className="text-gray-500 font-normal ml-1">(Required)</span>
                </h3>

                <div className="flex flex-col gap-3 max-w-xl ">
                  {formData.languages.map((item, index) => (
                    <div
                      key={item.id}
                      style={{ zIndex: 100 - index }}
                      className="relative flex gap-4 items-end bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                    >
                      <div className="flex-1 flex flex-col gap-1.5 ">
                        <label className="text-xs font-medium text-gray-400">Language</label>
                        <CustomSelect
                          value={item.language}
                          onChange={(val) => updateLanguage(item.id, 'language', val)}
                          placeholder="Select Language"
                          className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2"
                          options={LANGUAGE_OPTIONS.map((lang) => ({ label: lang, value: lang }))}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5 ">
                        <label className="text-xs font-medium text-gray-400">
                          Proficiency / Fluency
                        </label>
                        <CustomSelect
                          value={item.proficiency}
                          onChange={(val) => updateLanguage(item.id, 'proficiency', val)}
                          placeholder="Select Proficiency"
                          className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2"
                          options={FLUENCY_OPTIONS.map((f) => ({ label: f, value: f }))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLanguage(item.id)}
                        className="p-2 mb-0.5 text-gray-500 hover:text-red-400 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all z-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLanguage}
                  className="mt-4 text-sm font-medium text-[#00fad0] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add another language
                </button>
              </div>
            )}

            {activeTab === 'skill-discovery' && (
              <SkillDiscovery formData={formData} updateField={updateField} />
            )}

            {activeTab === 'preferences' && (
              <div key="preferences">
                <h3 className="text-base font-bold text-white mb-4">
                  Select the type of projects you're interested in
                </h3>

                <div className="flex flex-wrap gap-2.5 mb-10">
                  {PROJECT_TYPES.map((item) => {
                    const isSelected = formData.preferences.includes(item);
                    return (
                      <label
                        key={item}
                        className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/50 dark:bg-[#161616] hover:bg-white/80 dark:hover:bg-white/5 cursor-pointer transition-colors shadow-sm overflow-hidden"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePreference(item)}
                          className="peer absolute opacity-0 w-0 h-0"
                        />
                        <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center peer-checked:bg-[#00fad0] peer-checked:border-[#00fad0] transition-colors">
                          <CheckCircle2 className="w-3 h-3 text-black opacity-0 peer-checked:opacity-100" />
                        </div>
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === 'consent' && (
              <div key="consent">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                    {TABS.findIndex((t) => t.id === 'consent') + 1}
                  </span>
                  Data Privacy & Consent{' '}
                  <span className="text-gray-500 font-normal ml-1">(Required)</span>
                </h3>

                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm max-w-xl">
                  <h4 className="text-white font-semibold mb-3">DPDP Act Acknowledgment</h4>
                  <p className="text-sm text-white/45 mb-6 leading-relaxed">
                    In accordance with the Digital Personal Data Protection (DPDP) Act, we require
                    your explicit consent to collect, store, and process your personal information.
                    Your data will only be used to match you with opportunities and will never be
                    shared with unauthorized third parties.
                  </p>

                  <label className="group relative flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#161616] hover:bg-white dark:hover:bg-white/5 cursor-pointer transition-colors shadow-sm">
                    <input
                      type="checkbox"
                      checked={formData.dpdpConsent}
                      onChange={(e) => updateField('dpdpConsent', e.target.checked)}
                      className="peer absolute opacity-0 w-0 h-0"
                    />
                    <div className="mt-0.5 w-5 h-5 shrink-0 rounded border border-gray-300 dark:border-white/20 flex items-center justify-center peer-checked:bg-[#00fad0] peer-checked:border-[#00fad0] transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white mb-1">
                        I consent to data processing
                      </span>
                      <span className="text-xs text-gray-500">
                        I have read and agree to the Privacy Policy and terms regarding the handling
                        of my personal profile data.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {saveError ? <p className="mt-6 text-sm text-red-400">{saveError}</p> : null}

      <div className="mt-8 flex gap-3 pt-6 border-t border-white/8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-axiforma text-white/50 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={() => void handleContinue()}
          disabled={saving}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#00fad0] text-[#0a0a0a] text-sm font-axiforma font-medium ml-auto disabled:opacity-50"
        >
          {saving ? 'Saving…' : activeTab === 'consent' ? 'Complete Profile' : 'Continue'}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
