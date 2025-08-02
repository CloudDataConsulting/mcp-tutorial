# Advanced MCP Patterns: Real-World Examples and Best Practices

## Table of Contents
- [Building a File System Tool](#building-a-file-system-tool)
- [Creating a Web Scraping Tool](#creating-a-web-scraping-tool)
- [Implementing Authentication](#implementing-authentication)
- [Working with Resources and Prompts](#working-with-resources-and-prompts)
- [State Management in MCP Servers](#state-management-in-mcp-servers)
- [Performance Optimization](#performance-optimization)
- [Production Deployment](#production-deployment)
- [Advanced Error Handling Patterns](#advanced-error-handling-patterns)
- [Building Composite Tools](#building-composite-tools)
- [Real-World Integration Examples](#real-world-integration-examples)

## Building a File System Tool

A comprehensive file system tool demonstrates many advanced MCP patterns including security, validation, and complex operations.

### Complete File System MCP Server

```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import { glob } from 'glob';

// Security configuration
const ALLOWED_DIRECTORIES = [
  process.cwd(),
  path.join(process.env.HOME || process.env.USERPROFILE || '/home', 'Documents'),
  '/tmp',
  '/var/tmp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIRECTORY_ENTRIES = 1000;

// Validation schemas
const schemas = {
  read_file: z.object({
    path: z.string().min(1),
    encoding: z.enum(['utf8', 'base64', 'hex']).default('utf8'),
    max_size: z.number().max(MAX_FILE_SIZE).optional()
  }),
  
  write_file: z.object({
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
    mode: z.enum(['create', 'overwrite', 'append']).default('create')
  }),
  
  list_directory: z.object({
    path: z.string().default('.'),
    recursive: z.boolean().default(false),
    include_hidden: z.boolean().default(false),
    pattern: z.string().optional(),
    max_entries: z.number().max(MAX_DIRECTORY_ENTRIES).default(100)
  }),
  
  search_files: z.object({
    directory: z.string().default('.'),
    pattern: z.string(),
    content_pattern: z.string().optional(),
    max_results: z.number().max(100).default(20),
    case_sensitive: z.boolean().default(false)
  }),
  
  file_stats: z.object({
    path: z.string().min(1),
    include_checksum: z.boolean().default(false)
  }),
  
  create_directory: z.object({
    path: z.string().min(1),
    recursive: z.boolean().default(false)
  }),
  
  delete_path: z.object({
    path: z.string().min(1),
    recursive: z.boolean().default(false),
    confirm: z.boolean().default(false)
  })
};

// Security functions
function isPathAllowed(filePath) {
  const absolutePath = path.resolve(filePath);
  return ALLOWED_DIRECTORIES.some(allowed => 
    absolutePath.startsWith(path.resolve(allowed))
  );
}

function sanitizePath(filePath) {
  // Remove path traversal attempts
  const sanitized = path.normalize(filePath).replace(/\.\./g, '');
  if (!isPathAllowed(sanitized)) {
    throw new Error(`Access denied: Path outside allowed directories: ${sanitized}`);
  }
  return sanitized;
}

// Create server
const server = new Server(
  {
    name: 'filesystem-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'base64', 'hex'],
          default: 'utf8',
          description: 'File encoding'
        },
        max_size: {
          type: 'number',
          description: 'Maximum file size to read (bytes)',
          maximum: MAX_FILE_SIZE
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write'
        },
        content: {
          type: 'string',
          description: 'Content to write'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'base64'],
          default: 'utf8',
          description: 'Content encoding'
        },
        mode: {
          type: 'string',
          enum: ['create', 'overwrite', 'append'],
          default: 'create',
          description: 'Write mode'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_directory',
    description: 'List directory contents with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          default: '.',
          description: 'Directory path to list'
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'List subdirectories recursively'
        },
        include_hidden: {
          type: 'boolean',
          default: false,
          description: 'Include hidden files and directories'
        },
        pattern: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g., "*.js", "**/*.md")'
        },
        max_entries: {
          type: 'number',
          maximum: MAX_DIRECTORY_ENTRIES,
          default: 100,
          description: 'Maximum number of entries to return'
        }
      }
    }
  },
  {
    name: 'search_files',
    description: 'Search for files by name and optionally by content',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          default: '.',
          description: 'Directory to search in'
        },
        pattern: {
          type: 'string',
          description: 'File name pattern (glob syntax)'
        },
        content_pattern: {
          type: 'string',
          description: 'Text pattern to search within files (regex)'
        },
        max_results: {
          type: 'number',
          maximum: 100,
          default: 20,
          description: 'Maximum number of results'
        },
        case_sensitive: {
          type: 'boolean',
          default: false,
          description: 'Case sensitive search'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'file_stats',
    description: 'Get detailed file or directory statistics',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to analyze'
        },
        include_checksum: {
          type: 'boolean',
          default: false,
          description: 'Calculate file checksum (for files only)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'create_directory',
    description: 'Create a new directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to create'
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'Create parent directories if they don\'t exist'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_path',
    description: 'Delete a file or directory (use with caution)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to delete'
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'Delete directories recursively'
        },
        confirm: {
          type: 'boolean',
          default: false,
          description: 'Confirmation flag - must be true to proceed'
        }
      },
      required: ['path', 'confirm']
    }
  }
];

server.setRequestHandler('tools_list', async () => ({ tools }));

// Tool handlers with comprehensive error handling
const toolHandlers = {
  async read_file(args) {
    const { path: filePath, encoding, max_size } = args;
    const safePath = sanitizePath(filePath);
    
    try {
      // Check file access
      await fs.access(safePath, fsConstants.R_OK);
      
      // Get file stats
      const stats = await fs.stat(safePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }
      
      const fileSize = stats.size;
      const sizeLimit = max_size || MAX_FILE_SIZE;
      
      if (fileSize > sizeLimit) {
        throw new Error(`File too large: ${fileSize} bytes (limit: ${sizeLimit})`);
      }
      
      // Read file
      const content = await fs.readFile(safePath, encoding);
      
      return {
        content: [
          {
            type: 'text',
            text: `📄 File: ${path.basename(safePath)} (${fileSize} bytes)`
          },
          {
            type: 'text',
            text: encoding === 'utf8' ? content : `Content (${encoding}):\n${content}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },

  async write_file(args) {
    const { path: filePath, content, encoding, mode } = args;
    const safePath = sanitizePath(filePath);
    
    try {
      // Check if file exists
      let fileExists = false;
      try {
        await fs.access(safePath);
        fileExists = true;
      } catch {}
      
      // Handle different write modes
      if (mode === 'create' && fileExists) {
        throw new Error('File already exists. Use "overwrite" or "append" mode.');
      }
      
      let writeContent = content;
      if (encoding === 'base64') {
        writeContent = Buffer.from(content, 'base64').toString('utf8');
      }
      
      // Write file
      if (mode === 'append' && fileExists) {
        await fs.appendFile(safePath, writeContent, 'utf8');
      } else {
        await fs.writeFile(safePath, writeContent, 'utf8');
      }
      
      const stats = await fs.stat(safePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ File ${mode === 'append' ? 'appended' : 'written'}: ${path.basename(safePath)}\n📊 Size: ${stats.size} bytes\n📅 Modified: ${stats.mtime.toLocaleString()}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  },

  async list_directory(args) {
    const { path: dirPath, recursive, include_hidden, pattern, max_entries } = args;
    const safePath = sanitizePath(dirPath);
    
    try {
      await fs.access(safePath, fsConstants.R_OK);
      const stats = await fs.stat(safePath);
      
      if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
      }
      
      let entries;
      
      if (pattern) {
        // Use glob for pattern matching
        const globPattern = recursive ? 
          path.join(safePath, '**', pattern) : 
          path.join(safePath, pattern);
        
        entries = await glob(globPattern, {
          dot: include_hidden,
          absolute: false,
          cwd: safePath
        });
      } else {
        // Simple directory listing
        entries = await fs.readdir(safePath);
        
        if (!include_hidden) {
          entries = entries.filter(entry => !entry.startsWith('.'));
        }
        
        if (recursive) {
          const allEntries = [];
          
          const processDirectory = async (currentPath, relativePath = '') => {
            const items = await fs.readdir(currentPath);
            
            for (const item of items) {
              if (!include_hidden && item.startsWith('.')) continue;
              
              const fullPath = path.join(currentPath, item);
              const relPath = path.join(relativePath, item);
              allEntries.push(relPath);
              
              try {
                const itemStats = await fs.stat(fullPath);
                if (itemStats.isDirectory() && allEntries.length < max_entries) {
                  await processDirectory(fullPath, relPath);
                }
              } catch (error) {
                // Skip inaccessible items
                console.error(`Skipping ${fullPath}: ${error.message}`);
              }
            }
          };
          
          await processDirectory(safePath);
          entries = allEntries;
        }
      }
      
      // Limit results
      if (entries.length > max_entries) {
        entries = entries.slice(0, max_entries);
      }
      
      // Get detailed info for each entry
      const entryDetails = await Promise.all(
        entries.map(async (entry) => {
          try {
            const fullPath = path.join(safePath, entry);
            const stats = await fs.stat(fullPath);
            
            return {
              name: entry,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime.toISOString(),
              permissions: stats.mode.toString(8).slice(-3)
            };
          } catch (error) {
            return {
              name: entry,
              type: 'unknown',
              error: error.message
            };
          }
        })
      );
      
      // Format output
      const table = entryDetails.map(entry => {
        const icon = entry.type === 'directory' ? '📁' : '📄';
        const size = entry.size ? `${entry.size} bytes` : '-';
        const modified = entry.modified ? new Date(entry.modified).toLocaleString() : '-';
        return `${icon} ${entry.name.padEnd(30)} ${size.padEnd(12)} ${modified}`;
      }).join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `📂 Directory: ${safePath}\n📊 Found ${entryDetails.length} entries${entries.length >= max_entries ? ` (limited to ${max_entries})` : ''}\n\n${table}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  },

  async search_files(args) {
    const { directory, pattern, content_pattern, max_results, case_sensitive } = args;
    const safePath = sanitizePath(directory);
    
    try {
      // Find files matching name pattern
      const globPattern = path.join(safePath, '**', pattern);
      const files = await glob(globPattern, { 
        nodir: true,
        absolute: false,
        cwd: safePath
      });
      
      let results = files.slice(0, max_results);
      
      // If content pattern is specified, search within files
      if (content_pattern) {
        const contentMatches = [];
        const regex = new RegExp(content_pattern, case_sensitive ? 'g' : 'gi');
        
        for (const file of results) {
          try {
            const fullPath = path.join(safePath, file);
            const stats = await fs.stat(fullPath);
            
            // Skip large files for content search
            if (stats.size > 1024 * 1024) continue; // Skip files > 1MB
            
            const content = await fs.readFile(fullPath, 'utf8');
            const matches = [...content.matchAll(regex)];
            
            if (matches.length > 0) {
              contentMatches.push({
                file,
                matches: matches.length,
                lines: matches.map(match => {
                  const beforeMatch = content.substring(0, match.index);
                  const lineNumber = beforeMatch.split('\n').length;
                  const line = content.split('\n')[lineNumber - 1];
                  return { lineNumber, line: line.trim() };
                }).slice(0, 3) // Show first 3 matches per file
              });
            }
          } catch (error) {
            // Skip files that can't be read
            console.error(`Skipping ${file}: ${error.message}`);
          }
        }
        
        results = contentMatches;
      }
      
      // Format results
      let output;
      if (content_pattern && Array.isArray(results)) {
        output = results.map(result => 
          `📄 ${result.file}\n   ${result.matches} matches:\n${result.lines.map(l => `   Line ${l.lineNumber}: ${l.line}`).join('\n')}`
        ).join('\n\n');
      } else {
        output = results.map(file => `📄 ${file}`).join('\n');
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 Search results in ${safePath}\n🎯 Pattern: ${pattern}${content_pattern ? `\n📝 Content: ${content_pattern}` : ''}\n📊 Found: ${results.length} results\n\n${output}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  },

  async file_stats(args) {
    const { path: filePath, include_checksum } = args;
    const safePath = sanitizePath(filePath);
    
    try {
      const stats = await fs.stat(safePath);
      
      const info = {
        path: safePath,
        type: stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other',
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: stats.mode.toString(8).slice(-3),
        owner: {
          uid: stats.uid,
          gid: stats.gid
        }
      };
      
      let checksum = null;
      if (include_checksum && stats.isFile()) {
        const crypto = await import('crypto');
        const content = await fs.readFile(safePath);
        checksum = crypto.createHash('sha256').update(content).digest('hex');
      }
      
      const output = `📊 File Statistics: ${path.basename(safePath)}

🏷️  Type: ${info.type}
📏 Size: ${info.size.toLocaleString()} bytes
📅 Created: ${new Date(info.created).toLocaleString()}
📅 Modified: ${new Date(info.modified).toLocaleString()}
📅 Accessed: ${new Date(info.accessed).toLocaleString()}
🔒 Permissions: ${info.permissions}
👤 Owner: UID ${info.owner.uid}, GID ${info.owner.gid}${checksum ? `\n🔐 SHA256: ${checksum}` : ''}`;
      
      return {
        content: [
          {
            type: 'text',
            text: output
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  },

  async create_directory(args) {
    const { path: dirPath, recursive } = args;
    const safePath = sanitizePath(dirPath);
    
    try {
      await fs.mkdir(safePath, { recursive });
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Directory created: ${safePath}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  },

  async delete_path(args) {
    const { path: targetPath, recursive, confirm } = args;
    
    if (!confirm) {
      throw new Error('Deletion requires confirmation. Set confirm: true');
    }
    
    const safePath = sanitizePath(targetPath);
    
    try {
      const stats = await fs.stat(safePath);
      
      if (stats.isDirectory()) {
        if (!recursive) {
          // Try to remove empty directory
          await fs.rmdir(safePath);
        } else {
          // Remove directory and contents
          await fs.rm(safePath, { recursive: true });
        }
      } else {
        // Remove file
        await fs.unlink(safePath);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Deleted: ${safePath}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }
};

// Validation and routing
function validateInput(toolName, args) {
  const schema = schemas[toolName];
  if (!schema) {
    throw new Error(`No validation schema for tool: ${toolName}`);
  }
  return schema.parse(args);
}

server.setRequestHandler('tools_call', async (request) => {
  const toolName = request.params.name;
  const rawArgs = request.params.arguments || {};
  
  console.error(`🔧 FileSystem tool: ${toolName}`);
  
  try {
    const validatedArgs = validateInput(toolName, rawArgs);
    const handler = toolHandlers[toolName];
    
    if (!handler) {
      throw new Error(`No handler for tool: ${toolName}`);
    }
    
    const result = await handler(validatedArgs);
    console.error(`✅ FileSystem ${toolName} completed`);
    
    return result;
  } catch (error) {
    console.error(`❌ FileSystem ${toolName} failed:`, error.message);
    
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

// Resource handling for file access
server.setRequestHandler('resources_list', async () => ({
  resources: [
    {
      uri: 'file://current-directory',
      name: 'Current Directory',
      description: 'Contents of the current working directory'
    }
  ]
}));

server.setRequestHandler('resources_read', async (request) => {
  const uri = request.params.uri;
  
  if (uri === 'file://current-directory') {
    try {
      const entries = await fs.readdir(process.cwd());
      const content = entries.join('\n');
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: content
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to read current directory: ${error.message}`);
    }
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('📁 FileSystem MCP Server running!');
console.error(`🛡️  Security: ${ALLOWED_DIRECTORIES.length} allowed directories`);
console.error(`⚙️  Limits: ${MAX_FILE_SIZE / 1024 / 1024}MB max file size, ${MAX_DIRECTORY_ENTRIES} max directory entries`);
```

## Creating a Web Scraping Tool

A web scraping MCP server demonstrates handling external APIs, content processing, and rate limiting.

### Web Scraping MCP Server

```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Rate limiting
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    return true;
  }
  
  getWaitTime(key = 'default') {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    const waitTime = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}

const rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

// Validation schemas
const schemas = {
  fetch_url: z.object({
    url: z.string().url(),
    timeout: z.number().min(1000).max(30000).default(10000),
    follow_redirects: z.boolean().default(true),
    headers: z.record(z.string()).optional()
  }),
  
  extract_content: z.object({
    url: z.string().url(),
    selector: z.string().optional(),
    extract_type: z.enum(['text', 'html', 'links', 'images', 'metadata']).default('text'),
    timeout: z.number().min(1000).max(30000).default(10000)
  }),
  
  check_status: z.object({
    urls: z.array(z.string().url()).min(1).max(10),
    timeout: z.number().min(1000).max(10000).default(5000)
  }),
  
  screenshot: z.object({
    url: z.string().url(),
    width: z.number().min(320).max(1920).default(1280),
    height: z.number().min(240).max(1080).default(720),
    timeout: z.number().min(5000).max(30000).default(15000)
  })
};

const server = new Server(
  {
    name: 'web-scraper-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'fetch_url',
    description: 'Fetch content from a URL with customizable options',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'URL to fetch'
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 30000,
          default: 10000,
          description: 'Request timeout in milliseconds'
        },
        follow_redirects: {
          type: 'boolean',
          default: true,
          description: 'Follow HTTP redirects'
        },
        headers: {
          type: 'object',
          description: 'Custom HTTP headers',
          additionalProperties: {
            type: 'string'
          }
        }
      },
      required: ['url']
    }
  },
  {
    name: 'extract_content',
    description: 'Extract specific content from a web page',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'URL to scrape'
        },
        selector: {
          type: 'string',
          description: 'CSS selector for content extraction (optional)'
        },
        extract_type: {
          type: 'string',
          enum: ['text', 'html', 'links', 'images', 'metadata'],
          default: 'text',
          description: 'Type of content to extract'
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 30000,
          default: 10000,
          description: 'Request timeout'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'check_status',
    description: 'Check HTTP status of multiple URLs',
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uri'
          },
          minItems: 1,
          maxItems: 10,
          description: 'URLs to check'
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 10000,
          default: 5000,
          description: 'Request timeout per URL'
        }
      },
      required: ['urls']
    }
  }
];

server.setRequestHandler('tools_list', async () => ({ tools }));

// Content extraction utilities
function extractMetadata(html) {
  const metadata = {};
  
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1].trim();
  
  // Meta tags
  const metaPattern = /<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']+)["'][^>]*>/gi;
  let metaMatch;
  while ((metaMatch = metaPattern.exec(html)) !== null) {
    metadata[metaMatch[1]] = metaMatch[2];
  }
  
  return metadata;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const linkPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let linkMatch;
  
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    try {
      const url = new URL(linkMatch[1], baseUrl).href;
      links.push({
        url,
        text: linkMatch[2].trim()
      });
    } catch (error) {
      // Skip invalid URLs
    }
  }
  
  return links;
}

