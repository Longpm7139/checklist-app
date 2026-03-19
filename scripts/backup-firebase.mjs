// Script backup toàn bộ dữ liệu Firebase ra file JSON
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import { writeFileSync } from "fs";

const firebaseConfig = {
    apiKey: "AIzaSyDVqP30dU9dglVTHEC2n3EU6d51DSAXFFc",
    authDomain: "checklistapp-38948.firebaseapp.com",
    projectId: "checklistapp-38948",
    storageBucket: "checklistapp-38948.firebasestorage.app",
    messagingSenderId: "477232659978",
    appId: "1:477232659978:web:02975e29d1a57b941929f3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = [
    "systems",
    "details",
    "users",
    "duties",
    "logs",
    "history",
    "incidents",
    "maintenance",
    "material_history",
];

async function main() {
    console.log("=== Đang backup dữ liệu từ Firebase... ===\n");
    const backupData = {};

    for (const colName of COLLECTIONS) {
        const snap = await getDocs(query(collection(db, colName)));
        const items = [];
        snap.forEach((d) => items.push({ ...d.data(), _id: d.id }));
        backupData[colName] = items;
        console.log(`  ✓ ${colName}: ${items.length} bản ghi`);
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `backup_${timestamp}.json`;

    writeFileSync(filename, JSON.stringify(backupData, null, 2), "utf-8");
    console.log(`\n✅ Backup hoàn thành! File: ${filename}`);
    process.exit(0);
}

main().catch(err => { console.error("Lỗi:", err); process.exit(1); });
