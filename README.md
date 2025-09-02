# 🏗️ Tekla API MCP Server

A Model Context Protocol (MCP) server that provides **Claude Desktop** and **Claude Code** with comprehensive access to the **Tekla Open API documentation** and **real-world code examples**.

[![npm version](https://badge.fury.io/js/tekla-api-mcp.svg)](https://badge.fury.io/js/tekla-api-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔍 **Search API Documentation** - Find classes, methods, properties, and other API elements
- 📚 **Real Code Examples** - 50+ working examples from the official [TSOpenAPIExamples](https://github.com/TrimbleSolutionsCorporation/TSOpenAPIExamples) repository
- 🎯 **Intelligent Search** - Fuzzy search across documentation and examples
- 📖 **Detailed Documentation** - Get comprehensive class and method details
- 🏷️ **Browse by Category** - Explore examples by type (Applications, Plugins, Drawings)
- 🔗 **Claude Integration** - Works seamlessly with Claude Desktop and Claude Code

## 🚀 Quick Start

### Option 1: NPX (Recommended)
```bash
# One-command setup
npx tekla-api-mcp setup

# Or run directly
npx tekla-api-mcp
```

### Option 2: Global Install
```bash
npm install -g tekla-api-mcp
tekla-api-mcp setup
```

### Option 3: Local Development
```bash
git clone https://github.com/pawellisowski/tekla-api-mcp.git
cd tekla-api-mcp
npm install
npm run setup
```

## 📋 Claude Desktop Configuration

After setup, add this to your Claude Desktop config file:

**NPX Version (Recommended):**
```json
{
  "mcpServers": {
    "tekla-api-mcp": {
      "command": "npx",
      "args": ["tekla-api-mcp"]
    }
  }
}
```

**Global Install Version:**
```json
{
  "mcpServers": {
    "tekla-api-mcp": {
      "command": "tekla-api-mcp"
    }
  }
}
```

**Configuration File Locations:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json` 
- **Linux**: `~/.config/claude/claude_desktop_config.json`

## 🛠️ Requirements

- **Node.js 18+**
- **Tekla Open API CHM file** (TeklaOpenAPI_Reference.chm)
- **Claude Desktop** or **Claude Code**

## 📖 Available Tools

### 🔍 search_api
Search the Tekla Open API documentation.
```
Ask Claude: "Search for Model classes in Tekla API"
```

### 📝 search_examples  
Search through real code examples.
```
Ask Claude: "Show me beam creation examples"
```

### 🔎 get_example_details
Get complete code and details for specific examples.
```
Ask Claude: "Show details for BeamApplication example"
```

### 📚 get_class_details
Get detailed information about API classes.
```  
Ask Claude: "Tell me about the Model class"
```

### 🎯 get_method_details
Get detailed method information.
```
Ask Claude: "How do I use the Insert method?"
```

### 🗂️ browse_namespace
Explore API by namespace.
```
Ask Claude: "What's available in Tekla.Structures.Model?"
```

### 📊 get_statistics
View documentation coverage statistics.
```
Ask Claude: "Show me API documentation statistics"
```

## 💡 Example Queries for Claude

Once configured, you can ask Claude questions like:

- *"How do I create a beam in Tekla using the API?"*
- *"Show me examples of working with the Model class"*
- *"What drawing manipulation examples are available?"*
- *"Find all classes related to reinforcement"*
- *"Show me the syntax for creating a custom part"*
- *"What are the available namespaces in Tekla API?"*

## 📊 Coverage

### API Documentation
- **1,000+ API items** processed from official CHM documentation
- **75 Classes** with detailed information
- **235 Methods** with signatures and descriptions  
- **483 Properties** with usage details
- **58 Enums** with value definitions

### Code Examples  
- **50+ Real Examples** from official Tekla repository
- **5 Categories**: Model/Applications, Model/Plugins, Drawings/Applications, Drawings/Plugins, CustomProperties
- **150+ Code Snippets** with actual working C# code
- **API Usage Patterns** showing real-world implementations

## 🏗️ Project Structure

```
tekla-api-mcp/
├── bin/                    # CLI executable
├── src/                    # TypeScript source code  
├── scripts/                # Setup and utility scripts
├── examples/               # Claude Desktop config examples
├── parsed-api/             # Pre-processed API data (2.7MB)
└── dist/                   # Compiled JavaScript (auto-generated)
```

## 🔧 Development

### Scripts
```bash
npm run build       # Compile TypeScript
npm run dev         # Run in development mode
npm start          # Run compiled version  
npm run setup      # Interactive setup
```

### Building from Source
```bash
git clone https://github.com/pawellisowski/tekla-api-mcp.git
cd tekla-api-mcp
npm install
npm run build
```

### Adding Your CHM File
1. Place `TeklaOpenAPI_Reference.chm` in the project root
2. Run `npm run setup` to process it
3. The setup will extract and parse the documentation automatically

## 🐛 Troubleshooting

### "Server not built" Error
```bash
npx tekla-api-mcp setup
# or
npm run build
```

### "No API data loaded" Warning  
- Ensure you have the CHM file in the project directory
- Run the setup script: `npm run setup`
- Check that `parsed-api/` directory contains JSON files

### Claude Desktop Connection Issues
- Verify the configuration file path and format
- Restart Claude Desktop after config changes
- Check Claude Desktop logs for error details

### Memory Issues During Setup
The setup automatically uses optimized parsing to avoid memory problems. If you encounter issues:
- Ensure you have Node.js 18+ with sufficient memory
- Close other applications during setup
- Try running setup multiple times if it fails

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding New Features
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Submit a pull request

### Reporting Issues
Please report bugs and feature requests in the [GitHub Issues](https://github.com/pawellisowski/tekla-api-mcp/issues).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: https://github.com/pawellisowski/tekla-api-mcp
- **NPM Package**: https://www.npmjs.com/package/tekla-api-mcp  
- **Tekla Examples**: https://github.com/TrimbleSolutionsCorporation/TSOpenAPIExamples
- **MCP Documentation**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/desktop

## 🙏 Acknowledgments

- **Trimble/Tekla** for the comprehensive API documentation and examples
- **Anthropic** for the Model Context Protocol and Claude
- **TSOpenAPIExamples** repository contributors for real-world code examples

---

**Made with ❤️ for the Tekla developer community**