function extractImages(html, baseUrl) {
  const images = [];
  const imgPattern = /<img\s+[^>]*src=["']([^"']+)["'][^>]*(?:\s+alt=["']([^"']*)["'])?[^>]*>/gi;
  let imgMatch;
  
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    try {
      const url = new URL(imgMatch[1], baseUrl).href;
      images.push({
        url,
        alt: imgMatch[2] || ''
      });
    } catch (error) {
      // Skip invalid URLs
    }
  }
  
  return images;
}

function extractText(html) {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Tool handlers
const toolHandlers = {
  async fetch_url(args) {
    const { url, timeout, follow_redirects, headers } = args;
    
    // Rate limiting
    if (!rateLimiter.isAllowed(url)) {
      const waitTime = rateLimiter.getWaitTime(url);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    try {
      console.error(`Fetching: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchOptions = {
        signal: controller.signal,
        redirect: follow_redirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'WebScraper-MCP/1.0.0',
          ...headers
        }
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length') || 'unknown';
      
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
            text: `🌐 URL: ${url}\n📊 Status: ${response.status} ${response.statusText}\n📁 Content-Type: ${contentType}\n📏 Content-Length: ${contentLength}`
          },
          {
            type: 'text',
            text: `📄 Content:\n\n${content.substring(0, 2000)}${content.length > 2000 ? '\n\n... (truncated)' : ''}`
          }
        ]
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw new Error(`Failed to fetch URL: ${error.message}`);
    }
  },

  async extract_content(args) {
    const { url, selector, extract_type, timeout } = args;
    
    if (!rateLimiter.isAllowed(url)) {
      const waitTime = rateLimiter.getWaitTime(url);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    try {
      console.error(`Extracting ${extract_type} from: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WebScraper-MCP/1.0.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      let extractedContent;
      let description;
      
      switch (extract_type) {
        case 'text':
          extractedContent = extractText(html);
          description = `Extracted text content (${extractedContent.length} characters)`;
          break;
          
        case 'html':
          if (selector) {
            // Simple CSS selector support (basic implementation)
            const matches = [];
            if (selector.startsWith('#')) {
              const id = selector.slice(1);
              const pattern = new RegExp(`<[^>]+id=["']${id}["'][^>]*>.*?</[^>]+>`, 'gis');
              const match = html.match(pattern);
              if (match) matches.push(match[0]);
            } else if (selector.startsWith('.')) {
              const className = selector.slice(1);
              const pattern = new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>.*?</[^>]+>`, 'gis');
              const allMatches = html.match(pattern);
              if (allMatches) matches.push(...allMatches);
            } else {
              // Tag selector
              const pattern = new RegExp(`<${selector}[^>]*>.*?</${selector}>`, 'gis');
              const allMatches = html.match(pattern);
              if (allMatches) matches.push(...allMatches);
            }
            extractedContent = matches.join('\n\n');
          } else {
            extractedContent = html;
          }
          description = `Extracted HTML${selector ? ` (selector: ${selector})` : ''}`;
          break;
          
        case 'links':
          const links = extractLinks(html, url);
          extractedContent = links.map(link => `${link.text}: ${link.url}`).join('\n');
          description = `Extracted ${links.length} links`;
          break;
          
        case 'images':
          const images = extractImages(html, url);
          extractedContent = images.map(img => `${img.alt || '(no alt)'}: ${img.url}`).join('\n');
          description = `Extracted ${images.length} images`;
          break;
          
        case 'metadata':
          const metadata = extractMetadata(html);
          extractedContent = Object.entries(metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          description = `Extracted ${Object.keys(metadata).length} metadata entries`;
          break;
          
        default:
          throw new Error(`Unknown extract_type: ${extract_type}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 ${description} from ${url}\n\n${extractedContent.substring(0, 3000)}${extractedContent.length > 3000 ? '\n\n... (truncated)' : ''}`
          }
        ]
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  },

  async check_status(args) {
    const { urls, timeout } = args;
    
    console.error(`Checking status of ${urls.length} URLs`);
    
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        if (!rateLimiter.isAllowed(url)) {
          return {
            url,
            status: 'rate_limited',
            message: 'Rate limit exceeded'
          };
        }
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(url, {
            method: 'HEAD', // Only get headers, not body
            signal: controller.signal,
            headers: {
              'User-Agent': 'WebScraper-MCP/1.0.0'
            }
          });
          
          clearTimeout(timeoutId);
          
          return {
            url,
            status: response.status,
            statusText: response.statusText,
            headers: {
              'content-type': response.headers.get('content-type'),
              'content-length': response.headers.get('content-length'),
              'last-modified': response.headers.get('last-modified')
            }
          };
        } catch (error) {
          return {
            url,
            status: 'error',
            message: error.message
          };
        }
      })
    );
    
    const statusResults = results.map(result => result.value || result.reason);
    
    const summary = statusResults.map(result => {
      if (result.status === 'rate_limited') {
        return `❌ ${result.url}: Rate Limited`;
      } else if (result.status === 'error') {
        return `❌ ${result.url}: Error - ${result.message}`;
      } else {
        const icon = result.status < 300 ? '✅' : result.status < 400 ? '🔄' : '❌';
        return `${icon} ${result.url}: ${result.status} ${result.statusText}`;
      }
    }).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `📊 Status Check Results:\n\n${summary}`
        }
      ]
    };
  }
};

// Validation and routing
function validateInput(toolName, args) {
  const schema = schemas[toolName];
  if (!schema) {
    throw new Error(`No validation schema for tool: ${toolName}`);
  }
  return schema.parse(args);
}

server.setRequestHandler('tools_call', async (request) => {
  const toolName = request.params.name;
  const rawArgs = request.params.arguments || {};
  
  console.error(`🔧 WebScraper tool: ${toolName}`);
  
  try {
    const validatedArgs = validateInput(toolName, rawArgs);
    const handler = toolHandlers[toolName];
    
    if (!handler) {
      throw new Error(`No handler for tool: ${toolName}`);
    }
    
    const result = await handler(validatedArgs);
    console.error(`✅ WebScraper ${toolName} completed`);
    
    return result;
  } catch (error) {
    console.error(`❌ WebScraper ${toolName} failed:`, error.message);
    
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
console.error('🌐 Web Scraper MCP Server running!');
console.error('⚡ Rate limit: 10 requests per minute per URL');
```

## Implementing Authentication

Authentication in MCP servers can be handled through various methods: environment variables, configuration files, or interactive prompts.

### Authentication Manager

```javascript
import { createHash } from 'crypto';

class AuthManager {
  constructor() {
    this.tokens = new Map();
    this.sessions = new Map();
  }
  
  // Environment-based authentication
  static fromEnvironment() {
    const manager = new AuthManager();
    
    // Load API keys from environment
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY,
      github: process.env.GITHUB_TOKEN,
      aws_access_key: process.env.AWS_ACCESS_KEY_ID,
      aws_secret_key: process.env.AWS_SECRET_ACCESS_KEY
    };
    
    Object.entries(apiKeys).forEach(([service, key]) => {
      if (key) {
        manager.tokens.set(service, key);
      }
    });
    
    return manager;
  }
  
  // Configuration file authentication
  static async fromConfigFile(configPath) {
    const manager = new AuthManager();
    
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      Object.entries(config.credentials || {}).forEach(([service, creds]) => {
        manager.tokens.set(service, creds);
      });
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error.message);
    }
    
    return manager;
  }
  
  getToken(service) {
    return this.tokens.get(service);
  }
  
  setToken(service, token) {
    this.tokens.set(service, token);
  }
  
  hasToken(service) {
    return this.tokens.has(service) && this.tokens.get(service);
  }
  
  // Create session for temporary authentication
  createSession(service, credentials, ttl = 3600000) { // 1 hour default
    const sessionId = createHash('sha256')
      .update(`${service}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .slice(0, 16);
    
    const session = {
      service,
      credentials,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    this.sessions.set(sessionId, session);
    
    // Auto-cleanup expired sessions
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, ttl);
    
    return sessionId;
  }
  
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session || Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session;
  }
  
  // Validate credentials for a service
  async validateCredentials(service, credentials) {
    switch (service) {
      case 'github':
        return this.validateGitHubToken(credentials.token);
      case 'openai':
        return this.validateOpenAIKey(credentials.key);
      default:
        return false;
    }
  }
  
  async validateGitHubToken(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'MCP-Server/1.0.0'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async validateOpenAIKey(key) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
          'User-Agent': 'MCP-Server/1.0.0'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Usage in MCP server
const authManager = AuthManager.fromEnvironment();

// Example authenticated tool
{
  name: 'github_repos',
  description: 'List GitHub repositories for authenticated user',
  inputSchema: {
    type: 'object',
    properties: {
      per_page: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20
      }
    }
  }
}

// Tool handler with authentication
async function handleGitHubRepos(args) {
  const token = authManager.getToken('github');
  
  if (!token) {
    throw new Error('GitHub token not configured. Set GITHUB_TOKEN environment variable.');
  }
  
  try {
    const response = await fetch(`https://api.github.com/user/repos?per_page=${args.per_page}`, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'MCP-Server/1.0.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const repos = await response.json();
    
    const repoList = repos.map(repo => 
      `📦 ${repo.full_name}\n   ${repo.description || 'No description'}\n   🌟 ${repo.stargazers_count} stars, 🍴 ${repo.forks_count} forks\n   ${repo.html_url}`
    ).join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `📚 Your GitHub Repositories (${repos.length} found):\n\n${repoList}`
        }
      ]
    };
  } catch (error) {
    throw new Error(`Failed to fetch repositories: ${error.message}`);
  }
}
```

## Working with Resources and Prompts

MCP supports resources (accessible content) and prompts (reusable templates) in addition to tools.

### Advanced Resource Management

```javascript
class ResourceManager {
  constructor() {
    this.resources = new Map();
    this.watchedPaths = new Map();
  }
  
  // Register a static resource
  addStaticResource(uri, name, description, content, mimeType = 'text/plain') {
    this.resources.set(uri, {
      type: 'static',
      name,
      description,
      content,
      mimeType,
      lastModified: new Date().toISOString()
    });
  }
  
  // Register a dynamic resource (generated on access)
  addDynamicResource(uri, name, description, generator) {
    this.resources.set(uri, {
      type: 'dynamic',
      name,
      description,
      generator,
      lastModified: new Date().toISOString()
    });
  }
  
  // Register a file-based resource with watching
  async addFileResource(uri, name, description, filePath) {
    this.resources.set(uri, {
      type: 'file',
      name,
      description,
      filePath,
      lastModified: new Date().toISOString()
    });
    
    // Watch for file changes (in a real implementation, use fs.watch)
    this.watchedPaths.set(filePath, uri);
  }
  
  // Get resource list
  getResourceList() {
    return Array.from(this.resources.entries()).map(([uri, resource]) => ({
      uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType || 'text/plain'
    }));
  }
  
  // Read a resource
  async readResource(uri) {
    const resource = this.resources.get(uri);
    
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    switch (resource.type) {
      case 'static':
        return {
          uri,
          mimeType: resource.mimeType,
          text: resource.content
        };
        
      case 'dynamic':
        const content = await resource.generator();
        return {
          uri,
          mimeType: 'text/plain',
          text: content
        };
        
      case 'file':
        try {
          const content = await fs.readFile(resource.filePath, 'utf8');
          return {
            uri,
            mimeType: 'text/plain',
            text: content
          };
        } catch (error) {
          throw new Error(`Failed to read file resource: ${error.message}`);
        }
        
      default:
        throw new Error(`Unknown resource type: ${resource.type}`);
    }
  }
}

// Usage in MCP server
const resourceManager = new ResourceManager();

// Add various resource types
resourceManager.addStaticResource(
  'config://server-info',
  'Server Information',
  'MCP server configuration and status',
  JSON.stringify({
    name: 'Advanced MCP Server',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }, null, 2),
  'application/json'
);

resourceManager.addDynamicResource(
  'status://current-time',
  'Current Time',
  'Current server time and status',
  () => {
    return `Current Time: ${new Date().toISOString()}\nUptime: ${Math.floor(process.uptime())} seconds\nMemory Usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`;
  }
);

// Add log file resource
await resourceManager.addFileResource(
  'logs://server.log',
  'Server Log',
  'Server error and debug log',
  './server.log'
);

// MCP resource handlers
server.setRequestHandler('resources_list', async () => ({
  resources: resourceManager.getResourceList()
}));

server.setRequestHandler('resources_read', async (request) => {
  const uri = request.params.uri;
  
  try {
    const content = await resourceManager.readResource(uri);
    return {
      contents: [content]
    };
  } catch (error) {
    throw new Error(`Failed to read resource ${uri}: ${error.message}`);
  }
});
```

### Advanced Prompt Management

```javascript
class PromptManager {
  constructor() {
    this.prompts = new Map();
  }
  
  // Add a prompt template
  addPrompt(name, description, template, args = []) {
    this.prompts.set(name, {
      name,
      description,
      template,
      arguments: args
    });
  }
  
  // Get prompt list
  getPromptList() {
    return Array.from(this.prompts.values());
  }
  
  // Get a specific prompt with arguments
  getPrompt(name, args = {}) {
    const prompt = this.prompts.get(name);
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    
    // Replace template variables
    let content = prompt.template;
    
    Object.entries(args).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(placeholder, value);
    });
    
    // Check for missing required arguments
    const missingArgs = prompt.arguments
      .filter(arg => arg.required && !args.hasOwnProperty(arg.name))
      .map(arg => arg.name);
    
    if (missingArgs.length > 0) {
      throw new Error(`Missing required arguments: ${missingArgs.join(', ')}`);
    }
    
    return {
      description: prompt.description,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: content
          }
        }
      ]
    };
  }
}

