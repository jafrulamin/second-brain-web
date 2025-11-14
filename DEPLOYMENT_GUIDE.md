# 🚀 Demo Deployment Guide

This guide provides step-by-step instructions for deploying your Second Brain as a read-only web demo.

## ✅ What Was Implemented

### Core Features
- ✅ **Demo Mode**: Read-only mode that disables file uploads in production
- ✅ **Provider Abstraction**: Support for multiple AI providers (Ollama, OpenAI, Groq)
- ✅ **Storage Abstraction**: Flexible storage layer (local filesystem + Vercel Blob placeholder)
- ✅ **Seed Export/Import**: Scripts to migrate data from SQLite to Postgres
- ✅ **Client-Side Detection**: UI automatically detects and adapts to demo mode

### Files Created
1. `lib/config.ts` - Centralized configuration management
2. `lib/storage.ts` - Storage abstraction layer
3. `lib/ai_providers.ts` - AI provider wrappers (embeddings + generation)
4. `app/api/env/route.ts` - Environment config endpoint
5. `scripts/export-seed.js` - Export seed data from SQLite
6. `scripts/import-seed.js` - Import seed data to Postgres
7. `.env.example` - Complete environment variable template
8. `docs/seed/README.md` - Seed data documentation
9. `DEPLOYMENT_GUIDE.md` - This file

### Files Modified
1. `lib/ingest.ts` - Uses new provider abstractions
2. `app/api/upload/route.ts` - Guards against uploads in demo mode
3. `components/chat/InputBar.tsx` - Detects demo mode and disables uploads
4. `README.md` - Added comprehensive Cloud Demo Mode section

## 📋 Prerequisites

- Node.js 20+
- Local Ollama installation (for development)
- Supabase account (free tier)
- Vercel account (free tier)
- OpenAI or Groq API key (for production)

## 🔧 Local Setup & Testing

### 1. Install Dependencies

```bash
npm ci
npx prisma generate
```

### 2. Set Up Local Environment

Create `.env.local`:

```bash
DATABASE_URL=file:./prisma/data/app.db
DEMO_MODE=false
PROVIDER_EMBED=ollama
PROVIDER_LLM=ollama
OLLAMA_BASE=http://localhost:11434
OLLAMA_EMBED_MODEL=all-minilm
OLLAMA_LLM_MODEL=llama3
```

### 3. Start Ollama & Pull Models

```bash
ollama serve
ollama pull all-minilm
ollama pull llama3
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and verify:
- ✅ Upload works (demo mode is OFF)
- ✅ `/api/env` returns `{ demo: false }`
- ✅ No yellow banner appears

### 5. Test Demo Mode Locally

Update `.env.local`:

```bash
DEMO_MODE=true
```

Restart server and verify:
- ✅ Upload button is disabled
- ✅ Yellow banner appears: "Demo Mode: File uploads are disabled"
- ✅ `/api/upload` returns 403
- ✅ Queries still work

## 📦 Prepare Seed Data

### 1. Populate Local Database

With `DEMO_MODE=false`, upload your demo PDFs and create conversations.

### 2. Export Seed Data

```bash
node scripts/export-seed.js
```

This creates JSON files in `./docs/seed/`:
- `conversations.json`
- `documents.json`
- `chunks.json`
- `embeddings.json`
- `messages.json`
- `message_sources.json`

**Note**: PDF files themselves are NOT exported, only metadata and embeddings.

## 🗄️ Set Up Supabase

### 1. Create Project

1. Go to https://supabase.com
2. Create a new project (free tier)
3. Wait for provisioning (~2 minutes)

### 2. Get Connection String

1. Go to Settings → Database
2. Copy the connection string (Connection pooling → Transaction mode)
3. Replace `[YOUR-PASSWORD]` with your database password

### 3. Update Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 4. Deploy Schema

Set `DATABASE_URL` in `.env.local`:

```bash
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Deploy migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Import Seed Data

```bash
node scripts/import-seed.js
```

Verify in Prisma Studio:

```bash
npx prisma studio
```

## 🌐 Deploy to Vercel

