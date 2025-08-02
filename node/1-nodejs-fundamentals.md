# Node.js Fundamentals for MCP Development

## Table of Contents
- [What is Node.js](#what-is-nodejs)
- [Why Node.js for MCP Servers](#why-nodejs-for-mcp-servers)
- [JavaScript Modules](#javascript-modules)
- [The Event Loop and Async/Await](#the-event-loop-and-asyncawait)
- [File System Operations](#file-system-operations)
- [Running Node.js Scripts](#running-nodejs-scripts)
- [Understanding package.json](#understanding-packagejson)
- [Practical Examples](#practical-examples)

## What is Node.js

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It allows you to run JavaScript code outside of a web browser, making it perfect for server-side applications, command-line tools, and network applications.

### Key Features:
- **Event-driven**: Uses an event loop to handle multiple operations concurrently
- **Non-blocking I/O**: Operations don't wait for each other to complete
- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Large ecosystem**: Access to hundreds of thousands of packages via npm

### Installing Node.js
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from nodejs.org or use a package manager:
# macOS with Homebrew:
brew install node

# Ubuntu/Debian:
sudo apt update && sudo apt install nodejs npm
```

## Why Node.js for MCP Servers

MCP (Model Context Protocol) servers are ideal for Node.js because:

1. **Stdio Communication**: MCP servers communicate via standard input/output, which Node.js handles excellently
2. **JSON Processing**: Native JSON support makes handling MCP messages effortless
3. **Async Operations**: MCP servers often need to perform I/O operations (file reading, API calls) without blocking
4. **Rich Ecosystem**: The `@modelcontextprotocol/sdk` package provides all necessary tools

Looking at our hello-world MCP server:
```javascript
// This line tells the system to use Node.js to run this script
#!/usr/bin/env node

// Import MCP SDK modules
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
```

## JavaScript Modules

Node.js supports two module systems: CommonJS and ES Modules (ESM).

### CommonJS (Traditional)
```javascript
// Exporting
module.exports = {
  sayHello: (name) => `Hello, ${name}!`
};

// Importing
const { sayHello } = require('./hello.js');
```

### ES Modules (Modern - Used in MCP)
```javascript
// Exporting
export const sayHello = (name) => `Hello, ${name}!`;
export default function greet(name) {
  return `Greetings, ${name}!`;
}

// Importing
import { sayHello } from './hello.js';
import greet from './hello.js';
```

Our MCP server uses ES modules, as indicated by `"type": "module"` in package.json:
```javascript
// ES module imports - notice the .js extension is required
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
```

## The Event Loop and Async/Await

Node.js uses a single-threaded event loop to handle multiple operations concurrently.

### Understanding Async Operations
```javascript
// Synchronous (blocking) - avoid this for I/O operations
function blockingRead() {
  const fs = require('fs');
  const data = fs.readFileSync('file.txt', 'utf8');
  return data;
}

// Asynchronous with callbacks (old style)
function callbackRead(callback) {
  const fs = require('fs');
  fs.readFile('file.txt', 'utf8', (err, data) => {
    if (err) callback(err);
    else callback(null, data);
  });
}

// Modern async/await (preferred)
async function modernRead() {
  const fs = require('fs').promises;
  try {
    const data = await fs.readFile('file.txt', 'utf8');
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}
```

### Async/Await in MCP Servers
Our MCP server uses async/await extensively:
```javascript
// Handler functions are async
server.setRequestHandler('tools_list', async () => ({
  tools: [
    // tool definitions
  ]
}));

server.setRequestHandler('tools_call', async (request) => {
  // This could involve async operations like:
  // - Reading files
  // - Making API calls  
  // - Database queries
  const name = request.params.arguments.name;
  return {
    content: [
      {
        type: 'text',
        text: `Hello, ${name}! This is your MCP server speaking.`
      }
    ]
  };
});

// Starting the server is also async
const transport = new StdioServerTransport();
await server.connect(transport);
```

## File System Operations

Node.js provides comprehensive file system operations through the `fs` module.

### Basic File Operations
```javascript
import { promises as fs } from 'fs';
import path from 'path';

// Reading files
async function readConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Config file not found, using defaults');
    return { default: true };
  }
}

// Writing files
async function saveResults(results) {
  const outputPath = path.join(process.cwd(), 'results.json');
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
}

// Checking if files exist
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

### File Operations in MCP Context
MCP servers often need to read configuration files or access data:
```javascript
// Example: Enhanced MCP server that reads configuration
import { promises as fs } from 'fs';
import path from 'path';

async function loadServerConfig() {
  const configPath = path.join(process.cwd(), 'mcp-config.json');
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    // Return default configuration if file doesn't exist
    return {
      greetings: ['Hello', 'Hi', 'Greetings'],
      maxNameLength: 50
    };
  }
}

// Use in tool handler
server.setRequestHandler('tools_call', async (request) => {
  if (request.params.name === 'say_hello') {
    const config = await loadServerConfig();
    const name = request.params.arguments.name;
    
    if (name.length > config.maxNameLength) {
      throw new Error(`Name too long (max ${config.maxNameLength} characters)`);
    }
    
    const greeting = config.greetings[Math.floor(Math.random() * config.greetings.length)];
    
    return {
      content: [
        {
          type: 'text',
          text: `${greeting}, ${name}! This is your MCP server speaking.`
        }
      ]
    };
  }
});
```

## Running Node.js Scripts

### Direct Execution
```bash
# Run a JavaScript file
node script.js

# Run with command line arguments
node script.js arg1 arg2

# Run with environment variables
NODE_ENV=production node script.js
```

### Accessing Command Line Arguments
```javascript
// script.js
console.log('Process arguments:', process.argv);
console.log('Script name:', process.argv[1]);
console.log('First argument:', process.argv[2]);

// Environment variables
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());
```

### Making Scripts Executable
The shebang line makes scripts executable directly:
```javascript
#!/usr/bin/env node
// This tells the system to use Node.js to run this script

console.log('Hello from executable script!');
```

```bash
# Make script executable
chmod +x script.js

# Run directly
./script.js
```

Our MCP server uses this pattern:
```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// ... rest of the server code
```

## Understanding package.json

The `package.json` file is the heart of any Node.js project. Let's examine our MCP server's package.json:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.1"
  },
  "name": "cdc-mcp",
  "version": "1.0.0",
  "description": "Bernie first MCP",
  "main": "index.js",
  "devDependencies": {},
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "Bernie Pruss",
  "license": "ISC",
  "type": "module",
  "bin": {
    "cdc-mcp": "./index.js"
  }
}
```

### Key Fields Explained:

#### Basic Information
- **name**: Package identifier (must be unique if publishing to npm)
- **version**: Current version following semantic versioning (major.minor.patch)
- **description**: Brief description of what the package does
- **author**: Package creator
- **license**: Legal license for the code

#### Functionality
- **main**: Entry point when package is imported (`require('package-name')`)
- **type**: "module" enables ES modules instead of CommonJS
- **bin**: Makes the package executable as a command-line tool

#### Dependencies
- **dependencies**: Packages needed to run the application
- **devDependencies**: Packages only needed for development (testing, building)

#### Scripts
- **scripts**: Custom commands you can run with `npm run <script-name>`

### Dependency Version Ranges
```json
{
  "dependencies": {
    "exact-version": "1.2.3",      // Exactly 1.2.3
    "caret-range": "^1.2.3",       // >=1.2.3 <2.0.0 (compatible)
    "tilde-range": "~1.2.3",       // >=1.2.3 <1.3.0 (patch updates)
    "latest": "*",                 // Latest version (dangerous)
    "range": ">=1.2.0 <1.4.0"     // Specific range
  }
}
```

## Practical Examples

### Example 1: Simple File-Reading MCP Tool
```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { promises as fs } from 'fs';
import path from 'path';

const server = new Server(
  {
    name: 'file-reader-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler('tools_list', async () => ({
  tools: [
    {
      name: 'read_file',
      description: 'Reads the content of a text file',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Name of the file to read'
          }
        },
        required: ['filename']
      }
    }
  ]
}));

server.setRequestHandler('tools_call', async (request) => {
  if (request.params.name === 'read_file') {
    const filename = request.params.arguments.filename;
    
    try {
      // Security: Only allow reading files in current directory
      const filePath = path.join(process.cwd(), filename);
      const content = await fs.readFile(filePath, 'utf8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Contents of ${filename}:\n\n${content}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file ${filename}: ${error.message}`
          }
        ]
      };
    }
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('File Reader MCP Server running!');
```

### Example 2: Understanding the Event Loop
```javascript
console.log('1: Start');

setTimeout(() => {
  console.log('4: Timeout callback');
}, 0);

Promise.resolve().then(() => {
  console.log('3: Promise resolved');
});

console.log('2: End');

// Output:
// 1: Start
// 2: End  
// 3: Promise resolved
// 4: Timeout callback
```

This demonstrates how Node.js processes:
1. Synchronous code runs first
2. Promises (microtasks) run before timeouts (macrotasks)
3. Even a 0ms timeout waits for the current execution to complete

### Example 3: Error Handling in Async Code
```javascript
// Good error handling pattern for MCP servers
server.setRequestHandler('tools_call', async (request) => {
  try {
    if (request.params.name === 'risky_operation') {
      // Simulate an operation that might fail
      const result = await performRiskyOperation();
      
      return {
        content: [
          {
            type: 'text',
            text: `Success: ${result}`
          }
        ]
      };
    }
  } catch (error) {
    // Log error for debugging (goes to stderr, not stdout)
    console.error('Tool execution failed:', error);
    
    // Return user-friendly error message
    return {
      content: [
        {
          type: 'text',
          text: `Sorry, something went wrong: ${error.message}`
        }
      ]
    };
  }
});

async function performRiskyOperation() {
  // Simulate async operation that might fail
  const random = Math.random();
  if (random < 0.3) {
    throw new Error('Random failure occurred');
  }
  return `Operation succeeded with value: ${random}`;
}
```

## Next Steps

Now that you understand Node.js fundamentals, you're ready to learn about:

1. **Package management** with npm and npx (next tutorial)
2. **MCP architecture** and how servers communicate with clients
3. **Building more complex tools** that interact with files, APIs, and databases

Key takeaways:
- Node.js uses an event-driven, non-blocking I/O model
- Modern Node.js development uses ES modules and async/await
- MCP servers are essentially Node.js applications that communicate via stdio
- Understanding package.json is crucial for managing dependencies and configuration
- Proper error handling is essential for robust MCP servers

In the next tutorial, we'll explore npm and npx, which are essential for managing the packages that make MCP development possible.