# 🚀 IntelliQuest Deployment Guide

## Secure Deployment Configuration

This project uses a template system to ensure sensitive information is not committed to the Git repository.

## 📋 Pre-deployment Requirements

### 1. Environment Requirements
- Google Cloud CLI (`gcloud`) installed and authenticated
- Docker Desktop installed and running
- Valid Firebase project and Google Cloud project

### 2. Get Firebase Configuration
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to "Project Settings" > "General" > "Your apps"
4. Copy Firebase SDK configuration information

### 3. Set Production Environment Variables

#### Create environment configuration file:
```bash
# Copy template file
cp .env.production.template .env.production
```

#### Edit `.env.production` file and replace the following placeholders:
- `YOUR_FIREBASE_API_KEY` → Your Firebase API Key
- `YOUR_PROJECT_ID` → Your Firebase/Google Cloud project ID
- `YOUR_SENDER_ID` → Firebase messaging sender ID
- `YOUR_APP_ID` → Firebase app ID
- `YOUR_MEASUREMENT_ID` → Google Analytics measurement ID

#### Example configuration:
```bash
export NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY_HERE"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
# ... other configurations
```

### 4. Create Deployment Script

```bash
# Copy template file
cp deploy.sh.template deploy.sh
chmod +x deploy.sh
```

## 🚀 Execute Deployment

### 1. Load Environment Variables
```bash
source .env.production
```

### 2. Verify Environment Variables Are Set
```bash
echo $NEXT_PUBLIC_FIREBASE_API_KEY
# Should display your API key
```

### 3. Execute Deployment
```bash
./deploy.sh
```

## 🔐 Security Best Practices

### ❌ Files that should NEVER be committed:
- `.env.production` - Contains real API keys
- `deploy.sh` - If it contains hardcoded sensitive information
- Any files containing API keys, tokens, or passwords

### ✅ Files that are safe to commit:
- `.env.production.template` - Contains only placeholders
- `deploy.sh.template` - Template using environment variables
- `DEPLOYMENT.md` - This documentation

### 📁 File Structure
```
├── .env.production.template    # ✅ Safe template
├── .env.production            # ❌ Local file, not committed
├── deploy.sh.template         # ✅ Safe template
├── deploy.sh                  # ❌ Local file, not committed
├── DEPLOYMENT.md              # ✅ Documentation
└── .gitignore                 # ✅ Ignores sensitive files
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Environment variables not set error**
   ```
   Error: Environment variables not set
   ```
   Solution: Make sure you ran `source .env.production`

2. **Docker permission issues**
   ```
   Error: Docker is not running
   ```
   Solution: Start Docker Desktop

3. **gcloud authentication issues**
   ```
   Error: Unauthenticated request
   ```
   Solution: Run `gcloud auth login` and `gcloud auth configure-docker`

### Verify Deployment Status:
```bash
# Check Cloud Run services
gcloud run services list --region=asia-northeast1

# View deployment logs
gcloud logs read --service=intelliquest-app --region=asia-northeast1

# Test health check
curl https://YOUR_SERVICE_URL/api/health
```

## 📚 Related Documentation

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Configuration Documentation](https://firebase.google.com/docs/web/setup)
- [Docker Deployment Guide](https://docs.docker.com/get-started/)

## 🆘 Getting Help

If you encounter deployment issues, please check:
1. Are all environment variables correctly set?
2. Does the Google Cloud project have sufficient permissions?
3. Is the Firebase project correctly configured?
4. Are Docker and gcloud CLI working properly? 