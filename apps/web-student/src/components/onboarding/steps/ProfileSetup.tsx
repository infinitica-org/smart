import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomSelect } from '../../ui/CustomSelect';
import { api } from '@/lib/api';
import { useProfileStore } from '@/lib/stores/profile-store';
import {
  emptyOnboardingForm,
  mergeOnboardingIntoProfile,
  profileToOnboarding,
} from '@/lib/map-student-profile';

interface ProfileSetupProps {
  onBack: () => void;
  onContinue: () => void;
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

export default function ProfileSetup({ onBack, onContinue }: ProfileSetupProps) {
  const [activeTab, setActiveTab] = useState<TabID>('profile');

  const [formData, setFormData] = useState(emptyOnboardingForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [me, saved] = await Promise.all([api.auth.me(), api.users.getProfile()]);
        if (cancelled) return;
        useProfileStore.getState().hydrate(saved.profile);
        setFormData(profileToOnboarding(saved.profile, me.fullName));
      } catch {
        /* keep blank form until save */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: string, value: any) => {
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
      setActiveTab(TABS[currentIndex + 1]!.id);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setSaveError('First and last name are required.');
      setActiveTab('profile');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setSaveError('Phone number is required.');
      setActiveTab('phone');
      return;
    }
    if (!formData.linkedinUrl.trim()) {
      setSaveError('LinkedIn profile is required.');
      setActiveTab('linkedin');
      return;
    }
    if (!formData.languages.some((l) => l.language.trim() && l.proficiency.trim())) {
      setSaveError('At least one language is required.');
      setActiveTab('languages');
      return;
    }
    if (formData.preferences.length === 0) {
      setSaveError('Please select at least one project preference.');
      setActiveTab('preferences');
      return;
    }
    if (!formData.dpdpConsent) {
      setSaveError('You must agree to the DPDP consent terms to complete your profile.');
      setActiveTab('consent');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const existing = await api.users.getProfile();
      const merged = mergeOnboardingIntoProfile(existing.profile, formData);
      const saved = await api.users.saveProfile(merged);
      useProfileStore.getState().hydrate(saved.profile);
      localStorage.setItem('studentProfileData', JSON.stringify(formData));
      onContinue();
    } catch {
      setSaveError('Could not save your profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1]!.id);
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
    <div className="flex flex-col relative w-full max-w-2xl mx-auto">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00fad0]/5 rounded-full blur-[100px] -mr-[100px] -mt-[100px] pointer-events-none" />

      {/* Pills Navigation */}
      <div className="flex flex-wrap gap-2 mb-10 relative z-10">
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const currentIndex = TABS.findIndex((t) => t.id === activeTab);
          const isCompleted = idx < currentIndex;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? 'border-[#00fad0]/40 text-[#00fad0] bg-[#00fad0]/10 shadow-[0_0_15px_rgba(0,250,208,0.15)]'
                  : isCompleted
                    ? 'border-white/10 text-gray-700 dark:text-gray-300 bg-white/5 hover:bg-white/10'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-white/5'
              }`}
            >
              {isCompleted && !isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00fad0]" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-8 relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-display">
          Tell us more about you
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          We've filled in your details based on your resume. Take a moment to review and make any
          necessary updates.
        </p>
      </div>

      {/* Dynamic Content Area based on Tab */}
      <div className="flex flex-col relative z-20">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  1
                </span>
                Profile <span className="text-gray-500 font-normal ml-1">(Required)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-lg">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Legal First Name <span className="text-[#00fad0]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    autoComplete="given-name"
                    className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Legal Last Name <span className="text-[#00fad0]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    autoComplete="family-name"
                    className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2 relative z-20">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <div className="flex flex-col gap-2 md:col-span-2 relative z-10">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of Birth <span className="text-[#00fad0]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <CustomSelect
                      value={formData.dobMonth}
                      onChange={(val) => updateField('dobMonth', val)}
                      placeholder="Month"
                      className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 relative z-30"
                      options={MONTHS.map((m) => ({ label: m, value: m }))}
                    />
                    <CustomSelect
                      value={formData.dobDay}
                      onChange={(val) => updateField('dobDay', val)}
                      placeholder="Day"
                      className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 relative z-20 font-display"
                      dropdownClassName="font-display"
                      options={DAYS.map((d) => ({ label: d.toString(), value: d.toString() }))}
                    />
                    <CustomSelect
                      value={formData.dobYear}
                      onChange={(val) => updateField('dobYear', val)}
                      placeholder="Year"
                      className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 relative z-10 font-display"
                      dropdownClassName="font-display"
                      options={YEARS.map((y) => ({ label: y.toString(), value: y.toString() }))}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Phone Number <span className="text-gray-500 font-normal ml-1">(Required)</span>
              </h3>

              <div className="flex flex-col gap-2 max-w-sm relative z-20">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mobile Number <span className="text-[#00fad0]">*</span>
                </label>
                <div className="flex gap-2">
                  <CustomSelect
                    value={formData.phoneCountryCode}
                    onChange={(val) => updateField('phoneCountryCode', val)}
                    className="w-28 shrink-0 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 relative z-30 font-display"
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
                    className="min-w-0 flex-1 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner relative z-10 font-display"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'linkedin' && (
            <motion.div
              key="linkedin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
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
                  className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-xl pl-16 pr-4 py-3.5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 focus:ring-1 focus:ring-[#00fad0]/50 transition-all shadow-inner"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'languages' && (
            <motion.div
              key="languages"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  4
                </span>
                Languages <span className="text-gray-500 font-normal ml-1">(Required)</span>
              </h3>

              <div className="flex flex-col gap-3 max-w-xl relative z-20">
                {formData.languages.map((item, index) => (
                  <div
                    key={item.id}
                    style={{ zIndex: 100 - index }}
                    className="relative flex gap-4 items-end bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                  >
                    <div className="flex-1 flex flex-col gap-1.5 relative z-20">
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
                    <div className="flex-1 flex flex-col gap-1.5 relative z-10">
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
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
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
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors">
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Select the coding languages you know
              </h3>
              <div className="flex flex-col gap-3 max-w-xl relative z-20">
                {formData.codingProficiencies.map((item, index) => (
                  <div
                    key={item.id}
                    style={{ zIndex: 100 - index }}
                    className="relative flex gap-4 items-end bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                  >
                    <div className="flex-1 flex flex-col gap-1.5 relative z-20">
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
                    <div className="flex-1 flex flex-col gap-1.5 relative z-10">
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
            </motion.div>
          )}
          {activeTab === 'consent' && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
                  5
                </span>
                Data Privacy & Consent{' '}
                <span className="text-gray-500 font-normal ml-1">(Required)</span>
              </h3>

              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm max-w-xl">
                <h4 className="text-gray-900 dark:text-white font-semibold mb-3">
                  DPDP Act Acknowledgment
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
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
                    <span className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      I consent to data processing
                    </span>
                    <span className="text-xs text-gray-500">
                      I have read and agree to the Privacy Policy and terms regarding the handling
                      of my personal profile data.
                    </span>
                  </div>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {saveError ? <p className="mt-6 text-sm text-red-400">{saveError}</p> : null}

      <div className="mt-8 flex gap-3 relative z-10 pt-6 border-t border-white/5">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-transparent dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 transition-colors text-sm font-medium border border-transparent hover:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => void handleContinue()}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#00fad0] hover:bg-[#00fad0]/90 text-black shadow-[0_0_20px_rgba(0,250,208,0.2)] transition-all text-sm font-semibold ml-auto disabled:opacity-60"
        >
          {saving ? 'Saving…' : activeTab === 'consent' ? 'Complete Profile' : 'Continue'}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
