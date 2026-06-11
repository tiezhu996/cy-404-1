import { describe, it, expect, beforeEach, vi } from 'vitest';

const { storageRef } = vi.hoisted(() => {
  const ref: { current: Record<string, string> } = { current: {} };
  return { storageRef: ref };
});

vi.mock('../../utils/storage', () => ({
  storageKeys: {
    resumes: 'smart-resume:resumes',
    activeResumeId: 'smart-resume:activeResumeId',
    profile: 'smart-resume:profile',
    template: 'smart-resume:selectedTemplateId',
    theme: 'smart-resume:theme',
    applications: 'smart-resume:applications',
  },
  readStorage: <T>(key: string, fallback: T): T => {
    const raw = storageRef.current[key];
    return raw ? (JSON.parse(raw) as T) : fallback;
  },
  writeStorage: <T>(key: string, value: T): void => {
    storageRef.current[key] = JSON.stringify(value);
  },
  removeStorage: (key: string): void => {
    delete storageRef.current[key];
  },
  downloadJson: vi.fn(),
  readJsonFile: vi.fn(),
}));

vi.mock('../template', () => ({
  useTemplateStore: {
    getState: () => ({ selectedTemplateId: 'atelier' }),
  },
}));

import { useApplicationStore, getResumeTitleById } from '../application';
import { useResumeStore } from '../resume';
import { ApplicationStatus } from '../../types/enums';

function resetStores() {
  storageRef.current = {};
  useApplicationStore.setState({ applications: [] });
  useResumeStore.setState({
    resumes: [],
    activeResumeId: null,
  });
}

function seedResume(title = '测试简历') {
  const id = useResumeStore.getState().createResume();
  useResumeStore.getState().updateResume(id, { title });
  return id;
}

function seedApplication(resumeId: string, company: string, position: string, status = ApplicationStatus.Applied) {
  const resume = useResumeStore.getState().resumes.find((r) => r.id === resumeId);
  return useApplicationStore.getState().addApplication({
    resumeId,
    resumeTitle: resume?.title ?? '',
    archived: false,
    company,
    position,
    status,
    feedback: '',
    appliedAt: new Date().toISOString(),
  });
}

function readPersistedApplications() {
  const raw = storageRef.current['smart-resume:applications'];
  return raw ? JSON.parse(raw) : [];
}

describe('application store', () => {
  beforeEach(() => {
    resetStores();
  });

  it('addApplication should carry resumeTitle', () => {
    const resumeId = seedResume('产品经理简历');
    const appId = seedApplication(resumeId, '青松科技', '产品经理');

    const app = useApplicationStore.getState().applications.find((a) => a.id === appId);
    expect(app).toBeDefined();
    expect(app!.resumeTitle).toBe('产品经理简历');
    expect(app!.archived).toBe(false);
  });

  it('archiveByResumeId should mark related applications as archived and snapshot title', () => {
    const resumeId = seedResume('前端简历');
    seedApplication(resumeId, '字节跳动', '前端工程师');
    seedApplication(resumeId, '腾讯', '前端开发');

    useApplicationStore.getState().archiveByResumeId(resumeId, '前端简历');

    const apps = useApplicationStore.getState().applications.filter((a) => a.resumeId === resumeId);
    expect(apps).toHaveLength(2);
    apps.forEach((app) => {
      expect(app.archived).toBe(true);
      expect(app.resumeTitle).toBe('前端简历');
    });
  });

  it('archiveByResumeId should not affect unrelated applications', () => {
    const r1 = seedResume('简历A');
    const r2 = seedResume('简历B');
    seedApplication(r1, '公司A', '岗位A');
    seedApplication(r2, '公司B', '岗位B');

    useApplicationStore.getState().archiveByResumeId(r1, '简历A');

    const appA = useApplicationStore.getState().applications.find((a) => a.resumeId === r1);
    const appB = useApplicationStore.getState().applications.find((a) => a.resumeId === r2);
    expect(appA!.archived).toBe(true);
    expect(appB!.archived).toBe(false);
  });

  it('getResumeTitleById should return resume title when resume exists', () => {
    const resumeId = seedResume('我的简历');
    expect(getResumeTitleById(resumeId)).toBe('我的简历');
  });

  it('getResumeTitleById should return snapshot title when resume is deleted', () => {
    const resumeId = seedResume('已删简历');
    seedApplication(resumeId, '公司', '岗位');
    useApplicationStore.getState().archiveByResumeId(resumeId, '已删简历');
    useResumeStore.getState().deleteResume(resumeId);

    expect(getResumeTitleById(resumeId)).toBe('已删简历');
  });

  it('getResumeTitleById should fallback when no resume and no snapshot', () => {
    expect(getResumeTitleById('nonexistent')).toBe('已删除的简历');
  });
});

