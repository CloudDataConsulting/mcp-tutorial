# Common MCP Documentation

This directory contains language-agnostic MCP documentation that applies to all implementations.

## 📁 Contents

### Core Documentation
- **[mcp-core-concepts.md](mcp-core-concepts.md)** - Essential MCP concepts
  - Protocol architecture
  - Communication patterns
  - Tools, resources, and prompts
  - Transport mechanisms
  - Security model

- **[debugging-mcp-servers.md](debugging-mcp-servers.md)** - Universal debugging guide
  - Common errors and solutions
  - Debugging tools (MCP Inspector)
  - Logging best practices
  - Testing strategies
  - Performance debugging

## 📚 When to Read These

### Read First
Start with `mcp-core-concepts.md` after learning your language basics. This gives you the foundation to understand how MCP works regardless of implementation language.

### Read When Debugging
Consult `debugging-mcp-servers.md` when you encounter issues. It covers problems that affect all MCP servers and provides language-agnostic solutions.

## 🔑 Key Concepts

### Protocol Basics
- JSON-RPC 2.0 message format
- Request/response patterns
- Standard error codes
- Transport options (stdio, HTTP/SSE)

### Architecture
- Client-server model
- Stateless design
- Tool/resource/prompt abstractions
- Security boundaries

### Best Practices
- Always validate inputs
- Use structured logging
- Handle errors gracefully
- Design for stateless operation

## 🛠️ Universal Tools

### MCP Inspector
Works with any language:
```bash
mcp-inspector "python server.py"
mcp-inspector "node server.js"
mcp-inspector "ruby server.rb"
```

### Protocol Testing
Test any server with curl:
```bash
# Test JSON-RPC endpoint
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  python server.py

# Test HTTP server
curl -X POST http://localhost:8080/rpc \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## 🔗 Resources

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [MCP GitHub Organization](https://github.com/modelcontextprotocol)