// Usage
const promptManager = new PromptManager();

// Add code review prompt
promptManager.addPrompt(
  'code_review',
  'Comprehensive code review template',
  `Please review the following {{language}} code for:

1. **Code Quality**: Structure, readability, and maintainability
2. **Best Practices**: Following {{language}} conventions and patterns
3. **Performance**: Potential optimizations and bottlenecks
4. **Security**: Vulnerabilities and security concerns
5. **Testing**: Test coverage and testability

{{#if context}}
**Context**: {{context}}
{{/if}}

**Code to Review**:
\`\`\`{{language}}
{{code}}
\`\`\`

Please provide specific, actionable feedback with examples where possible.`,
  [
    {
      name: 'language',
      description: 'Programming language',
      required: true
    },
    {
      name: 'code',
      description: 'Code to review',
      required: true
    },
    {
      name: 'context',
      description: 'Additional context about the code',
      required: false
    }
  ]
);

// Add documentation prompt
promptManager.addPrompt(
  'generate_docs',
  'Generate documentation for code',
  `Generate comprehensive documentation for the following {{language}} code:

**Requirements**:
- Include a clear description of what the code does
- Document all parameters and return values
- Provide usage examples
- Note any important behaviors or edge cases
- Follow {{language}} documentation conventions

{{#if style}}
**Documentation Style**: {{style}}
{{/if}}

**Code**:
\`\`\`{{language}}
{{code}}
\`\`\``,
  [
    {
      name: 'language',
      description: 'Programming language',
      required: true
    },
    {
      name: 'code',
      description: 'Code to document',
      required: true
    },
    {
      name: 'style',
      description: 'Documentation style (JSDoc, Sphinx, etc.)',
      required: false
    }
  ]
);