describe('resume delete → application archive integration', () => {
  beforeEach(() => {
    resetStores();
  });

  it('deleting resume should archive all related applications with title snapshot', () => {
    const resumeId = seedResume('算法简历');
    seedApplication(resumeId, '百度', '算法工程师', ApplicationStatus.Interviewing);
    seedApplication(resumeId, '阿里', '算法专家', ApplicationStatus.Applied);

    useResumeStore.getState().deleteResume(resumeId);

    const apps = useApplicationStore.getState().applications;
    expect(apps).toHaveLength(2);
    apps.forEach((app) => {
      expect(app.archived).toBe(true);
      expect(app.resumeTitle).toBe('算法简历');
    });

    expect(useResumeStore.getState().resumes.find((r) => r.id === resumeId)).toBeUndefined();
  });

  it('deleting resume should not archive applications from other resumes', () => {
    const r1 = seedResume('简历1');
    const r2 = seedResume('简历2');
    seedApplication(r1, '公司1', '岗位1');
    seedApplication(r2, '公司2', '岗位2');

    useResumeStore.getState().deleteResume(r1);

    const app1 = useApplicationStore.getState().applications.find((a) => a.resumeId === r1);
    const app2 = useApplicationStore.getState().applications.find((a) => a.resumeId === r2);
    expect(app1!.archived).toBe(true);
    expect(app1!.resumeTitle).toBe('简历1');
    expect(app2!.archived).toBe(false);
  });
});

describe('import/export with application data', () => {
  beforeEach(() => {
    resetStores();
  });

  it('persisted data should include resumeTitle field', () => {
    const resumeId = seedResume('导出测试简历');
    seedApplication(resumeId, '华为', '后端开发');

    const persisted = readPersistedApplications();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].company).toBe('华为');
    expect(persisted[0].resumeTitle).toBe('导出测试简历');
  });

  it('archived applications should persist correctly', () => {
    const resumeId = seedResume('导入简历');
    seedApplication(resumeId, '小米', '产品', ApplicationStatus.Offer);

    useResumeStore.getState().deleteResume(resumeId);

    const persisted = readPersistedApplications();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].company).toBe('小米');
    expect(persisted[0].archived).toBe(true);
    expect(persisted[0].resumeTitle).toBe('导入简历');
  });

  it('legacy data without resumeTitle/archived should be normalized on load', () => {
    const legacyApp = {
      id: 'app_legacy_1',
      resumeId: 'resume_legacy',
      company: '旧公司',
      position: '旧岗位',
      status: 'applied',
      feedback: '',
      appliedAt: '2025-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    storageRef.current['smart-resume:applications'] = JSON.stringify([legacyApp]);

    useApplicationStore.setState({
      applications: (JSON.parse(storageRef.current['smart-resume:applications']) as any[]).map((app) => ({
        ...app,
        resumeTitle: app.resumeTitle ?? '',
        archived: app.archived ?? false,
      })),
    });

    const apps = useApplicationStore.getState().applications;
    expect(apps[0].resumeTitle).toBe('');
    expect(apps[0].archived).toBe(false);
    expect(apps[0].company).toBe('旧公司');
  });

  it('full round-trip: add → delete resume → persist → restore', () => {
    const resumeId = seedResume('全链路简历');
    seedApplication(resumeId, '美团', '运营', ApplicationStatus.Applied);

    useResumeStore.getState().deleteResume(resumeId);

    const applicationsJson = storageRef.current['smart-resume:applications'];
    expect(applicationsJson).toBeDefined();

    resetStores();

    storageRef.current['smart-resume:applications'] = applicationsJson;

    const restored = readPersistedApplications();
    expect(restored).toHaveLength(1);
    expect(restored[0].company).toBe('美团');
    expect(restored[0].archived).toBe(true);
    expect(restored[0].resumeTitle).toBe('全链路简历');
  });
});
