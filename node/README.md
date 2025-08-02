# Node.js MCP Server Tutorial

This directory contains everything you need to learn MCP server development with Node.js/TypeScript.

## 📁 Contents

### Server Implementation
- `index.js` - Working hello-world MCP server
- `package.json` - Project configuration
- `package-lock.json` - Dependency lock file

### Tutorials (Read in Order)
1. **[1-nodejs-fundamentals.md](1-nodejs-fundamentals.md)** - Node.js basics for MCP
2. **[2-npm-npx-basics.md](2-npm-npx-basics.md)** - Package management essentials
3. **[5-extending-hello-world.md](5-extending-hello-world.md)** - Adding features to your server
4. **[6-advanced-mcp-patterns.md](6-advanced-mcp-patterns.md)** - Production-ready patterns

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the server**:
   ```bash
   node index.js
   ```

3. **Test the server**:
   ```bash
   # In another terminal
   npm install -g @modelcontextprotocol/inspector
   mcp-inspector "node index.js"
   ```

## 📚 Learning Path

1. Start with the fundamentals if you're new to Node.js
2. Learn npm/npx for package management
3. Read the common MCP concepts in `../common/`
4. Extend the hello-world server with new features
5. Study advanced patterns for production use

## 🛠️ Development Tips

- Use `console.error()` for debugging (not `console.log()`)
- Always handle promises and async operations
- Test with the MCP Inspector tool
- Follow ES module conventions (`type: "module"`)

## 📦 Key Dependencies

- `@modelcontextprotocol/sdk` - Official MCP SDK for TypeScript/Node.js
- ES modules enabled for modern JavaScript

## 🔗 Resources

- [Node.js Documentation](https://nodejs.org/docs)
- [npm Documentation](https://docs.npmjs.com)
- [MCP SDK for TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)