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

const SOURCE_ID = "E1"; // TDS ga đến
const TARGETS = [
    { id: "E2", name: "TDS khu checkin" },
    { id: "E3", name: "TDS phòng chờ" },
    { id: "E4", name: "TDS cửa boarding 1,2,3" },
    { id: "E5", name: "TDS cửa boarding 9,10,11" },
];

async function main() {
    const sourceDoc = await getDoc(doc(db, "details", SOURCE_ID));
    if (!sourceDoc.exists()) {
        console.log(`Không có checklist chi tiết cho nguồn (ID: ${SOURCE_ID})`);
        process.exit(1);
    }
    const sourceItems = sourceDoc.data().items || [];
    console.log(`Nguồn: TDS ga đến (ID: ${SOURCE_ID}) — ${sourceItems.length} mục:`);
    sourceItems.forEach((item, i) => console.log(`  ${i + 1}. ${item.content}`));

    console.log("\n=== Đang copy... ===");
    for (const target of TARGETS) {
        // Reset fields for fresh inspection
        const resetItems = sourceItems.map(item => ({
            id: item.id,
            content: item.content,
            status: "NA",
            note: "",
            timestamp: "",
            inspectorName: null,
            inspectorCode: null
        }));
        await setDoc(doc(db, "details", target.id), { items: resetItems });
        console.log(`  ✓ ${target.name} (ID: ${target.id})`);
    }
    console.log(`\n✅ Hoàn thành! Đã copy vào ${TARGETS.length} hệ thống TDS.`);
    process.exit(0);
}

main().catch(err => { console.error("Lỗi:", err); process.exit(1); });
