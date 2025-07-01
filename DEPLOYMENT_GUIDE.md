# GitHub Pages Deployment Guide

This guide will help you deploy your AI Chat App as an MVP on GitHub Pages.

## 🎯 MVP Strategy

For the MVP deployment, we're deploying **frontend-only** to GitHub Pages since it only supports static sites. The backend will need to be deployed separately for full functionality.

## 📋 Pre-Deployment Checklist

### ✅ Essential MVP Items from Production Checklist

- [x] **Production Build:** Vite configured for optimized builds
- [x] **Environment Configs:** Environment variables properly set up
- [x] **Static Assets:** All assets will be optimized during build
- [x] **Documentation:** README updated with deployment instructions
- [x] **Version Control:** Git repository ready for GitHub Pages

### ⚠️ MVP Limitations

- **Backend Required:** Chat functionality needs a deployed backend
- **Environment Variables:** Must be set during build (no runtime config)
- **HTTPS Only:** GitHub Pages only serves over HTTPS

## 🚀 Step-by-Step Deployment

### Step 1: Repository Setup

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository settings
   - Scroll to "Pages" section
   - Set Source to "GitHub Actions"

### Step 2: Configure Environment Variables

1. **For development, create `.env`:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` with your values:**
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_DEFAULT_MODEL=gemini-pro
   VITE_ENABLE_HISTORY=true
   VITE_ENABLE_MODEL_SELECTION=false
   ```

3. **For production, set environment variables in GitHub Actions:**
   - Go to Repository Settings → Secrets and Variables → Actions
   - Add these secrets:
     - `VITE_API_URL`: Your deployed backend URL
     - `VITE_DEFAULT_MODEL`: Your preferred AI model
     - `VITE_ENABLE_HISTORY`: true
     - `VITE_ENABLE_MODEL_SELECTION`: false

### Step 3: Install Dependencies

```bash
# Install the new gh-pages dependency
npm install
```

### Step 4: Test Build Locally

```bash
# Test the production build
npm run build:prod

# Preview the built app
npm run preview
```

### Step 5: Deploy

**Option A: Automatic Deployment (Recommended)**
- Just push to main branch:
  ```bash
  git push origin main
  ```
- GitHub Actions will automatically build and deploy

**Option B: Manual Deployment**
```bash
# Build and deploy manually
npm run deploy
```

### Step 6: Access Your App

Your app will be available at:
```
https://YOUR_USERNAME.github.io/ai-chat-app/
```

## 🔧 Configuration Details

### Vite Configuration
The `vite.config.js` has been configured with:
- **Base path:** `/ai-chat-app/` for GitHub Pages
- **Production optimizations:** Minification, no source maps
- **Build output:** `dist` directory

### GitHub Actions Workflow
The `.github/workflows/deploy.yml` workflow:
- Triggers on push to main branch
- Runs tests before deployment
- Builds the app with production optimizations
- Deploys to GitHub Pages automatically

## 🐛 Troubleshooting

### Common Issues

1. **404 on GitHub Pages:**
   - Check that base path in `vite.config.js` matches your repo name
   - Ensure GitHub Pages is enabled and source is set to "GitHub Actions"

2. **Environment variables not working:**
   - Make sure they start with `VITE_`
   - Check that they're set in GitHub repository secrets

3. **Build failing:**
   - Check the Actions tab for error logs
   - Ensure all dependencies are in `package.json`

4. **App not working (API errors):**
   - This is expected for MVP - you need to deploy the backend separately
   - The frontend will show connection errors until backend is available

### Debug Commands

```bash
# Check build output
npm run build && ls -la dist/

# Test production build locally
npm run preview

# Check for linting errors
npm run lint
```

## 🎯 Next Steps After MVP

1. **Deploy Backend:**
   - Use Heroku, Railway, or AWS
   - Update `VITE_API_URL` to point to deployed backend

2. **Custom Domain (Optional):**
   - Add CNAME file to public directory
   - Configure DNS settings

3. **Enhanced Features:**
   - Add error boundaries
   - Implement offline functionality
   - Add PWA features

## 📊 MVP Success Metrics

Once deployed, you can track:
- GitHub Pages analytics
- User feedback on functionality
- Performance metrics via browser dev tools

---

**Need Help?** Check the main README.md for additional configuration options and troubleshooting tips. 