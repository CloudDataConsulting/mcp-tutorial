# Extending the Hello-World MCP Server: A Practical Guide

## Table of Contents
- [Understanding the Base Server](#understanding-the-base-server)
- [Adding Your First New Tool](#adding-your-first-new-tool)
- [Working with Different Parameter Types](#working-with-different-parameter-types)
- [Returning Different Content Types](#returning-different-content-types)
- [Adding Error Handling](#adding-error-handling)
- [Implementing Tool Validation](#implementing-tool-validation)
- [Adding Multiple Tools](#adding-multiple-tools)
- [Advanced Tool Patterns](#advanced-tool-patterns)
- [Testing Your Extensions](#testing-your-extensions)
- [Best Practices](#best-practices)

## Understanding the Base Server

Let's start by examining our current hello-world server:

```javascript
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

// Add a simple "hello" tool
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

// Handle the tool being called
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
```

This server has:
- **One tool**: `say_hello`
- **Simple parameters**: Just a string name
- **Basic response**: Text content only
- **No error handling**: Missing validation and error management

Let's extend it step by step!

## Adding Your First New Tool

Let's add a calculator tool to demonstrate how to add new functionality.

### Step 1: Add the New Tool to tools_list

```javascript
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
    },
    // NEW TOOL: Simple calculator
    {
      name: 'calculate',
      description: 'Performs basic mathematical calculations',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'Mathematical operation to perform',
            enum: ['add', 'subtract', 'multiply', 'divide']
          },
          a: {
            type: 'number',
            description: 'First number'
          },
          b: {
            type: 'number',
            description: 'Second number'
          }
        },
        required: ['operation', 'a', 'b']
      }
    }
  ]
}));
```

### Step 2: Implement the Tool Logic

```javascript
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
  
  // NEW TOOL IMPLEMENTATION
  if (request.params.name === 'calculate') {
    const { operation, a, b } = request.params.arguments;
    let result;
    
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Cannot divide by zero!'
              }
            ]
          };
        }
        result = a / b;
        break;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `${a} ${operation} ${b} = ${result}`
        }
      ]
    };
  }
  
  // Handle unknown tools
  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${request.params.name}`
      }
    ]
  };
});
```

### Step 3: Test Your New Tool

1. **Start the server:**
   ```bash
   node index.js
   ```

2. **Test with MCP Inspector or Claude Desktop:**
   - Ask: "What tools are available?"
   - Ask: "Calculate 15 + 25"
   - Ask: "Divide 100 by 4"

## Working with Different Parameter Types

Let's add tools that demonstrate various parameter types and validation patterns.

### String Parameters with Validation

```javascript
{
  name: 'generate_password',
  description: 'Generates a secure password',
  inputSchema: {
    type: 'object',
    properties: {
      length: {
        type: 'integer',
        description: 'Password length',
        minimum: 8,
        maximum: 128,
        default: 12
      },
      include_symbols: {
        type: 'boolean',
        description: 'Include special symbols',
        default: true
      },
      exclude_similar: {
        type: 'boolean',
        description: 'Exclude similar characters (0, O, l, 1)',
        default: false
      },
      custom_charset: {
        type: 'string',
        description: 'Custom character set to use (optional)',
        pattern: '^[a-zA-Z0-9!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]*$'
      }
    },
    required: ['length']
  }
}
```

Implementation:

```javascript
if (request.params.name === 'generate_password') {
  const { 
    length = 12, 
    include_symbols = true, 
    exclude_similar = false,
    custom_charset 
  } = request.params.arguments;
  
  let charset = custom_charset;
  
  if (!charset) {
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    if (include_symbols) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }
    
    if (exclude_similar) {
      charset = charset.replace(/[0Ol1]/g, '');
    }
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `Generated password: ${password}\nLength: ${password.length} characters`
      }
    ]
  };
}
```

### Array and Object Parameters

```javascript
{
  name: 'format_data',
  description: 'Formats data into various output formats',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: 'Array of data objects to format',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' },
            category: { type: 'string' }
          },
          required: ['name', 'value']
        }
      },
      format: {
        type: 'string',
        description: 'Output format',
        enum: ['table', 'json', 'csv', 'summary'],
        default: 'table'
      },
      sort_by: {
        type: 'string',
        description: 'Field to sort by',
        enum: ['name', 'value', 'category']
      }
    },
    required: ['data']
  }
}
```

Implementation:

```javascript
if (request.params.name === 'format_data') {
  const { data, format = 'table', sort_by } = request.params.arguments;
  
  // Sort data if requested
  let sortedData = [...data];
  if (sort_by) {
    sortedData.sort((a, b) => {
      if (typeof a[sort_by] === 'number') {
        return b[sort_by] - a[sort_by]; // Descending for numbers
      }
      return a[sort_by].localeCompare(b[sort_by]); // Ascending for strings
    });
  }
  
  let output;
  
  switch (format) {
    case 'json':
      output = JSON.stringify(sortedData, null, 2);
      break;
      
    case 'csv':
      const headers = Object.keys(sortedData[0] || {}).join(',');
      const rows = sortedData.map(item => 
        Object.values(item).map(val => `"${val}"`).join(',')
      ).join('\n');
      output = `${headers}\n${rows}`;
      break;
      
    case 'summary':
      const total = sortedData.reduce((sum, item) => sum + item.value, 0);
      const avg = total / sortedData.length;
      const categories = [...new Set(sortedData.map(item => item.category))];
      output = `Summary:\n- Total items: ${sortedData.length}\n- Sum of values: ${total}\n- Average value: ${avg.toFixed(2)}\n- Categories: ${categories.join(', ')}`;
      break;
      
    default: // table
      const maxNameLen = Math.max(...sortedData.map(item => item.name.length), 4);
      const maxValueLen = Math.max(...sortedData.map(item => item.value.toString().length), 5);
      const maxCatLen = Math.max(...sortedData.map(item => (item.category || '').length), 8);
      
      let table = `| ${'Name'.padEnd(maxNameLen)} | ${'Value'.padEnd(maxValueLen)} | ${'Category'.padEnd(maxCatLen)} |\n`;
      table += `|${'-'.repeat(maxNameLen + 2)}|${'-'.repeat(maxValueLen + 2)}|${'-'.repeat(maxCatLen + 2)}|\n`;
      
      for (const item of sortedData) {
        table += `| ${item.name.padEnd(maxNameLen)} | ${item.value.toString().padEnd(maxValueLen)} | ${(item.category || '').padEnd(maxCatLen)} |\n`;
      }
      
      output = table;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `Formatted data (${format}):\n\n${output}`
      }
    ]
  };
}
```

## Returning Different Content Types

MCP supports multiple content types in responses. Let's explore different ways to return data.

### Text with Rich Formatting

```javascript
{
  name: 'system_info',
  description: 'Returns formatted system information',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['simple', 'detailed', 'json'],
        default: 'simple'
      }
    }
  }
}
```

Implementation:

```javascript
import os from 'os';

