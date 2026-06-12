import { describe, it, expect, beforeEach, vi } from 'vitest';

const { storageRef, profileRef } = vi.hoisted(() => ({
  storageRef: { current: {} as Record<string, string> },
  profileRef: {
    current: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      summary: '',
      avatar: '',
    },
  },
}));

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

import { readWorkspaceSnapshot, writeWorkspaceSnapshot } from '../../api/storage';
import { useApplicationStore } from '../application';
import { useResumeStore } from '../resume';
import { ApplicationStatus } from '../../types/enums';
import { storageKeys } from '../../utils/storage';

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

describe('workspace import/export — applications', () => {
  beforeEach(() => {
    storageRef.current = {};
    useApplicationStore.setState({ applications: [] });
    useResumeStore.setState({ resumes: [], activeResumeId: null });
  });

  it('readWorkspaceSnapshot exports applications array', () => {
    const resumeId = seedResume('产品简历');
    seedApplication(resumeId, '字节跳动', '产品经理', ApplicationStatus.Interviewing);
    seedApplication(resumeId, '腾讯', '高级产品', ApplicationStatus.Applied);

    const snapshot = readWorkspaceSnapshot(profileRef.current);

    expect(Array.isArray(snapshot.applications)).toBe(true);
    expect(snapshot.applications).toHaveLength(2);

    const bytedance = snapshot.applications.find((a) => a.company === '字节跳动');
    const tencent = snapshot.applications.find((a) => a.company === '腾讯');
    expect(bytedance).toBeDefined();
    expect(bytedance!.resumeTitle).toBe('产品简历');
    expect(bytedance!.status).toBe(ApplicationStatus.Interviewing);
    expect(tencent).toBeDefined();
    expect(tencent!.status).toBe(ApplicationStatus.Applied);
  });

  it('writeWorkspaceSnapshot imports applications and restores them to storage', () => {
    const applications = [
      {
        id: 'app_001',
        resumeId: 'res_001',
        resumeTitle: '导入简历A',
        archived: false,
        company: '阿里',
        position: '前端工程师',
        status: 'applied',
        feedback: '已投官网',
        appliedAt: '2025-06-01T00:00:00.000Z',
        createdAt: '2025-06-01T00:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'app_002',
        resumeId: 'res_002',
        resumeTitle: '导入简历B',
        archived: true,
        company: '美团',
        position: '后端开发',
        status: 'rejected',
        feedback: '一面挂',
        appliedAt: '2025-05-15T00:00:00.000Z',
        createdAt: '2025-05-15T00:00:00.000Z',
        updatedAt: '2025-05-20T00:00:00.000Z',
      },
    ];

    const snapshot = {
      exportedAt: '2025-06-12T00:00:00.000Z',
      resumes: [],
      activeResumeId: null,
      profile: profileRef.current,
      selectedTemplateId: 'atelier',
      theme: 'light' as const,
      applications,
    };

    writeWorkspaceSnapshot(snapshot);

    const raw = storageRef.current[storageKeys.applications];
    expect(raw).toBeDefined();

    const restored = JSON.parse(raw!);
    expect(restored).toHaveLength(2);
    expect(restored[0].id).toBe('app_001');
    expect(restored[0].company).toBe('阿里');
    expect(restored[0].archived).toBe(false);
    expect(restored[1].id).toBe('app_002');
    expect(restored[1].company).toBe('美团');
    expect(restored[1].archived).toBe(true);
    expect(restored[1].resumeTitle).toBe('导入简历B');
  });

  it('full round-trip: create data → export → import → verify', () => {
    const resumeId = seedResume('全链路测试简历');
    seedApplication(resumeId, '华为', '产品运营', ApplicationStatus.Offer);
    seedApplication(resumeId, '小米', '产品经理', ApplicationStatus.Applied);

    useResumeStore.getState().deleteResume(resumeId);

    const exported = readWorkspaceSnapshot(profileRef.current);
    expect(exported.applications).toHaveLength(2);
    expect(exported.applications.every((a) => a.archived)).toBe(true);
    expect(exported.applications.every((a) => a.resumeTitle === '全链路测试简历')).toBe(true);

    storageRef.current = {};
    useApplicationStore.setState({ applications: [] });
    useResumeStore.setState({ resumes: [], activeResumeId: null });

    writeWorkspaceSnapshot(exported);

    const reExported = readWorkspaceSnapshot(profileRef.current);
    expect(reExported.applications).toHaveLength(2);

    const huawei = reExported.applications.find((a) => a.company === '华为');
    const xiaomi = reExported.applications.find((a) => a.company === '小米');
    expect(huawei).toBeDefined();
    expect(huawei!.status).toBe('offer');
    expect(huawei!.archived).toBe(true);
    expect(xiaomi).toBeDefined();
    expect(xiaomi!.status).toBe('applied');
    expect(xiaomi!.archived).toBe(true);
  });

  it('legacy storage without applications key reads as empty array via readWorkspaceSnapshot', () => {
    storageRef.current[storageKeys.resumes] = '[]';
    storageRef.current[storageKeys.activeResumeId] = 'null';

    const snapshot = readWorkspaceSnapshot(profileRef.current);
    expect(snapshot.applications).toEqual([]);
  });

  it('snapshot with applications containing legacy entries (no resumeTitle/archived) imports and normalizes via store', () => {
    const legacyApp = {
      id: 'app_old',
      resumeId: 'res_old',
      company: '老公司',
      position: '老岗位',
      status: 'applied',
      feedback: '',
      appliedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const snapshot = {
      exportedAt: '2025-06-12T00:00:00.000Z',
      resumes: [],
      activeResumeId: null,
      profile: profileRef.current,
      selectedTemplateId: 'atelier',
      theme: 'light' as const,
      applications: [legacyApp],
    };

    writeWorkspaceSnapshot(snapshot);

    const raw = storageRef.current[storageKeys.applications];
    const persisted = JSON.parse(raw!);
    expect(persisted[0].resumeTitle).toBeUndefined();
    expect(persisted[0].archived).toBeUndefined();

    useApplicationStore.setState({
      applications: persisted.map((app: any) => ({
        ...app,
        resumeTitle: app.resumeTitle ?? '',
        archived: app.archived ?? false,
      })),
    });

    const apps = useApplicationStore.getState().applications;
    expect(apps).toHaveLength(1);
    expect(apps[0].company).toBe('老公司');
    expect(apps[0].resumeTitle).toBe('');
    expect(apps[0].archived).toBe(false);
  });

  it('empty applications array exports and imports correctly', () => {
    const emptySnapshot = readWorkspaceSnapshot(profileRef.current);
    expect(emptySnapshot.applications).toEqual([]);

    writeWorkspaceSnapshot(emptySnapshot);
    const reloaded = readWorkspaceSnapshot(profileRef.current);
    expect(reloaded.applications).toEqual([]);
  });

  it('resume count + application count both preserved in round-trip', () => {
    const r1 = seedResume('简历一');
    const r2 = seedResume('简历二');
    seedApplication(r1, '公司A', '岗位A');
    seedApplication(r1, '公司B', '岗位B');
    seedApplication(r2, '公司C', '岗位C');

    const exported = readWorkspaceSnapshot(profileRef.current);
    expect(exported.resumes).toHaveLength(2);
    expect(exported.applications).toHaveLength(3);

    storageRef.current = {};
    writeWorkspaceSnapshot(exported);

    const reloaded = readWorkspaceSnapshot(profileRef.current);
    expect(reloaded.resumes).toHaveLength(2);
    expect(reloaded.applications).toHaveLength(3);
    expect(reloaded.applications.filter((a) => a.resumeId === r1)).toHaveLength(2);
    expect(reloaded.applications.filter((a) => a.resumeId === r2)).toHaveLength(1);
  });
});
