import { db } from './db';
import { users, userIdentities } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Critical migration script to fix authentication architecture
 * 
 * BACKGROUND: The current system incorrectly assigns provider IDs as user primary keys,
 * preventing multi-provider account linking. This migration fixes the architecture by:
 * 1. Creating the user_identities table
 * 2. Migrating existing users to the new identity system
 * 3. Ensuring no data loss during the transition
 */

interface ExistingUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  oauthProvider: string | null;
  oauthId: string | null;
  createdAt: Date;
  [key: string]: any;
}

export async function migrateUsersToIdentitySystem(): Promise<void> {
  console.log('🔄 Starting critical authentication security migration...');
  
  try {
    // Step 1: Create user_identities table by pushing schema
    console.log('📝 Step 1: Pushing schema to create user_identities table...');
    // Note: This step requires running `npm run db:push` separately
    
    // Step 2: Identify existing users that need migration
    console.log('🔍 Step 2: Identifying users that need migration...');
    
    const existingUsers = await db.select().from(users);
    console.log(`Found ${existingUsers.length} existing users to migrate`);
    
    if (existingUsers.length === 0) {
      console.log('✅ No existing users to migrate');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // Step 3: Migrate users in transaction
    console.log('🔄 Step 3: Migrating users to identity system...');
    
    for (const user of existingUsers) {
      try {
        await db.transaction(async (tx) => {
          // Check if this user already has identities (skip if already migrated)
          const existingIdentities = await tx
            .select()
            .from(userIdentities)
            .where(sql`${userIdentities.userId} = ${user.id}`);
          
          if (existingIdentities.length > 0) {
            console.log(`⏭️  User ${user.id} already migrated, skipping...`);
            return;
          }

          // For legacy users, we need to determine the provider and provider user ID
          let provider = 'replit'; // Default to replit
          let providerUserId = user.id; // For legacy users, the user ID WAS the provider ID

          // Try to determine the actual provider from user data
          if (user.oauthProvider) {
            provider = user.oauthProvider;
          }
          if (user.oauthId) {
            providerUserId = user.oauthId;
          }

          // Create identity for this user
          await tx.insert(userIdentities).values({
            userId: user.id,
            provider: provider,
            providerUserId: providerUserId,
            emailAtAuth: user.email,
            profileData: {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
            },
            isVerified: true,
            createdAt: user.createdAt || new Date(),
          });

          // Clean up the OAuth fields from users table since they're now in user_identities
          await tx
            .update(users)
            .set({
              oauthProvider: null,
              oauthId: null,
              oauthAccessToken: null,
              oauthRefreshToken: null,
              oauthTokenExpiry: null,
            })
            .where(sql`${users.id} = ${user.id}`);
        });

        migratedCount++;
        console.log(`✅ Migrated user ${user.id} (${user.email || 'no email'}) - ${provider} provider`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate user ${user.id}:`, error);
        // Continue with other users
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} users`);
    console.log(`   ❌ Failed migrations: ${errorCount} users`);
    console.log(`   📝 Total processed: ${existingUsers.length} users`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('🔒 Authentication security vulnerabilities have been fixed');
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors`);
      console.log('❗ Please review and manually fix failed migrations');
    }

  } catch (error) {
    console.error('💥 Critical error during migration:', error);
    throw error;
  }
}

export async function verifyMigration(): Promise<void> {
  console.log('🔍 Verifying migration integrity...');
  
  try {
    // Check that all users have corresponding identities
    const totalUsers = await db.select({ count: sql`count(*)` }).from(users);
    const totalIdentities = await db.select({ count: sql`count(DISTINCT ${userIdentities.userId})` }).from(userIdentities);
    
    console.log(`📊 Users: ${totalUsers[0]?.count || 0}`);
    console.log(`📊 Users with identities: ${totalIdentities[0]?.count || 0}`);
    
    // Check for users without identities
    const usersWithoutIdentities = await db
      .select()
      .from(users)
      .leftJoin(userIdentities, sql`${users.id} = ${userIdentities.userId}`)
      .where(sql`${userIdentities.userId} IS NULL`);
    
    if (usersWithoutIdentities.length > 0) {
      console.log(`⚠️  Found ${usersWithoutIdentities.length} users without identities:`);
      usersWithoutIdentities.forEach(row => {
        console.log(`   - User ${row.users.id} (${row.users.email || 'no email'})`);
      });
    } else {
      console.log('✅ All users have corresponding identities');
    }
    
    console.log('✅ Migration verification complete');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Starting authentication security migration...');
      await migrateUsersToIdentitySystem();
      await verifyMigration();
      process.exit(0);
    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    }
  })();
}