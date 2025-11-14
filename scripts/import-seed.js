/**
 * Import seed data from JSON files into Postgres (Supabase) database
 * Run: node scripts/import-seed.js
 * 
 * Prerequisites:
 * 1. Set DATABASE_URL to point to your Postgres database
 * 2. Run: npx prisma migrate deploy
 * 3. Run: npx prisma generate
 * 4. Ensure seed files exist in ./docs/seed/
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importSeed() {
  console.log('🌱 Starting seed import...\n');

  const seedDir = path.join(process.cwd(), 'docs', 'seed');

  // Check if seed directory exists
  if (!fs.existsSync(seedDir)) {
    console.error(`❌ Seed directory not found: ${seedDir}`);
    console.error('Run "node scripts/export-seed.js" first to generate seed files.');
    process.exit(1);
  }

  try {
    // Import in dependency order to avoid foreign key violations

    // 1. Import Conversations (no dependencies)
    console.log('📦 Importing Conversations...');
    const conversationsPath = path.join(seedDir, 'conversations.json');
    if (fs.existsSync(conversationsPath)) {
      const conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf-8'));
      if (conversations.length > 0) {
        // Convert date strings back to Date objects
        const conversationsData = conversations.map(c => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }));
        
        const result = await prisma.conversation.createMany({
          data: conversationsData,
          skipDuplicates: true,
        });
        console.log(`   ✓ Imported ${result.count} conversations\n`);
      } else {
        console.log('   ⚠ No conversations to import\n');
      }
    } else {
      console.log('   ⚠ conversations.json not found, skipping\n');
    }

    // 2. Import Documents (depends on Conversations)
    console.log('📦 Importing Documents...');
    const documentsPath = path.join(seedDir, 'documents.json');
    if (fs.existsSync(documentsPath)) {
      const documents = JSON.parse(fs.readFileSync(documentsPath, 'utf-8'));
      if (documents.length > 0) {
        const documentsData = documents.map(d => ({
          ...d,
          createdAt: new Date(d.createdAt),
        }));
        
        const result = await prisma.document.createMany({
          data: documentsData,
          skipDuplicates: true,
        });
        console.log(`   ✓ Imported ${result.count} documents\n`);
      } else {
        console.log('   ⚠ No documents to import\n');
      }
    } else {
      console.log('   ⚠ documents.json not found, skipping\n');
    }

    // 3. Import Chunks (depends on Documents)
    console.log('📦 Importing Chunks...');
    const chunksPath = path.join(seedDir, 'chunks.json');
    if (fs.existsSync(chunksPath)) {
      const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
      if (chunks.length > 0) {
        const chunksData = chunks.map(c => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }));
        
        const result = await prisma.chunk.createMany({
          data: chunksData,
          skipDuplicates: true,
        });
        console.log(`   ✓ Imported ${result.count} chunks\n`);
      } else {
        console.log('   ⚠ No chunks to import\n');
      }
    } else {
      console.log('   ⚠ chunks.json not found, skipping\n');
    }

    // 4. Import Embeddings (depends on Chunks)
    console.log('📦 Importing Embeddings...');
    const embeddingsPath = path.join(seedDir, 'embeddings.json');
    if (fs.existsSync(embeddingsPath)) {
      const embeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));
      if (embeddings.length > 0) {
        const embeddingsData = embeddings.map(e => ({
          ...e,
          createdAt: new Date(e.createdAt),
        }));
        
        const result = await prisma.embedding.createMany({
          data: embeddingsData,
          skipDuplicates: true,
        });
        console.log(`   ✓ Imported ${result.count} embeddings\n`);
      } else {
        console.log('   ⚠ No embeddings to import\n');
      }
    } else {
      console.log('   ⚠ embeddings.json not found, skipping\n');
    }

    // 5. Import Messages (depends on Conversations)
    console.log('📦 Importing Messages...');
    const messagesPath = path.join(seedDir, 'messages.json');
    if (fs.existsSync(messagesPath)) {
      const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
      if (messages.length > 0) {
        const messagesData = messages.map(m => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
        
        const result = await prisma.message.createMany({
          data: messagesData,
          skipDuplicates: true,
        });
        console.log(`   ✓ Imported ${result.count} messages\n`);
      } else {
        console.log('   ⚠ No messages to import\n');
      }
    } else {
      console.log('   ⚠ messages.json not found, skipping\n');
    }

    // 6. Import MessageSources (depends on Messages)
    console.log('📦 Importing MessageSources...');
    const messageSourcesPath = path.join(seedDir, 'message_sources.json');
    if (fs.existsSync(messageSourcesPath)) {
      const messageSources = JSON.parse(fs.readFileSync(messageSourcesPath, 'utf-8'));
      if (messageSources.length > 0) {
        const result = await prisma.messageSource.createMany({
          data: messageSources,
          skipDuplicates: true,
        });
        console.log(`   ✓ Imported ${result.count} message sources\n`);
      } else {
        console.log('   ⚠ No message sources to import\n');
      }
    } else {
      console.log('   ⚠ message_sources.json not found, skipping\n');
    }

    console.log('✅ Seed import completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Prisma Studio: npx prisma studio');
    console.log('2. Deploy to Vercel with DEMO_MODE=true');
    console.log('3. Set PROVIDER_LLM and PROVIDER_EMBED to hosted providers (openai/groq)');

  } catch (error) {
    console.error('❌ Error during import:', error);
    console.error('\nTroubleshooting:');
    console.error('- Ensure DATABASE_URL points to Postgres');
    console.error('- Run: npx prisma migrate deploy');
    console.error('- Check for foreign key violations');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importSeed();

