# Seed Data for Demo Deployment

This directory contains JSON seed files exported from your local SQLite database for importing into a production Postgres database (e.g., Supabase).

## Files

- `conversations.json` - Conversation records
- `documents.json` - Document metadata (PDF files)
- `chunks.json` - Text chunks extracted from documents
- `embeddings.json` - Vector embeddings for semantic search
- `messages.json` - Chat messages
- `message_sources.json` - Citations linking messages to document chunks

## Generating Seed Data

To export your current local database to seed files:

```bash
node scripts/export-seed.js
```

This will create/update all JSON files in this directory.

## Importing to Production

After setting up your Postgres database (Supabase):

1. Set `DATABASE_URL` to your Postgres connection string
2. Deploy schema: `npx prisma migrate deploy`
3. Import seed data: `node scripts/import-seed.js`

## Notes

- **PDF files are NOT included** - only metadata and embeddings
- If you want to include PDFs in production:
  - Copy files from `./uploads/` to your production storage
  - Or configure `STORAGE_DRIVER=vercel-blob` and re-upload
- Seed files use `skipDuplicates: true` to avoid errors on re-import
- Import order matters (conversations → documents → chunks → embeddings → messages → message sources)

## Security

⚠️ **Do not commit sensitive data** to this directory if your repo is public. The seed data may contain:
- Document content/text
- Chat messages
- File metadata

Consider:
- Using a private repo for demo deployments
- Sanitizing data before export
- Using sample/demo documents only

