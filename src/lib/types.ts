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
  systemId?: string; // ID thiết bị liên kết
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
  createdAt?: string;
  systemId?: string;
  systemName?: string;
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

// ============================================================
// SỔ LÝ LỊCH THIẾT BỊ — ACV-LLTB01
// ============================================================

export interface DeviceOperator {
  name: string;
  qualification: string;  // Trình độ chuyên môn
  licenseNo: string;      // Số giấy phép hành nghề
  position: string;       // Chức vụ
  startDate: string;      // Ngày chuyển đến
  endDate: string;        // Ngày chuyển đi
}

export interface DeviceComponent {
  name: string;     // Tên thành phần
  unit: string;     // Đơn vị tính
  quantity: string; // Số lượng
  note: string;     // Ghi chú
}

export interface DeviceCertification {
  number: string;   // Số giấy phép / tem kiểm định
  issuedBy: string; // Đơn vị cấp
  expiry: string;   // Thời hạn
  note: string;     // Ghi chú
}

export interface DeviceDocument {
  name: string;     // Tên tài liệu
  quantity: string; // Số lượng
  note: string;     // Ghi chú
}

export interface DeviceLog {
  systemId: string;         // Liên kết với SystemCheck.id (e.g. "A1")
  systemName: string;       // Tên thiết bị (auto từ system)
  // Mục 1–13 — Lý lịch
  brand: string;            // 2. Nhãn hiệu
  purpose: string;          // 3. Mục đích sử dụng
  operatingArea: string;    // 4. Phạm vi hoạt động
  countryOfOrigin: string;  // 5. Nước sản xuất
  serialNumber: string;     // 6. Số máy (serial)
  technicalAddress: string; // 7. Mã số, địa chỉ kỹ thuật
  location: string;         // 8. Địa điểm đặt thiết bị
  dailyOperatingHours: string; // 9. Thời gian HKT hàng ngày
  assetCode: string;        // 10+11. Mã số TSCD / Xuất xứ
  managingUnit: string;     // 12. Đơn vị sử dụng
  operators: DeviceOperator[]; // 13. Người sử dụng
  // Mục 14–19 — Đặc tính kỹ thuật
  dimLength: string;        // 14. Chiều dài
  dimWidth: string;         // 14. Chiều rộng
  dimHeight: string;        // 14. Chiều cao
  dimUnit: string;          // Đơn vị kích thước (mm/cm/m)
  weight: string;           // 15. Khối lượng
  weightUnit: string;       // Đơn vị khối lượng (kg/tấn)
  powerSource: string;      // 16. Nguồn điện / nhiên liệu
  powerConsumption: string; // 17. Công suất tiêu thụ
  safetyRegulations: string; // 18. Quy định ATLD
  otherSpecs: string;       // 19. Đặc điểm kỹ thuật khác
  // Mục 20 — Thành phần
  components: DeviceComponent[];
  // Mục 21 — Giấy phép / Kiểm định
  certifications: DeviceCertification[];
  // Mục 22 — Tài liệu kỹ thuật
  documents: DeviceDocument[];
  // Metadata
  updatedAt: string;
  updatedBy: string;
  createdAt?: string;
}

export interface Procedure {
  id: string;
  type: 'OPERATING' | 'MAINTENANCE';
  ticketNumber: string;
  formCode: string; // B01.QT01/DAD
  department: string;
  documentName: string;
  documentSymbol: string;
  revision: string;
  reason: string;
  date: string; // "dd/MM/yyyy"
  fileUrl?: string;
  fileName?: string;
  creatorName: string;
  creatorCode: string;
  createdAt: string; // "HH:mm dd/MM/yyyy"
}
