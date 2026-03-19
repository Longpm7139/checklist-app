// Script to remove incorrectly copied checklist from Cổng từ machines
import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";

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

// These were wrongly given scanner checklist - remove their details
const wrongTargets = [
    { id: "D7", name: "Cổng từ transis" },
    { id: "D8", name: "Cổng từ nội bộ" },
    { id: "D9", name: "Cổng từ soi rác" },
    { id: "D10", name: "Cổng từ nhà VIP" },
];

async function main() {
    console.log("=== Đang xóa checklist máy soi đã copy nhầm vào Cổng từ ===\n");
    for (const target of wrongTargets) {
        await deleteDoc(doc(db, "details", target.id));
        console.log(`  ✓ Đã xóa checklist khỏi: ${target.name} (ID: ${target.id})`);
    }
    console.log("\n✅ Hoàn thành! Đã dọn sạch các máy bị copy nhầm.");
    process.exit(0);
}

main().catch(err => {
    console.error("Lỗi:", err);
    process.exit(1);
});
