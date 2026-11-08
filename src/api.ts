import type {
  DashboardData,
  LearningResource,
  LearningResourceInput,
  LearningResourcePatch,
  Milestone,
  MilestoneInput,
  MilestonePatch,
  Project,
  ProjectInput,
  RoadmapStage,
  RoadmapStageInput,
  RoadmapStagePatch,
  Skill,
  SkillInput,
  SkillNote,
  SkillPatch,
  Status,
  Task,
  TaskInput,
  TaskPatch,
  WorkSession,
  WorkSessionInput,
  WorkSessionPatch,
} from './types';

const BASE = '/devjourney/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const getDashboard = () => req<DashboardData>('/dashboard');

export const getProjects = (params: { q?: string; status?: string; priority?: string } = {}) =>
  req<{ projects: Project[] }>(`/projects${query(params)}`).then((result) => result.projects);

export const getProject = (id: number) =>
  req<{ project: Project }>(`/projects/${id}`).then((result) => result.project);

export const createProject = (input: ProjectInput) =>
  req<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(input) }).then(
    (result) => result.project,
  );

export const updateProject = (id: number, patch: Partial<ProjectInput>) =>
  req<{ project: Project }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((result) => result.project);

export const deleteProject = (id: number) =>
  req<{ ok: boolean; archived: boolean; retained_tasks: number }>(`/projects/${id}`, {
    method: 'DELETE',
  });

export const getTasks = (params: {
  project_id?: number;
  status?: string;
  priority?: string;
  q?: string;
  limit?: number;
} = {}) => req<{ tasks: Task[]; count: number }>(`/tasks${query(params)}`).then((result) => result.tasks);

export const getTask = (id: number) =>
  req<{ task: Task }>(`/tasks/${id}`).then((result) => result.task);

export const createTask = (input: TaskInput) =>
  req<{ id: number; task: Task }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((result) => result.task);

/** Backward-compatible helper for the dashboard Quick Add. */
export const addTask = (project_id: number, title: string) =>
  createTask({ project_id, title }).then((task) => ({ id: task.id }));

export const updateTask = (id: number, patch: TaskPatch | Status) =>
  req<{ ok: boolean; task: Task }>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(typeof patch === 'string' ? { status: patch } : patch),
  }).then((result) => result.task);

export const deleteTask = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/tasks/${id}`, { method: 'DELETE' });

export const getRoadmap = (projectId?: number) =>
  req<{ stages: RoadmapStage[] }>(`/roadmap${query({ project_id: projectId })}`).then(
    (result) => result.stages,
  );

export const getStage = (id: number) =>
  req<{ stage: RoadmapStage }>(`/roadmap/${id}`).then((result) => result.stage);

export const createStage = (input: RoadmapStageInput) =>
  req<{ stage: RoadmapStage }>('/roadmap', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((result) => result.stage);

export const updateStage = (id: number, patch: RoadmapStagePatch) =>
  req<{ stage: RoadmapStage }>(`/roadmap/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((result) => result.stage);

export const deleteStage = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/roadmap/${id}`, { method: 'DELETE' });

export const getMilestones = (params: {
  project_id?: number;
  status?: string;
  q?: string;
} = {}) =>
  req<{ milestones: Milestone[] }>(`/milestones${query(params)}`).then(
    (result) => result.milestones,
  );

export const getMilestone = (id: number) =>
  req<{ milestone: Milestone }>(`/milestones/${id}`).then((result) => result.milestone);

export const createMilestone = (input: MilestoneInput) =>
  req<{ milestone: Milestone }>('/milestones', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((result) => result.milestone);

export const updateMilestone = (id: number, patch: MilestonePatch) =>
  req<{ milestone: Milestone }>(`/milestones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((result) => result.milestone);

export const deleteMilestone = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/milestones/${id}`, { method: 'DELETE' });

export const getSessions = (params: { project_id?: number; task_id?: number; limit?: number } = {}) =>
  req<{ sessions: WorkSession[] }>(`/sessions${query(params)}`).then((result) => result.sessions);

export const getSession = (id: number) =>
  req<{ session: WorkSession }>(`/sessions/${id}`).then((result) => result.session);

export const createSession = (input: WorkSessionInput) =>
  req<{ session: WorkSession }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((result) => result.session);

export const updateSession = (id: number, patch: WorkSessionPatch) =>
  req<{ session: WorkSession }>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((result) => result.session);

export const deleteSession = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/sessions/${id}`, { method: 'DELETE' });

export const getSkills = (params: { q?: string; status?: string; project_id?: number } = {}) =>
  req<{ skills: Skill[] }>(`/skills${query(params)}`).then((result) => result.skills);

export const getSkill = (id: number) =>
  req<{ skill: Skill; resources: LearningResource[]; notes: SkillNote[] }>(`/skills/${id}`);

export const createSkill = (input: SkillInput) =>
  req<{ skill: Skill }>('/skills', { method: 'POST', body: JSON.stringify(input) }).then(
    (result) => result.skill,
  );

export const updateSkill = (id: number, patch: SkillPatch) =>
  req<{ skill: Skill }>(`/skills/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((result) => result.skill);

export const deleteSkill = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/skills/${id}`, { method: 'DELETE' });

export const getResources = (skillId: number) =>
  req<{ resources: LearningResource[] }>(`/skills/${skillId}/resources`).then(
    (result) => result.resources,
  );

export const createResource = (skillId: number, input: LearningResourceInput) =>
  req<{ resource: LearningResource }>(`/skills/${skillId}/resources`, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((result) => result.resource);

export const updateResource = (id: number, patch: LearningResourcePatch) =>
  req<{ resource: LearningResource }>(`/resources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((result) => result.resource);

export const deleteResource = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/resources/${id}`, { method: 'DELETE' });

export const getNotes = (skillId: number) =>
  req<{ notes: SkillNote[] }>(`/skills/${skillId}/notes`).then((result) => result.notes);

export const createNote = (skillId: number, note: string) =>
  req<{ note: SkillNote }>(`/skills/${skillId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  }).then((result) => result.note);

export const updateNote = (id: number, note: string) =>
  req<{ note: SkillNote }>(`/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  }).then((result) => result.note);

export const deleteNote = (id: number) =>
  req<{ ok: boolean; archived: boolean }>(`/notes/${id}`, { method: 'DELETE' });
