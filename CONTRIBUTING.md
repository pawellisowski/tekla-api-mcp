# Contributing to Tekla API MCP Server

Thank you for your interest in contributing to the Tekla API MCP Server! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/pawellisowski/tekla-api-mcp/issues) page
- Check if the issue already exists before creating a new one
- Provide clear steps to reproduce the problem
- Include system information (Node.js version, OS, etc.)
- Add relevant error messages and logs

### Suggesting Features
- Open an issue with the "enhancement" label
- Describe the feature and its use case clearly
- Explain how it would benefit Tekla API users
- Consider the scope and complexity

### Submitting Code Changes

1. **Fork the repository**
   ```bash
   git fork https://github.com/pawellisowski/tekla-api-mcp.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run build
   npm run test  # if tests exist
   ```

5. **Commit with clear messages**
   ```bash
   git commit -m "Add: feature description"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all source code
- Follow existing naming conventions
- Add type annotations where helpful
- Use meaningful variable and function names
- Add comments for complex logic

### File Structure
- Keep related functionality in separate modules
- Use consistent file naming (kebab-case)
- Group similar files in appropriate directories

### Documentation
- Update README.md for user-facing changes
- Add JSDoc comments for public functions
- Include examples in documentation
- Keep CHANGELOG.md updated

## 🧪 Testing

### Local Testing
```bash
# Build the project
npm run build

# Test CLI functionality
./bin/tekla-api-mcp.js --help
./bin/tekla-api-mcp.js setup

# Test MCP server
npm start
```

### Integration Testing
- Test with Claude Desktop integration
- Verify all MCP tools work correctly
- Check error handling and edge cases

## 📚 Development Setup

### Requirements
- Node.js 18+
- Git
- TypeScript knowledge
- Familiarity with MCP protocol

### Setup Steps
```bash
# Clone your fork
git clone https://github.com/yourusername/tekla-api-mcp.git
cd tekla-api-mcp

# Install dependencies
npm install

# Build project
npm run build

# Run in development mode
npm run dev
```

## 🎯 Areas for Contribution

### High Priority
- **Error handling improvements** - Better error messages and recovery
- **Documentation parsing** - More robust CHM file parsing
- **Performance optimizations** - Faster search and data loading
- **Cross-platform compatibility** - Testing on different OS

### Medium Priority
- **Additional code examples** - More real-world usage patterns
- **Search improvements** - Better relevance and filtering
- **Configuration options** - More customization for users
- **Logging and debugging** - Better troubleshooting tools

### Enhancement Ideas
- **GUI setup wizard** - Easier initial setup
- **Example templates** - Code generation helpers
- **VS Code extension** - Direct IDE integration
- **Docker support** - Containerized deployment

## 📖 Understanding the Codebase

### Key Components
- **`src/index.ts`** - Main MCP server implementation
- **`src/tekla-api-documentation.ts`** - Documentation search and retrieval
- **`bin/tekla-api-mcp.js`** - CLI wrapper for NPX usage
- **`scripts/setup.js`** - Interactive setup process
- **`fetch-examples.js`** - Code example fetching and parsing

### Data Flow
1. CHM file → HTML extraction → JSON parsing
2. Examples repository → Code analysis → Snippet extraction  
3. MCP tools → Documentation lookup → Formatted response

## ✅ Pull Request Checklist

Before submitting your PR, ensure:
- [ ] Code builds without errors (`npm run build`)
- [ ] All existing functionality still works
- [ ] New features are tested manually
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the changes
- [ ] No sensitive information is included

## 🤔 Questions?

If you have questions about contributing:
- Open a GitHub issue with the "question" label
- Check existing issues and discussions
- Review the README.md for setup instructions

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

Thank you for helping make the Tekla API MCP Server better for everyone! 🎉