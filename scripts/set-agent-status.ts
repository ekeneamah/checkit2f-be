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
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/set-agent-status.ts <email> [status]');
    process.exit(1);
  }
  const email = args[0];
  const status = (args[1] || 'active').toLowerCase();

  const doc = await findAgentByEmail(email);
  if (!doc) {
    console.error('Agent not found for', email);
    process.exit(2);
  }

  const updates: Record<string, any> = {};
  updates.status = status;
  // set availability to AVAILABLE when activating the agent
  if (status === 'active') updates.availabilityStatus = 'AVAILABLE';
  updates.modifiedAt = new Date().toISOString();
  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await doc.ref.update(updates);
  console.log('Updated status for', doc.id, updates);
  const updated = await doc.ref.get();
  console.log(JSON.stringify(updated.data(), null, 2));
}

main().catch(err => { console.error(err); process.exit(99); });
