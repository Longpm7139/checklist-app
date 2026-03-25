// 'use client'; removed to allow server-side usage in API routes

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDoc, addDoc, limit } from "firebase/firestore";

// TODO: Thay thế phần bên dưới bằng Config từ Firebase Console
// 1. Vào console.firebase.google.com
// 2. Tạo Project mới
// 3. Vào Project Settings -> General -> Your apps -> chọn Web (</>)
// 4. Copy toàn bộ đoạn firebaseConfig dán vào bên dưới
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
// Check if app is already initialized to avoid duplication in Next.js hot-reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };

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
    // Use timestamp as ID or auto-id
    const logId = log.id || Date.now().toString();
    await setDoc(doc(db, "logs", logId), removeUndefined(log));
};

export const subscribeToLogs = (callback: (data: any[]) => void) => {
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

// Maintenance
export const saveMaintenance = async (task: any) => {
    await setDoc(doc(db, "maintenance", task.id), removeUndefined(task));
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
        // Sort by timestamp descending (newest appeared issue first)
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
            return parseDate(b.timestamp) - parseDate(a.timestamp);
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
        "details", // This is special, document IDs are system IDs
        "categories"
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
