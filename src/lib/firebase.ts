// 'use client'; removed to allow server-side usage in API routes

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDoc, addDoc, limit, orderBy } from "firebase/firestore";
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// TODO: Thay thế phần bên dưới bằng Config từ Firebase Console
// 1. Vào console.firebase.google.com
// 2. Tạo Project mới
// 3. Vào Project Settings -> General -> Your apps -> chọn Web (</>)
// 4. Copy toàn bộ đoạn firebaseConfig dán vào bên dưới
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Debug: Check if variables are missing
if (typeof window !== 'undefined') {
    const missing = Object.entries(firebaseConfig)
        .filter(([key, value]) => !value && key !== 'measurementId')
        .map(([key]) => key);
    if (missing.length > 0) {
        console.error("Firebase Configuration Missing Variables:", missing);
    }
}

// Initialize Firebase
let app;
try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}
const db = getFirestore(app!);
const storage = getStorage(app!);
export { db, storage };

// --- HELPER FUNCTIONS FOR MIGRATION ---

// Systems
// Helper to remove undefined values (Firestore doesn't support them)
const removeUndefined = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const newObj: any = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
            newObj[key] = (typeof value === 'object' && value !== null) ? removeUndefined(value) : value;
        }
    });
    return newObj;
};

// Systems
export const subscribeToSystems = (callback: (data: any[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, "systems"));
    return onSnapshot(q, (querySnapshot) => {
        const systems: any[] = [];
        querySnapshot.forEach((doc) => {
            systems.push({ ...doc.data(), id: doc.id });
        });
        callback(systems);
    }, (error) => {
        console.error("subscribeToSystems error:", error);
        if (onError) onError(error);
    });
};

export const saveSystem = async (id: string, data: any) => {
    // Merge true to allow partial updates (e.g. status change) without wiping name/categoryId
    await setDoc(doc(db, "systems", id), removeUndefined(data), { merge: true });
};

export const deleteSystem = async (id: string) => {
    await deleteDoc(doc(db, "systems", id));
};

// Categories
export const subscribeToCategories = (callback: (data: any[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, "categories"));
    return onSnapshot(q, (querySnapshot) => {
        const categories: any[] = [];
        querySnapshot.forEach((doc) => {
            categories.push({ ...doc.data(), id: doc.id });
        });
        callback(categories);
    }, (error) => {
        console.error("subscribeToCategories error:", error);
        if (onError) onError(error);
    });
};

export const saveCategory = async (id: string, data: any) => {
    await setDoc(doc(db, "categories", id), removeUndefined(data), { merge: true });
};

export const deleteCategory = async (id: string) => {
    await deleteDoc(doc(db, "categories", id));
};

// Logs
export const addLog = async (log: any) => {
    // Standard Firestore addDoc generates a unique ID automatically
    await addDoc(collection(db, "logs"), {
        ...removeUndefined(log),
        createdAt: Date.now() // Add a hidden server-sort field
    });
};

export const subscribeToLogs = (callback: (data: any[]) => void) => {
    // Returning to full data view (no limit/sorting) to restore all historical logs
    const q = query(collection(db, "logs"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push(doc.data());
        });
        callback(items);
    });
};

// Incidents
export const subscribeToIncidents = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "incidents"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push(doc.data());
        });
        callback(items);
    });
};

export const saveIncident = async (incident: any) => {
    await setDoc(doc(db, "incidents", incident.id), removeUndefined(incident));
};

export const deleteIncident = async (id: string) => {
    await deleteDoc(doc(db, "incidents", id));
};


// Maintenance
export const saveMaintenance = async (task: any) => {
    await setDoc(doc(db, "maintenance", task.id), removeUndefined(task));
};

export const deleteMaintenance = async (id: string) => {
    await deleteDoc(doc(db, "maintenance", id));
};

export const subscribeToMaintenance = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "maintenance"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push(doc.data());
        });
        callback(items);
    });
};

// Duties
export const saveDuty = async (date: string, assignments: any[]) => {
    await setDoc(doc(db, "duties", date), { date, assignments: removeUndefined(assignments) });
};

export const subscribeToDuties = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "duties"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push(doc.data());
        });
        callback(items);
    });
};

// Checklist Details
export const subscribeToChecklist = (systemId: string, callback: (data: any) => void, onError?: (error: any) => void) => {
    return onSnapshot(doc(db, "details", systemId), (doc) => {
        if (doc.exists()) {
            callback(doc.data().items || []);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error("subscribeToChecklist error:", error);
        if (onError) onError(error);
    });
};

export const saveChecklist = async (systemId: string, items: any[]) => {
    // Sanitize items array
    const sanitizedItems = items.map(item => removeUndefined(item));
    await setDoc(doc(db, "details", systemId), { items: sanitizedItems });
};

// Users
export const getUsers = async () => {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    const users: any[] = [];
    snapshot.forEach((doc) => {
        users.push({ ...doc.data(), id: doc.id });
    });
    return users.sort((a, b) => a.name.localeCompare(b.name));
};

export const getUserByCode = async (code: string) => {
    const q = query(collection(db, "users"), where("code", "==", code));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { ...doc.data(), id: doc.id };
    }
    return null;
};

