# MCP Core Concepts (Language Agnostic)

This guide explains the Model Context Protocol (MCP) concepts that apply regardless of which programming language you use to implement your server.

## Table of Contents
- [What is MCP](#what-is-mcp)
- [Core Architecture](#core-architecture)
- [Communication Patterns](#communication-patterns)
- [Protocol Messages](#protocol-messages)
- [Tools, Resources, and Prompts](#tools-resources-and-prompts)
- [Transport Mechanisms](#transport-mechanisms)
- [Security Model](#security-model)
- [Best Practices](#best-practices)

## What is MCP

The Model Context Protocol (MCP) is a standardized protocol that enables AI assistants to interact with external tools and data sources. It's language-agnostic - you can implement MCP servers in Python, TypeScript/Node.js, or any language that can:

1. Handle JSON-RPC 2.0 messages
2. Communicate over supported transports (stdio, HTTP/SSE)
3. Implement the required protocol handlers

### Key Benefits
- **Interoperability**: Any MCP client can work with any MCP server
- **Language Freedom**: Choose the best language for your use case
- **Standard Protocol**: Well-defined message formats and behaviors
- **Security**: Built-in permission model and controlled access

## Core Architecture

MCP follows a client-server model:

```
┌─────────────────┐     JSON-RPC 2.0      ┌─────────────────┐
│   MCP Client    │◄────────────────────►│   MCP Server    │
│ (AI Assistant)  │   over Transport      │  (Your Tool)    │
└─────────────────┘                       └─────────────────┘
```

### Client (AI Assistant)
- Discovers available tools/resources
- Sends requests to servers
- Handles responses and errors
- Manages multiple server connections

### Server (Your Implementation)
- Exposes tools, resources, and prompts
- Processes client requests
- Returns structured responses
- Maintains stateless operation (typically)

## Communication Patterns

### 1. Initialization Flow
```
Client → Server: initialize
Server → Client: initialized (with capabilities)
Client → Server: initialized (acknowledgment)
```

### 2. Discovery Pattern
```
Client → Server: tools/list
Server → Client: List of available tools

Client → Server: resources/list
Server → Client: List of available resources

Client → Server: prompts/list
Server → Client: List of available prompts
```

### 3. Execution Pattern
```
Client → Server: tools/call (with tool name and arguments)
Server → Client: Tool result or error

Client → Server: resources/read (with resource URI)
Server → Client: Resource content or error
```

## Protocol Messages

All MCP messages follow JSON-RPC 2.0 format:

### Request Structure
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1"
    }
  }
}
```

### Response Structure
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Response content"
      }
    ]
  }
}
```

### Error Structure
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": "Additional error details"
  }
}
```

## Tools, Resources, and Prompts

### Tools
Interactive functions that perform actions:
- Accept parameters
- Execute operations
- Return results
- Examples: file operations, API calls, calculations

### Resources
Static or dynamic content sources:
- Provide read-only data
- Can be files, API endpoints, or computed values
- Support different MIME types
- Examples: documentation, logs, configuration

### Prompts
Reusable prompt templates:
- Define conversation starters
- Include variable substitution
- Guide specific interactions
- Examples: code review prompts, analysis templates

## Transport Mechanisms

### 1. Standard Input/Output (stdio)
Most common for desktop integrations:
- Server reads from stdin
- Server writes to stdout
- Errors go to stderr
- Simple subprocess model

### 2. HTTP with Server-Sent Events (SSE)
For web-based integrations:
- RESTful HTTP endpoints
- SSE for server-to-client messages
- Supports authentication headers
- Good for cloud deployments

### 3. WebSocket (Future)
Planned for bidirectional web communication:
- Full-duplex communication
- Lower latency
- Better for real-time features

## Security Model

### Permission System
- Clients must request specific capabilities
- Servers declare what they provide
- Users control permissions through client configuration

### Input Validation
- Always validate tool arguments
- Use JSON Schema for automatic validation
- Sanitize file paths and system commands
- Implement rate limiting where appropriate

### Isolation
- Servers run as separate processes
- Limited access to system resources
- No direct access to client data
- Communicate only through protocol

## Best Practices

### 1. Stateless Design
- Each request should be independent
- Don't rely on previous requests
- Use request IDs for correlation
- Store state externally if needed

### 2. Error Handling
- Return proper JSON-RPC errors
- Include helpful error messages
- Log errors to stderr (not stdout)
- Gracefully handle malformed requests

### 3. Performance
- Minimize response latency
- Stream large responses if supported
- Cache expensive computations
- Use connection pooling for external services

### 4. Documentation
- Provide clear tool descriptions
- Document all parameters
- Include usage examples
- Specify error conditions

### 5. Testing
- Test with multiple MCP clients
- Validate against protocol specification
- Handle edge cases and errors
- Test transport-specific features

## Language-Specific Considerations

While MCP is language-agnostic, implementation details vary:

### Python
- Use async/await for concurrent operations
- Leverage type hints for better SDK integration
- Handle exceptions properly
- Use the official `mcp` package

### TypeScript/Node.js
- Use ES modules for modern code
- Leverage TypeScript for type safety
- Handle promises and async operations
- Use the official `@modelcontextprotocol/sdk`

### Other Languages
- Ensure JSON-RPC 2.0 compliance
- Implement proper stdio handling
- Follow language idioms
- Consider creating reusable libraries

## Next Steps

1. **Choose Your Language**: Pick Python or TypeScript based on your needs
2. **Implement a Server**: Start with hello-world, then add complexity
3. **Test Thoroughly**: Use MCP Inspector and real clients
4. **Deploy**: Consider transport options for your use case
5. **Contribute**: Share tools with the MCP community

Remember: The protocol is the same regardless of language. Focus on understanding the concepts, then apply them in your chosen language.