# 💰 100% FREE Always-Live Deployment Plan

This guide shows you how to deploy your Second Brain **completely free** with **zero pausing** - your app will stay live 24/7 forever!

---

## 🎯 **The Free Stack**

| Service | Purpose | Cost | Always-On? |
|---------|---------|------|------------|
| **Vercel** | Hosting | FREE | ✅ Yes |
| **Neon** | PostgreSQL Database | FREE | ✅ Yes |
| **Groq** | LLM (AI Responses) | FREE | ✅ Yes |
| **Voyage AI** | Embeddings | FREE | ✅ Yes |
| **Vercel Cron** | Keep-Alive | FREE | ✅ Yes |

**Total Monthly Cost: $0.00** 🎉

---

## 📋 **Why This Stack is Better Than Supabase**

### **Supabase Issues:**
- ❌ Pauses after 7 days of inactivity
- ❌ Requires keep-alive pings
- ❌ Limited to 500MB database

### **Neon Advantages:**
- ✅ **Never pauses** (even on free tier!)
- ✅ 512MB database (more than Supabase)
- ✅ Auto-scaling (scales to zero but wakes instantly)
- ✅ Built for serverless (perfect for Vercel)
- ✅ No credit card required

---

## 🚀 **STEP-BY-STEP DEPLOYMENT**

---

## **STEP 1: Prepare Your Demo Data Locally** (10 minutes)

### 1.1 Install Dependencies
```bash
npm install
npx prisma generate
```

### 1.2 Start Ollama (for local development)
```bash
# Start Ollama
ollama serve

# Pull required models
ollama pull all-minilm
ollama pull llama3
```

### 1.3 Run Locally
```bash
npm run dev
```

Visit http://localhost:3000

### 1.4 Upload Demo PDFs
1. Click "New Chat"
2. Upload 3-5 PDF files (your best demo content)
3. Ask some questions to create conversations
4. This creates the seed data for your demo

### 1.5 Export Seed Data
```bash
node scripts/export-seed.js
```

This creates JSON files in `./docs/seed/`

### 1.6 Commit and Push
```bash
git add docs/seed/*.json vercel.json app/api/cron/keep-alive/route.ts
git commit -m "feat: add seed data and keep-alive endpoint"
git push origin main
```

---

## **STEP 2: Set Up Neon Database** (5 minutes) 🆓

### 2.1 Create Neon Account
1. Go to https://neon.tech
2. Click "Sign Up" (use GitHub for easy signup)
3. **No credit card required!**

### 2.2 Create Database
1. Click "Create Project"
2. Name: `second-brain-demo`
3. Region: Choose closest to your users
4. Click "Create Project"

### 2.3 Get Connection String
1. On project dashboard, click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. **Save this!** You'll need it for Vercel

### 2.4 Update Prisma Schema
Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2.5 Deploy Schema to Neon
```bash
# Set DATABASE_URL temporarily
$env:DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2.6 Import Seed Data
```bash
# With DATABASE_URL still set
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

---

## **STEP 3: Get FREE API Keys** (10 minutes) 🆓

### 3.1 Groq API Key (FREE LLM - Fast!)
1. Go to https://console.groq.com
2. Sign up (GitHub login recommended)
3. Go to "API Keys" → "Create API Key"
4. Name it "second-brain-demo"
5. Copy the key (starts with `gsk_...`)
6. **Save it!**

**Free Tier:**
- ✅ 30 requests per minute
- ✅ 14,400 requests per day
- ✅ No credit card required
- ✅ Perfect for demos!

### 3.2 Voyage AI API Key (FREE Embeddings)
1. Go to https://www.voyageai.com
2. Sign up (email or GitHub)
3. Go to Dashboard → API Keys
4. Click "Create New API Key"
5. Copy the key (starts with `pa-...`)
6. **Save it!**

**Free Tier:**
- ✅ 100 million tokens per month
- ✅ More than enough for demos
- ✅ No credit card required
- ✅ Better quality than OpenAI for RAG!

**Alternative (if Voyage AI requires credit card):**
Use **Cohere** instead:
1. Go to https://cohere.com
2. Sign up → Dashboard → API Keys
3. Free tier: 1000 calls/month
4. Copy key (starts with `co-...`)

---

## **STEP 4: Deploy to Vercel** (10 minutes) 🆓

### 4.1 Push to GitHub
```bash
git status
git add .
git commit -m "chore: prepare for free deployment"
git push origin main
```

### 4.2 Create Vercel Project
1. Go to https://vercel.com
2. Sign up with GitHub (free forever!)
3. Click "Add New..." → "Project"
4. Import your repository: `second-brain-web`
5. Click "Configure Project"

