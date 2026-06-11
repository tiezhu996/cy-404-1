export enum SkillLevel {
  Beginner = 'beginner',
  Elementary = 'elementary',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Expert = 'expert',
}

export enum EducationLevel {
  HighSchool = 'high_school',
  Associate = 'associate',
  Bachelor = 'bachelor',
  Master = 'master',
  Doctor = 'doctor',
}

export enum SkillCategory {
  Technology = 'technology',
  Language = 'language',
  Soft = 'soft',
}

export type SkillProficiency = 1 | 2 | 3 | 4 | 5;

export const skillLevelLabels: Record<SkillLevel, string> = {
  [SkillLevel.Beginner]: '入门',
  [SkillLevel.Elementary]: '基础',
  [SkillLevel.Intermediate]: '熟练',
  [SkillLevel.Advanced]: '高级',
  [SkillLevel.Expert]: '专家',
};

export const educationLevelLabels: Record<EducationLevel, string> = {
  [EducationLevel.HighSchool]: '高中',
  [EducationLevel.Associate]: '专科',
  [EducationLevel.Bachelor]: '本科',
  [EducationLevel.Master]: '硕士',
  [EducationLevel.Doctor]: '博士',
};

export const skillCategoryLabels: Record<SkillCategory, string> = {
  [SkillCategory.Technology]: '技术',
  [SkillCategory.Language]: '语言',
  [SkillCategory.Soft]: '软技能',
};

export enum ApplicationStatus {
  Applied = 'applied',
  Interviewing = 'interviewing',
  Offer = 'offer',
  Rejected = 'rejected',
  Ghosted = 'ghosted',
}

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Applied]: '已投递',
  [ApplicationStatus.Interviewing]: '面试中',
  [ApplicationStatus.Offer]: '已 Offer',
  [ApplicationStatus.Rejected]: '已拒绝',
  [ApplicationStatus.Ghosted]: '无回音',
};

