#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create a server instance
const server = new Server(
  {
    name: 'hello-world-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add a simple "hello" tool - updated syntax
server.setRequestHandler('tools_list', async () => ({
  tools: [
    {
      name: 'say_hello',
      description: 'Says hello to someone',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the person to greet'
          }
        },
        required: ['name']
      }
    }
  ]
}));

// Handle the tool being called - updated syntax
server.setRequestHandler('tools_call', async (request) => {
  if (request.params.name === 'say_hello') {
    const name = request.params.arguments.name;
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${name}! This is your MCP server speaking.`
        }
      ]
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Hello World MCP Server running!');
