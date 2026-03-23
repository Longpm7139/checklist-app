// Script restore toàn bộ dữ liệu Firebase từ file JSON backup
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { readFileSync, existsSync } from "fs";

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
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Sử dụng: node scripts/restore-firebase.mjs <tên_file_backup.json>");
        process.exit(1);
    }

    const filename = args[0];
    if (!existsSync(filename)) {
        console.error(`Lỗi: Không tìm thấy file ${filename}`);
        process.exit(1);
    }

    const data = JSON.parse(readFileSync(filename, "utf-8"));
    console.log(`=== Đang khôi phục dữ liệu từ file: ${filename} ===\n`);

    for (const colName of COLLECTIONS) {
        if (!data[colName]) {
            console.log(`  ⚠ Bỏ qua ${colName} (không có trong bản backup)`);
            continue;
        }

        console.log(`  ↺ Đang xử lý ${colName}...`);

        // 1. Xóa dữ liệu cũ trong collection
        const snap = await getDocs(collection(db, colName));
        const deleteBatch = writeBatch(db);
        snap.forEach((d) => {
            deleteBatch.delete(d.ref);
        });
        await deleteBatch.commit();
        console.log(`    - Đã xóa ${snap.size} bản ghi cũ`);

        // 2. Ghi đè dữ liệu từ backup
        const items = data[colName];
        // Chia nhỏ batch nếu số lượng bản ghi quá lớn (Firestore giới hạn 500/batch)
        const BATCH_SIZE = 400;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = items.slice(i, i + BATCH_SIZE);
            chunk.forEach((item) => {
                const id = item._id || item.id;
                const cleanItem = { ...item };
                delete cleanItem._id; // Loại bỏ field tạm hỗ trợ restore
                batch.set(doc(db, colName, id), cleanItem);
            });
            await batch.commit();
        }
        console.log(`    - Đã khôi phục ${items.length} bản ghi mới`);
    }

    console.log(`\n✅ Khôi phục thành công!`);
    process.exit(0);
}

main().catch(err => { console.error("Lỗi:", err); process.exit(1); });