if (request.params.name === 'system_info') {
  const { format = 'simple' } = request.params.arguments;
  
  const info = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024),
      used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
    },
    cpu: {
      model: os.cpus()[0].model,
      cores: os.cpus().length
    }
  };
  
  let content;
  
  switch (format) {
    case 'json':
      content = JSON.stringify(info, null, 2);
      break;
      
    case 'detailed':
      content = `🖥️  System Information (Detailed)
      
Platform: ${info.platform} (${info.arch})
Node.js Version: ${info.nodeVersion}
Process Uptime: ${Math.floor(info.uptime / 60)} minutes, ${info.uptime % 60} seconds

💾 Memory Usage:
  Total: ${info.memory.total} MB
  Used:  ${info.memory.used} MB (${Math.round(info.memory.used / info.memory.total * 100)}%)
  Free:  ${info.memory.free} MB

🔧 CPU Information:
  Model: ${info.cpu.model}
  Cores: ${info.cpu.cores}`;
      break;
      
    default: // simple
      content = `System: ${info.platform}/${info.arch}, Node: ${info.nodeVersion}, Memory: ${info.memory.used}/${info.memory.total}MB, CPU: ${info.cpu.cores} cores`;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: content
      }
    ]
  };
}
```

### Multiple Content Items

```javascript
{
  name: 'file_analysis',
  description: 'Analyzes a file and returns multiple content types',
  inputSchema: {
    type: 'object',
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to the file to analyze'
      }
    },
    required: ['filepath']
  }
}
```

Implementation:

```javascript
import fs from 'fs/promises';
import path from 'path';