// MCP prompt handlers
server.setRequestHandler('prompts_list', async () => ({
  prompts: promptManager.getPromptList()
}));

server.setRequestHandler('prompts_get', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const prompt = promptManager.getPrompt(name, args);
    return prompt;
  } catch (error) {
    throw new Error(`Failed to get prompt ${name}: ${error.message}`);
  }
});
```

## State Management in MCP Servers

For complex operations, MCP servers may need to maintain state across multiple tool calls.

### State Manager Implementation

```javascript
class StateManager {
  constructor() {
    this.sessions = new Map();
    this.globalState = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }
  
  // Create a new session
  createSession(sessionId, ttl = 3600000) { // 1 hour default
    const session = {
      id: sessionId,
      data: new Map(),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  // Get or create session
  getSession(sessionId, createIfMissing = true) {
    let session = this.sessions.get(sessionId);
    
    if (!session && createIfMissing) {
      session = this.createSession(sessionId);
    }
    
    if (session) {
      session.lastAccessed = Date.now();
    }
    
    return session;
  }
  
  // Set session data
  setSessionData(sessionId, key, value) {
    const session = this.getSession(sessionId);
    session.data.set(key, value);
  }
  
  // Get session data
  getSessionData(sessionId, key) {
    const session = this.getSession(sessionId, false);
    return session ? session.data.get(key) : undefined;
  }
  
  // Set global state
  setGlobal(key, value) {
    this.globalState.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  // Get global state
  getGlobal(key) {
    const entry = this.globalState.get(key);
    return entry ? entry.value : undefined;
  }
  
  // Clean up expired sessions
  cleanup() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
      console.error(`Cleaned up expired session: ${sessionId}`);
    });
  }
  
