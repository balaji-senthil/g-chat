# Backend Deployment Guide

## 🚀 Free Hosting Options

### Option 1: Railway (Recommended)

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **Connect Repository**: 
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `ai-chat-app` repository
   - Choose the `backend` folder as root directory
3. **Environment Variables**: Add these in Railway dashboard:
   ```
   GOOGLE_API_KEY=your_actual_api_key
   SECRET_KEY=your_secret_key
   ALLOWED_ORIGINS=https://balaji-senthil.github.io
   DATABASE_URL=postgresql://...  (Railway provides this)
   ```
4. **Deploy**: Railway auto-deploys when you push to main branch

**Your backend URL will be**: `https://your-app-name.up.railway.app`

### Option 2: Render

1. **Sign up**: Go to [render.com](https://render.com)
2. **New Web Service**: 
   - Connect GitHub repository
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Environment Variables**: Same as Railway
4. **Deploy**: Auto-deploy on git push

### Option 3: Fly.io

1. **Install CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `flyctl auth login`
3. **Launch**: In backend directory, run `flyctl launch`
4. **Deploy**: `flyctl deploy`

## 🔧 After Deployment

### Update Frontend

Once your backend is deployed, update your frontend environment:

1. **Update Frontend `.env`**:
   ```env
   VITE_API_URL=https://your-backend-url.com/api
   ```

2. **Rebuild and redeploy frontend**:
   ```bash
   npm run build
   git add .
   git commit -m "Update API URL to deployed backend"
   git push origin master
   ```

## 🔍 Testing Your Deployed Backend

Visit these URLs to test:
- `https://your-backend-url.com/` - Should return a welcome message
- `https://your-backend-url.com/health` - Health check endpoint
- `https://your-backend-url.com/docs` - FastAPI documentation

## 🛟 Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure `ALLOWED_ORIGINS` includes your frontend URL
2. **Environment Variables**: Ensure all required env vars are set
3. **Database Connection**: Use the database URL provided by your hosting platform
4. **Port Issues**: Use `$PORT` environment variable, not hardcoded ports

### Logs:
- **Railway**: Check logs in Railway dashboard
- **Render**: Check logs in Render dashboard
- **Fly.io**: `flyctl logs`

## 💡 Pro Tips

1. **Database**: Most platforms offer free PostgreSQL databases
2. **Monitoring**: Enable health checks for better uptime
3. **Secrets**: Never commit actual API keys to git
4. **CORS**: Be specific with allowed origins for security

---

**Need help?** Check the platform-specific documentation or ask for assistance! 