if (request.params.name === 'file_analysis') {
  const { filepath } = request.params.arguments;
  
  try {
    const stats = await fs.stat(filepath);
    const content = await fs.readFile(filepath, 'utf8');
    
    const analysis = {
      size: stats.size,
      lines: content.split('\n').length,
      words: content.split(/\s+/).filter(w => w.length > 0).length,
      chars: content.length,
      extension: path.extname(filepath),
      modified: stats.mtime.toISOString()
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `📄 File Analysis: ${path.basename(filepath)}`
        },
        {
          type: 'text',
          text: `📊 Statistics:
• Size: ${analysis.size} bytes
• Lines: ${analysis.lines}
• Words: ${analysis.words}
• Characters: ${analysis.chars}
• Extension: ${analysis.extension}
• Modified: ${new Date(analysis.modified).toLocaleString()}`
        },
        {
          type: 'text',
          text: `📄 Content Preview:\n\n${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error analyzing file: ${error.message}`
        }
      ]
    };
  }
}
```

### Resource References

```javascript
{
  name: 'create_temp_file',
  description: 'Creates a temporary file with content',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Content to write to the file'
      },
      extension: {
        type: 'string',
        description: 'File extension',
        default: 'txt'
      }
    },
    required: ['content']
  }
}
```

Implementation:

```javascript
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

