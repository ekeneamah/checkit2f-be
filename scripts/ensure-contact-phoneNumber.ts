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

async function ensurePhoneNumber(email: string) {
  const snapshot = await db.collection('agents').where('contactInfo.email', '==', email.toLowerCase()).limit(1).get();
  if (snapshot.empty) {
    console.error('No agent found for', email);
    process.exit(1);
  }
  const doc = snapshot.docs[0];
  const data = doc.data();
  const contact = data.contactInfo || {};
  const phone = contact.phone || data.phone;
  if (!phone) {
    console.error('No phone present to migrate');
    process.exit(1);
  }
  const updates: Record<string, any> = {};
  if (!contact.phoneNumber || contact.phoneNumber.trim().length < 10) {
    updates['contactInfo.phoneNumber'] = phone;
  }

  // Ensure rating defaults exist to satisfy backend value-object (backend expects `rating`)
  if (!data.rating && !data.agentRating) {
    updates['rating'] = { averageRating: 0, totalRatings: 0, completedVerifications: 0, successRate: 100 };
  } else if (data.rating) {
    if (data.rating.averageRating === undefined) updates['rating.averageRating'] = 0;
    if (data.rating.totalRatings === undefined) updates['rating.totalRatings'] = 0;
    if (data.rating.completedVerifications === undefined) updates['rating.completedVerifications'] = 0;
    if (data.rating.successRate === undefined) updates['rating.successRate'] = 100;
  } else if (data.agentRating) {
    // Support older key names
    if (data.agentRating.averageRating === undefined) updates['rating.averageRating'] = 0;
    else updates['rating.averageRating'] = data.agentRating.averageRating;
    if (data.agentRating.totalRatings === undefined) updates['rating.totalRatings'] = 0;
    else updates['rating.totalRatings'] = data.agentRating.totalRatings;
    if (data.agentRating.completedVerifications === undefined) updates['rating.completedVerifications'] = 0;
    else updates['rating.completedVerifications'] = data.agentRating.completedVerifications;
    if (data.agentRating.successRate === undefined) updates['rating.successRate'] = 100;
    else updates['rating.successRate'] = data.agentRating.successRate;
  }

  if (Object.keys(updates).length === 0) {
    console.log('No updates required for', doc.id);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  // If firebaseUid missing, try to resolve it from Firebase Auth
  if (!data.firebaseUid) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord && userRecord.uid) {
        updates['firebaseUid'] = userRecord.uid;
      }
    } catch (err) {
      console.warn('Could not resolve Firebase Auth user for', email, err && err.message ? err.message : err);
    }
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('agents').doc(doc.id).update(updates);
  console.log('Updated fields for', doc.id, updates);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx ts-node scripts/ensure-contact-phoneNumber.ts <email>');
  process.exit(1);
}

ensurePhoneNumber(args[0]).then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1)});
