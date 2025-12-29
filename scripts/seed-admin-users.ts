import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

// Load environment variables - try .env.local first, then .env
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
 * Standalone script to seed admin users
 * Run with: npx ts-node scripts/seed-admin-users.ts
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

const adminUsers = [
  {
    email: 'admin@checkit24.com',
    password: 'Admin@2024!',
    role: 'SUPER_ADMIN',
    displayName: 'Super Admin',
  },
  {
    email: 'manager@checkit24.com',
    password: 'Manager@2024!',
    role: 'AGENT_MANAGER',
    displayName: 'Agent Manager',
  },
  {
    email: 'support@checkit24.com',
    password: 'Support@2024!',
    role: 'ADMIN',
    displayName: 'Admin Support',
  },
];

async function seedAdminUsers() {
  console.log('🌱 Starting admin user seeding...\n');

  const firestore = admin.firestore();

  for (const userData of adminUsers) {
    try {
      // Step 1: Check if Firebase Auth user exists
      let user: admin.auth.UserRecord;
      let isNewUser = false;
      
      try {
        user = await admin.auth().getUserByEmail(userData.email);
        console.log(`✓ Firebase Auth user already exists: ${userData.email}`);
      } catch (error) {
        // User doesn't exist in Firebase Auth, create new user
        user = await admin.auth().createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true,
        });
        isNewUser = true;
        console.log(`✓ Created Firebase Auth user: ${userData.email}`);
      }

      // Step 2: Set custom claims for role-based access
      await admin.auth().setCustomUserClaims(user.uid, {
        role: userData.role,
      });
      console.log(`✓ Set role ${userData.role} for ${userData.email}`);

      // Step 3: Create/Update Firestore user document
      const userDoc: any = {
        email: userData.email,
        firebaseUid: user.uid,
        displayName: userData.displayName,
        role: userData.role,
        isActive: true,
        emailVerified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Only set password hash for new users
      if (isNewUser) {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        userDoc.passwordHash = passwordHash;
        userDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
        console.log(`✓ Created Firestore user document with hashed password`);
      } else {
        console.log(`✓ Updated Firestore user document (password unchanged)`);
      }

      await firestore.collection('users').doc(user.uid).set(userDoc, { merge: true });
      console.log(`  UID: ${user.uid}\n`);
    } catch (error) {
      console.error(`✗ Failed to process ${userData.email}:`, error.message);
    }
  }

  console.log('✅ Admin user seeding completed!\n');
  console.log('📝 Default Credentials:');
  console.log('━'.repeat(50));
  adminUsers.forEach((user) => {
    console.log(`\n${user.displayName}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Role: ${user.role}`);
  });
  console.log('\n' + '━'.repeat(50));
}

// Run the seeder
seedAdminUsers()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