### 1. Push to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/second-brain-web.git
git push -u origin web-demo
```

### 2. Create Vercel Project

1. Go to https://vercel.com
2. Import your GitHub repository
3. Select the `web-demo` branch

### 3. Configure Environment Variables

Add these in Vercel → Settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Demo Mode
DEMO_MODE=true

# AI Providers
PROVIDER_EMBED=openai
PROVIDER_LLM=groq

# API Keys
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...

# Storage
STORAGE_DRIVER=local

# Retrieval (optional)
TOP_K=5
MAX_CONTEXT_CHARS=3000
PREFILTER_LIMIT=200
```

### 4. Deploy

Click "Deploy" and wait for build to complete.

### 5. Verify Production

Visit your Vercel URL and check:
- ✅ Yellow demo banner appears
- ✅ Upload button is disabled
- ✅ Conversations and documents are visible
- ✅ Queries work with Groq/OpenAI
- ✅ `/api/env` returns `{ demo: true }`

## 🔑 Getting API Keys

### OpenAI (Embeddings)

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Cost: ~$0.0001 per 1K tokens (very cheap for embeddings)

### Groq (LLM)

1. Go to https://console.groq.com/keys
2. Create a new API key
3. Free tier: 30 requests/minute (generous for demos)

## 💰 Cost Estimate

**Free Tier Deployment:**
- Supabase: Free (500 MB database)
- Vercel: Free (Hobby plan)
- Groq: Free tier (30 req/min)
- OpenAI: Pay-as-you-go (~$0.01-0.10/day for light usage)

**Total monthly cost**: ~$3-10 for moderate demo usage

## 🔄 Switching to Production Mode

To enable uploads in production:

1. Set `DEMO_MODE=false` in Vercel
2. Configure Vercel Blob storage:
   - Go to Vercel → Storage → Create Blob Store
   - Copy the `BLOB_READ_WRITE_TOKEN`
   - Set `STORAGE_DRIVER=vercel-blob`
   - Set `VERCEL_BLOB_READ_WRITE_TOKEN=...`
3. Redeploy

## 🐛 Troubleshooting

### Seed Import Fails

**Error**: `Foreign key constraint failed`

**Solution**:
- Ensure `DATABASE_URL` points to Postgres, not SQLite
- Run `npx prisma migrate deploy` first
- Check import order in `scripts/import-seed.js`

### Queries Don't Work in Production

**Error**: `Failed to generate embeddings`

**Solution**:
- Verify `OPENAI_API_KEY` is set in Vercel
- Check API key is valid and has credits
- View Vercel function logs for detailed errors

### Prisma Schema Mismatch

**Error**: `Invalid provider: sqlite`

**Solution**:
- Change `provider` to `postgresql` in `prisma/schema.prisma`
- Run `npx prisma generate`
- Delete `node_modules/.prisma` if needed

### Upload Still Works in Demo Mode

**Solution**:
- Verify `DEMO_MODE=true` in Vercel environment variables
- Check `/api/env` returns `{ demo: true }`
- Clear browser cache and hard refresh

## 📊 Monitoring

### Vercel Logs

View real-time logs:
```bash
vercel logs [deployment-url]
```

### Supabase Metrics

Check database usage:
- Supabase Dashboard → Database → Usage

### API Usage

Monitor API costs:
- OpenAI: https://platform.openai.com/usage
- Groq: https://console.groq.com/usage

## 🎯 Next Steps

1. ✅ Test demo deployment end-to-end
2. ✅ Monitor API usage and costs
3. ⏭️ Add custom domain (optional)
4. ⏭️ Set up analytics (Vercel Analytics)
5. ⏭️ Add more demo documents
6. ⏭️ Implement Vercel Blob storage for production uploads

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Groq API Documentation](https://console.groq.com/docs)

## 🆘 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test locally with same config
4. Check API provider status pages
5. Review Prisma schema compatibility

---

**Deployment Status**: ✅ Ready for production demo

**Last Updated**: November 14, 2025

**Commit**: a55b639 (web-demo branch)

