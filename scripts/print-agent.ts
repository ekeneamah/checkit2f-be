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

async function printAgent(email: string) {
  const snapshot = await db.collection('agents').where('contactInfo.email', '==', email.toLowerCase()).limit(1).get();
  if (snapshot.empty) {
    console.error('No agent found for', email);
    process.exit(1);
  }
  const doc = snapshot.docs[0];
  console.log('Document ID:', doc.id);
  console.log('Data:', JSON.stringify(doc.data(), null, 2));
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx ts-node scripts/print-agent.ts <email>');
  process.exit(1);
}

printAgent(args[0]).catch((err) => {
  console.error(err);
  process.exit(1);
});