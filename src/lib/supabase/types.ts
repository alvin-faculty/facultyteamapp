export type ProjectStatus = "proposal" | "active" | "review" | "done" | "archived";
export type UserRole = "admin" | "employee";

export interface AssetLink {
  label: string;
  url: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  hourly_rate: number;
  avatar_url: string | null;
  role: UserRole;
  disabled: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  budget_hours: number | null;
  budget_amount: number | null;
  hourly_rate_override: number | null;
  start_date: string | null;
  end_date: string | null;
  share_token: string;
  asset_links: AssetLink[];
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  section_id: string | null;
  completed: boolean;
  parent_task_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type TaskCommentWithAuthor = TaskComment & { profiles?: { name: string } | null };

export interface InvoiceBatch {
  id: string;
  client_id: string;
  date_range_start: string;
  date_range_end: string;
  exported_at: string;
  exported_by: string | null;
}

export type FlowNodeType = "task" | "note" | "document";

export interface FlowNode {
  id: string;
  project_id: string;
  type: FlowNodeType;
  label: string;
  task_id: string | null;
  url: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface FlowEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  task_id: string | null;
  user_id: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  billable: boolean;
  rate_snapshot: number;
  locked: boolean;
  invoice_batch_id: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> };
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> };
      project_members: { Row: ProjectMember; Insert: Partial<ProjectMember> & { project_id: string; user_id: string }; Update: Partial<ProjectMember> };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      sections: { Row: Section; Insert: Partial<Section>; Update: Partial<Section> };
      task_comments: { Row: TaskComment; Insert: Partial<TaskComment>; Update: Partial<TaskComment> };
      invoice_batches: { Row: InvoiceBatch; Insert: Partial<InvoiceBatch>; Update: Partial<InvoiceBatch> };
      time_entries: { Row: TimeEntry; Insert: Partial<TimeEntry>; Update: Partial<TimeEntry> };
      flow_nodes: { Row: FlowNode; Insert: Partial<FlowNode>; Update: Partial<FlowNode> };
      flow_edges: { Row: FlowEdge; Insert: Partial<FlowEdge>; Update: Partial<FlowEdge> };
    };
  };
}
