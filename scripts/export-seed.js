/**
 * Export seed data from local SQLite database to JSON files
 * Run: node scripts/export-seed.js
 * 
 * This script exports all database tables to ./docs/seed/*.json
 * for later import into a Postgres (Supabase) database.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportSeed() {
  console.log('🌱 Starting seed export...\n');

  // Ensure output directory exists
  const seedDir = path.join(process.cwd(), 'docs', 'seed');
  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir, { recursive: true });
    console.log(`✓ Created directory: ${seedDir}\n`);
  }

  try {
    // Export Conversations
    console.log('📦 Exporting Conversations...');
    const conversations = await prisma.conversation.findMany({
      orderBy: { id: 'asc' },
    });
    fs.writeFileSync(
      path.join(seedDir, 'conversations.json'),
      JSON.stringify(conversations, null, 2)
    );
    console.log(`   ✓ Exported ${conversations.length} conversations\n`);

    // Export Documents
    console.log('📦 Exporting Documents...');
    const documents = await prisma.document.findMany({
      orderBy: { id: 'asc' },
    });
    fs.writeFileSync(
      path.join(seedDir, 'documents.json'),
      JSON.stringify(documents, null, 2)
    );
    console.log(`   ✓ Exported ${documents.length} documents\n`);

    // Export Chunks
    console.log('📦 Exporting Chunks...');
    const chunks = await prisma.chunk.findMany({
      orderBy: { id: 'asc' },
    });
    fs.writeFileSync(
      path.join(seedDir, 'chunks.json'),
      JSON.stringify(chunks, null, 2)
    );
    console.log(`   ✓ Exported ${chunks.length} chunks\n`);

    // Export Embeddings
    console.log('📦 Exporting Embeddings...');
    const embeddings = await prisma.embedding.findMany({
      orderBy: { id: 'asc' },
    });
    fs.writeFileSync(
      path.join(seedDir, 'embeddings.json'),
      JSON.stringify(embeddings, null, 2)
    );
    console.log(`   ✓ Exported ${embeddings.length} embeddings\n`);

    // Export Messages
    console.log('📦 Exporting Messages...');
    const messages = await prisma.message.findMany({
      orderBy: { id: 'asc' },
    });
    fs.writeFileSync(
      path.join(seedDir, 'messages.json'),
      JSON.stringify(messages, null, 2)
    );
    console.log(`   ✓ Exported ${messages.length} messages\n`);

    // Export MessageSources
    console.log('📦 Exporting MessageSources...');
    const messageSources = await prisma.messageSource.findMany({
      orderBy: { id: 'asc' },
    });
    fs.writeFileSync(
      path.join(seedDir, 'message_sources.json'),
      JSON.stringify(messageSources, null, 2)
    );
    console.log(`   ✓ Exported ${messageSources.length} message sources\n`);

    console.log('✅ Seed export completed successfully!');
    console.log(`\nFiles saved to: ${seedDir}`);
    console.log('\nNext steps:');
    console.log('1. Set up your Supabase/Postgres database');
    console.log('2. Set DATABASE_URL in .env.local to point to Postgres');
    console.log('3. Run: npx prisma migrate deploy');
    console.log('4. Run: node scripts/import-seed.js');

  } catch (error) {
    console.error('❌ Error during export:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportSeed();

