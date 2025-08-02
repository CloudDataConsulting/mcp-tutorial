# MCP Server Learning Program

A comprehensive, multi-language tutorial series for learning Model Context Protocol (MCP) server development. Start from zero knowledge and build production-ready MCP servers in your language of choice.

## 🌐 Supported Languages

### [📘 Node.js/TypeScript](node/)
Full tutorial series with JavaScript/TypeScript implementation

### [🐍 Python](python/)
Complete tutorial series with Python async implementation

### [📚 Common Concepts](common/)
Language-agnostic MCP concepts and debugging guides

## 🎯 Learning Path

### 1. Choose Your Language
- **Node.js** - Great for web developers, full ecosystem support
- **Python** - Excellent for data science, AI/ML integration

### 2. Follow the Tutorials
Each language directory contains:
1. **Language Fundamentals** - Basics needed for MCP development
2. **Package Management** - Dependencies and project setup
3. **Extending Servers** - Adding features and tools
4. **Advanced Patterns** - Production-ready implementations

### 3. Common Knowledge
Read the common documentation for:
- MCP protocol concepts
- Debugging techniques
- Best practices
- Security considerations

## 🚀 Quick Start

### Node.js
```bash
cd node
npm install
node index.js
```

### Python
```bash
cd python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python hello_world_mcp.py
```

## 📖 What You'll Learn

- **Protocol Understanding**: How MCP works under the hood
- **Language-Specific Skills**: Best practices for your chosen language
- **Tool Development**: Creating powerful MCP tools
- **Debugging**: Troubleshooting common issues
- **Production Deployment**: Building robust, scalable servers

## 🗂️ Repository Structure

```
cdc-mcp/
├── README.md                 # This file
├── CLAUDE.md                # Claude Code configuration
│
├── common/                  # Language-agnostic documentation
│   ├── README.md
│   ├── mcp-core-concepts.md
│   └── debugging-mcp-servers.md
│
├── node/                    # Node.js/TypeScript implementation
│   ├── README.md
│   ├── index.js            # Hello-world server
│   ├── package.json
│   ├── 1-nodejs-fundamentals.md
│   ├── 2-npm-npx-basics.md
│   ├── 5-extending-hello-world.md
│   └── 6-advanced-mcp-patterns.md
│
└── python/                  # Python implementation
    ├── README.md
    ├── hello_world_mcp.py  # Hello-world server
    ├── pyproject.toml
    ├── requirements.txt
    ├── 1-python-fundamentals.md
    ├── 2-pip-uv-basics.md
    ├── 5-extending-hello-world.md
    └── 6-advanced-mcp-patterns.md
```

## 💡 Learning Tips

1. **Start Simple**: Begin with the hello-world server in your chosen language
2. **Read in Order**: Tutorials are designed to build on each other
3. **Experiment**: Modify the examples and see what happens
4. **Use the Debugger**: Follow the debugging guide when stuck
5. **Ask Questions**: The MCP community is helpful

## 🛠️ Universal Tools

### MCP Inspector
Works with all languages:
```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector "node server.js"
mcp-inspector "python server.py"
```

## 🤝 Contributing

Feel free to:
- Add examples in other languages
- Improve existing tutorials
- Share your MCP tools
- Report issues or suggestions

## 📚 Additional Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/download)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)

## 🎓 After This Program

You'll be able to:
- Build MCP servers in multiple languages
- Debug complex protocol issues
- Create sophisticated tools
- Deploy production servers
- Contribute to the MCP ecosystem

---

**Choose your language and start learning!** Each path is complete and self-contained.