  // Get session statistics
  getStats() {
    const now = Date.now();
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => now <= session.expiresAt);
    
    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      globalStateKeys: this.globalState.size,
      oldestSession: activeSessions.length > 0 ? 
        Math.min(...activeSessions.map(s => s.createdAt)) : null
    };
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.globalState.clear();
  }
}

// Usage in stateful MCP server
const stateManager = new StateManager();

// Example: Multi-step calculator with history
{
  name: 'calculator_start',
  description: 'Start a new calculator session',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'Session identifier'
      }
    },
    required: ['session_id']
  }
}

async function handleCalculatorStart(args) {
  const { session_id } = args;
  
  const session = stateManager.createSession(session_id);
  stateManager.setSessionData(session_id, 'history', []);
  stateManager.setSessionData(session_id, 'current_value', 0);
  
  return {
    content: [
      {
        type: 'text',
        text: `🧮 Calculator session started: ${session_id}\n💡 Current value: 0\n📚 History: (empty)`
      }
    ]
  };
}

{
  name: 'calculator_operation',
  description: 'Perform calculation in existing session',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'Session identifier'
      },
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide', 'clear'],
        description: 'Operation to perform'
      },
      value: {
        type: 'number',
        description: 'Value for operation (not needed for clear)'
      }
    },
    required: ['session_id', 'operation']
  }
}

