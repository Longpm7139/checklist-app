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

const SOURCE_ID = "F1"; // ACS cửa boarding số 1
const TARGETS = [
    { id: "F2", name: "ACS cửa boarding số 2" },
    { id: "F3", name: "ACS cửa boarding số 3" },
    { id: "F4", name: "ACS cửa boarding số 4" },
    { id: "F5", name: "ACS cửa boarding số 5" },
    { id: "F6", name: "ACS cửa boarding số 6" },
    { id: "F7", name: "ACS cửa boarding số 7" },
    { id: "F8", name: "ACS cửa boarding số 8" },
    { id: "F9", name: "ACS cửa boarding số 9" },
    { id: "F10", name: "ACS cửa boarding số 10" },
    { id: "F11", name: "ACS cửa boarding số 11" },
];

async function main() {
    const sourceDoc = await getDoc(doc(db, "details", SOURCE_ID));
    if (!sourceDoc.exists()) {
        console.log(`Không có checklist chi tiết cho nguồn (ID: ${SOURCE_ID})`);
        process.exit(1);
    }
    const sourceItems = sourceDoc.data().items || [];
    console.log(`Nguồn: ACS cửa boarding số 1 (ID: ${SOURCE_ID}) — ${sourceItems.length} mục:`);
    sourceItems.forEach((item, i) => console.log(`  ${i + 1}. ${item.content}`));

    console.log("\n=== Đang copy... ===");
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
        console.log(`  ✓ ${target.name} (ID: ${target.id})`);
    }
    console.log(`\n✅ Hoàn thành! Đã copy vào ${TARGETS.length} ACS.`);
    process.exit(0);
}

main().catch(err => { console.error("Lỗi:", err); process.exit(1); });
