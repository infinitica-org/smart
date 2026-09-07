'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { LightSelect } from '../../ui/LightSelect';
import {
  MONTHS,
  validateEducationItems,
  validateExperienceItems,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import {
  BackButton,
  ErrorBanner,
  FieldLabel,
  PrimaryButton,
  StepHeading,
  TextInput,
  stepMotionProps,
} from '../wizard-ui';

interface BasicProfileStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}

type SubTab = 'profile' | 'education' | 'experience' | 'phone';
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'phone', label: 'Phone' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const YEARS = Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString());
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

export default function BasicProfileStep({
  formData,
  updateField,
  onBack,
  onContinue,
}: BasicProfileStepProps) {
  const [tab, setTab] = useState<SubTab>('profile');
  const [error, setError] = useState<string | null>(null);
  const tabIndex = useMemo(() => SUB_TABS.findIndex((t) => t.id === tab), [tab]);

  const addEducation = () =>
    updateField('education', [
      ...formData.education,
      {
        institutionName: '',
        degree: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        current: false,
        grade: '',
      },
    ]);
  const updateEducation = (index: number, field: string, value: unknown) =>
    updateField(
      'education',
      formData.education.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  const removeEducation = (index: number) =>
    updateField(
      'education',
      formData.education.filter((_, i) => i !== index),
    );

  const addExperience = () =>
    updateField('experiences', [
      ...formData.experiences,
      {
        role: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        tags: [],
      },
    ]);
  const updateExperience = (index: number, field: string, value: unknown) =>
    updateField(
      'experiences',
      formData.experiences.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  const removeExperience = (index: number) =>
    updateField(
      'experiences',
      formData.experiences.filter((_, i) => i !== index),
    );

  const goNext = () => {
    setError(null);
    if (tab === 'profile' && (!formData.firstName.trim() || !formData.lastName.trim())) {
      setError('First and last name are required.');
      return;
    }
    if (tab === 'education') {
      const err = validateEducationItems(formData.education);
      if (err) {
        setError(err);
        return;
      }
    }
    if (tab === 'experience') {
      const err = validateExperienceItems(formData.experiences);
      if (err) {
        setError(err);
        return;
      }
    }
    if (tab === 'phone' && !formData.phoneNumber.trim()) {
      setError('Phone number is required.');
      return;
    }
    const nextTab = SUB_TABS[tabIndex + 1];
    if (nextTab) {
      setTab(nextTab.id);
    } else {
      onContinue();
    }
  };

  const goBack = () => {
    setError(null);
    const previousTab = SUB_TABS[tabIndex - 1];
    if (previousTab) {
      setTab(previousTab.id);
    } else {
      onBack();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-8">
        {SUB_TABS.map((t, idx) => {
          const isActive = tab === t.id;
          const isCompleted = idx < tabIndex;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : isCompleted
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isCompleted && !isActive && <CheckCircle2 className="w-3 h-3" />}
              {t.label}
            </button>
          );
        })}
      </div>

      <StepHeading
        title="Tell us about you"
        subtitle="Basic details, education, and experience — you can always edit these later."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <motion.div key={tab} {...stepMotionProps}>
        {tab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <FieldLabel required>Legal First Name</FieldLabel>
              <TextInput
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div>
              <FieldLabel required>Legal Last Name</FieldLabel>
              <TextInput
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Gender</FieldLabel>
              <LightSelect
                value={formData.gender}
                onChange={(val) => updateField('gender', val)}
                placeholder="Select gender"
                options={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' },
                  { label: 'Non-binary', value: 'Non-binary' },
                  { label: 'Prefer not to say', value: 'Prefer not to say' },
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Date of Birth</FieldLabel>
              <div className="grid grid-cols-3 gap-3">
                <LightSelect
                  value={formData.dobMonth}
                  onChange={(val) => updateField('dobMonth', val)}
                  placeholder="Month"
                  options={MONTHS.map((m) => ({ label: m, value: m }))}
                />
                <LightSelect
                  value={formData.dobDay}
                  onChange={(val) => updateField('dobDay', val)}
                  placeholder="Day"
                  options={DAYS.map((d) => ({ label: d, value: d }))}
                />
                <LightSelect
                  value={formData.dobYear}
                  onChange={(val) => updateField('dobYear', val)}
                  placeholder="Year"
                  options={YEARS.map((y) => ({ label: y, value: y }))}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'education' && (
          <div>
            <p className="text-sm text-gray-500 mb-5">
              Add your degree, university or college details.
            </p>
            <div className="flex flex-col gap-4">
              {formData.education.map((item, index) => (
                <div
                  key={index}
                  className="relative flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">
                      Education #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <FieldLabel required>Institution / University Name</FieldLabel>
                    <TextInput
                      value={item.institutionName}
                      onChange={(e) => updateEducation(index, 'institutionName', e.target.value)}
                      placeholder="e.g. Stanford University or IIT Madras"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Degree</FieldLabel>
                      <LightSelect
                        value={item.degree ?? ''}
                        onChange={(val) => updateEducation(index, 'degree', val)}
                        placeholder="Select degree"
                        options={DEGREE_OPTIONS}
                      />
                    </div>
                    <div>
                      <FieldLabel>Field of Study</FieldLabel>
                      <TextInput
                        value={item.fieldOfStudy ?? ''}
                        onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value)}
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Start Date</FieldLabel>
                      <TextInput
                        value={item.startDate ?? ''}
                        onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                        placeholder="YYYY"
                      />
                    </div>
                    <div>
                      <FieldLabel>End Date</FieldLabel>
                      <TextInput
                        disabled={item.current}
                        value={item.current ? 'Present' : (item.endDate ?? '')}
                        onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                        placeholder="YYYY"
                      />
                    </div>
                    <div>
                      <FieldLabel>Grade / CGPA</FieldLabel>
                      <TextInput
                        value={item.grade ?? ''}
                        onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                        placeholder="e.g. 8.5"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={item.current ?? false}
                      onChange={(e) => updateEducation(index, 'current', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-600">Currently studying here</span>
                  </label>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEducation}
              className="mt-4 text-sm font-medium text-gray-900 hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add education entry
            </button>
          </div>
        )}

        {tab === 'experience' && (
          <div>
            <p className="text-sm text-gray-500 mb-5">
              Add internships, jobs, or research roles (optional).
            </p>
            <div className="flex flex-col gap-4">
              {formData.experiences.map((item, index) => (
                <div
                  key={index}
                  className="relative flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">
                      Experience #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Role / Title</FieldLabel>
                      <TextInput
                        value={item.role}
                        onChange={(e) => updateExperience(index, 'role', e.target.value)}
                        placeholder="e.g. Software Engineer Intern"
                      />
                    </div>
                    <div>
                      <FieldLabel required>Company</FieldLabel>
                      <TextInput
                        value={item.company}
                        onChange={(e) => updateExperience(index, 'company', e.target.value)}
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Location</FieldLabel>
                      <TextInput
                        value={item.location ?? ''}
                        onChange={(e) => updateExperience(index, 'location', e.target.value)}
                        placeholder="Remote or Bangalore"
                      />
                    </div>
                    <div>
                      <FieldLabel>Start Date</FieldLabel>
                      <TextInput
                        value={item.startDate ?? ''}
                        onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                        placeholder="MM/YYYY"
                      />
                    </div>
                    <div>
                      <FieldLabel>End Date</FieldLabel>
                      <TextInput
                        value={item.endDate ?? ''}
                        onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                        placeholder="MM/YYYY or Present"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                      rows={2}
                      value={item.description ?? ''}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      placeholder="Key responsibilities and accomplishments..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExperience}
              className="mt-4 text-sm font-medium text-gray-900 hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add experience entry
            </button>
          </div>
        )}

        {tab === 'phone' && (
          <div className="max-w-sm">
            <FieldLabel required>Mobile Number</FieldLabel>
            <div className="flex gap-2">
              <LightSelect
                value={formData.phoneCountryCode}
                onChange={(val) => updateField('phoneCountryCode', val)}
                className="w-28 shrink-0"
                options={[
                  { label: '+1', value: '+1' },
                  { label: '+44', value: '+44' },
                  { label: '+91', value: '+91' },
                ]}
              />
              <TextInput
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={formData.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                placeholder="98765 43210"
              />
            </div>
          </div>
        )}
      </motion.div>

      <div className="mt-10 flex justify-between">
        <BackButton onClick={goBack} />
        <PrimaryButton onClick={goNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
