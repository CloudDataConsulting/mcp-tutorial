# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-language Model Context Protocol (MCP) tutorial repository containing comprehensive learning materials and working hello-world servers in both Node.js and Python.

## Repository Structure

```
cdc-mcp/
├── common/          # Language-agnostic MCP documentation
├── node/           # Node.js/TypeScript implementation and tutorials
└── python/         # Python implementation and tutorials
```

## Development Commands

### Node.js Server
```bash
cd node
npm install
node index.js
```

### Python Server
```bash
cd python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt  # or: uv pip install -r requirements.txt
python hello_world_mcp.py
```

### Testing Both Servers
```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Test Node.js server
mcp-inspector "node node/index.js"

# Test Python server
mcp-inspector "python python/hello_world_mcp.py"
```

## Architecture

### Language Implementations

**Node.js (node/index.js)**
- Uses `@modelcontextprotocol/sdk` package
- ES Module syntax with `type: "module"`
- Implements stdio transport
- Single `say_hello` tool

**Python (python/hello_world_mcp.py)**
- Uses official `mcp` package
- Async/await with asyncio
- Decorator-based tool registration
- Same `say_hello` tool functionality

### Common Concepts

Both implementations follow the same MCP protocol:
- JSON-RPC 2.0 message format
- Stdio transport for client communication
- Tool registration and execution
- Structured error handling

## Key Implementation Details

1. **Debugging**: Always use stderr for debug output (stdout is reserved for MCP protocol)
   - Node.js: `console.error()`
   - Python: `print(..., file=sys.stderr)`

2. **Protocol Compliance**: Both servers implement the same protocol methods:
   - `initialize` (handled by SDK)
   - `tools/list` 
   - `tools/call`

3. **Tool Response Format**: Consistent across languages:
   ```json
   {
     "content": [{
       "type": "text",
       "text": "Hello, {name}! This is your MCP server speaking."
     }]
   }
   ```

## Tutorial Organization

1. **Language-Specific** (in each language directory):
   - Fundamentals (1-*.md)
   - Package management (2-*.md)
   - Extending servers (5-*.md)
   - Advanced patterns (6-*.md)

2. **Common Documentation** (in common/):
   - MCP core concepts
   - Debugging techniques
   - Protocol specification

## Best Practices

- Use language-appropriate package managers (npm for Node.js, uv for Python)
- Follow language idioms and conventions
- Maintain protocol compatibility across implementations
- Test with MCP Inspector before integration
- Keep tutorials updated with SDK changes