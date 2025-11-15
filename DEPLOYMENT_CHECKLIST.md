# 🚀 Web Deployment Checklist

Follow these steps to deploy your Second Brain to the web (Vercel + Supabase).

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### Local Setup (Already Done ✓)
- [x] Repository cleaned and optimized
- [x] Demo mode implemented
- [x] Provider abstractions added
- [x] Seed export/import scripts created
- [x] `.env.local` created
- [x] `.env.example` created

---

## 📦 **STEP 1: Prepare Demo Data Locally**

### 1.1 Ensure Ollama is Running
```bash
# Start Ollama
ollama serve

# Verify models are installed
ollama list
```

If models are missing:
```bash
ollama pull all-minilm
ollama pull llama3
```

### 1.2 Run Local Development Server
```bash
npm install
npx prisma generate
npm run dev
```

Visit http://localhost:3000

### 1.3 Upload Your Demo PDFs
- Click "New Chat"
- Upload 3-5 PDF files (your best demo content)
- Ask some questions to create conversations
- This creates the seed data for your demo

### 1.4 Export Seed Data
```bash
node scripts/export-seed.js
```

This creates JSON files in `./docs/seed/`:
- ✓ `conversations.json`
- ✓ `documents.json`
- ✓ `chunks.json`
- ✓ `embeddings.json`
- ✓ `messages.json`
- ✓ `message_sources.json`

**⚠️ Important**: Commit these seed files to your repository!
```bash
git add docs/seed/*.json
git commit -m "feat: add seed data for demo deployment"
git push origin main
```

---

## 🗄️ **STEP 2: Set Up Supabase (PostgreSQL Database)**

### 2.1 Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Choose a name (e.g., "second-brain-demo")
4. Set a strong database password (save it!)
5. Choose a region close to your users
6. Wait ~2 minutes for provisioning

### 2.2 Get Database Connection String
1. Go to **Settings** → **Database**
2. Scroll to **Connection String**
3. Select **Connection pooling** → **Transaction mode**
4. Copy the connection string (looks like):
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
5. Replace `[PASSWORD]` with your database password

### 2.3 Update Prisma Schema for PostgreSQL
Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2.4 Deploy Schema to Supabase
```bash
# Set DATABASE_URL temporarily (or add to .env.local)
$env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@..."

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2.5 Import Seed Data
```bash
# With DATABASE_URL still set to Supabase
node scripts/import-seed.js
```

Expected output:
```
✓ Imported X conversations
✓ Imported X documents
✓ Imported X chunks
✓ Imported X embeddings
✓ Imported X messages
✓ Imported X message sources
```

### 2.6 Verify Data in Prisma Studio
```bash
npx prisma studio
```
- Check that all tables have data
- Verify conversations, documents, and embeddings are present

---

## 🔑 **STEP 3: Get API Keys**

### 3.1 OpenAI API Key (for Embeddings)
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "second-brain-demo"
4. Copy the key (starts with `sk-proj-...`)
5. **Save it securely** (you won't see it again!)

**Cost**: ~$0.0001 per 1K tokens (very cheap for embeddings)

### 3.2 Groq API Key (for LLM - Fast & Free!)
1. Go to https://console.groq.com/keys
2. Click "Create API Key"
3. Name it "second-brain-demo"
4. Copy the key (starts with `gsk_...`)
5. **Save it securely**

**Cost**: FREE tier with 30 requests/minute (perfect for demos!)

---

## 🌐 **STEP 4: Deploy to Vercel**

### 4.1 Push to GitHub
```bash
# Make sure all changes are committed
git status
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

### 4.2 Create Vercel Project
1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `second-brain-web`
4. **Don't deploy yet!** Click "Configure Project"

### 4.3 Configure Environment Variables
In Vercel project settings, add these environment variables:

#### Required Variables:
```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Demo Mode (IMPORTANT!)
DEMO_MODE=true

# AI Providers
PROVIDER_EMBED=openai
PROVIDER_LLM=groq

# API Keys
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...

# Storage
STORAGE_DRIVER=local

# Retrieval Parameters (optional)
TOP_K=5
MAX_CONTEXT_CHARS=3000
PREFILTER_LIMIT=200
```

