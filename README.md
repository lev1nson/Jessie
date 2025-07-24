# Jessie Email Assistant

AI-powered email assistant for analyzing email conversations using Next.js, Supabase, and OpenAI.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account
- Google Cloud Console project (for OAuth)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jessie-email-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
   - `GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
   - `OPENAI_API_KEY`: OpenAI API key
   - `NEXTAUTH_SECRET`: Random string for NextAuth encryption

4. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at http://localhost:3000

## 📁 Project Structure

```
jessie-email-assistant/
├── apps/
│   ├── web/                      # Main Next.js application
│   │   ├── src/app/              # App Router structure
│   │   │   ├── (chat)/           # Chat interface routes
│   │   │   ├── api/              # Backend API routes
│   │   │   └── auth/             # Authentication routes
│   │   └── src/components/       # React components
│   └── db/                       # Supabase configuration
├── packages/
│   ├── lib/                      # Shared types and utilities
│   ├── config/                   # Shared configurations
│   └── ui/                       # Shared UI components
└── docs/                         # Project documentation
```

## 🛠 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest
- `npm run type-check` - Run TypeScript type checking

## 📦 Tech Stack

- **Frontend**: Next.js 14.2, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL with pgvector
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenAI GPT-4 and text-embedding-ada-002
- **State Management**: Zustand
- **Testing**: Vitest, Testing Library
- **Monorepo**: Turborepo

## 🔧 Development

### Adding New Components

1. Create components in `apps/web/src/components/`
2. For shared components, use `packages/ui/src/`
3. Follow the existing naming conventions

### Database Changes

1. Update types in `packages/lib/src/types.ts`
2. Create migrations in `apps/db/`
3. Generate new types: `npm run db:generate-types`

### Testing

- Unit tests: Place `.test.tsx` files next to components
- Integration tests: Use `__tests__` folders
- E2E tests: Coming in future stories

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the project: `npm run build`
2. Deploy the `apps/web` folder to your hosting provider

## 🔐 Security

- Environment variables are validated using Zod schemas
- API routes include proper authentication checks
- Secrets are never committed to repository
- Regular security audits via `npm audit`

## 📝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.