export const addUser = async (user: any) => {
    // Check if user exists
    const existing = await getUserByCode(user.code);
    if (existing) {
        throw new Error('Mã nhân viên đã tồn tại');
    }
    // Add new user
    await addDoc(collection(db, "users"), removeUndefined(user));
};

export const deleteUser = async (id: string) => {
    await deleteDoc(doc(db, "users", id));
};

export const updateUserPassword = async (id: string, password: string) => {
    await updateDoc(doc(db, "users", id), { password });
};

// Client-side image compression to speed up mobile uploads
const compressImage = async (file: File): Promise<Blob | File> => {
    if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_DIM = 1000;

            if (width > height) {
                if (width > MAX_DIM) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                }
            } else {
                if (height > MAX_DIM) {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else resolve(file);
                },
                'image/jpeg',
                0.6
            );
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
};

// Storage
export const uploadImage = async (file: File, path: string) => {
    if (!firebaseConfig.storageBucket) {
        alert("CẢNH BÁO: Hệ thống chưa được cấu hình KHO ẢNH (Storage Bucket). Vui lòng liên hệ Admin để thêm biến môi trường!");
        throw new Error("Storage bucket missing");
    }

    try {
        const compressedFile = await compressImage(file).catch(err => {
            console.warn("Compression failed, using original:", err);
            return file;
        });

        const storageRef = ref(storage, path);
        
        // Return a promise that uses the simpler uploadBytes
        // Adding explicit contentType can help with some storage rules
        const metadata = { contentType: compressedFile.type || file.type };
        
        const uploadTask = uploadBytes(storageRef, compressedFile, metadata);
        
        // 60-second timeout is plenty for <10MB on most connections
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("QUÁ THỜI GIAN: Đường truyền mạng quá tải (60s timeout).")), 60000)
        );

        const snapshot = await Promise.race([uploadTask, timeoutPromise]) as any;
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
    } catch (error: any) {
        console.error("Firebase Storage Error:", error);
        
        let errorMsg = error?.code || error?.message || "Không xác định";
        
        if (errorMsg.includes('unauthorized')) {
             alert(`LỖI TRUY CẬP (unauthorized):\n\n- Đường dẫn: ${path}\n- Dung lượng: ${(file.size/(1024*1024)).toFixed(2)}MB\n- Lỗi hệ thống: ${errorMsg}\n\nNguyên nhân: Server từ chối ghi vào đường dẫn này. Hướng xử lý: Hãy liên hệ Admin để kiểm tra Storage Rules cho thư mục 'procedures/'.`);
        } else {
             alert(`LỖI TẢI FILE (Code: ${error.code || 'ERR'}):\n${errorMsg}`);
        }
        throw error;
    }
};

// Seeding
export const checkAnyUserExists = async () => {
    const q = query(collection(db, "users"), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};

// History (Fixed Issues)
export const subscribeToHistory = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "history"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        // Sort by resolution time descending (newest fix first)
        // If not fixed yet, use the initial timestamp
        items.sort((a, b) => {
            const parseDate = (t: string) => {
                if (!t) return 0;
                // Handle "HH:mm dd/MM/yyyy" or similar
                const parts = t.split(' ');
                const datePart = parts.find((p: string) => p.includes('/'));
                if (datePart) {
                    const [d, m, y] = datePart.split('/');
                    const timePart = parts.find((p: string) => p.includes(':')) || '00:00';
                    return new Date(`${y}-${m}-${d}T${timePart}:00`).getTime();
                }
                return new Date(t).getTime() || 0;
            };
            
            const timeA = parseDate(a.resolvedAt || a.timestamp);
            const timeB = parseDate(b.resolvedAt || b.timestamp);
            return timeB - timeA;
        });
        callback(items);
    });
};

export const addHistoryItem = async (item: any) => {
    await addDoc(collection(db, "history"), removeUndefined(item));
};

export const saveHistoryItem = async (priorityId: string, item: any) => {
    // Upsert history item with specific ID (e.g. systemId_itemId)
    // If priorityId is provided, use it. Otherwise use item.id or auto-id
    const docId = priorityId || item.id || Date.now().toString();
    await setDoc(doc(db, "history", docId), removeUndefined(item), { merge: true });
};

export const deleteHistoryItem = async (id: string) => {
    await deleteDoc(doc(db, "history", id));
};

// Safety Reports
export const subscribeToSafetyReports = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "safety_reports"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        // Sort by createdAt descending
        items.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA;
        });
        callback(items);
    });
};

export const saveSafetyReport = async (report: any) => {
    const docId = report.id || Date.now().toString();
    await setDoc(doc(db, "safety_reports", docId), removeUndefined(report), { merge: true });
};

export const deleteSafetyReport = async (id: string) => {
    await deleteDoc(doc(db, "safety_reports", id));
};

// --- PROCEDURES (OPERATING & MAINTENANCE) ---
export const subscribeToProcedures = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "procedures"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        // Sort by ticketNumber or createdAt? Let's sort by createdAt desc for now
        items.sort((a, b) => {
            const timeA = new Date(a.createdAt?.split(' ').reverse().join(' ') || '').getTime() || 0;
            const timeB = new Date(b.createdAt?.split(' ').reverse().join(' ') || '').getTime() || 0;
            return timeB - timeA;
        });
        callback(items);
    });
};

