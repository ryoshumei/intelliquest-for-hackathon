# 🚀 IntelliQuest

An AI-powered survey platform that transforms survey creation through intelligent question generation using Google's Vertex AI. Built with modern web technologies and deployed on Google Cloud Run.

## ✨ Features

- **🤖 AI-Powered Question Generation**: Leverage Vertex AI (Gemini 2.5 Pro) to automatically generate contextual survey questions
- **🔐 Firebase Authentication**: Secure user registration and login system
- **📊 Real-time Survey Management**: Create, manage, and analyze surveys with live data
- **📱 Responsive Design**: Modern UI that works seamlessly across all devices
- **☁️ Cloud-Native Architecture**: Built with hexagonal architecture and Domain-Driven Design
- **🔥 Real-time Database**: Firestore integration with optimized indexing
- **📈 Event-Driven Architecture**: Comprehensive event handling with audit logging

## 🏗️ Technology Stack

### Frontend
- **Next.js 15.3.3** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern component library

### Backend & Infrastructure
- **Firebase Auth** - User authentication
- **Firestore** - NoSQL database with real-time sync
- **Vertex AI** - Google's generative AI platform
- **Google Cloud Run** - Serverless container platform
- **Docker** - Containerization

### Architecture
- **Hexagonal Architecture** - Clean separation of concerns
- **Domain-Driven Design (DDD)** - Business logic organization
- **Event-Driven Architecture** - Decoupled event handling

## 🌐 Live Demo

**Production URL**: [https://intelliquest-app-oplpzfy3pa-an.a.run.app](https://intelliquest-app-oplpzfy3pa-an.a.run.app)

### Test the Platform:
1. Visit the live demo URL
2. Register a new account or login
3. Create an AI-generated survey
4. Test the survey response system
5. View results in the dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Docker Desktop (for deployment)
- Google Cloud CLI (for deployment)
- Firebase project with Firestore enabled

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/intelliquest-for-hackathon.git
   cd intelliquest-for-hackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Firebase configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📋 Environment Configuration

### Required Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_LOCATION="global"
GOOGLE_CLOUD_MODEL="gemini-2.5-flash"
```

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── components/        # Page-specific components
│   ├── contexts/          # React contexts
│   ├── create-survey/     # Survey creation page
│   ├── dashboard/         # User dashboard
│   └── survey/            # Survey response pages
├── application/           # Application layer (Use Cases)
│   ├── services/          # Application services
│   ├── use-cases/         # Business use cases
│   └── event-handlers/    # Event handlers
├── domain/                # Domain layer (Business Logic)
│   ├── survey/            # Survey domain
│   ├── user/              # User domain
│   └── shared/            # Shared domain concepts
├── infrastructure/        # Infrastructure layer
│   ├── auth/              # Authentication services
│   ├── external-services/ # External API integrations
│   ├── firebase/          # Firebase configuration
│   ├── repositories/      # Data access implementations
│   └── services/          # Infrastructure services
└── components/            # Shared UI components
```

## 🔄 Development Workflow

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Testing
npm run test         # Run tests (when implemented)

# Deployment
./deploy.sh          # Deploy to Google Cloud Run
```

## 🚀 Deployment

### Production Deployment on Google Cloud Run

1. **Setup deployment configuration**
   ```bash
   cp .env.production.template .env.production
   cp deploy.sh.template deploy.sh
   chmod +x deploy.sh
   ```

2. **Configure environment variables**
   - Edit `.env.production` with your production Firebase config
   - Ensure Google Cloud CLI is authenticated

3. **Deploy to Cloud Run**
   ```bash
   source .env.production
   ./deploy.sh
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🏛️ Architecture Overview

### Hexagonal Architecture
- **Domain Layer**: Business logic and entities
- **Application Layer**: Use cases and application services
- **Infrastructure Layer**: External integrations and data access

### Key Design Patterns
- **Repository Pattern**: Abstract data access
- **Command Query Responsibility Segregation (CQRS)**: Separate read/write operations
- **Event Sourcing**: Comprehensive audit trail
- **Dependency Injection**: Loose coupling

## 🔐 Security Features

- **Firebase Authentication** with email/password
- **Firestore Security Rules** for data protection
- **Environment Variable Management** for sensitive data
- **HTTPS Enforcement** on all production endpoints
- **Input Validation** and sanitization

## 📊 Performance Optimizations

- **Firestore Composite Indexes** for query optimization
- **Next.js App Router** for optimal loading performance
- **Server-side Rendering (SSR)** for SEO and performance
- **Cloud Run Auto-scaling** based on traffic
- **Efficient Bundle Splitting** with Next.js

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use English for all code, comments, and documentation
- Implement proper error handling
- Write meaningful commit messages
- Follow the established architecture patterns

## 📝 API Documentation

### Health Check
```
GET /api/health
```

### Authentication
```
POST /api/auth/login
POST /api/auth/register
```

### Surveys
```
GET    /api/surveys          # List user surveys
POST   /api/surveys          # Create new survey
GET    /api/surveys/:id      # Get survey details
DELETE /api/surveys/:id      # Delete survey
```

### Survey Responses
```
GET  /api/surveys/:id/responses  # Get survey responses
POST /api/surveys/:id/responses  # Submit survey response
```

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Errors**
   - Verify API keys in environment variables
   - Check Firebase project configuration

2. **Vertex AI Generation Failures**
   - Ensure Google Cloud APIs are enabled
   - Verify project has Vertex AI permissions

3. **Build Failures**
   - Check Node.js version (18+ required)
   - Clear `node_modules` and reinstall dependencies

## 📞 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Architecture**: Review the `/src` directory structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Achievements

- ✅ **100% Feature Complete** - All core functionality implemented
- ✅ **Production Deployed** - Live on Google Cloud Run
- ✅ **AI Integration** - Vertex AI question generation working
- ✅ **Real-time Data** - Firebase integration operational
- ✅ **Modern Architecture** - Hexagonal architecture with DDD
- ✅ **Performance Optimized** - Database indexes and caching implemented
- ✅ **Security Hardened** - Authentication and data protection in place

---

**Built with ❤️ for intelligent survey creation**
