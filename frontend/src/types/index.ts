export interface User {
  id: number;
  email: string;
  displayName: string;
  themePreference: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  priority: "Low" | "Medium" | "High";
  status: "Todo" | "InProgress" | "Done";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  items: Task[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
