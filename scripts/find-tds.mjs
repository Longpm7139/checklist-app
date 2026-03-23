import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function main() {
    const q = collection(db, "systems");
    const snapshot = await getDocs(q);
    const tdsSystems = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.name.includes("TDS")) {
            tdsSystems.push({ id: doc.id, name: data.name });
        }
    });

    console.log("Found TDS Systems:");
    tdsSystems.forEach(s => console.log(`- ${s.id}: ${s.name}`));
    process.exit(0);
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
