import { db } from './src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkDuties() {
    const today = new Date().toLocaleDateString('en-CA');
    const snap = await getDoc(doc(db, 'duties', today));
    if (snap.exists()) {
        console.log(`Duty for ${today}:`, JSON.stringify(snap.data(), null, 2));
    } else {
        console.log(`No duty found for ${today}`);
    }
}

checkDuties();