if (request.params.name === 'create_temp_file') {
  const { content, extension = 'txt' } = request.params.arguments;
  
  try {
    const filename = `temp_${Date.now()}.${extension}`;
    const filepath = path.join(tmpdir(), filename);
    
    await fs.writeFile(filepath, content, 'utf8');
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Created temporary file: ${filename}`
        },
        {
          type: 'resource',
          resource: {
            uri: `file://${filepath}`,
            name: filename,
            description: `Temporary file with ${content.length} characters`
          }
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error creating file: ${error.message}`
        }
      ]
    };
  }
}
```

## Adding Error Handling

Proper error handling is crucial for robust MCP servers. Let's add comprehensive error handling patterns.

### Input Validation with Detailed Errors

```javascript
function validateCalculatorInput(args) {
  const errors = [];
  
  if (!args.operation) {
    errors.push('operation is required');
  } else if (!['add', 'subtract', 'multiply', 'divide'].includes(args.operation)) {
    errors.push(`operation must be one of: add, subtract, multiply, divide. Got: ${args.operation}`);
  }
  
  if (typeof args.a !== 'number') {
    errors.push(`parameter 'a' must be a number. Got: ${typeof args.a}`);
  } else if (!isFinite(args.a)) {
    errors.push(`parameter 'a' must be a finite number. Got: ${args.a}`);
  }
  
  if (typeof args.b !== 'number') {
    errors.push(`parameter 'b' must be a number. Got: ${typeof args.b}`);
  } else if (!isFinite(args.b)) {
    errors.push(`parameter 'b' must be a finite number. Got: ${args.b}`);
  }
  
  if (args.operation === 'divide' && args.b === 0) {
    errors.push('cannot divide by zero');
  }
  
  return errors;
}

// Updated calculator implementation with validation
if (request.params.name === 'calculate') {
  const args = request.params.arguments;
  const validationErrors = validateCalculatorInput(args);
  
  if (validationErrors.length > 0) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Validation errors:\n${validationErrors.map(e => `• ${e}`).join('\n')}`
        }
      ]
    };
  }
  
  const { operation, a, b } = args;
  let result;
  
  try {
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = a / b; break;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ ${a} ${operation} ${b} = ${result}`
        }
      ]
    };
  } catch (error) {
    console.error(`Calculator error:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Calculation error: ${error.message}`
        }
      ]
    };
  }
}
```

### Async Error Handling

```javascript
{
  name: 'fetch_url',
  description: 'Fetches content from a URL',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch',
        pattern: '^https?://.+'
      },
      timeout: {
        type: 'integer',
        description: 'Timeout in milliseconds',
        minimum: 1000,
        maximum: 30000,
        default: 5000
      }
    },
    required: ['url']
  }
}
```

Implementation with comprehensive error handling:

```javascript
if (request.params.name === 'fetch_url') {
  const { url, timeout = 5000 } = request.params.arguments;
  
  try {
    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Invalid URL format: ${error.message}`
          }
        ]
      };
    }
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Only HTTP and HTTPS URLs are allowed. Got: ${urlObj.protocol}`
          }
        ]
      };
    }
    
    console.error(`Fetching URL: ${url} with timeout: ${timeout}ms`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MCP-Server/1.0.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ HTTP Error: ${response.status} ${response.statusText}`
          }
        ]
      };
    }
    
    const contentType = response.headers.get('content-type') || '';
    let content;
    
    if (contentType.includes('application/json')) {
      content = JSON.stringify(await response.json(), null, 2);
    } else {
      content = await response.text();
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Fetched ${url} (${response.status} ${response.statusText})`
        },
        {
          type: 'text',
          text: `Content-Type: ${contentType}\nContent Length: ${content.length} characters`
        },
        {
          type: 'text',
          text: `Content:\n\n${content.substring(0, 1000)}${content.length > 1000 ? '\n\n... (truncated)' : ''}`
        }
      ]
    };
    
  } catch (error) {
    console.error(`URL fetch error:`, error);
    
    let errorMessage = `❌ Failed to fetch URL: ${error.message}`;
    
    if (error.name === 'AbortError') {
      errorMessage = `❌ Request timed out after ${timeout}ms`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = `❌ DNS lookup failed - host not found`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = `❌ Connection refused - server not reachable`;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: errorMessage
        }
      ]
    };
  }
}
```

## Implementing Tool Validation

Let's implement a comprehensive validation system using Zod for runtime type checking.

### Installing Zod

First, add Zod to your project:

```bash
npm install zod
```

### Setting Up Validation Schemas

```javascript
import { z } from 'zod';

// Define validation schemas for each tool
const schemas = {
  say_hello: z.object({
    name: z.string()
      .min(1, 'Name cannot be empty')
      .max(50, 'Name too long (max 50 characters)')
      .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  }),
  
  calculate: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number().finite('First number must be finite'),
    b: z.number().finite('Second number must be finite')
  }).refine(
    (data) => !(data.operation === 'divide' && data.b === 0),
    {
      message: 'Cannot divide by zero',
      path: ['b']
    }
  ),
  
  generate_password: z.object({
    length: z.number().int().min(8).max(128),
    include_symbols: z.boolean().optional().default(true),
    exclude_similar: z.boolean().optional().default(false),
    custom_charset: z.string()
      .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]*$/, 'Invalid characters in custom charset')
      .optional()
  }),
  
  format_data: z.object({
    data: z.array(z.object({
      name: z.string(),
      value: z.number(),
      category: z.string().optional()
    })).min(1, 'Data array cannot be empty'),
    format: z.enum(['table', 'json', 'csv', 'summary']).optional().default('table'),
    sort_by: z.enum(['name', 'value', 'category']).optional()
  })
};

// Generic validation function
function validateToolInput(toolName, args) {
  const schema = schemas[toolName];
  if (!schema) {
    throw new Error(`No validation schema defined for tool: ${toolName}`);
  }
  
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}
```

### Updated tools_call Handler with Validation

```javascript
server.setRequestHandler('tools_call', async (request) => {
  const toolName = request.params.name;
  const rawArgs = request.params.arguments;
  
  console.error(`Processing tool: ${toolName}`);
  console.error(`Raw arguments:`, rawArgs);
  
  try {
    // Validate input arguments
    const args = validateToolInput(toolName, rawArgs);
    console.error(`Validated arguments:`, args);
    
    // Route to appropriate tool handler
    switch (toolName) {
      case 'say_hello':
        return handleSayHello(args);
      case 'calculate':
        return handleCalculate(args);
      case 'generate_password':
        return handleGeneratePassword(args);
      case 'format_data':
        return handleFormatData(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
  } catch (error) {
    console.error(`Tool ${toolName} error:`, error.message);
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error in ${toolName}: ${error.message}`
        }
      ]
    };
  }
});

