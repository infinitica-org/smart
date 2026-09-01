import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StudentProfileDataSchema } from '@smart/contracts';
import type {
  BasicInfo,
  Education,
  Skill,
  Project,
  Certification,
  Experience,
  Subject,
  ProfileData,
} from '../schemas/profile.schema';
import { api } from '../api';

interface ProfileState {
  data: ProfileData;
  hydratedFromApi: boolean;
  hydrate: (profile: ProfileData) => void;
  updateBasicInfo: (info: BasicInfo) => void;
  addEducation: (edu: Education) => void;
  updateEducation: (id: string, edu: Education) => void;
  removeEducation: (id: string) => void;
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, skill: Skill) => void;
  removeSkill: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Project) => void;
  removeProject: (id: string) => void;
  addCertification: (cert: Certification) => void;
  updateCertification: (id: string, cert: Certification) => void;
  removeCertification: (id: string) => void;
  addExperience: (exp: Experience) => void;
  updateExperience: (id: string, exp: Experience) => void;
  removeExperience: (id: string) => void;
  addSubject: (sub: Subject) => void;
  updateSubject: (id: string, sub: Subject) => void;
  removeSubject: (id: string) => void;
  getCompletionPercentage: () => number;
}

const defaultData: ProfileData = StudentProfileDataSchema.parse({});

let persistTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist(): void {
  if (typeof window === 'undefined') return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const { data } = useProfileStore.getState();
    void api.users.saveProfile(data).catch(() => undefined);
  }, 400);
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      data: defaultData,
      hydratedFromApi: false,

      hydrate: (profile) =>
        set({ data: StudentProfileDataSchema.parse(profile), hydratedFromApi: true }),

      updateBasicInfo: (info) => {
        set((state) => ({ data: { ...state.data, basicInfo: info } }));
        schedulePersist();
      },

      addEducation: (edu) => {
        set((state) => ({
          data: { ...state.data, education: [...state.data.education, edu] },
        }));
        schedulePersist();
      },

      updateEducation: (id, edu) => {
        set((state) => ({
          data: {
            ...state.data,
            education: state.data.education.map((e) => (e.id === id ? edu : e)),
          },
        }));
        schedulePersist();
      },

      removeEducation: (id) => {
        set((state) => ({
          data: {
            ...state.data,
            education: state.data.education.filter((e) => e.id !== id),
          },
        }));
        schedulePersist();
      },

      addSkill: (skill) => {
        set((state) => ({
          data: { ...state.data, skills: [...state.data.skills, skill] },
        }));
        schedulePersist();
      },

      updateSkill: (id, skill) => {
        set((state) => ({
          data: {
            ...state.data,
            skills: state.data.skills.map((s) => (s.id === id ? skill : s)),
          },
        }));
        schedulePersist();
      },

      removeSkill: (id) => {
        set((state) => ({
          data: {
            ...state.data,
            skills: state.data.skills.filter((s) => s.id !== id),
          },
        }));
        schedulePersist();
      },

      addProject: (project) => {
        set((state) => ({
          data: { ...state.data, projects: [...state.data.projects, project] },
        }));
        schedulePersist();
      },

      updateProject: (id, project) => {
        set((state) => ({
          data: {
            ...state.data,
            projects: state.data.projects.map((p) => (p.id === id ? project : p)),
          },
        }));
        schedulePersist();
      },

      removeProject: (id) => {
        set((state) => ({
          data: {
            ...state.data,
            projects: state.data.projects.filter((p) => p.id !== id),
          },
        }));
        schedulePersist();
      },

      addCertification: (cert) => {
        set((state) => ({
          data: {
            ...state.data,
            certifications: [...state.data.certifications, cert],
          },
        }));
        schedulePersist();
      },

      updateCertification: (id, cert) => {
        set((state) => ({
          data: {
            ...state.data,
            certifications: state.data.certifications.map((c) => (c.id === id ? cert : c)),
          },
        }));
        schedulePersist();
      },

      removeCertification: (id) => {
        set((state) => ({
          data: {
            ...state.data,
            certifications: state.data.certifications.filter((c) => c.id !== id),
          },
        }));
        schedulePersist();
      },

      addExperience: (exp) => {
        set((state) => ({
          data: { ...state.data, experiences: [...state.data.experiences, exp] },
        }));
        schedulePersist();
      },

      updateExperience: (id, exp) => {
        set((state) => ({
          data: {
            ...state.data,
            experiences: state.data.experiences.map((e) => (e.id === id ? exp : e)),
          },
        }));
        schedulePersist();
      },

      removeExperience: (id) => {
        set((state) => ({
          data: {
            ...state.data,
            experiences: state.data.experiences.filter((e) => e.id !== id),
          },
        }));
        schedulePersist();
      },

      addSubject: (sub) => {
        set((state) => ({
          data: { ...state.data, subjects: [...state.data.subjects, sub] },
        }));
        schedulePersist();
      },

      updateSubject: (id, sub) => {
        set((state) => ({
          data: {
            ...state.data,
            subjects: state.data.subjects.map((s) => (s.id === id ? sub : s)),
          },
        }));
        schedulePersist();
      },

      removeSubject: (id) => {
        set((state) => ({
          data: {
            ...state.data,
            subjects: state.data.subjects.filter((s) => s.id !== id),
          },
        }));
        schedulePersist();
      },

      getCompletionPercentage: () => {
        const { data } = get();
        let score = 0;
        if (data.basicInfo?.firstName && data.basicInfo.lastName) score += 30;
        if (data.education.length > 0) score += 10;
        if (data.skills.length > 0) score += 10;
        if (data.projects.length > 0) score += 20;
        if (data.experiences.length > 0) score += 20;
        if (data.certifications.length > 0) score += 10;
        return score;
      },
    }),
    {
      name: 'smart-student-profile',
      partialize: (state) => ({ data: state.data }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { data?: unknown } | undefined;
        return {
          ...currentState,
          data: StudentProfileDataSchema.parse(persisted?.data ?? currentState.data),
        };
      },
    },
  ),
);
