# Debugging MCP Servers (Language Agnostic)

This guide covers debugging techniques that apply to MCP servers regardless of implementation language.

## Table of Contents
- [Common MCP Errors](#common-mcp-errors)
- [Debugging Tools](#debugging-tools)
- [Logging Best Practices](#logging-best-practices)
- [Testing Strategies](#testing-strategies)
- [Transport-Specific Issues](#transport-specific-issues)
- [Protocol Debugging](#protocol-debugging)
- [Performance Debugging](#performance-debugging)

## Common MCP Errors

### 1. Protocol Errors

#### Invalid JSON-RPC Format
**Error**: Client receives malformed JSON or incorrect JSON-RPC structure
```json
{
  "error": "Parse error",
  "code": -32700
}
```

**Common Causes**:
- Writing debug output to stdout (stdio transport)
- Not wrapping responses in JSON-RPC envelope
- Missing required fields (jsonrpc, id)

**Solutions**:
- Always write debug output to stderr
- Use your language's MCP SDK for proper formatting
- Validate JSON output during development

#### Method Not Found
**Error**: Client requests unknown method
```json
{
  "error": {
    "code": -32601,
    "message": "Method not found: tools/unknown"
  }
}
```

**Common Causes**:
- Typo in method registration
- Not implementing required methods
- Case sensitivity issues

**Solutions**:
- Implement all required protocol methods
- Check method name spelling
- Use SDK method decorators/handlers

### 2. Transport Errors

#### Stdio Communication Failed
**Symptoms**:
- Server starts but client can't communicate
- "Broken pipe" errors
- Server exits immediately

**Common Causes**:
- Writing to stdout instead of using protocol
- Buffering issues
- Incorrect line endings

**Solutions**:
```python
# Python: Always use stderr for debugging
import sys
print("Debug message", file=sys.stderr)

# TypeScript: Use console.error
console.error("Debug message");
```

#### HTTP/SSE Connection Issues
**Symptoms**:
- Connection timeouts
- CORS errors
- SSE events not received

**Common Causes**:
- Missing CORS headers
- Incorrect content-type
- Firewall/proxy issues

**Solutions**:
- Set proper CORS headers
- Use correct SSE format
- Test with curl first

### 3. Tool Execution Errors

#### Schema Validation Failed
**Error**: Tool arguments don't match schema
```json
{
  "error": {
    "code": -32602,
    "message": "Invalid params: missing required field 'name'"
  }
}
```

**Solutions**:
- Validate against your declared schema
- Use JSON Schema validators
- Provide helpful error messages

## Debugging Tools

### 1. MCP Inspector
Universal MCP debugging tool:
```bash
# Install globally
npm install -g @modelcontextprotocol/inspector

# Run your server through the inspector
mcp-inspector "python my_server.py"
mcp-inspector "node my_server.js"
```

Features:
- Intercepts all protocol messages
- Displays formatted JSON-RPC
- Validates protocol compliance
- Shows timing information

### 2. Protocol Logging

Create a debug wrapper:

**Python Example**:
```python
import json
import sys
from datetime import datetime

def log_protocol(direction, message):
    """Log protocol messages to stderr"""
    timestamp = datetime.now().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "direction": direction,
        "message": message
    }
    print(json.dumps(log_entry), file=sys.stderr)
```

**TypeScript Example**:
```typescript
function logProtocol(direction: string, message: any): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    direction,
    message
  }));
}
```

### 3. Testing Clients

#### Simple Test Client
Create minimal test clients for debugging:

**Python Test Client**:
```python
import json
import subprocess
import asyncio

async def test_mcp_server():
    # Start server process
    proc = await asyncio.create_subprocess_exec(
        'python', 'my_server.py',
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Send test request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "1.0.0",
            "capabilities": {}
        }
    }
    
    proc.stdin.write(json.dumps(request).encode() + b'\n')
    await proc.stdin.drain()
    
    # Read response
    response = await proc.stdout.readline()
    print("Response:", json.loads(response))
```

## Logging Best Practices

### 1. Structured Logging
Use structured logs for easier parsing:

```json
{
  "level": "error",
  "timestamp": "2024-01-15T10:30:00Z",
  "component": "tool_executor",
  "method": "file_read",
  "error": "Permission denied",
  "context": {
    "file_path": "/etc/passwd",
    "user": "mcp_server"
  }
}
```

### 2. Log Levels
- **ERROR**: Protocol violations, tool failures
- **WARN**: Deprecated usage, performance issues
- **INFO**: Server lifecycle, tool executions
- **DEBUG**: Detailed protocol messages

### 3. Sensitive Data
- Never log authentication tokens
- Mask file paths with sensitive info
- Sanitize user inputs in logs
- Use environment-specific log levels

## Testing Strategies

### 1. Unit Testing Tools

**Python Example**:
```python
import pytest
from my_server import say_hello_tool

async def test_say_hello():
    result = await say_hello_tool({"name": "World"})
    assert result[0]["type"] == "text"
    assert "Hello, World" in result[0]["text"]
```

**TypeScript Example**:
```typescript
import { describe, it, expect } from '@jest/globals';
import { sayHelloTool } from './server';

describe('say_hello tool', () => {
  it('should greet with name', async () => {
    const result = await sayHelloTool({ name: 'World' });
    expect(result[0].type).toBe('text');
    expect(result[0].text).toContain('Hello, World');
  });
});
```

### 2. Integration Testing

Test full protocol flow:
1. Initialize connection
2. List available tools
3. Execute each tool
4. Verify responses
5. Test error conditions

### 3. Client Testing

Test with real clients:
- Claude Desktop
- MCP CLI tools
- Custom integrations
- Different transport types

## Transport-Specific Issues

### Stdio Transport
```bash
# Test stdio communication
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | python server.py
```

Common issues:
- Buffering (use line-buffered mode)
- Platform differences (Windows vs Unix)
- Character encoding (use UTF-8)

### HTTP/SSE Transport
```bash
# Test HTTP endpoint
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test SSE stream
curl -N http://localhost:8080/sse
```

Common issues:
- Connection timeouts
- Proxy interference
- CORS policies

## Protocol Debugging

### 1. Message Validation
Validate all messages against JSON-RPC 2.0:
- Required fields present
- Correct types
- Valid method names
- Matching request/response IDs

### 2. State Tracking
Track protocol state:
```
NOT_CONNECTED → INITIALIZING → READY → SHUTTING_DOWN
```

### 3. Error Codes
Use standard JSON-RPC error codes:
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

## Performance Debugging

### 1. Response Time Monitoring
Log execution times:
```json
{
  "method": "tools/call",
  "tool": "database_query",
  "duration_ms": 1250,
  "status": "success"
}
```

### 2. Memory Usage
Monitor for leaks:
- Track active connections
- Clean up resources
- Use profiling tools
- Set memory limits

### 3. Bottleneck Identification
Common bottlenecks:
- Synchronous I/O operations
- Unoptimized database queries
- Large response serialization
- Missing connection pooling

## Debugging Checklist

### Initial Setup
- [ ] Server starts without errors
- [ ] Can send/receive JSON-RPC messages
- [ ] Initialize method works
- [ ] Capabilities are properly declared

### Tool Implementation
- [ ] Tools appear in tools/list
- [ ] Tool schemas are valid
- [ ] Tool execution succeeds
- [ ] Error handling works

### Protocol Compliance
- [ ] All required methods implemented
- [ ] JSON-RPC format correct
- [ ] Error codes follow standard
- [ ] IDs properly matched

### Production Readiness
- [ ] Logging configured
- [ ] Error handling comprehensive
- [ ] Performance acceptable
- [ ] Security measures in place

## Language-Specific Tips

### Python
- Use `python -u` for unbuffered output
- Enable asyncio debug mode
- Use `pdb` for breakpoint debugging

### TypeScript/Node.js
- Use `--inspect` flag for debugging
- Enable source maps
- Use Chrome DevTools

### General
- Start simple, add complexity
- Test each component separately
- Use version control for experiments
- Document found issues

## Next Steps

1. Set up MCP Inspector
2. Add structured logging
3. Create test suite
4. Monitor production servers
5. Share debugging tips with community