export const saveProcedure = async (procedure: any) => {
    const docId = procedure.id || Date.now().toString();
    await setDoc(doc(db, "procedures", docId), removeUndefined(procedure), { merge: true });
};

export const deleteProcedure = async (id: string) => {
    await deleteDoc(doc(db, "procedures", id));
};

// PCCC Reports
export const subscribeToPcccReports = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "pccc_reports"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        items.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA;
        });
        callback(items);
    });
};

export const savePcccReport = async (report: any) => {
    const docId = report.id || Date.now().toString();
    await setDoc(doc(db, "pccc_reports", docId), removeUndefined(report), { merge: true });
};

export const deletePcccReport = async (id: string) => {
    await deleteDoc(doc(db, "pccc_reports", id));
};

// PBB Reports
export const subscribeToPbbReports = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "pbb_reports"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        items.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA;
        });
        callback(items);
    });
};

export const savePbbReport = async (report: any) => {
    const docId = report.id || Date.now().toString();
    await setDoc(doc(db, "pbb_reports", docId), removeUndefined(report), { merge: true });
};

export const deletePbbReport = async (id: string) => {
    await deleteDoc(doc(db, "pbb_reports", id));
};

// Helper to get all details for Summary page
export const getAllDetails = async () => {
    const q = query(collection(db, "details"));
    const snapshot = await getDocs(q);
    const details: Record<string, any[]> = {};
    snapshot.forEach((doc) => {
        details[doc.id] = doc.data().items || [];
    });
    return details;
};

// Material History
export const subscribeToMaterialHistory = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "material_history"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        // Sort by approvedAt desc
        items.sort((a, b) => {
            // Basic string sort
            if (a.approvedAt < b.approvedAt) return 1;
            if (a.approvedAt > b.approvedAt) return -1;
            return 0;
        });
        callback(items);
    });
};

export const addMaterialHistory = async (item: any) => {
    await addDoc(collection(db, "material_history"), removeUndefined(item));
};

// Reset KPI Data (Admin only)
import { writeBatch } from "firebase/firestore";

export const resetKPIData = async () => {
    const batch = writeBatch(db);
    const collections = ["logs", "history", "incidents", "maintenance", "material_history"];

    for (const colName of collections) {
        const q = query(collection(db, colName));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
    }

    await batch.commit();

    // Reset System Statuses
    const systemsQ = query(collection(db, "systems"));
    const systemsSnapshot = await getDocs(systemsQ);
    const systemBatch = writeBatch(db);

    systemsSnapshot.docs.forEach((doc) => {
        systemBatch.update(doc.ref, {
            status: "NA",
            note: "",
            inspectorName: null,
            timestamp: null
        });
    });

    await systemBatch.commit();

    // Reset Details Items Status
    const detailsQ = query(collection(db, "details"));
    const detailsSnapshot = await getDocs(detailsQ);
    const detailsBatch = writeBatch(db);

    detailsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.items && Array.isArray(data.items)) {
            const resetItems = data.items.map((i: any) => ({
                ...i,
                status: "NA",
                note: "",
                timestamp: "",
                inspectorName: null
            }));
            detailsBatch.update(doc.ref, { items: resetItems });
        }
    });

    await detailsBatch.commit();
};

// ============================================================
// SỔ LÝ LỊCH THIẾT BỊ — device_logs collection
// ============================================================

export const getDeviceLog = async (systemId: string) => {
    const docRef = doc(db, "device_logs", systemId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { ...snap.data(), systemId } as any;
    }
    return null;
};

export const saveDeviceLog = async (systemId: string, data: any) => {
    await setDoc(doc(db, "device_logs", systemId), removeUndefined(data), { merge: true });
};

export const subscribeToDeviceLogs = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "device_logs"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), systemId: doc.id });
        });
        callback(items);
    });
};

// Backup All Data (Admin only)
export const backupAllData = async () => {
    const collections = [
        "logs",
        "history",
        "incidents",
        "maintenance",
        "material_history",
        "systems",
        "users",
        "details",
        "categories",
        "pbb_reports",
        "safety_reports",
        "pccc_reports",
        "device_logs"
    ];

    const backupData: Record<string, any[]> = {};

    for (const colName of collections) {
        const q = query(collection(db, colName));
        const snapshot = await getDocs(q);
        const items: any[] = [];
        snapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        backupData[colName] = items;
    }

    // Convert to JSON string
    return JSON.stringify(backupData, null, 2);
};

// License Categories
export const subscribeToLicenseCategories = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "license_categories"));
    return onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id });
        });
        callback(items);
    });
};

export const saveLicenseCategory = async (category: any) => {
    const docId = category.id || Date.now().toString();
    await setDoc(doc(db, "license_categories", docId), removeUndefined(category), { merge: true });
};

export const deleteLicenseCategory = async (id: string) => {
    await deleteDoc(doc(db, "license_categories", id));
};
