import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Briefcase, Plus, Edit3, Trash2, X } from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { useApplicationStore, getResumeTitleById } from '../stores/application';
import { useResumeStore } from '../stores/resume';
import { ApplicationStatus, applicationStatusLabels } from '../types/enums';
import { JobApplication } from '../types/application';
import { formatDateTime } from '../utils/format';

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]';
const textareaClass = `${inputClass} min-h-24 resize-y leading-6`;

const statusColors: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Applied]: 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
  [ApplicationStatus.Interviewing]: 'bg-[var(--gold)]/15 text-[var(--gold)]',
  [ApplicationStatus.Offer]: 'bg-[var(--accent)] text-[var(--ink-invert)]',
  [ApplicationStatus.Rejected]: 'bg-[var(--danger)]/15 text-[var(--danger)]',
  [ApplicationStatus.Ghosted]: 'bg-[var(--surface-alt)] text-[var(--muted)]',
};

type FilterStatus = ApplicationStatus | 'all';
const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: ApplicationStatus.Applied, label: applicationStatusLabels[ApplicationStatus.Applied] },
  { value: ApplicationStatus.Interviewing, label: applicationStatusLabels[ApplicationStatus.Interviewing] },
  { value: ApplicationStatus.Offer, label: applicationStatusLabels[ApplicationStatus.Offer] },
  { value: ApplicationStatus.Rejected, label: applicationStatusLabels[ApplicationStatus.Rejected] },
  { value: ApplicationStatus.Ghosted, label: applicationStatusLabels[ApplicationStatus.Ghosted] },
];

interface FormState {
  resumeId: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  feedback: string;
  appliedAt: string;
}

function getDefaultForm(resumes: { id: string }[]): FormState {
  return {
    resumeId: resumes[0]?.id ?? '',
    company: '',
    position: '',
    status: ApplicationStatus.Applied,
    feedback: '',
    appliedAt: new Date().toISOString().slice(0, 10),
  };
}

export function JobTracking() {
  const applications = useApplicationStore((state) => state.applications);
  const addApplication = useApplicationStore((state) => state.addApplication);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const resumes = useResumeStore((state) => state.resumes);

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [form, setForm] = useState<FormState>(getDefaultForm(resumes));

  const filteredApplications =
    filter === 'all'
      ? [...applications].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      : applications
          .filter((app) => app.status === filter)
          .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  const handleOpenAdd = () => {
    setEditingApp(null);
    setForm(getDefaultForm(resumes));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (app: JobApplication) => {
    setEditingApp(app);
    setForm({
      resumeId: app.resumeId,
      company: app.company,
      position: app.position,
      status: app.status,
      feedback: app.feedback,
      appliedAt: app.appliedAt.slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.company.trim() || !form.position.trim()) {
      return;
    }

    const appliedAtISO = new Date(form.appliedAt).toISOString();

    if (editingApp) {
      updateApplication(editingApp.id, {
        ...form,
        appliedAt: appliedAtISO,
      });
    } else {
      addApplication({
        ...form,
        appliedAt: appliedAtISO,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条投递记录吗？')) {
      deleteApplication(id);
    }
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--accent-strong)]">Job tracker</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">求职追踪</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            记录每份简历的投递进展，跟踪状态和反馈，掌握求职节奏。
          </p>
        </div>
        <Button icon={<Plus size={16} aria-hidden />} onClick={handleOpenAdd} variant="primary">
          新增投递
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              filter === option.value
                ? 'bg-[var(--surface-strong)] text-[var(--ink-invert)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface-alt)]'
            }`}
          >
            {option.label}
            <span className="text-xs opacity-70">
              {option.value === 'all'
                ? applications.length
                : applications.filter((a) => a.status === option.value).length}
            </span>
          </button>
        ))}
      </div>

      {filteredApplications.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            actionLabel="添加第一条记录"
            description="开始记录你的求职投递，跟踪每家公司的进展和反馈。"
            icon={<Briefcase size={24} aria-hidden />}
            onAction={handleOpenAdd}
            title="暂无投递记录"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredApplications.map((app) => (
            <article
              key={app.id}
              className="flex flex-col justify-between gap-4 border border-[var(--border)] bg-[var(--surface)] p-5 shadow-panel transition hover:-translate-y-0.5 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-xl font-semibold text-[var(--ink)]">{app.company}</h3>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[app.status]}`}>
                    {applicationStatusLabels[app.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {app.position} · {getResumeTitleById(app.resumeId)}
                </p>
                {app.feedback && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--ink)]">{app.feedback}</p>
                )}
                <p className="mt-3 text-xs text-[var(--muted)]">
                  投递时间：{formatDateTime(app.appliedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  icon={<Edit3 size={16} aria-hidden />}
                  onClick={() => handleOpenEdit(app)}
                  variant="secondary"
                >
                  编辑
                </Button>
                <Button
                  icon={<Trash2 size={16} aria-hidden />}
                  onClick={() => handleDelete(app.id)}
                  variant="ghost"
                >
                  删除
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto w-full max-w-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="font-display text-2xl font-semibold text-[var(--ink)]">
                {editingApp ? '编辑投递记录' : '新增投递记录'}
              </DialogTitle>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-alt)]"
                onClick={() => setIsModalOpen(false)}
                aria-label="关闭"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  <span>公司</span>
                  <input
                    className={inputClass}
                    value={form.company}
                    placeholder="例如：青松科技"
                    onChange={(e) => updateField('company', e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>岗位</span>
                  <input
                    className={inputClass}
                    value={form.position}
                    placeholder="例如：高级产品经理"
                    onChange={(e) => updateField('position', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  <span>关联简历</span>
                  <select
                    className={inputClass}
                    value={form.resumeId}
                    onChange={(e) => updateField('resumeId', e.target.value)}
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>投递日期</span>
                  <input
                    className={inputClass}
                    type="date"
                    value={form.appliedAt}
                    onChange={(e) => updateField('appliedAt', e.target.value)}
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm font-medium">
                <span>状态</span>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value as ApplicationStatus)}
                >
                  {Object.values(ApplicationStatus).map((status) => (
                    <option key={status} value={status}>
                      {applicationStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium">
                <span>反馈 / 备注</span>
                <textarea
                  className={textareaClass}
                  value={form.feedback}
                  placeholder="记录面试反馈、薪资范围、下一步安排等"
                  onChange={(e) => updateField('feedback', e.target.value)}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {editingApp ? '保存修改' : '添加记录'}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