// Separate handler functions for cleaner code
function handleSayHello(args) {
  const greeting = `Hello, ${args.name}! This is your MCP server speaking.`;
  return {
    content: [
      {
        type: 'text',
        text: greeting
      }
    ]
  };
}

function handleCalculate(args) {
  const { operation, a, b } = args;
  let result;
  
  switch (operation) {
    case 'add': result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide': result = a / b; break;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `✅ ${a} ${operation} ${b} = ${result}`
      }
    ]
  };
}

function handleGeneratePassword(args) {
  const { length, include_symbols, exclude_similar, custom_charset } = args;
  
  let charset = custom_charset;
  
  if (!charset) {
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    if (include_symbols) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }
    
    if (exclude_similar) {
      charset = charset.replace(/[0Ol1]/g, '');
    }
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `🔐 Generated password: ${password}\nLength: ${password.length} characters\nCharset size: ${charset.length} characters`
      }
    ]
  };
}

function handleFormatData(args) {
  // Implementation as shown earlier...
  const { data, format, sort_by } = args;
  
  let sortedData = [...data];
  if (sort_by) {
    sortedData.sort((a, b) => {
      if (typeof a[sort_by] === 'number') {
        return b[sort_by] - a[sort_by];
      }
      return a[sort_by].localeCompare(b[sort_by]);
    });
  }
  
  // Format data according to requested format
  // ... (implementation as shown in earlier section)
}
```

## Adding Multiple Tools

Now let's organize our server to handle multiple tools cleanly. Here's the complete extended server:

### Complete Extended Server

```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

// Validation schemas
const schemas = {
  say_hello: z.object({
    name: z.string().min(1).max(50)
  }),
  
  calculate: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number().finite(),
    b: z.number().finite()
  }).refine(
    (data) => !(data.operation === 'divide' && data.b === 0),
    { message: 'Cannot divide by zero', path: ['b'] }
  ),
  
  generate_password: z.object({
    length: z.number().int().min(8).max(128).default(12),
    include_symbols: z.boolean().default(true),
    exclude_similar: z.boolean().default(false)
  }),
  
  system_info: z.object({
    format: z.enum(['simple', 'detailed', 'json']).default('simple')
  }),
  
  current_time: z.object({
    timezone: z.string().optional(),
    format: z.enum(['iso', 'local', 'unix']).default('local')
  })
};

// Create server
const server = new Server(
  {
    name: 'extended-hello-world-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'say_hello',
    description: 'Says hello to someone',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the person to greet',
          minLength: 1,
          maxLength: 50
        }
      },
      required: ['name']
    }
  },
  {
    name: 'calculate',
    description: 'Performs basic mathematical calculations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Mathematical operation',
          enum: ['add', 'subtract', 'multiply', 'divide']
        },
        a: {
          type: 'number',
          description: 'First number'
        },
        b: {
          type: 'number',
          description: 'Second number'
        }
      },
      required: ['operation', 'a', 'b']
    }
  },
  {
    name: 'generate_password',
    description: 'Generates a secure password with customizable options',
    inputSchema: {
      type: 'object',
      properties: {
        length: {
          type: 'integer',
          description: 'Password length',
          minimum: 8,
          maximum: 128,
          default: 12
        },
        include_symbols: {
          type: 'boolean',
          description: 'Include special symbols',
          default: true
        },
        exclude_similar: {
          type: 'boolean',
          description: 'Exclude similar characters (0, O, l, 1)',
          default: false
        }
      }
    }
  },
  {
    name: 'system_info',
    description: 'Returns system information',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['simple', 'detailed', 'json'],
          default: 'simple'
        }
      }
    }
  },
  {
    name: 'current_time',
    description: 'Returns the current date and time',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., "America/New_York", "UTC")'
        },
        format: {
          type: 'string',
          description: 'Time format',
          enum: ['iso', 'local', 'unix'],
          default: 'local'
        }
      }
    }
  }
];

