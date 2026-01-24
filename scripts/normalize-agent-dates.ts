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

function toISO(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (value._seconds !== undefined) return new Date(value._seconds * 1000).toISOString();
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {
    return null;
  }
  return null;
}

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
    console.error('Usage: npx ts-node scripts/normalize-agent-dates.ts <email>');
    process.exit(1);
  }
  const email = args[0];
  const doc = await findAgentByEmail(email);
  if (!doc) {
    console.error('Agent not found for', email);
    process.exit(2);
  }

  const data = doc.data() || {};
  const updates: Record<string, any> = {};

  const createdAtISO = toISO(data.createdAt);
  if (createdAtISO) updates.createdAt = createdAtISO;

  // backend expects modifiedAt; some docs have updatedAt instead
  const modifiedAtISO = toISO(data.modifiedAt) || toISO(data.updatedAt);
  if (modifiedAtISO) updates.modifiedAt = modifiedAtISO;

  if (Object.keys(updates).length === 0) {
    console.log('No date normalization required for', doc.id);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await doc.ref.update(updates);
  console.log('Normalized dates for', doc.id, updates);
  const updated = await doc.ref.get();
  console.log(JSON.stringify(updated.data(), null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(99);
});