async function handleCalculatorOperation(args) {
  const { session_id, operation, value } = args;
  
  const session = stateManager.getSession(session_id, false);
  if (!session) {
    throw new Error(`Calculator session not found: ${session_id}. Use calculator_start first.`);
  }
  
  let currentValue = stateManager.getSessionData(session_id, 'current_value') || 0;
  const history = stateManager.getSessionData(session_id, 'history') || [];
  
  let newValue = currentValue;
  let operationText = '';
  
  switch (operation) {
    case 'add':
      newValue = currentValue + value;
      operationText = `${currentValue} + ${value} = ${newValue}`;
      break;
    case 'subtract':
      newValue = currentValue - value;
      operationText = `${currentValue} - ${value} = ${newValue}`;
      break;
    case 'multiply':
      newValue = currentValue * value;
      operationText = `${currentValue} × ${value} = ${newValue}`;
      break;
    case 'divide':
      if (value === 0) {
        throw new Error('Cannot divide by zero');
      }
      newValue = currentValue / value;
      operationText = `${currentValue} ÷ ${value} = ${newValue}`;
      break;
    case 'clear':
      newValue = 0;
      operationText = 'Calculator cleared';
      history.length = 0; // Clear history
      break;
  }
  
  // Update state
  stateManager.setSessionData(session_id, 'current_value', newValue);
  
  if (operation !== 'clear') {
    history.push({
      operation: operationText,
      timestamp: new Date().toISOString(),
      result: newValue
    });
    stateManager.setSessionData(session_id, 'history', history);
  }
  
  const historyText = history.length > 0 ? 
    history.slice(-5).map(h => `  ${h.operation}`).join('\n') :
    '  (empty)';
  
  return {
    content: [
      {
        type: 'text',
        text: `🧮 ${operationText}\n💡 Current value: ${newValue}\n📚 Recent history:\n${historyText}`
      }
    ]
  };
}

// Tool to get session info
{
  name: 'calculator_status',
  description: 'Get calculator session status and history',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'Session identifier'
      }
    },
    required: ['session_id']
  }
}