// Register tools
server.setRequestHandler('tools_list', async () => ({
  tools
}));

// Validation helper
function validateInput(toolName, args) {
  const schema = schemas[toolName];
  if (!schema) {
    throw new Error(`No validation schema for tool: ${toolName}`);
  }
  
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

// Tool handlers
const toolHandlers = {
  say_hello: (args) => {
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${args.name}! This is your extended MCP server speaking. 👋`
        }
      ]
    };
  },
  
  calculate: (args) => {
    const { operation, a, b } = args;
    let result;
    let symbol;
    
    switch (operation) {
      case 'add': result = a + b; symbol = '+'; break;
      case 'subtract': result = a - b; symbol = '-'; break;
      case 'multiply': result = a * b; symbol = '×'; break;
      case 'divide': result = a / b; symbol = '÷'; break;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `🧮 ${a} ${symbol} ${b} = ${result}`
        }
      ]
    };
  },
  
  generate_password: (args) => {
    const { length, include_symbols, exclude_similar } = args;
    
    let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    if (include_symbols) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }
    
    if (exclude_similar) {
      charset = charset.replace(/[0Ol1]/g, '');
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `🔐 Generated password: ${password}`
        },
        {
          type: 'text',
          text: `📊 Password stats:\n• Length: ${password.length} characters\n• Character set size: ${charset.length}\n• Symbols included: ${include_symbols ? 'Yes' : 'No'}\n• Similar chars excluded: ${exclude_similar ? 'Yes' : 'No'}`
        }
      ]
    };
  },
  
  system_info: (args) => {
    const { format } = args;
    
    const info = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length
      }
    };
    
    switch (format) {
      case 'json':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2)
            }
          ]
        };
        
      case 'detailed':
        return {
          content: [
            {
              type: 'text',
              text: `🖥️  System Information (Detailed)

Platform: ${info.platform} (${info.arch})
Node.js Version: ${info.nodeVersion}
Process Uptime: ${Math.floor(info.uptime / 60)} minutes

💾 Memory Usage:
  Total: ${info.memory.total} MB
  Used:  ${info.memory.used} MB (${Math.round(info.memory.used / info.memory.total * 100)}%)
  Free:  ${info.memory.free} MB

🔧 CPU Information:
  Model: ${info.cpu.model}
  Cores: ${info.cpu.cores}`
            }
          ]
        };
        
      default: // simple
        return {
          content: [
            {
              type: 'text',
              text: `💻 ${info.platform}/${info.arch}, Node ${info.nodeVersion}, ${info.memory.used}/${info.memory.total}MB RAM, ${info.cpu.cores} CPU cores`
            }
          ]
        };
    }
  },
  
  current_time: (args) => {
    const { timezone, format } = args;
    const now = new Date();
    
    let timeString;
    let description = 'Current time';
    
    try {
      switch (format) {
        case 'iso':
          timeString = timezone ? 
            now.toLocaleString('sv-SE', { timeZone: timezone }) + 'Z' :
            now.toISOString();
          description = `Current time (ISO format${timezone ? `, ${timezone}` : ', UTC'})`;
          break;
          
        case 'unix':
          timeString = Math.floor(now.getTime() / 1000).toString();
          description = 'Current time (Unix timestamp)';
          break;
          
        default: // local
          if (timezone) {
            timeString = now.toLocaleString('en-US', { 
              timeZone: timezone,
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });
            description = `Current time in ${timezone}`;
          } else {
            timeString = now.toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });
            description = 'Current local time';
          }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `🕐 ${description}: ${timeString}`
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error formatting time: ${error.message}`
          }
        ]
      };
    }
  }
};

