import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
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

async function findAgentByEmail(email: string) {
  const snapshot = await db.collection('agents').where('contactInfo.email', '==', email.toLowerCase()).limit(1).get();
  if (!snapshot.empty) return snapshot.docs[0];
  const snapshot2 = await db.collection('agents').where('email', '==', email.toLowerCase()).limit(1).get();
  if (!snapshot2.empty) return snapshot2.docs[0];
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/set-agent-firebase-uid.ts <email> <firebaseUid>');
    process.exit(1);
  }
  const [email, uid] = args;
  const doc = await findAgentByEmail(email);
  if (!doc) {
    console.error('Agent not found for', email);
    process.exit(2);
  }
  await doc.ref.update({ firebaseUid: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log('Set firebaseUid for', doc.id, uid);
  const updated = await doc.ref.get();
  console.log(JSON.stringify(updated.data(), null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(99);
});
