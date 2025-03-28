# VORTËX - File Transfer Solution

English | [简体中文](README.md)

> 📝 This documentation is generated by LLM. If you find any issues, please submit an [Issue](https://github.com/JimmyKmi/vortex/issues)

![Docker Pulls](https://img.shields.io/docker/pulls/jimmykmi/vortex)
![Docker Latest Version](https://img.shields.io/docker/v/jimmykmi/vortex/latest)
![License](https://img.shields.io/github/license/JimmyKmi/vortex)

> ⚠️ **Beta Notice**: VORTËX is currently in Beta development stage. While it's great for testing and personal use, we recommend against using it in production environments at this time.

VORTËX is an efficient and streamlined file transfer platform designed for rapid file sharing and collaboration. Built on modern web technology stack, it provides secure and reliable file sharing services.

> 🌟 Love this project? Give it a star! It means a lot to us, just like coffee means to programmers~

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT_en.md) - Detailed deployment and configuration instructions
- [Development Guide](docs/DEVELOPMENT_en.md) - Development environment setup and workflow
- [Contributing Guide](docs/CONTRIBUTING_en.md) - How to participate in project development
- [Project Wiki](https://github.com/JimmyKmi/vortex/wiki) - More detailed documentation

## ✨ Core Features

- **Simple & Efficient File Transfer**: Supports drag-and-drop uploads while preserving directory structure
- **No Registration Required**: Quick file sharing using transfer codes
- **Flexible Sharing Control**: Customize download permissions and sharing parameters
- **Enterprise-grade Authentication**: Supports Zitadel SSO and user permission management
- **Modern UI Design**: Responsive interface built with Next.js 15 and shadcn/ui

## 🚀 Quick Deployment

### Docker Compose (Recommended)

1. Create and enter deployment directory:

   ```bash
   mkdir vortex && cd vortex
   ```

2. Create `docker-compose.yml`:

   ```yaml
   services:
     vortex:
       image: jimmykmi/vortex:latest # Use dogfood tag for testing version
       env_file: ./.env
       container_name: vortex
       ports:
         - '21330:3000' # Map port 21330 to container's 3000
       volumes:
         - ./data:/app/data # Persistent data storage
       restart: unless-stopped
   ```

3. Create environment configuration:

   ```bash
   # Download environment template
   curl -o .env https://raw.githubusercontent.com/JimmyKmi/vortex/main/.env.example

   # Edit configuration file
   nano .env
   ```

4. Start service:

   ```bash
   docker-compose up -d
   ```

5. Access service:
   Open `http://localhost:21330` in your browser

### Docker Tags

- `latest`: Latest stable version
- `dogfood`: Latest testing version (with experimental features)
- `x.y.z`: Specific version number

## 🛠️ Development Guide

### Environment Setup

1. Clone repository and install dependencies:

   ```bash
   git clone https://github.com/JimmyKmi/vortex.git
   cd vortex
   npm install --legacy-peer-deps  # Use legacy-peer-deps to resolve dependency compatibility
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Common Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run format` - Format code
- `npm run check-lint` - Check code quality
- `npm run check-prettier` - Check code formatting
- `npm run check-jest` - Run tests

## 🤝 Contribution Guide

Thank you for your interest in VORTËX! Here's how you can contribute:

### Development Process

1. Fork repository and clone locally
2. Create new branch: `git checkout -b feature/your-feature-name`
3. Develop and test your feature
4. Ensure code passes all checks:
   ```bash
   npm run check-lint
   npm run check-prettier
   npm run check-jest
   ```
5. Commit changes: `git commit -m 'feat: add some feature'`
6. Push to your Fork: `git push origin feature/your-feature-name`
7. Create Pull Request

### Commit Convention

- Use semantic commit messages (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`)
- Each PR should focus on a single feature or fix
- New features should include appropriate tests

## 📌 Roadmap

- [ ] Mobile responsive layout optimization
- [ ] Internationalization support (i18n)
- [ ] Advanced transfer code settings
  - [ ] Expiration configuration
  - [ ] Transfer rate limits
  - [ ] Usage count limits
- [ ] Enhanced file preview
  - [ ] File thumbnails
  - [ ] Online preview support
- [ ] Support for uploading empty directories

## 📜 License

This project is licensed under the [Apache-2.0 License](LICENSE).

## 🔗 Links

- [Docker Image](https://hub.docker.com/r/jimmykmi/vortex)
- [Issue Tracker](https://github.com/JimmyKmi/vortex/issues)
- [中文文档](README.md)