### 4.4 Deploy!
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Click on the deployment URL when ready

---

## ✅ **STEP 5: Verify Production Deployment**

### 5.1 Check Demo Mode
Visit your Vercel URL and verify:
- ✅ Yellow banner appears: "Demo Mode: File uploads are disabled"
- ✅ Upload button is disabled
- ✅ You can see conversations from seed data
- ✅ Queries work and return answers

### 5.2 Test API Endpoints
```bash
# Check environment (should return demo: true)
curl https://your-app.vercel.app/api/env

# Check health
curl https://your-app.vercel.app/api/health

# Try upload (should return 403)
curl -X POST https://your-app.vercel.app/api/upload
```

### 5.3 Test Queries
- Click on a conversation
- Ask a question
- Verify you get a response with citations
- Check that sources are displayed

---

## 🎯 **STEP 6: Optional Enhancements**

### 6.1 Add Custom Domain
1. In Vercel: Settings → Domains
2. Add your domain (e.g., `secondbrain.yourdomain.com`)
3. Follow DNS configuration instructions

### 6.2 Enable Analytics
1. In Vercel: Analytics tab
2. Enable Vercel Analytics (free)
3. Monitor traffic and performance

### 6.3 Set Up Monitoring
1. In Supabase: Database → Usage
2. Monitor database size and queries
3. Set up alerts for quota limits

---

## 🐛 **TROUBLESHOOTING**

### Issue: Build Fails on Vercel
**Solution**: Check build logs for errors
- Missing environment variables?
- Prisma schema issues?
- TypeScript errors?

### Issue: Database Connection Fails
**Solution**: 
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure password is correct (no special characters causing issues)

### Issue: Queries Don't Work
**Solution**:
- Check `OPENAI_API_KEY` and `GROQ_API_KEY` are set
- Verify API keys are valid
- Check Vercel function logs for errors

### Issue: No Conversations Visible
**Solution**:
- Verify seed data was imported successfully
- Check Prisma Studio to confirm data exists
- Ensure `DATABASE_URL` points to correct database

### Issue: Upload Still Works (Demo Mode Not Active)
**Solution**:
- Verify `DEMO_MODE=true` in Vercel environment variables
- Redeploy after adding the variable
- Clear browser cache

---

## 📊 **MONITORING & COSTS**

### Expected Monthly Costs (Free Tier):
- **Vercel**: $0 (Hobby plan)
- **Supabase**: $0 (500 MB database)
- **Groq**: $0 (free tier, 30 req/min)
- **OpenAI**: ~$3-10 (pay-as-you-go, depends on usage)

**Total**: ~$3-10/month for moderate demo usage

### Monitoring:
- **Vercel**: Dashboard → Analytics
- **Supabase**: Dashboard → Database → Usage
- **OpenAI**: https://platform.openai.com/usage
- **Groq**: https://console.groq.com/usage

---

## 🎉 **SUCCESS!**

Your Second Brain is now live on the web! 🚀

**Share your demo**:
- Production URL: `https://your-app.vercel.app`
- GitHub Repo: `https://github.com/jafrulamin/second-brain-web`

**Next Steps**:
- Share with friends/portfolio
- Add to your resume/LinkedIn
- Consider enabling uploads (set `DEMO_MODE=false` + configure Vercel Blob)
- Add more demo content and redeploy

---

## 📚 **Quick Reference**

### Useful Commands:
```bash
# Export seed data
node scripts/export-seed.js

# Import seed data
node scripts/import-seed.js

# View database
npx prisma studio

# Deploy schema changes
npx prisma migrate deploy

# Check Vercel logs
vercel logs [deployment-url]
```

### Important URLs:
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- OpenAI Usage: https://platform.openai.com/usage
- Groq Console: https://console.groq.com

---

**Last Updated**: November 15, 2025
**Status**: ✅ Ready for Production Deployment

