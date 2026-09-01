'use client';

import { useState, useEffect } from 'react';
import { useProfileStore } from '@/lib/stores/profile-store';
import {
  Edit,
  Trash2,
  Upload,
  Plus,
  ChevronDown,
  CheckCircle2,
  FileText,
  Download,
} from 'lucide-react';
import { mockQueueSkillVerification } from '@/lib/api';

// Import forms
import { BasicInfoForm } from '@/components/profile/BasicInfoForm';
import { EducationForm } from '@/components/profile/EducationForm';
import { ProjectForm } from '@/components/profile/ProjectForm';
import { SkillsForm } from '@/components/profile/SkillsForm';
import { CertificationForm } from '@/components/profile/CertificationForm';
import { ExperienceForm } from '@/components/profile/ExperienceForm';
import { SubjectForm } from '@/components/profile/SubjectForm';

const MENU_ITEMS = [
  { id: 'basic', label: 'Basic Details' },
  { id: 'education', label: 'Education Details' },
  { id: 'experience', label: 'Internship & Work Ex' },
  { id: 'skills', label: 'Skills, Subjects & Languages' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
];

export default function ProfilePage() {
  const {
    data,
    updateBasicInfo,
    addEducation,
    removeEducation,
    addSkill,
    updateSkill,
    removeSkill,
    addProject,
    removeProject,
    addCertification,
    removeCertification,
    addExperience,
    removeExperience,
    addSubject,
    removeSubject,
  } = useProfileStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingCert, setIsAddingCert] = useState(false);
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [isAddingLanguage, setIsAddingLanguage] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const {
    basicInfo,
    education,
    projects,
    skills,
    certifications,
    experiences = [],
    subjects = [],
  } = data;
  const initials =
    `${basicInfo?.firstName?.[0] ?? ''}${basicInfo?.lastName?.[0] ?? ''}`.toUpperCase() || 'SV';
  const fullName =
    `${basicInfo?.firstName || 'STUDENT'} ${basicInfo?.lastName || 'NAME'}`.toUpperCase();

  return (
    <div className="flex h-full w-full max-w-[1400px] mx-auto overflow-hidden bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-[40px] shadow-2xl mb-8">
      {/* LEFT SIDEBAR */}
      <div className="w-[280px] shrink-0 border-r border-white/50 dark:border-white/10 flex flex-col h-full overflow-y-auto custom-scrollbar py-8 bg-white/20 dark:bg-white/5">
        {/* User Info */}
        <div className="flex flex-col items-center px-6 mb-8 text-center">
          <div className="relative group w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 border border-white/50 dark:border-white/20 flex items-center justify-center shadow-lg mb-4 overflow-hidden cursor-pointer">
            <span className="text-3xl font-display text-gray-700 dark:text-white group-hover:opacity-0 transition-opacity">
              {initials}
            </span>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
              <Upload className="w-5 h-5 text-[#00fad0] mb-1" />
              <span className="text-[10px] text-[#00fad0] font-bold uppercase tracking-wider">
                Upload
              </span>
            </div>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide">
            {fullName}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Superset ID: 6251252</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col px-4 gap-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`text-left px-5 py-3.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#00fad0] text-black shadow-lg shadow-[#00fad0]/20 scale-[1.02]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar relative">
        <div className="max-w-5xl mx-auto p-8 md:p-12">
          {/* TAB CONTENT: BASIC DETAILS */}
          {activeTab === 'basic' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Basic Details</h1>
                {!isEditingBasic && (
                  <button
                    onClick={() => setIsEditingBasic(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Details
                  </button>
                )}
              </div>
              {isEditingBasic ? (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm">
                  <BasicInfoForm
                    initialData={basicInfo}
                    onSubmit={(d) => {
                      updateBasicInfo(d);
                      setIsEditingBasic(false);
                    }}
                    onCancel={() => setIsEditingBasic(false)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-8 border-t border-gray-100 dark:border-white/10 pt-6">
                  {/* About Section */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">About</h2>
                    <div className="grid grid-cols-[200px_1fr] gap-y-4">
                      <div className="text-sm text-gray-500">Full Name :</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {basicInfo?.firstName || ''} {basicInfo?.lastName || ''}
                      </div>

                      <div className="text-sm text-gray-500">Date of Birth :</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {basicInfo?.dob || '-'}
                      </div>

                      <div className="text-sm text-gray-500">Gender :</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {basicInfo?.gender || '-'}
                      </div>

                      <div className="text-sm text-gray-500">Current/Latest College :</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {basicInfo?.currentCollege || '-'}{' '}
                        <button className="text-[#312e81] dark:text-[#00fad0] flex items-center gap-1 text-xs">
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100 dark:border-white/10" />

                  {/* Summary Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">Summary</h2>
                      <button className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add new
                      </button>
                    </div>
                    {basicInfo?.summary ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {basicInfo.summary}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        You have not added a profile summary yet. Go ahead and write something about
                        yourself.
                      </p>
                    )}
                  </div>

                  <hr className="border-gray-100 dark:border-white/10" />

                  {/* Address Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">Address</h2>
                      <button className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 dark:border-white/20 text-[#312e81] dark:text-[#00fad0] rounded-full text-xs font-medium transition-colors">
                        <Edit className="w-3.5 h-3.5" /> Edit Info
                      </button>
                    </div>
                    <div className="grid grid-cols-[200px_1fr] gap-y-4">
                      <div className="text-sm text-gray-500">Permanent Address :</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {basicInfo?.permanentAddress || '-'}
                      </div>

                      <div className="text-sm text-gray-500">Current Address :</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {basicInfo?.currentAddress || '-'}
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100 dark:border-white/10" />

                  {/* Placement Enrollments Section */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                      Placement Enrollments
                    </h2>
                    <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex gap-6 items-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-medium">Aug</span>
                          <span className="text-sm text-gray-500">2020</span>
                        </div>
                        <div className="text-gray-300">-</div>
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-medium">Aug</span>
                          <span className="text-sm text-gray-500">2040</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Superset Placements</h4>
                          <button className="text-[#312e81] dark:text-[#00fad0] text-xs">
                            View Details
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 border border-green-200 dark:border-green-500/20 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100 dark:border-white/10" />

                  {/* Social Media */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                        Social Media Accounts & Profiles
                      </h2>
                      <button className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add new
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {basicInfo?.linkedinUrl && (
                        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-full">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                            {basicInfo.linkedinUrl}
                          </span>
                          <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {basicInfo?.githubUrl && (
                        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-full">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                            {basicInfo.githubUrl}
                          </span>
                          <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {!basicInfo?.linkedinUrl && !basicInfo?.githubUrl && (
                        <p className="text-sm text-gray-500">No social media links added.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Projects</h1>
                {!isAddingProject && (
                  <button
                    onClick={() => setIsAddingProject(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add new
                  </button>
                )}
              </div>

              {isAddingProject && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-8">
                  <ProjectForm
                    onSubmit={(p) => {
                      addProject(p);
                      setIsAddingProject(false);
                    }}
                    onCancel={() => setIsAddingProject(false)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-6">
                {projects.length === 0 && !isAddingProject && (
                  <p className="text-sm text-gray-500">No projects added yet.</p>
                )}

                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-start justify-between py-6 border-b border-gray-100 dark:border-white/10 last:border-0 group"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {project.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Dec 23 - Present | {project.approach || 'Full Stack'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeProject(project.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-blue-500 transition-colors">
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: SKILLS */}
          {activeTab === 'skills' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Technical Skills */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Technical Skills
                  </h1>
                  {!isAddingSkill && (
                    <button
                      onClick={() => setIsAddingSkill(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add new
                    </button>
                  )}
                </div>

                {isAddingSkill && (
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-6">
                    <SkillsForm
                      type="technical"
                      onSubmit={(s) => {
                        addSkill(s);
                        setIsAddingSkill(false);
                        // SE-T01: Queue verification
                        mockQueueSkillVerification(s.id).then(() => {
                          updateSkill(s.id, { ...s, verificationStatus: 'In verification' });
                          // Simulate it completing verification after some time
                          setTimeout(() => {
                            updateSkill(s.id, { ...s, verificationStatus: 'Verified' });
                          }, 3000);
                        });
                      }}
                      onCancel={() => setIsAddingSkill(false)}
                    />
                  </div>
                )}

                <div className="flex flex-col">
                  {skills.filter((s) => s.type !== 'language').length === 0 && !isAddingSkill && (
                    <p className="text-sm text-gray-500">No technical skills added yet.</p>
                  )}

                  {skills
                    .filter((s) => s.type !== 'language')
                    .map((skill) => (
                      <div
                        key={skill.id}
                        className="grid grid-cols-12 items-center py-4 border-b border-gray-100 dark:border-white/10 last:border-0 group"
                      >
                        <div className="col-span-4 flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {skill.language}
                          </span>
                          {skill.verificationStatus && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                skill.verificationStatus === 'Declared'
                                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                  : skill.verificationStatus === 'In verification'
                                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                    : skill.verificationStatus === 'Verified'
                                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                              }`}
                            >
                              {skill.verificationStatus}
                            </span>
                          )}
                          {skill.verificationStatus === 'Locked' && skill.lockedUntil && (
                            <span className="text-[10px] text-gray-500">
                              until {skill.lockedUntil}
                            </span>
                          )}
                        </div>
                        <div className="col-span-6">
                          <span className="text-sm text-gray-500">{skill.proficiency}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-3">
                          <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeSkill(skill.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-blue-500 transition-colors">
                            <Upload className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Languages */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Languages</h1>
                  {!isAddingLanguage && (
                    <button
                      onClick={() => setIsAddingLanguage(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add new
                    </button>
                  )}
                </div>
                {isAddingLanguage && (
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-6">
                    <SkillsForm
                      type="language"
                      onSubmit={(s) => {
                        addSkill(s);
                        setIsAddingLanguage(false);
                      }}
                      onCancel={() => setIsAddingLanguage(false)}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  {skills.filter((s) => s.type === 'language').length === 0 && (
                    <p className="text-sm text-gray-500">No languages added yet.</p>
                  )}

                  {skills
                    .filter((s) => s.type === 'language')
                    .map((skill) => (
                      <div
                        key={skill.id}
                        className="grid grid-cols-12 items-center py-4 border-b border-gray-100 dark:border-white/10 last:border-0 group"
                      >
                        <div className="col-span-4">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {skill.language}
                          </span>
                        </div>
                        <div className="col-span-6">
                          <span className="text-sm text-gray-500">{skill.proficiency}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-3">
                          <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeSkill(skill.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Subjects */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Subjects</h1>
                  {!isAddingSubject && (
                    <button
                      onClick={() => setIsAddingSubject(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add new
                    </button>
                  )}
                </div>
                {isAddingSubject && (
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-6">
                    <SubjectForm
                      onSubmit={(s) => {
                        addSubject(s);
                        setIsAddingSubject(false);
                      }}
                      onCancel={() => setIsAddingSubject(false)}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  {subjects.length === 0 && (
                    <p className="text-sm text-gray-500">You have not added any Subjects yet.</p>
                  )}

                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="grid grid-cols-12 items-center py-4 border-b border-gray-100 dark:border-white/10 last:border-0 group"
                    >
                      <div className="col-span-10">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {subject.name}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-3">
                        <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSubject(subject.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: EXPERIENCE / INTERNSHIPS */}
          {activeTab === 'experience' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Internship and Work Experience
                </h1>
                {!isAddingExperience && (
                  <button
                    onClick={() => setIsAddingExperience(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add new
                  </button>
                )}
              </div>

              {isAddingExperience && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-8">
                  <ExperienceForm
                    onSubmit={(e) => {
                      addExperience(e);
                      setIsAddingExperience(false);
                    }}
                    onCancel={() => setIsAddingExperience(false)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-10">
                {experiences.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No internship and work experience added yet.
                  </p>
                )}

                {experiences.map((exp, idx) => (
                  <div key={exp.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-gray-500 font-medium text-lg uppercase">
                        {exp.company[0]}
                      </span>
                    </div>
                    <div
                      className={`flex-1 pb-10 ${idx !== experiences.length - 1 ? 'border-b border-gray-100 dark:border-white/10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {exp.role}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {exp.company} | {exp.startDate} - {exp.endDate || 'Present'} |{' '}
                            {exp.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeExperience(exp.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {exp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-[10px] font-semibold rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                        {exp.description}
                      </p>

                      {exp.documents && exp.documents.length > 0 && (
                        <div className="flex gap-2 w-full overflow-x-auto custom-scrollbar pb-2">
                          {exp.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl min-w-[250px]"
                            >
                              <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                                <FileText className="w-5 h-5 text-red-500" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                                  {doc.name}
                                </h4>
                                <p className="text-[10px] text-gray-500">
                                  Created at {doc.createdAt}
                                </p>
                              </div>
                              <button className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: EDUCATION */}
          {activeTab === 'education' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Education Details
                </h1>
                {!isAddingEducation && (
                  <button
                    onClick={() => setIsAddingEducation(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add new
                  </button>
                )}
              </div>

              {isAddingEducation && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-8">
                  <EducationForm
                    onSubmit={(e) => {
                      addEducation(e);
                      setIsAddingEducation(false);
                    }}
                    onCancel={() => setIsAddingEducation(false)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-6">
                {education.length === 0 && !isAddingEducation && (
                  <p className="text-sm text-gray-500">No education added yet.</p>
                )}

                {education.map((edu) => (
                  <div
                    key={edu.id}
                    className="flex items-start justify-between py-6 border-b border-gray-100 dark:border-white/10 last:border-0 group"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {edu.institutionName}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {edu.degree}, {edu.fieldOfStudy} | {edu.startDate} - {edu.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeEducation(edu.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: CERTIFICATIONS */}
          {activeTab === 'certifications' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Certifications</h1>
                {!isAddingCert && (
                  <button
                    onClick={() => setIsAddingCert(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#00fad0] hover:bg-[#00e0b0] text-black rounded-full shadow-lg shadow-[#00fad0]/20 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add new
                  </button>
                )}
              </div>

              {isAddingCert && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm mb-8">
                  <CertificationForm
                    onSubmit={(c) => {
                      addCertification(c);
                      setIsAddingCert(false);
                    }}
                    onCancel={() => setIsAddingCert(false)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-6">
                {certifications.length === 0 && !isAddingCert && (
                  <p className="text-sm text-gray-500">No certifications added yet.</p>
                )}

                {certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-start justify-between py-6 border-b border-gray-100 dark:border-white/10 last:border-0 group"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {cert.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {cert.issuer} | {cert.issueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeCertification(cert.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