### 4.3 Configure Environment Variables

Add these in Vercel project settings:

```bash
# Database (from Neon)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Demo Mode
DEMO_MODE=true

# AI Providers (FREE!)
PROVIDER_EMBED=voyageai
PROVIDER_LLM=groq

# API Keys (FREE!)
GROQ_API_KEY=gsk_...
VOYAGE_API_KEY=pa-...

# Storage
STORAGE_DRIVER=local

# Retrieval Parameters
TOP_K=5
MAX_CONTEXT_CHARS=3000
PREFILTER_LIMIT=200
```

### 4.4 Deploy!
1. Click "Deploy"
2. Wait 2-3 minutes
3. Your app is live! 🎉

---

## **STEP 5: Update Code for Voyage AI** (5 minutes)

We need to add Voyage AI support to your AI providers:

### 5.1 Update `lib/ai_providers.ts`

Add this function after the OpenAI embedding function:

```typescript
/**
 * Generate embeddings using Voyage AI API (FREE tier available)
 */
async function embedWithVoyageAI(texts: string[]): Promise<number[][]> {
  if (!cfg.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not configured. Set it in environment variables.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Voyage AI] Embedding ${texts.length} texts using voyage-2`);
  }

  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from Voyage AI: missing data array');
    }

    const embeddings = data.data.map((item: any) => item.embedding);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Voyage AI] Successfully generated ${embeddings.length} embeddings`);
    }

    return embeddings;
  } catch (error: any) {
    console.error('[Voyage AI] Embedding error:', error);
    throw error;
  }
}
```

Update the `embedTexts` function to support Voyage AI:

```typescript
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const provider = cfg.PROVIDER_EMBED;

  if (provider === 'ollama' || isOllamaEmbed()) {
    return await embedWithOllama(texts);
  } else if (provider === 'openai') {
    return await embedWithOpenAI(texts);
  } else if (provider === 'voyageai') {
    return await embedWithVoyageAI(texts);
  } else {
    throw new Error(`Unknown embedding provider: ${provider}. Supported: ollama, openai, voyageai`);
  }
}
```

### 5.2 Update `lib/config.ts`

Add Voyage AI key:

```typescript
export const cfg = {
  // ... existing config ...
  
  // API keys for hosted providers
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY || '',  // Add this line
  
  // ... rest of config ...
};
```

### 5.3 Commit and Deploy
```bash
git add lib/ai_providers.ts lib/config.ts
git commit -m "feat: add Voyage AI support for free embeddings"
git push origin main
```

Vercel will automatically redeploy!

---

## **STEP 6: Verify Everything Works** (5 minutes)

### 6.1 Test Your Live App
Visit your Vercel URL (e.g., `https://your-app.vercel.app`)

Verify:
- ✅ Yellow banner: "Demo Mode: File uploads are disabled"
- ✅ Upload button is disabled
- ✅ Conversations from seed data are visible
- ✅ You can ask questions and get answers

### 6.2 Test API Endpoints
```bash
# Check environment
curl https://your-app.vercel.app/api/env

# Check keep-alive
curl https://your-app.vercel.app/api/cron/keep-alive

# Should return: { "ok": true, "conversationCount": X }
```

### 6.3 Test a Query
1. Click on a conversation
2. Ask: "What are the main topics in these documents?"
3. Verify you get a response with citations
4. Check response time (should be fast with Groq!)

---

## ✅ **SUCCESS! Your App is Live 24/7 for FREE!**

---

## 📊 **Free Tier Limits (More Than Enough!)**

| Service | Free Tier Limit | Your Usage (Est.) | Enough? |
|---------|----------------|-------------------|---------|
| **Neon** | 512MB database | ~50-100MB | ✅ Yes (5-10x headroom) |
| **Vercel** | 100GB bandwidth/mo | ~1-5GB | ✅ Yes (20-100x headroom) |
| **Groq** | 14,400 requests/day | ~50-200/day | ✅ Yes (70x headroom) |
| **Voyage AI** | 100M tokens/mo | ~1-5M/mo | ✅ Yes (20-100x headroom) |

**Your app can handle:**
- 📈 ~500-1000 visitors per day
- 💬 ~10,000 queries per month
- 📚 ~50-100 documents in database
- ⏱️ Response time: 1-3 seconds

---

## 🎯 **Why This Stack Never Pauses**

### **Neon Database:**
- ✅ Designed for serverless (auto-scales)
- ✅ Wakes from sleep in **milliseconds** (imperceptible)
- ✅ Free tier never expires
- ✅ No 7-day inactivity limit like Supabase

