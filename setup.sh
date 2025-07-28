#!/bin/bash

# Jessie Email Assistant - Local Development Setup Script
echo "🚀 Setting up Jessie Email Assistant for local development..."

# Check if .env.local exists
if [ -f "apps/web/.env.local" ]; then
    echo "⚠️  .env.local already exists. Backup will be created."
    cp apps/web/.env.local apps/web/.env.local.backup
fi

# Copy example env file
echo "📋 Copying .env.example to .env.local..."
cp apps/web/.env.example apps/web/.env.local

# Generate secrets
echo "🔐 Generating NextAuth and Cron secrets..."
NEXTAUTH_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)

# Update .env.local with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/NEXTAUTH_SECRET=your-32-char-hex-string/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" apps/web/.env.local
    sed -i '' "s/CRON_SECRET=your-secure-cron-secret/CRON_SECRET=$CRON_SECRET/" apps/web/.env.local
else
    # Linux
    sed -i "s/NEXTAUTH_SECRET=your-32-char-hex-string/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" apps/web/.env.local
    sed -i "s/CRON_SECRET=your-secure-cron-secret/CRON_SECRET=$CRON_SECRET/" apps/web/.env.local
fi

echo "✅ Generated secrets:"
echo "   NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo "   CRON_SECRET: $CRON_SECRET"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Get your Supabase credentials from: https://supabase.com/dashboard"
echo "2. Get Google OAuth credentials from: https://console.cloud.google.com"
echo "3. Get OpenAI API key from: https://platform.openai.com/api-keys"
echo "4. Edit apps/web/.env.local and fill in the remaining variables"
echo "5. Run: npm run dev"
echo ""
echo "📚 See DEVELOPER_QUICK_REFERENCE.md for detailed setup instructions"
echo "✅ Setup script completed!"