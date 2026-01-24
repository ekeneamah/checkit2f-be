import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('📄 Loaded environment from .env.local\n');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('📄 Loaded environment from .env\n');
} else {
  console.error('❌ No .env or .env.local file found!');
  process.exit(1);
}

/**
 * Seed agent users
 * Run with: npx ts-node scripts/seed-agent-users.ts
 */

// Initialize Firebase Admin SDK
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

const agentUsers = [
  {
    displayName: 'Agent Manager',
    firstName: 'Agent',
    lastName: 'Manager',
    contactInfo: {
      email: 'manager@checkit24.com',
      phone: '+1234567890',
    },
    serviceArea: {
      city: 'Lagos',
      areas: ['Ikeja', 'Victoria Island', 'Lekki'],
      coordinates: { latitude: 6.5244, longitude: 3.3792 }
    },
    status: 'active',
    verified: true,
    specializations: ['ID_VERIFICATION', 'ADDRESS_VERIFICATION', 'DOCUMENT_VERIFICATION'],
  },
];

async function seedAgents() {
  console.log('🌱 Starting agent seeding...\n');

  for (const agentData of agentUsers) {
    try {
      console.log(`Processing agent: ${agentData.contactInfo.email}`);

      // Get Firebase Auth user
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(agentData.contactInfo.email);
        console.log(`  ✓ Found Firebase user: ${firebaseUser.uid}`);
      } catch (error) {
        console.log(`  ✗ Firebase user not found for ${agentData.contactInfo.email}`);
        console.log(`  ℹ️  Create this user in Firebase Auth first or run seed-admin-users.ts`);
        continue;
      }

      // Check if agent already exists
      const agentRef = db.collection('agents').doc(firebaseUser.uid);
      const agentDoc = await agentRef.get();

      if (agentDoc.exists) {
        console.log(`  ⚠️  Agent already exists, updating...`);
        await agentRef.update({
          ...agentData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Agent updated successfully\n`);
      } else {
        // Create agent document
        await agentRef.set({
          id: firebaseUser.uid,
          firebaseUid: firebaseUser.uid,
          ...agentData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Agent created successfully\n`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${agentData.contactInfo.email}:`, error);
    }
  }

  console.log('✅ Agent seeding completed!\n');
  process.exit(0);
}

seedAgents().catch((error) => {
  console.error('❌ Fatal error during seeding:', error);
  process.exit(1);
});
