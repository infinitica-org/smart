import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { CustomSelect } from '../../ui/CustomSelect';
import { api } from '@/lib/api';
import {
  MONTHS,
  buildCompleteOnboardingRequest,
  clearOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';

interface ProfileSetupProps {
  initialForm: OnboardingProfileForm;
  onBack: () => void;
  onComplete: () => void;
}

type TabID = 'profile' | 'phone' | 'linkedin' | 'languages' | 'preferences' | 'consent';

const TABS: { id: TabID; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'phone', label: 'Phone number' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'languages', label: 'Languages' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'consent', label: 'Consent' },
];

function tabAt(index: number): TabID | undefined {
  return TABS[index]?.id;
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

export default function ProfileSetup({ initialForm, onBack, onComplete }: ProfileSetupProps) {
  const [activeTab, setActiveTab] = useState<TabID>('profile');

  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialForm);
  }, [initialForm]);

  useEffect(() => {
    saveOnboardingDraft(formData);
  }, [formData]);

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
    if (activeTab === 'phone' && !formData.phoneNumber.trim()) {
      setSaveError('Phone number is required.');
      return;
    }
    if (activeTab === 'linkedin' && !formData.linkedinUrl.trim()) {
      setSaveError('LinkedIn profile is required.');
      return;
    }
    if (
      activeTab === 'languages' &&
      !formData.languages.some((l) => l.language.trim() && l.proficiency.trim())
    ) {
      setSaveError('At least one language is required.');
      return;
    }
    if (activeTab === 'preferences' && formData.preferences.length === 0) {
      setSaveError('Please select at least one project preference.');
      return;
    }

    if (currentIndex < TABS.length - 1) {
      const nextTab = tabAt(currentIndex + 1);
      if (nextTab) setActiveTab(nextTab);
      return;
    }

    const payload = buildCompleteOnboardingRequest(formData);
    if ('error' in payload) {
      setSaveError(payload.error);
      if (payload.error.includes('DPDP')) setActiveTab('consent');
      else if (payload.error.includes('language')) setActiveTab('languages');
      else if (payload.error.includes('preference')) setActiveTab('preferences');
      else if (payload.error.includes('LinkedIn')) setActiveTab('linkedin');
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
    const previousTab = tabAt(currentIndex - 1);
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

  const addCodingProficiency = () => {
    setFormData((prev) => ({
      ...prev,
      codingProficiencies: [
        ...prev.codingProficiencies,
        { id: Date.now().toString(), language: '', proficiency: '' },
      ],
    }));
  };

  const updateCodingProficiency = (id: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      codingProficiencies: prev.codingProficiencies.map((cp) =>
        cp.id === id ? { ...cp, [field]: value } : cp,
      ),
    }));
  };

  const removeCodingProficiency = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      codingProficiencies: prev.codingProficiencies.filter((cp) => cp.id !== id),
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
          Required fields only. Review anything we pre-filled from your resume.
        </p>
      </div>

      {/* Dynamic Content Area based on Tab */}
      <div className="flex flex-col ">
        <>
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

          {activeTab === 'phone' && (
            <div key="phone">
              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  2
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

          {activeTab === 'linkedin' && (
            <div key="linkedin">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  3
                </span>
                LinkedIn Profile <span className="text-gray-500 font-normal ml-1">(Required)</span>
              </h3>
              <p className="text-sm text-gray-400 mb-6 ml-8">
                Add your LinkedIn profile to showcase your professional network.
              </p>

              <div className="max-w-lg ml-8 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">https://</span>
                </div>
                <input
                  type="text"
                  value={formData.linkedinUrl}
                  onChange={(e) => updateField('linkedinUrl', e.target.value)}
                  autoComplete="url"
                  placeholder="linkedin.com/in/you"
                  className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl pl-16 pr-4 py-3.5 text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner"
                />
              </div>
            </div>
          )}

          {activeTab === 'languages' && (
            <div key="languages">
              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  4
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
                        options={[
                          { label: 'English', value: 'English' },
                          { label: 'Spanish', value: 'Spanish' },
                          { label: 'French', value: 'French' },
                          { label: 'German', value: 'German' },
                        ]}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 ">
                      <label className="text-xs font-medium text-gray-400">Proficiency</label>
                      <CustomSelect
                        value={item.proficiency}
                        onChange={(val) => updateLanguage(item.id, 'proficiency', val)}
                        placeholder="Select Proficiency"
                        className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2"
                        options={[
                          { label: 'Native or Bilingual', value: 'Native or Bilingual' },
                          { label: 'Fluent', value: 'Fluent' },
                          { label: 'Conversational', value: 'Conversational' },
                          { label: 'Beginner', value: 'Beginner' },
                        ]}
                      />
                    </div>
                    <button
                      onClick={() => removeLanguage(item.id)}
                      className="p-2 mb-0.5 text-gray-500 hover:text-red-400 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all z-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addLanguage}
                className="mt-4 text-sm font-medium text-[#00fad0] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add another language
              </button>
            </div>
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

              <h3 className="text-base font-bold text-white mb-4">
                Select the coding languages you know
              </h3>
              <div className="flex flex-col gap-3 max-w-xl ">
                {formData.codingProficiencies.map((item, index) => (
                  <div
                    key={item.id}
                    style={{ zIndex: 100 - index }}
                    className="relative flex gap-4 items-end bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                  >
                    <div className="flex-1 flex flex-col gap-1.5 ">
                      <label className="text-xs font-medium text-gray-400">Coding Language</label>
                      <CustomSelect
                        value={item.language}
                        onChange={(val) => updateCodingProficiency(item.id, 'language', val)}
                        placeholder="Select Language"
                        className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2"
                        options={[
                          { label: 'C++', value: 'C++' },
                          { label: 'CSS', value: 'CSS' },
                          { label: 'HTML', value: 'HTML' },
                          { label: 'Java', value: 'Java' },
                          { label: 'JavaScript', value: 'JavaScript' },
                          { label: 'Python', value: 'Python' },
                        ]}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 ">
                      <label className="text-xs font-medium text-gray-400">Proficiency</label>
                      <CustomSelect
                        value={item.proficiency}
                        onChange={(val) => updateCodingProficiency(item.id, 'proficiency', val)}
                        placeholder="Select Proficiency"
                        className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2"
                        options={[
                          { label: 'Advanced', value: 'Advanced' },
                          { label: 'Intermediate', value: 'Intermediate' },
                          { label: 'Beginner', value: 'Beginner' },
                        ]}
                      />
                    </div>
                    <button
                      onClick={() => removeCodingProficiency(item.id)}
                      className="p-2 mb-0.5 text-gray-500 hover:text-red-400 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all z-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addCodingProficiency}
                className="mt-4 text-sm font-medium text-[#00fad0] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add another coding language
              </button>
            </div>
          )}
          {activeTab === 'consent' && (
            <div key="consent">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  5
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
        </>
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
