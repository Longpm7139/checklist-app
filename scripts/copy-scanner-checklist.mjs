// Script to copy checklist from "máy soi xách tay số 1" to other scanners
// Run with: node scripts/copy-scanner-checklist.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDVqP30dU9dglVTHEC2n3EU6d51DSAXFFc",
    authDomain: "checklistapp-38948.firebaseapp.com",
    projectId: "checklistapp-38948",
    storageBucket: "checklistapp-38948.firebasestorage.app",
    messagingSenderId: "477232659978",
    appId: "1:477232659978:web:02975e29d1a57b941929f3",
    measurementId: "G-G514YP3WLP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    // Step 1: List all systems to find scanner IDs
    console.log("=== Đang tải danh sách hệ thống từ Firebase... ===\n");
    const systemsSnap = await getDocs(collection(db, "systems"));
    const systems = [];
    systemsSnap.forEach((d) => {
        systems.push({ id: d.id, ...d.data() });
    });

    // Sort and display
    systems.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    console.log("Danh sách tất cả hệ thống:");
    systems.forEach(s => console.log(`  ID: ${s.id} | Tên: ${s.name}`));

    // Step 2: Find "máy soi xách tay số 1"
    const sourceKeywords = ["xách tay", "xach tay"];
    let sourceSystem = systems.find(s => {
        const name = (s.name || '').toLowerCase();
        return sourceKeywords.some(kw => name.includes(kw)) && name.includes("1");
    });

    if (!sourceSystem) {
        // Broader search
        sourceSystem = systems.find(s => {
            const name = (s.name || '').toLowerCase();
            return name.includes("xách") || name.includes("xach");
        });
    }

    console.log("\n=== Tìm kiếm máy nguồn ===");
    if (!sourceSystem) {
        console.log("Không tìm thấy 'máy soi xách tay số 1'!");
        console.log("Vui lòng kiểm tra tên hệ thống trong danh sách trên.");
        process.exit(1);
    }
    console.log(`Máy nguồn tìm thấy: ID="${sourceSystem.id}" | Tên="${sourceSystem.name}"`);

    // Step 3: Load source checklist
    const sourceDoc = await getDoc(doc(db, "details", sourceSystem.id));
    if (!sourceDoc.exists()) {
        console.log(`\nKhông có checklist chi tiết cho máy nguồn (ID: ${sourceSystem.id})`);
        process.exit(1);
    }
    const sourceItems = sourceDoc.data().items || [];
    console.log(`\nSố lượng mục kiểm tra trong máy nguồn: ${sourceItems.length}`);
    sourceItems.forEach((item, i) => console.log(`  ${i + 1}. ${item.content}`));

    // Step 4: Find target scanner systems
    // Keywords for target scanners
    const targetKeywords = [
        "transis",
        "hành lý line",
        "quá khổ",
        "nội bộ",
        "máy soi rác",
        "soi rác",
        "kho hàng",
        "nhà vip",
        "vip"
    ];

    const targetSystems = systems.filter(s => {
        if (s.id === sourceSystem.id) return false; // skip source
        const name = (s.name || '').toLowerCase();
        return targetKeywords.some(kw => name.includes(kw));
    });

    console.log(`\n=== Danh sách máy đích tìm thấy (${targetSystems.length} máy): ===`);
    targetSystems.forEach(s => console.log(`  ID: ${s.id} | Tên: ${s.name}`));

    if (targetSystems.length === 0) {
        console.log("\nKhông tìm thấy máy đích. Hiển thị tất cả hệ thống để bạn chọn thủ công.");
        process.exit(1);
    }

    // Step 5: Copy checklist to each target
    console.log("\n=== Đang copy checklist... ===");
    for (const target of targetSystems) {
        // Reset status/note/timestamp but keep content
        const resetItems = sourceItems.map(item => ({
            id: item.id,
            content: item.content,
            status: null,
            note: "",
            timestamp: "",
            inspectorName: null
        }));

        await setDoc(doc(db, "details", target.id), { items: resetItems });
        console.log(`  ✓ Đã copy ${resetItems.length} mục vào: ${target.name} (ID: ${target.id})`);
    }

    console.log(`\n✅ Hoàn thành! Đã copy checklist vào ${targetSystems.length} máy soi.`);
    process.exit(0);
}

main().catch(err => {
    console.error("Lỗi:", err);
    process.exit(1);
});
