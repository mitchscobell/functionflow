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
  notes?: string;
  url?: string;
  dueDate?: string;
  priority: "Low" | "Medium" | "High";
  status: "Todo" | "InProgress" | "Done";
  tags: string[];
  listId?: number;
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

export interface TaskList {
  id: number;
  name: string;
  emoji?: string;
  color: string;
  sortOrder: number;
  taskCount: number;
  createdAt: string;
}

export interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  expiresAt?: string;
  isRevoked: boolean;
}

export interface ApiKeyCreated {
  id: number;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}
