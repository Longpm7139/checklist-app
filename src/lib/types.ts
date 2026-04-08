export type Status = 'OK' | 'NOK' | 'NA' | 'IN_PROGRESS';

export interface User {
  id?: string;
  code: string;
  name: string;
  role: string;
}

export interface SystemCategory {
  id: string;
  name: string;
}

export interface SystemCheck {
  id: string; // e.g., 'A1'
  categoryId: string;
  name: string; // e.g., 'Cầu số 1'
  status: Status | null;
  note: string;
  fixStatus?: 'Fixed' | 'Fixing' | 'No Fix';
  actionNote?: string;
  timestamp?: string;
  inspectorName?: string;
  inspectorCode?: string;
  imageUrl?: string;
}

export interface ChecklistItem {
  id: string;
  content: string;
  status: Status | null;
  note: string;
  timestamp?: string;
  fixStatus?: 'Fixed' | 'Fixing' | 'No Fix';
  actionNote?: string;
  inspectorName?: string;
  inspectorCode?: string;
  materialRequest?: string;
  executorNames?: string[];
  imageUrl?: string;
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
  systemName: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  severity?: 'CRITICAL' | 'MEDIUM' | 'LOW'; // Mức độ nghiêm trọng
  assignedTo?: string;
  reportedBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  participants?: string[];
  imageUrl?: string;
  resolutionImageUrl?: string;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  type?: 'MAINTENANCE' | 'PROJECT';
  description: string;
  deadline: string;
  assignees: string[];
  assigneeNames: string[];
  supervisors?: string[];
  supervisorNames?: string[];
  assignedByName: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string;
  completedNote?: string;
  remainingIssues?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export interface SafetyCriteria {
  id: string;
  name: string;
  method: string;
  standards: string;
  frequency: string;
  result: 'Đạt' | 'Không đạt' | null;
  note: string;
}

export interface SafetyReport {
  id: string;
  shiftTime: string; // '07:00 – 19:00' | '19:00 – 07:00'
  dutyOfficer: string;
  reporter: string;
  totalWorkers: string;
  absentWorkers: string;
  workLocations: string;
  inspectionLocations: string;
  criteria: SafetyCriteria[];
  workerOpinions: string;
  createdAt: string;
  updatedAt?: string;
}