async function handleCalculatorStatus(args) {
  const { session_id } = args;
  
  const session = stateManager.getSession(session_id, false);
  if (!session) {
    throw new Error(`Calculator session not found: ${session_id}`);
  }
  
  const currentValue = stateManager.getSessionData(session_id, 'current_value') || 0;
  const history = stateManager.getSessionData(session_id, 'history') || [];
  
  const sessionInfo = `🧮 Calculator Session: ${session_id}
💡 Current Value: ${currentValue}
📅 Created: ${new Date(session.createdAt).toLocaleString()}
📊 Operations: ${history.length}

📚 Full History:
${history.length > 0 ? 
  history.map((h, i) => `${i + 1}. ${h.operation} (${new Date(h.timestamp).toLocaleTimeString()})`).join('\n') :
  '  No operations performed yet'
}`;
  
  return {
    content: [
      {
        type: 'text',
        text: sessionInfo
      }
    ]
  };
}
```

## Performance Optimization

Performance is crucial for production MCP servers. Here are key optimization strategies:

### Caching Layer

```javascript
class CacheManager {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  // Generate cache key from arguments
  generateKey(prefix, args) {
    const argsString = JSON.stringify(args, Object.keys(args).sort());
    return `${prefix}:${createHash('md5').update(argsString).digest('hex')}`;
  }
  
  // Set cache entry
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
    this.stats.sets++;
  }
  
  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }
  
  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }
  
  // Delete cache entry
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }
  
  // Clear all cache
  clear() {
    this.cache.clear();
  }
  
  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.error(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }
  
  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) :
      0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      entries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  // Rough memory usage estimation
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 24; // Metadata overhead estimate
    }
    
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }
}

// Usage with cached tools
const cache = new CacheManager(600000); // 10 minute default TTL

// Cached web scraping
async function handleCachedFetch(args) {
  const cacheKey = cache.generateKey('fetch', args);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.error(`Cache hit for ${args.url}`);
    return {
      content: [
        {
          type: 'text',
          text: `🔄 Cached result for ${args.url}\n\n${cached}`
        }
      ]
    };
  }
  
  // Fetch from source
  console.error(`Cache miss for ${args.url}, fetching...`);
  const result = await performActualFetch(args);
  
  // Cache the result
  cache.set(cacheKey, result, 300000); // 5 minute TTL for web content
  
  return {
    content: [
      {
        type: 'text',
        text: `🌐 Fresh result for ${args.url}\n\n${result}`
      }
    ]
  };
}
```

### Connection Pooling

```javascript
class ConnectionPool {
  constructor(createConnection, options = {}) {
    this.createConnection = createConnection;
    this.minConnections = options.min || 2;
    this.maxConnections = options.max || 10;
    this.acquireTimeout = options.acquireTimeout || 30000;
    
    this.available = [];
    this.inUse = new Set();
    this.pending = [];
    
    // Initialize minimum connections
    this.initialize();
  }
  
  async initialize() {
    const initialConnections = Math.min(this.minConnections, this.maxConnections);
    
    for (let i = 0; i < initialConnections; i++) {
      try {
        const connection = await this.createConnection();
        this.available.push(connection);
      } catch (error) {
        console.error('Failed to create initial connection:', error);
      }
    }
  }
  
  async acquire() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.resolve === resolve);
        if (index !== -1) {
          this.pending.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.acquireTimeout);
      
      this.pending.push({ resolve, reject, timeout });
      this.processPending();
    });
  }
  
  async processPending() {
    while (this.pending.length > 0 && this.available.length > 0) {
      const { resolve, timeout } = this.pending.shift();
      const connection = this.available.pop();
      
      clearTimeout(timeout);
      this.inUse.add(connection);
      resolve(connection);
    }
    
    // Create new connections if needed and possible
    const totalConnections = this.available.length + this.inUse.size;
    
    if (this.pending.length > 0 && totalConnections < this.maxConnections) {
      try {
        const connection = await this.createConnection();
        this.available.push(connection);
        this.processPending();
      } catch (error) {
        console.error('Failed to create new connection:', error);
      }
    }
  }
  
  release(connection) {
    if (this.inUse.has(connection)) {
      this.inUse.delete(connection);
      this.available.push(connection);
      this.processPending();
    }
  }
  
  async destroy() {
    // Clear pending requests
    this.pending.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Connection pool destroyed'));
    });
    this.pending = [];
    
    // Close all connections
    const allConnections = [...this.available, ...this.inUse];
    
    await Promise.all(allConnections.map(async (connection) => {
      try {
        if (connection.close) {
          await connection.close();
        }
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }));
    
    this.available = [];
    this.inUse.clear();
  }
  
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      pending: this.pending.length,
      total: this.available.length + this.inUse.size
    };
  }
}

// Example usage with database connections
const dbPool = new ConnectionPool(
  async () => {
    // Create database connection (pseudo-code)
    const connection = await createDatabaseConnection();
    return connection;
  },
  {
    min: 2,
    max: 10,
    acquireTimeout: 30000
  }
);

// Use in tool handler
async function handleDatabaseQuery(args) {
  const connection = await dbPool.acquire();
  
  try {
    const result = await connection.query(args.sql, args.params);
    return formatDatabaseResult(result);
  } finally {
    dbPool.release(connection);
  }
}
```

## Production Deployment

Deploying MCP servers in production requires careful consideration of reliability, monitoring, and scaling.

### Production-Ready Server Template

```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

// Production configuration
const CONFIG = {
  name: process.env.MCP_SERVER_NAME || 'production-mcp-server',
  version: process.env.MCP_SERVER_VERSION || '1.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/server.log',
  metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 60000,
  maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB) || 512,
  gracefulShutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000
};

// Production logger
class ProductionLogger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.logFile = options.logFile;
    this.console = options.console !== false;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    if (this.logFile) {
      this.ensureLogDirectory();
      this.fileStream = createWriteStream(this.logFile, { flags: 'a' });
    }
  }
  
  async ensureLogDirectory() {
    const dir = path.dirname(this.logFile);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }
  
  log(level, message, meta = {}) {
    if (this.levels[level] > this.levels[this.level]) {
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      pid: process.pid,
      ...meta
    };
    
    const logLine = JSON.stringify(logEntry);
    
    if (this.console) {
      console.error(logLine);
    }
    
    if (this.fileStream) {
      this.fileStream.write(logLine + '\n');
    }
  }
  
  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }
  
  close() {
    if (this.fileStream) {
      this.fileStream.end();
    }
  }
}

// Metrics collector
class MetricsCollector {
  constructor(logger, interval = 60000) {
    this.logger = logger;
    this.interval = interval;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      toolCalls: new Map(),
      startTime: Date.now()
    };
    
