import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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

const SOURCE_ID = "G2"; // Điện thoại nhà điều hành
const TARGETS = [
    { id: "G3", name: "Điện thoại nhà Cứu hỏa; AOCC, ĐHSB" },
    { id: "G4", name: "Điện thoại nhà ga" },
    { id: "G6", name: "Điện thoại Khu bay" },
];

async function main() {
    console.log(`\n=== Đang đọc dữ liệu từ nguồn (ID: ${SOURCE_ID})... ===`);
    const sourceDoc = await getDoc(doc(db, "details", SOURCE_ID));
    if (!sourceDoc.exists()) {
        console.error(`❌ Lỗi: Không tìm thấy checklist chi tiết cho nguồn (ID: ${SOURCE_ID})`);
        process.exit(1);
    }
    const sourceItems = sourceDoc.data().items || [];
    console.log(`✅ Nguồn: Điện thoại nhà điều hành (ID: ${SOURCE_ID}) — ${sourceItems.length} mục:`);
    sourceItems.forEach((item, i) => console.log(`  ${i + 1}. ${item.content}`));

    console.log("\n=== Đang copy và reset trạng thái sang các mục tiêu... ===");
    for (const target of TARGETS) {
        const resetItems = sourceItems.map(item => ({
            id: item.id,
            content: item.content,
            status: null,
            note: "",
            timestamp: "",
            inspectorName: null
        }));
        await setDoc(doc(db, "details", target.id), { items: resetItems });
        console.log(`  ✓ Thành công: ${target.name} (ID: ${target.id})`);
    }
    console.log(`\n✅ Hoàn thành! Đã copy nội dung kiểm tra vào ${TARGETS.length} hệ thống điện thoại.`);
    process.exit(0);
}

main().catch(err => { console.error("Lỗi:", err); process.exit(1); });