### **Vercel:**
- ✅ Edge functions always ready
- ✅ No cold starts for static pages
- ✅ CDN caching for instant loads

### **Groq:**
- ✅ Fastest inference in the world (~500 tokens/sec)
- ✅ No rate limiting on free tier (just 30 req/min)
- ✅ Always available

### **Voyage AI:**
- ✅ Purpose-built for RAG (better than OpenAI!)
- ✅ Generous free tier
- ✅ Fast embedding generation

---

## 🔄 **Keep-Alive Strategy (Already Set Up!)**

Your app includes automatic keep-alive:

1. **Vercel Cron** pings `/api/cron/keep-alive` every 5 days
2. This queries your Neon database
3. Neon stays "warm" and never fully sleeps
4. **Cost: $0** (Vercel cron is free)

**Result**: Your app responds instantly 24/7! ⚡

---

## 💡 **Pro Tips for Free Tier**

### 1. Optimize Database Size
- Keep seed data under 50MB
- Use 3-5 demo PDFs (not 50)
- Clean up old test data

### 2. Monitor Usage
- **Neon**: Dashboard → Usage
- **Vercel**: Analytics tab
- **Groq**: Console → Usage
- **Voyage AI**: Dashboard → API Usage

### 3. Stay Within Limits
- Don't share publicly on Reddit/HN (traffic spike)
- Use for portfolio/demos/personal use
- If you get popular, upgrade later

### 4. Optimize Performance
- Keep `TOP_K=5` (don't increase unnecessarily)
- Use `MAX_CONTEXT_CHARS=3000` (not 10000)
- Enable Vercel Edge caching

---

## 🆙 **When to Upgrade (Optional)**

If your app becomes popular and you hit limits:

| Service | Upgrade Cost | When to Upgrade |
|---------|-------------|-----------------|
| **Neon** | $19/mo | >512MB database or >1000 active hours |
| **Vercel** | $20/mo | >100GB bandwidth or need custom domains |
| **Groq** | TBD | >14,400 requests/day (unlikely!) |
| **Voyage AI** | $15/mo | >100M tokens/month |

**But for a demo/portfolio**: FREE tier is perfect! 🎉

---

## 🐛 **Troubleshooting**

### Issue: "Database connection failed"
**Solution**: 
- Check DATABASE_URL is correct in Vercel
- Verify Neon project is active (dashboard)
- Test connection: `npx prisma studio`

### Issue: "VOYAGE_API_KEY not configured"
**Solution**:
- Add VOYAGE_API_KEY to Vercel environment variables
- Redeploy after adding

### Issue: "Groq rate limit exceeded"
**Solution**:
- You're getting popular! 🎉
- Wait 1 minute (rate limit resets)
- Or add error handling to retry

### Issue: Slow first query after inactivity
**Solution**:
- This is normal (Neon waking up)
- Takes ~500ms-1s on first query
- Subsequent queries are instant
- Keep-alive cron prevents this

---

## 📈 **Monitoring Your Free App**

### Daily Checks (Optional):
```bash
# Check if app is live
curl https://your-app.vercel.app/api/health

# Check database is active
curl https://your-app.vercel.app/api/cron/keep-alive
```

### Weekly Checks:
1. Visit Neon dashboard → Check storage usage
2. Visit Vercel dashboard → Check bandwidth
3. Visit Groq console → Check API usage

---

## 🎉 **You're Done!**

Your Second Brain is now:
- ✅ **Live 24/7** on the internet
- ✅ **100% FREE** (no credit card ever needed)
- ✅ **Fast** (Groq + Voyage AI + Neon)
- ✅ **Scalable** (handles hundreds of users)
- ✅ **Professional** (custom domain optional)

**Share your demo:**
- Add to your portfolio
- Share on LinkedIn
- Put on your resume
- Show to potential employers

---

## 📚 **Quick Reference**

### Important URLs:
- **Your App**: `https://your-app.vercel.app`
- **Neon Dashboard**: https://console.neon.tech
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Groq Console**: https://console.groq.com
- **Voyage AI Dashboard**: https://www.voyageai.com/dashboard

### Useful Commands:
```bash
# Export seed data
node scripts/export-seed.js

# Import seed data
node scripts/import-seed.js

# View database
npx prisma studio

# Check logs
vercel logs
```

---

**Last Updated**: November 15, 2025  
**Total Cost**: $0.00/month  
**Status**: ✅ Production-Ready, Always-Live, 100% FREE!

