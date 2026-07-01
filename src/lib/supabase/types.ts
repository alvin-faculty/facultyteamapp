export type ProjectStatus = "proposal" | "active" | "review" | "done" | "archived";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

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

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
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

export interface InvoiceBatch {
  id: string;
  client_id: string;
  date_range_start: string;
  date_range_end: string;
  exported_at: string;
  exported_by: string | null;
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
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      task_comments: { Row: TaskComment; Insert: Partial<TaskComment>; Update: Partial<TaskComment> };
      invoice_batches: { Row: InvoiceBatch; Insert: Partial<InvoiceBatch>; Update: Partial<InvoiceBatch> };
      time_entries: { Row: TimeEntry; Insert: Partial<TimeEntry>; Update: Partial<TimeEntry> };
    };
  };
}
