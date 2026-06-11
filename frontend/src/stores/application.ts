import { create } from 'zustand';
import { JobApplication } from '../types/application';
import { createId } from '../utils/format';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';
import { useResumeStore } from './resume';

const storedApplications = readStorage<JobApplication[]>(storageKeys.applications, []);

function persist(applications: JobApplication[]): void {
  writeStorage(storageKeys.applications, applications);
}

interface ApplicationState {
  applications: JobApplication[];
  addApplication: (data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateApplication: (id: string, patch: Partial<JobApplication>) => void;
  deleteApplication: (id: string) => void;
  getApplicationsByResume: (resumeId: string) => JobApplication[];
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  applications: storedApplications,

  addApplication: (data) => {
    const now = new Date().toISOString();
    const application: JobApplication = {
      id: createId('app'),
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    set((state) => ({
      applications: [application, ...state.applications],
    }));
    persist(get().applications);
    return application.id;
  },

  updateApplication: (id, patch) => {
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === id
          ? {
              ...app,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : app,
      ),
    }));
    persist(get().applications);
  },

  deleteApplication: (id) => {
    set((state) => ({
      applications: state.applications.filter((app) => app.id !== id),
    }));
    persist(get().applications);
  },

  getApplicationsByResume: (resumeId) => {
    return get().applications.filter((app) => app.resumeId === resumeId);
  },
}));

export function getResumeTitleById(resumeId: string): string {
  const resume = useResumeStore.getState().resumes.find((r) => r.id === resumeId);
  return resume?.title ?? '未知简历';
}
