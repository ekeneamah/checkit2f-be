import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env (same approach as other scripts)
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('No .env or .env.local found — make sure FIREBASE_* vars are set');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function updatePhone(email: string, newPhone: string) {
  console.log(`Updating phone for ${email} -> ${newPhone}`);
  const snapshot = await db.collection('agents').where('contactInfo.email', '==', email.toLowerCase()).limit(1).get();
  if (snapshot.empty) {
    console.error('No agent document found with that email');
    process.exit(2);
  }
  const doc = snapshot.docs[0];
  const id = doc.id;
  await db.collection('agents').doc(id).update({ 'contactInfo.phone': newPhone, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`Updated agent ${id}`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npx ts-node scripts/update-agent-phone.ts <email> <newPhone>');
  process.exit(1);
}

updatePhone(args[0], args[1])
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
