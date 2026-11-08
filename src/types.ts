export type Status = 'todo' | 'in_progress' | 'blocked' | 'done';
export type ProjectStatus = 'active' | 'paused' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type StageStatus = 'planned' | 'in_progress' | 'blocked' | 'done';
export type MilestoneStatus = 'planned' | 'reached';
export type SkillStatus = 'not_started' | 'learning' | 'practicing' | 'completed';
export type ResourceType = 'course' | 'article' | 'video' | 'book' | 'other';
export type ResourceStatus = 'planned' | 'in_progress' | 'completed';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  technologies: string | null;
  target_date: string | null;
  status: ProjectStatus;
  priority: Priority;
  total: number;
  done: number;
  progress: number | null;
  created_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
}

export interface Task {
  id: number;
  project_id: number;
  project: string;
  roadmap_stage_id: number | null;
  stage_title: string | null;
  title: string;
  status: Status;
  priority: Priority;
  blocked_reason: string | null;
  next_step: string | null;
  note: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Kept as an alias so existing dashboard components keep their public name. */
export type TaskLite = Task;

export interface Milestone {
  id: number;
  project_id: number;
  project: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: MilestoneStatus;
  completed_at: string | null;
  stage_total: number;
  stage_done: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface RoadmapStage {
  id: number;
  project_id: number;
  project: string;
  title: string;
  description: string | null;
  position: number;
  status: StageStatus;
  target_date: string | null;
  milestone_id: number | null;
  milestone_title: string | null;
  task_total: number;
  task_done: number;
  progress: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkSession {
  id: number;
  project_id: number | null;
  project: string | null;
  task_id: number | null;
  task: string | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  result: string | null;
  blockers: string | null;
  next_step: string | null;
  file_refs: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string | null;
  target: string | null;
  status: SkillStatus;
  progress: number;
  notes: string | null;
  project_id: number | null;
  project: string | null;
  resource_total: number;
  resource_done: number;
  note_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface LearningResource {
  id: number;
  skill_id: number;
  title: string;
  url: string | null;
  type: ResourceType;
  status: ResourceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillNote {
  id: number;
  skill_id: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  projects: Project[];
  counts: Record<Status, number>;
  pending: Task[];
  continue: Task | null;
  milestones: Milestone[];
  weekly: { label: string; count: number }[];
  latestSession: WorkSession | null;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  technologies?: string | null;
  target_date?: string | null;
  status?: ProjectStatus;
  priority?: Priority;
}

export interface TaskInput {
  project_id: number;
  title: string;
  status?: Status;
  priority?: Priority;
  target_date?: string | null;
  roadmap_stage_id?: number | null;
  blocked_reason?: string | null;
  next_step?: string | null;
  note?: string | null;
}

export type TaskPatch = Partial<TaskInput>;

export interface RoadmapStageInput {
  project_id: number;
  title: string;
  description?: string | null;
  position?: number;
  status?: StageStatus;
  target_date?: string | null;
  milestone_id?: number | null;
}

export type RoadmapStagePatch = Partial<Omit<RoadmapStageInput, 'project_id'>>;

export interface MilestoneInput {
  project_id: number;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status?: MilestoneStatus;
}

export type MilestonePatch = Partial<Omit<MilestoneInput, 'project_id'>>;

export interface WorkSessionInput {
  project_id?: number | null;
  task_id?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  summary?: string | null;
  result?: string | null;
  blockers?: string | null;
  next_step?: string | null;
  file_refs?: string | null;
}

export type WorkSessionPatch = Partial<WorkSessionInput>;

export interface SkillInput {
  name: string;
  description?: string | null;
  target?: string | null;
  status?: SkillStatus;
  progress?: number;
  notes?: string | null;
  project_id?: number | null;
}

export type SkillPatch = Partial<SkillInput>;

export interface LearningResourceInput {
  title: string;
  url?: string | null;
  type?: ResourceType;
  status?: ResourceStatus;
  notes?: string | null;
}

export type LearningResourcePatch = Partial<LearningResourceInput>;
