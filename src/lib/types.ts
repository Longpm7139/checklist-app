export type Status = 'OK' | 'NOK' | 'NA';

export interface SystemCategory {
  id: string;
  name: string;
}

export interface SystemCheck {
  id: string; // e.g., 'A1'
  categoryId: string; // New field to group by category
  name: string; // e.g., 'Cầu số 1'
  status: Status | null;
  note: string;
  fixStatus?: 'Fixed' | 'Fixing' | 'No Fix';
  actionNote?: string;
  timestamp?: string;
  inspectorName?: string;
}

export interface ChecklistItem {
  id: string;
  content: string; // Nội dung kiểm tra
  status: Status | null;
  note: string;
  timestamp?: string;
  fixStatus?: 'Fixed' | 'Fixing' | 'No Fix';
  actionNote?: string;
  inspectorName?: string;
  materialRequest?: string;
}

export interface ErrorReport {
  id: string;
  systemName: string;
  status: 'Fixed' | 'Fixing' | 'No Fix';
  executionContent: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  systemName: string; // e.g., "Cầu hành khách A1"
  description: string;
  status: 'OPEN' | 'RESOLVED';
  assignedTo?: string; // User Code or Name
  reportedBy: string; // Admin who created it
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string; // User who fixed it
  resolutionNote?: string;
  participants?: string[]; // List of names who participated in fixing
}

export interface MaintenanceTask {
  id: string;
  title: string; // e.g. "Bảo dưỡng Cầu A1 tháng 10"
  description: string;
  deadline: string; // YYYY-MM-DD
  assignees: string[]; // Array of User Codes
  assigneeNames: string[]; // Array of User Names for display
  supervisors?: string[]; // Array of User Codes (New for KPI)
  supervisorNames?: string[]; // Array of User Names for display
  assignedByName: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string;
  completedNote?: string;
  createdAt: string;
}