// Main tool call handler
server.setRequestHandler('tools_call', async (request) => {
  const toolName = request.params.name;
  const rawArgs = request.params.arguments || {};
  
  console.error(`🔧 Tool called: ${toolName}`);
  
  try {
    // Validate input
    const validatedArgs = validateInput(toolName, rawArgs);
    
    // Get handler
    const handler = toolHandlers[toolName];
    if (!handler) {
      throw new Error(`No handler found for tool: ${toolName}`);
    }
    
    // Execute tool
    const result = await handler(validatedArgs);
    console.error(`✅ Tool ${toolName} completed successfully`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Tool ${toolName} failed:`, error.message);
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error in ${toolName}: ${error.message}`
        }
      ]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('🚀 Extended Hello World MCP Server running!');
console.error(`📦 ${tools.length} tools available: ${tools.map(t => t.name).join(', ')}`);
```

## Testing Your Extensions

### Manual Testing Script

Create a test script to verify your tools work correctly:

```javascript
// test-tools.js
const testCases = [
  {
    name: 'say_hello',
    args: { name: 'Bernie' },
    description: 'Basic greeting'
  },
  {
    name: 'calculate',
    args: { operation: 'add', a: 15, b: 25 },
    description: 'Addition'
  },
  {
    name: 'calculate',
    args: { operation: 'divide', a: 100, b: 0 },
    description: 'Division by zero (should fail gracefully)'
  },
  {
    name: 'generate_password',
    args: { length: 16, include_symbols: true },
    description: 'Password generation'
  },
  {
    name: 'system_info',
    args: { format: 'detailed' },
    description: 'System information'
  },
  {
    name: 'current_time',
    args: { format: 'iso' },
    description: 'Current time in ISO format'
  }
];

// Run tests (this would be part of a testing framework)
console.log('🧪 Test cases to try:');
testCases.forEach((test, i) => {
  console.log(`${i + 1}. ${test.description}`);
  console.log(`   Tool: ${test.name}`);
  console.log(`   Args: ${JSON.stringify(test.args)}`);
  console.log('');
});
```

### Using with Claude Desktop

Update your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "extended-hello": {
      "command": "node",
      "args": ["/absolute/path/to/your/extended-server.js"],
      "env": {
        "DEBUG_MCP": "true"
      }
    }
  }
}
```

Test prompts for Claude:
- "What tools are available from the extended-hello server?"
- "Generate a 20-character password with symbols but no similar characters"
- "Calculate 144 divided by 12"
- "Show me detailed system information"
- "What time is it in Tokyo?"

## Best Practices

### 1. Organization and Structure

- **Separate concerns**: Keep tool definitions, validation, and handlers separate
- **Use consistent naming**: Follow naming conventions for tools and parameters
- **Group related tools**: Organize similar functionality together
- **Document everything**: Add clear descriptions to all tools and parameters

### 2. Error Handling

- **Validate early**: Check inputs before processing
- **Fail gracefully**: Return helpful error messages instead of crashing
- **Log for debugging**: Use console.error for diagnostic information
- **Handle edge cases**: Consider what could go wrong and handle it

### 3. Performance

- **Use async/await**: Handle asynchronous operations properly
- **Avoid blocking**: Don't use synchronous file operations in production
- **Cache when appropriate**: Store expensive computations when possible
- **Set timeouts**: Prevent hanging operations

### 4. Security

- **Validate inputs**: Never trust user input
- **Sanitize outputs**: Be careful with data you return
- **Limit resource usage**: Set bounds on memory, time, and network usage
- **Follow least privilege**: Only provide necessary capabilities

### 5. Testing

- **Test incrementally**: Add one tool at a time and test thoroughly
- **Use multiple clients**: Test with both MCP Inspector and Claude Desktop
- **Test error cases**: Verify error handling works correctly
- **Document test cases**: Keep track of what scenarios you've verified

By following these patterns and practices, you can build robust, extensible MCP servers that provide valuable functionality to AI assistants while maintaining reliability and security.