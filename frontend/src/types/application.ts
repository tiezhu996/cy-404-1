import { ApplicationStatus } from './enums';

export interface JobApplication {
  id: string;
  resumeId: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  feedback: string;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationCollection = JobApplication[];
