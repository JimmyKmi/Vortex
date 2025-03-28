# VORTËX Development Guide

English | [简体中文](DEVELOPMENT.md)

> 📝 This documentation is generated by LLM. If you find any issues, please submit an [Issue](https://github.com/JimmyKmi/vortex/issues)

This document provides guidance on development environment setup, testing, and contribution processes for the VORTËX project.

## Development Environment Setup

### Prerequisites

- Node.js 20+
- npm 9+
- Git
- Basic knowledge of Next.js and React

### Environment Setup

1. **Clone repository**:

   ```bash
   git clone https://github.com/JimmyKmi/vortex.git
   cd vortex
   ```

2. **Install dependencies**:

   ```bash
   # Use --legacy-peer-deps to resolve dependency compatibility issues
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables**:

   ```bash
   # Copy environment template
   cp .env.example .env.local

   # Edit .env.local to configure development parameters
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Development server will start at http://localhost:3000

## Project Structure

VORTËX project uses Next.js App Router architecture with the following directory structure:

```
vortex/
├── app/                 # Next.js application directory
│   ├── api/             # API routes
│   ├── (auth)/          # Authentication-related pages
│   ├── dashboard/       # Admin dashboard pages
│   └── ...              # Other pages and components
├── components/          # Shared components
├── contexts/            # React contexts
├── hooks/               # Custom React Hooks
├── lib/                 # Utility functions and services
│   ├── config/          # Application configuration
│   └── ...              # Other utilities
├── prisma/              # Prisma ORM models and migrations
├── public/              # Static assets
├── styles/              # Global styles
└── types/               # TypeScript type definitions
```

## Code Standards

Project uses ESLint and Prettier for code style management:

```bash
# Run code checks
npm run check-lint

# Format code
npm run format

# Check code formatting
npm run check-prettier
```

## Testing

Project uses Jest and React Testing Library for testing:

```bash
# Run all tests
npm run check-jest

# View test coverage report
npm run check-jest -- --coverage
```

### Testing Standards

1. Component tests should be in `__tests__` directory near the component
2. API endpoint tests should be in respective API route directory
3. Unit test files should use `.test.ts` or `.test.tsx` extension
4. Integration test files should use `.spec.ts` or `.spec.tsx` extension

## Database Migrations

Project uses Prisma ORM for database model and migration management:

```bash
# Generate migration
npx prisma migrate dev --name <migration-name>

# Apply migration
npx prisma migrate deploy

# View database
npx prisma studio
```

## Production Build

```bash
# Build production version
npm run build

# Test production version locally
npm start
```

## CI/CD Pipeline

Project uses GitHub Actions for continuous integration and deployment:

1. **Code Quality Checks**:

   - ESLint code check
   - Prettier format check
   - Dependency security check
   - Automated tests

2. **Docker Image Build**:
   - Automatically builds and pushes Docker image when new version is released
   - Pushes to `latest` or `dogfood` tag based on version number

### CI/CD Flow Diagram

```
Code Commit --> Code Quality Check --> Test --> Build
     \                                         \
      \--> (Create Release Tag) --------------> Docker Image Build --> Push Image
```

## Contribution Guide

### Development Flow

1. Fork repository and clone locally
2. Create new branch: `git checkout -b feature/your-feature-name`
3. Develop and test your feature
4. Ensure code passes all checks
5. Commit changes: `git commit -m 'feat: add some feature'`
6. Push to your Fork: `git push origin feature/your-feature-name`
7. Create Pull Request

### Branch Strategy

- `main`: Main branch containing stable code
- `dev`: Development branch containing latest features
- `feature/*`: Feature branches for new features
- `fix/*`: Fix branches for bug fixes
- `docs/*`: Documentation branches for documentation updates

### Commit Message Convention

Project uses semantic commit messages:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or auxiliary tool changes

Example:

```
feat: Add file expiration setting feature
fix: Fix large file upload crash
docs: Update API documentation
```

### Pull Request Process

1. PR title should use semantic commit message format
2. PR description should detail changes and reasons
3. PR should include appropriate test cases
4. PR will be reviewed before merging to main branch