    this.intervalId = setInterval(() => this.reportMetrics(), interval);
  }
  
  recordRequest(toolName, success, duration) {
    this.metrics.requestCount++;
    
    if (!success) {
      this.metrics.errorCount++;
    }
    
    if (!this.metrics.toolCalls.has(toolName)) {
      this.metrics.toolCalls.set(toolName, {
        count: 0,
        errors: 0,
        totalDuration: 0,
        avgDuration: 0
      });
    }
    
    const toolMetrics = this.metrics.toolCalls.get(toolName);
    toolMetrics.count++;
    toolMetrics.totalDuration += duration;
    toolMetrics.avgDuration = toolMetrics.totalDuration / toolMetrics.count;
    
    if (!success) {
      toolMetrics.errors++;
    }
  }
  
  reportMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const memUsage = process.memoryUsage();
    
    const report = {
      uptime: Math.floor(uptime / 1000),
      requests: {
        total: this.metrics.requestCount,
        errors: this.metrics.errorCount,
        errorRate: this.metrics.requestCount > 0 ? 
          (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) + '%' : '0%'
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      },
      tools: Object.fromEntries(this.metrics.toolCalls)
    };
    
    this.logger.info('Metrics report', { metrics: report });
    
    // Check memory usage
    if (report.memory.rss > CONFIG.maxMemoryMB) {
      this.logger.warn('High memory usage detected', { 
        current: report.memory.rss,
        limit: CONFIG.maxMemoryMB
      });
    }
  }
  
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Health checker
class HealthChecker {
  constructor(logger) {
    this.logger = logger;
    this.checks = new Map();
  }
  
  addCheck(name, checkFunction, interval = 30000) {
    const check = {
      name,
      checkFunction,
      lastRun: null,
      lastStatus: null,
      lastError: null
    };
    
    this.checks.set(name, check);
    
    // Run initial check
    this.runCheck(name);
    
    // Schedule periodic checks
    setInterval(() => this.runCheck(name), interval);
  }
  
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) return;
    
    try {
      const result = await check.checkFunction();
      check.lastRun = Date.now();
      check.lastStatus = result ? 'healthy' : 'unhealthy';
      check.lastError = null;
      
      if (!result) {
        this.logger.warn(`Health check failed: ${name}`);
      }
    } catch (error) {
      check.lastRun = Date.now();
      check.lastStatus = 'error';
      check.lastError = error.message;
      
      this.logger.error(`Health check error: ${name}`, { error: error.message });
    }
  }
  
  getStatus() {
    const status = {
      overall: 'healthy',
      checks: {}
    };
    
    for (const [name, check] of this.checks) {
      status.checks[name] = {
        status: check.lastStatus,
        lastRun: check.lastRun ? new Date(check.lastRun).toISOString() : null,
        error: check.lastError
      };
      
      if (check.lastStatus !== 'healthy') {
        status.overall = 'degraded';
      }
    }
    
    return status;
  }
}

// Initialize production components
const logger = new ProductionLogger({
  level: CONFIG.logLevel,
  logFile: CONFIG.logFile
});

const metrics = new MetricsCollector(logger, CONFIG.metricsInterval);

const health = new HealthChecker(logger);

// Add health checks
health.addCheck('memory', () => {
  const memUsage = process.memoryUsage();
  const memUsageMB = memUsage.rss / 1024 / 1024;
  return memUsageMB < CONFIG.maxMemoryMB;
});

health.addCheck('uptime', () => {
  return process.uptime() > 0;
});

// Graceful shutdown handler
class GracefulShutdown {
  constructor(logger, timeout = 30000) {
    this.logger = logger;
    this.timeout = timeout;
    this.shuttingDown = false;
    this.components = [];
    
    // Handle shutdown signals
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGHUP', () => this.shutdown('SIGHUP'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.shutdown('uncaughtException', 1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
      this.shutdown('unhandledRejection', 1);
    });
  }
  
  register(component) {
    this.components.push(component);
  }
  
  async shutdown(signal, exitCode = 0) {
    if (this.shuttingDown) {
      this.logger.warn('Shutdown already in progress');
      return;
    }
    
    this.shuttingDown = true;
    this.logger.info('Graceful shutdown initiated', { signal });
    
    const shutdownTimeout = setTimeout(() => {
      this.logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.timeout);
    
    try {
      // Shutdown components in reverse order
      for (const component of this.components.reverse()) {
        if (component.destroy) {
          await component.destroy();
        }
      }
      
      this.logger.info('Graceful shutdown completed');
      clearTimeout(shutdownTimeout);
      process.exit(exitCode);
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }
}

const shutdown = new GracefulShutdown(logger, CONFIG.gracefulShutdownTimeout);

// Register components for cleanup
shutdown.register(logger);
shutdown.register(metrics);

// Create production server
const server = new Server(
  {
    name: CONFIG.name,
    version: CONFIG.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

// Add production monitoring tool
server.setRequestHandler('tools_list', async () => ({
  tools: [
    {
      name: 'health_status',
      description: 'Get server health status and metrics',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

server.setRequestHandler('tools_call', async (request) => {
  const startTime = Date.now();
  const toolName = request.params.name;
  let success = false;
  
  try {
    logger.debug('Tool call started', { tool: toolName, args: request.params.arguments });
    
    let result;
    
    switch (toolName) {
      case 'health_status':
        const healthStatus = health.getStatus();
        const metricsData = metrics.metrics;
        
        result = {
          content: [
            {
              type: 'text',
              text: `🏥 Server Health Status\n\n📊 Overall: ${healthStatus.overall}\n\n📈 Metrics:\n- Requests: ${metricsData.requestCount}\n- Errors: ${metricsData.errorCount}\n- Uptime: ${Math.floor((Date.now() - metricsData.startTime) / 1000)}s\n\n💾 Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
            }
          ]
        };
        break;
        
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    success = true;
    logger.info('Tool call completed', { tool: toolName, duration: Date.now() - startTime });
    
    return result;
  } catch (error) {
    logger.error('Tool call failed', { 
      tool: toolName, 
      error: error.message, 
      duration: Date.now() - startTime 
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error in ${toolName}: ${error.message}`
        }
      ]
    };
  } finally {
    metrics.recordRequest(toolName, success, Date.now() - startTime);
  }
});

// Start server
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('Production MCP server started', {
      name: CONFIG.name,
      version: CONFIG.version,
      pid: process.pid
    });
    
    // Register transport for cleanup
    shutdown.register(transport);
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
```

This comprehensive guide covers advanced MCP patterns including file system tools, web scraping, authentication, resources and prompts, state management, performance optimization, and production deployment. These patterns provide the foundation for building sophisticated, production-ready MCP servers that can handle complex real-world scenarios.