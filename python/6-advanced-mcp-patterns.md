# Advanced Python MCP Patterns

## Table of Contents
- [Building file system tools with pathlib](#building-file-system-tools-with-pathlib)
- [Async HTTP requests with aiohttp](#async-http-requests-with-aiohttp)
- [Database integration with asyncpg](#database-integration-with-asyncpg)
- [State management with contextvars](#state-management-with-contextvars)
- [Performance with asyncio](#performance-with-asyncio)
- [Production deployment with uvloop](#production-deployment-with-uvloop)

## Building file system tools with pathlib

Python's `pathlib` module provides a modern, object-oriented approach to file system operations that's both safer and more intuitive than traditional string-based paths.

### Advanced File System Operations
```python
#!/usr/bin/env python3
"""
Advanced File System MCP Server
Demonstrates sophisticated file operations using pathlib.
"""
import asyncio
import aiofiles
import hashlib
import mimetypes
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import BaseModel, Field, validator
import logging

logger = logging.getLogger(__name__)

class FileSystemRequest(BaseModel):
    """Base request model for file system operations."""
    path: str = Field(..., description="File or directory path")
    
    @validator('path')
    def validate_path(cls, v):
        """Validate path for security."""
        if '..' in v or v.startswith('/') or '\\' in v:
            raise ValueError('Invalid path: potential directory traversal')
        return v

class SearchRequest(BaseModel):
    """Request for file search operations."""
    pattern: str = Field(..., description="Search pattern (glob or regex)")
    directory: str = Field(default=".", description="Directory to search in")
    recursive: bool = Field(default=True, description="Search recursively")
    case_sensitive: bool = Field(default=False, description="Case sensitive search")
    max_results: int = Field(default=100, ge=1, le=1000, description="Maximum results")

class FileCompareRequest(BaseModel):
    """Request for file comparison."""
    file1: str = Field(..., description="First file to compare")
    file2: str = Field(..., description="Second file to compare")
    method: str = Field(default="hash", regex="^(hash|content|size)$", description="Comparison method")

class AdvancedFileSystemMCP:
    """Advanced file system operations MCP server."""
    
    def __init__(self):
        self.app = Server("advanced-filesystem-mcp")
        self.base_path = Path.cwd().resolve()
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up MCP handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "get_file_info",
                    "description": "Get detailed information about a file or directory",
                    "inputSchema": FileSystemRequest.schema()
                },
                {
                    "name": "calculate_directory_size",
                    "description": "Calculate total size of a directory and its contents",
                    "inputSchema": FileSystemRequest.schema()
                },
                {
                    "name": "find_files",
                    "description": "Search for files using patterns",
                    "inputSchema": SearchRequest.schema()
                },
                {
                    "name": "compare_files",
                    "description": "Compare two files for differences",
                    "inputSchema": FileCompareRequest.schema()
                },
                {
                    "name": "organize_files",
                    "description": "Organize files by extension or date",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "directory": {"type": "string", "default": "."},
                            "method": {"type": "string", "enum": ["extension", "date"], "default": "extension"},
                            "dry_run": {"type": "boolean", "default": True}
                        }
                    }
                },
                {
                    "name": "create_file_tree",
                    "description": "Create a visual tree representation of directory structure",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "directory": {"type": "string", "default": "."},
                            "max_depth": {"type": "integer", "default": 3, "minimum": 1, "maximum": 10},
                            "show_hidden": {"type": "boolean", "default": False}
                        }
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "get_file_info":
                    return await self.get_file_info(arguments)
                elif name == "calculate_directory_size":
                    return await self.calculate_directory_size(arguments)
                elif name == "find_files":
                    return await self.find_files(arguments)
                elif name == "compare_files":
                    return await self.compare_files(arguments)
                elif name == "organize_files":
                    return await self.organize_files(arguments)
                elif name == "create_file_tree":
                    return await self.create_file_tree(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.exception(f"Error in {name}")
                return [{"type": "text", "text": f"Error: {str(e)}"}]
    
    async def get_file_info(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get detailed file/directory information."""
        request = FileSystemRequest(**arguments)
        path = await self._validate_path(request.path)
        
        try:
            stat = path.stat()
            
            # Basic information
            info = f"Path Information: {path.name}\n"
            info += f"• Full path: {path}\n"
            info += f"• Type: {'Directory' if path.is_dir() else 'File'}\n"
            info += f"• Size: {self._format_size(stat.st_size)}\n"
            
            # Timestamps
            info += f"• Created: {datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S')}\n"
            info += f"• Modified: {datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')}\n"
            info += f"• Accessed: {datetime.fromtimestamp(stat.st_atime).strftime('%Y-%m-%d %H:%M:%S')}\n"
            
            # Permissions
            info += f"• Permissions: {oct(stat.st_mode)[-3:]}\n"
            info += f"• Readable: {path.is_file() and path.stat().st_mode & 0o444}\n"
            info += f"• Writable: {path.is_file() and path.stat().st_mode & 0o222}\n"
            
            # File-specific information
            if path.is_file():
                # MIME type
                mime_type, _ = mimetypes.guess_type(str(path))
                info += f"• MIME type: {mime_type or 'unknown'}\n"
                
                # File hash (for smaller files)
                if stat.st_size < 10 * 1024 * 1024:  # 10MB
                    file_hash = await self._calculate_file_hash(path)
                    info += f"• SHA256: {file_hash}\n"
            
            # Directory-specific information
            elif path.is_dir():
                items = list(path.iterdir())
                files = [p for p in items if p.is_file()]
                dirs = [p for p in items if p.is_dir()]
                
                info += f"• Contains: {len(files)} files, {len(dirs)} directories\n"
                
                # Largest files
                if files:
                    largest_files = sorted(files, key=lambda p: p.stat().st_size, reverse=True)[:5]
                    info += "• Largest files:\n"
                    for file in largest_files:
                        size = self._format_size(file.stat().st_size)
                        info += f"  - {file.name}: {size}\n"
            
            return [{"type": "text", "text": info}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error getting file info: {str(e)}"}]
    
    async def calculate_directory_size(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Calculate total size of directory contents."""
        request = FileSystemRequest(**arguments)
        path = await self._validate_path(request.path)
        
        if not path.is_dir():
            return [{"type": "text", "text": "Error: Path is not a directory"}]
        
        try:
            total_size = 0
            file_count = 0
            dir_count = 0
            largest_files = []
            
            # Walk through directory tree
            for item in path.rglob('*'):
                if item.is_file():
                    size = item.stat().st_size
                    total_size += size
                    file_count += 1
                    
                    # Track largest files
                    largest_files.append((item.relative_to(path), size))
                    largest_files.sort(key=lambda x: x[1], reverse=True)
                    largest_files = largest_files[:10]  # Keep top 10
                    
                elif item.is_dir():
                    dir_count += 1
            
            # Format results
            result = f"Directory Size Analysis: {path.name}\n\n"
            result += f"• Total size: {self._format_size(total_size)}\n"
            result += f"• Files: {file_count:,}\n"
            result += f"• Directories: {dir_count:,}\n"
            result += f"• Average file size: {self._format_size(total_size // max(file_count, 1))}\n\n"
            
            if largest_files:
                result += "Largest files:\n"
                for file_path, size in largest_files:
                    result += f"• {file_path}: {self._format_size(size)}\n"
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error calculating directory size: {str(e)}"}]
    
    async def find_files(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Search for files using patterns."""
        request = SearchRequest(**arguments)
        directory = await self._validate_path(request.directory)
        
        if not directory.is_dir():
            return [{"type": "text", "text": "Error: Directory path is not a directory"}]
        
        try:
            matches = []
            pattern = request.pattern
            
            # Use glob pattern matching
            search_path = directory
            if request.recursive:
                glob_pattern = f"**/*{pattern}*" if '*' not in pattern else f"**/{pattern}"
                search_results = search_path.rglob(pattern)
            else:
                glob_pattern = f"*{pattern}*" if '*' not in pattern else pattern
                search_results = search_path.glob(pattern)
            
            for match in search_results:
                if len(matches) >= request.max_results:
                    break
                
                # Apply case sensitivity
                if not request.case_sensitive:
                    if pattern.lower() not in match.name.lower():
                        continue
                elif pattern not in match.name:
                    continue
                
                # Get file info
                try:
                    stat = match.stat()
                    matches.append({
                        'path': str(match.relative_to(directory)),
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime),
                        'is_dir': match.is_dir()
                    })
                except (OSError, PermissionError):
                    continue
            
            # Format results
            if not matches:
                result = f"No files found matching pattern '{pattern}'"
            else:
                result = f"Found {len(matches)} files matching '{pattern}':\n\n"
                
                # Sort by modification time (newest first)
                matches.sort(key=lambda x: x['modified'], reverse=True)
                
                for match in matches:
                    icon = "📁" if match['is_dir'] else "📄"
                    size = self._format_size(match['size']) if not match['is_dir'] else ""
                    date = match['modified'].strftime('%Y-%m-%d %H:%M')
                    result += f"{icon} {match['path']} {size} ({date})\n"
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error searching files: {str(e)}"}]
    
    async def compare_files(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Compare two files."""
        request = FileCompareRequest(**arguments)
        file1 = await self._validate_path(request.file1)
        file2 = await self._validate_path(request.file2)
        
        if not (file1.is_file() and file2.is_file()):
            return [{"type": "text", "text": "Error: Both paths must be files"}]
        
        try:
            # Basic comparison
            stat1 = file1.stat()
            stat2 = file2.stat()
            
            result = f"File Comparison:\n"
            result += f"• File 1: {file1.name} ({self._format_size(stat1.st_size)})\n"
            result += f"• File 2: {file2.name} ({self._format_size(stat2.st_size)})\n\n"
            
            if request.method == "size":
                # Size comparison
                if stat1.st_size == stat2.st_size:
                    result += "✅ Files are the same size\n"
                else:
                    diff = abs(stat1.st_size - stat2.st_size)
                    larger = file1.name if stat1.st_size > stat2.st_size else file2.name
                    result += f"❌ Size difference: {self._format_size(diff)} ({larger} is larger)\n"
            
            elif request.method == "hash":
                # Hash comparison
                hash1 = await self._calculate_file_hash(file1)
                hash2 = await self._calculate_file_hash(file2)
                
                if hash1 == hash2:
                    result += "✅ Files are identical (same SHA256 hash)\n"
                else:
                    result += "❌ Files are different (different SHA256 hashes)\n"
                    result += f"• File 1 hash: {hash1}\n"
                    result += f"• File 2 hash: {hash2}\n"
            
            elif request.method == "content":
                # Content comparison (for text files)
                try:
                    async with aiofiles.open(file1, 'r', encoding='utf-8') as f1:
                        content1 = await f1.read()
                    async with aiofiles.open(file2, 'r', encoding='utf-8') as f2:
                        content2 = await f2.read()
                    
                    if content1 == content2:
                        result += "✅ File contents are identical\n"
                    else:
                        # Simple line-by-line comparison
                        lines1 = content1.splitlines()
                        lines2 = content2.splitlines()
                        
                        result += f"❌ File contents are different\n"
                        result += f"• File 1: {len(lines1)} lines\n"
                        result += f"• File 2: {len(lines2)} lines\n"
                        
                        # Show first few differences
                        differences = 0
                        for i, (line1, line2) in enumerate(zip(lines1, lines2)):
                            if line1 != line2 and differences < 5:
                                result += f"• Line {i+1} differs\n"
                                differences += 1
                        
                        if len(lines1) != len(lines2):
                            result += f"• Different number of lines\n"
                
                except UnicodeDecodeError:
                    result += "❌ Cannot compare content (binary files or encoding issues)\n"
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error comparing files: {str(e)}"}]
    
    async def organize_files(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Organize files by extension or date."""
        directory = arguments.get("directory", ".")
        method = arguments.get("method", "extension")
        dry_run = arguments.get("dry_run", True)
        
        dir_path = await self._validate_path(directory)
        
        if not dir_path.is_dir():
            return [{"type": "text", "text": "Error: Path is not a directory"}]
        
        try:
            operations = []
            
            if method == "extension":
                # Group by file extension
                extensions = {}
                for file in dir_path.iterdir():
                    if file.is_file():
                        ext = file.suffix.lower() or "no_extension"
                        if ext not in extensions:
                            extensions[ext] = []
                        extensions[ext].append(file)
                
                # Plan moves
                for ext, files in extensions.items():
                    if len(files) > 1:  # Only create folders for multiple files
                        folder_name = ext[1:] if ext.startswith('.') else ext
                        target_dir = dir_path / folder_name
                        
                        for file in files:
                            target_path = target_dir / file.name
                            operations.append((file, target_path, f"Move to {folder_name}/ folder"))
            
            elif method == "date":
                # Group by creation date
                for file in dir_path.iterdir():
                    if file.is_file():
                        created = datetime.fromtimestamp(file.stat().st_ctime)
                        year_month = created.strftime("%Y-%m")
                        target_dir = dir_path / year_month
                        target_path = target_dir / file.name
                        
                        operations.append((file, target_path, f"Move to {year_month}/ folder"))
            
            # Format results
            if not operations:
                result = "No files need organizing."
            else:
                result = f"File Organization Plan ({method}):\n\n"
                
                if dry_run:
                    result += "DRY RUN - No files will be moved:\n"
                else:
                    result += "EXECUTING - Files will be moved:\n"
                
                for source, target, description in operations:
                    result += f"• {source.name} → {description}\n"
                
                if not dry_run:
                    # Actually perform the moves
                    moved_count = 0
                    for source, target, _ in operations:
                        try:
                            target.parent.mkdir(exist_ok=True)
                            source.rename(target)
                            moved_count += 1
                        except Exception as e:
                            result += f"  ❌ Failed to move {source.name}: {str(e)}\n"
                    
                    result += f"\n✅ Successfully moved {moved_count} files"
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error organizing files: {str(e)}"}]
    
    async def create_file_tree(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Create a visual tree representation of directory structure."""
        directory = arguments.get("directory", ".")
        max_depth = arguments.get("max_depth", 3)
        show_hidden = arguments.get("show_hidden", False)
        
        dir_path = await self._validate_path(directory)
        
        if not dir_path.is_dir():
            return [{"type": "text", "text": "Error: Path is not a directory"}]
        
        try:
            tree_lines = [f"📁 {dir_path.name}/"]
            
            def build_tree(path: Path, prefix: str = "", depth: int = 0):
                if depth >= max_depth:
                    return
                
                try:
                    items = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
                    
                    # Filter hidden files if requested
                    if not show_hidden:
                        items = [item for item in items if not item.name.startswith('.')]
                    
                    for i, item in enumerate(items):
                        is_last = i == len(items) - 1
                        current_prefix = "└── " if is_last else "├── "
                        icon = "📁" if item.is_dir() else "📄"
                        
                        # Add size for files
                        if item.is_file():
                            try:
                                size = self._format_size(item.stat().st_size)
                                name_with_size = f"{item.name} ({size})"
                            except (OSError, PermissionError):
                                name_with_size = item.name
                        else:
                            name_with_size = f"{item.name}/"
                        
                        tree_lines.append(f"{prefix}{current_prefix}{icon} {name_with_size}")
                        
                        # Recurse into directories
                        if item.is_dir() and depth < max_depth - 1:
                            extension = "    " if is_last else "│   "
                            build_tree(item, prefix + extension, depth + 1)
                
                except PermissionError:
                    tree_lines.append(f"{prefix}└── ❌ Permission denied")
            
            build_tree(dir_path)
            
            result = f"Directory Tree (max depth: {max_depth}):\n\n"
            result += "\n".join(tree_lines)
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error creating file tree: {str(e)}"}]
    
    async def _validate_path(self, path_str: str) -> Path:
        """Validate and resolve path with security checks."""
        if '..' in path_str or path_str.startswith('/') or '\\' in path_str:
            raise ValueError("Invalid path: potential directory traversal")
        
        path = Path(path_str).resolve()
        
        if not str(path).startswith(str(self.base_path)):
            raise ValueError("Access denied: path outside allowed directory")
        
        if not path.exists():
            raise FileNotFoundError(f"Path '{path_str}' not found")
        
        return path
    
    async def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file."""
        sha256_hash = hashlib.sha256()
        
        async with aiofiles.open(file_path, 'rb') as f:
            while chunk := await f.read(8192):
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"
    
    async def run(self):
        """Run the advanced file system MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

async def main():
    server = AdvancedFileSystemMCP()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## Async HTTP requests with aiohttp

HTTP requests are common in MCP servers for integrating with APIs and web services.

### Professional HTTP Client Implementation
```python
#!/usr/bin/env python3
"""
HTTP Client MCP Server
Demonstrates advanced HTTP operations with aiohttp.
"""
import asyncio
import aiohttp
import json
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse
from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import BaseModel, Field, validator, HttpUrl
import logging

logger = logging.getLogger(__name__)

class HttpRequest(BaseModel):
    """HTTP request configuration."""
    url: HttpUrl = Field(..., description="Target URL")
    method: str = Field(default="GET", regex="^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$")
    headers: Optional[Dict[str, str]] = Field(default=None, description="Request headers")
    data: Optional[str] = Field(default=None, description="Request body (JSON string)")
    timeout: int = Field(default=30, ge=1, le=300, description="Timeout in seconds")
    follow_redirects: bool = Field(default=True, description="Follow HTTP redirects")

class ApiCredentials(BaseModel):
    """API credentials configuration."""
    type: str = Field(..., regex="^(bearer|basic|api_key|oauth2)$")
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    api_key_header: Optional[str] = Field(default="X-API-Key")

class HttpClientMCP:
    """Advanced HTTP client MCP server."""
    
    def __init__(self):
        self.app = Server("http-client-mcp")
        self.session: Optional[aiohttp.ClientSession] = None
        self.setup_handlers()
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=60)
            connector = aiohttp.TCPConnector(limit=100, limit_per_host=30)
            
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers={
                    'User-Agent': 'MCP-HTTP-Client/1.0'
                }
            )
        
        return self.session
    
    def setup_handlers(self):
        """Set up MCP handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "http_request",
                    "description": "Make HTTP requests with full control",
                    "inputSchema": HttpRequest.schema()
                },
                {
                    "name": "fetch_json",
                    "description": "Fetch and parse JSON from a URL",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "format": "uri"},
                            "headers": {"type": "object"},
                            "timeout": {"type": "integer", "default": 30}
                        },
                        "required": ["url"]
                    }
                },
                {
                    "name": "download_file",
                    "description": "Download a file from URL",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "format": "uri"},
                            "filename": {"type": "string"},
                            "max_size": {"type": "integer", "default": 10485760},  # 10MB
                            "chunk_size": {"type": "integer", "default": 8192}
                        },
                        "required": ["url", "filename"]
                    }
                },
                {
                    "name": "api_health_check",
                    "description": "Check API endpoint health and performance",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "endpoints": {
                                "type": "array",
                                "items": {"type": "string", "format": "uri"}
                            },
                            "timeout": {"type": "integer", "default": 10}
                        },
                        "required": ["endpoints"]
                    }
                },
                {
                    "name": "webhook_test",
                    "description": "Test webhook endpoint with sample data",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "webhook_url": {"type": "string", "format": "uri"},
                            "payload": {"type": "object"},
                            "headers": {"type": "object"},
                            "method": {"type": "string", "default": "POST"}
                        },
                        "required": ["webhook_url"]
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "http_request":
                    return await self.http_request(arguments)
                elif name == "fetch_json":
                    return await self.fetch_json(arguments)
                elif name == "download_file":
                    return await self.download_file(arguments)
                elif name == "api_health_check":
                    return await self.api_health_check(arguments)
                elif name == "webhook_test":
                    return await self.webhook_test(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.exception(f"Error in {name}")
                return [{"type": "text", "text": f"Error: {str(e)}"}]
    
    async def http_request(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Make a complete HTTP request."""
        request = HttpRequest(**arguments)
        session = await self._get_session()
        
        try:
            # Prepare request parameters
            kwargs = {
                'method': request.method,
                'url': str(request.url),
                'timeout': aiohttp.ClientTimeout(total=request.timeout),
                'allow_redirects': request.follow_redirects
            }
            
            # Add headers
            if request.headers:
                kwargs['headers'] = request.headers
            
            # Add data for POST/PUT requests
            if request.data and request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    # Try to parse as JSON
                    json_data = json.loads(request.data)
                    kwargs['json'] = json_data
                except json.JSONDecodeError:
                    # Use as raw text
                    kwargs['data'] = request.data
            
            # Make the request
            async with session.request(**kwargs) as response:
                # Get response info
                status = response.status
                headers = dict(response.headers)
                
                # Read response body
                try:
                    if 'application/json' in headers.get('content-type', ''):
                        body = await response.json()
                        body_text = json.dumps(body, indent=2)
                    else:
                        body_text = await response.text()
                except Exception:
                    body_text = f"<Binary data, {len(await response.read())} bytes>"
                
                # Format response
                result = f"HTTP {request.method} {request.url}\n"
                result += f"Status: {status} {response.reason}\n\n"
                
                result += "Response Headers:\n"
                for key, value in headers.items():
                    result += f"• {key}: {value}\n"
                
                result += f"\nResponse Body:\n{body_text}"
                
                # Truncate if too long
                if len(result) > 4000:
                    result = result[:4000] + "\n\n... (truncated)"
                
                return [{"type": "text", "text": result}]
        
        except asyncio.TimeoutError:
            return [{"type": "text", "text": f"Request timeout after {request.timeout} seconds"}]
        except aiohttp.ClientError as e:
            return [{"type": "text", "text": f"HTTP client error: {str(e)}"}]
        except Exception as e:
            return [{"type": "text", "text": f"Request failed: {str(e)}"}]
    
    async def fetch_json(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Fetch and parse JSON from URL."""
        url = arguments["url"]
        headers = arguments.get("headers", {})
        timeout = arguments.get("timeout", 30)
        
        session = await self._get_session()
        
        try:
            async with session.get(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                
                if response.status != 200:
                    return [{"type": "text", "text": f"HTTP {response.status}: {response.reason}"}]
                
                content_type = response.headers.get('content-type', '')
                if 'application/json' not in content_type:
                    return [{"type": "text", "text": f"Response is not JSON (content-type: {content_type})"}]
                
                data = await response.json()
                formatted_json = json.dumps(data, indent=2, ensure_ascii=False)
                
                result = f"JSON Response from {url}:\n\n{formatted_json}"
                
                # Add metadata
                result += f"\n\nMetadata:"
                result += f"\n• Status: {response.status}"
                result += f"\n• Content-Length: {response.headers.get('content-length', 'unknown')}"
                result += f"\n• Server: {response.headers.get('server', 'unknown')}"
                
                return [{"type": "text", "text": result}]
        
        except json.JSONDecodeError as e:
            return [{"type": "text", "text": f"Invalid JSON response: {str(e)}"}]
        except Exception as e:
            return [{"type": "text", "text": f"Failed to fetch JSON: {str(e)}"}]
    
    async def download_file(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Download a file from URL."""
        url = arguments["url"]
        filename = arguments["filename"]
        max_size = arguments.get("max_size", 10 * 1024 * 1024)  # 10MB
        chunk_size = arguments.get("chunk_size", 8192)
        
        # Security check for filename
        if '..' in filename or filename.startswith('/') or '\\' in filename:
            return [{"type": "text", "text": "Invalid filename"}]
        
        session = await self._get_session()
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return [{"type": "text", "text": f"HTTP {response.status}: Cannot download file"}]
                
                # Check content length
                content_length = response.headers.get('content-length')
                if content_length and int(content_length) > max_size:
                    return [{"type": "text", "text": f"File too large: {content_length} bytes (max: {max_size})"}]
                
                # Download file
                total_size = 0
                import aiofiles
                
                async with aiofiles.open(filename, 'wb') as file:
                    async for chunk in response.content.iter_chunked(chunk_size):
                        total_size += len(chunk)
                        
                        if total_size > max_size:
                            await file.close()
                            # Clean up partial file
                            from pathlib import Path
                            Path(filename).unlink(missing_ok=True)
                            return [{"type": "text", "text": f"File too large during download (>{max_size} bytes)"}]
                        
                        await file.write(chunk)
                
                result = f"Successfully downloaded {url}\n"
                result += f"• Saved as: {filename}\n"
                result += f"• Size: {total_size:,} bytes\n"
                result += f"• Content-Type: {response.headers.get('content-type', 'unknown')}"
                
                return [{"type": "text", "text": result}]
        
        except Exception as e:
            return [{"type": "text", "text": f"Download failed: {str(e)}"}]
    
    async def api_health_check(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Check health of API endpoints."""
        endpoints = arguments["endpoints"]
        timeout = arguments.get("timeout", 10)
        
        session = await self._get_session()
        results = []
        
        for url in endpoints:
            try:
                start_time = asyncio.get_event_loop().time()
                
                async with session.get(
                    url,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    end_time = asyncio.get_event_loop().time()
                    response_time = (end_time - start_time) * 1000  # ms
                    
                    status_icon = "✅" if 200 <= response.status < 300 else "❌"
                    
                    results.append({
                        'url': url,
                        'status': response.status,
                        'response_time': response_time,
                        'icon': status_icon
                    })
            
            except asyncio.TimeoutError:
                results.append({
                    'url': url,
                    'status': 'TIMEOUT',
                    'response_time': timeout * 1000,
                    'icon': '⏱️'
                })
            except Exception as e:
                results.append({
                    'url': url,
                    'status': f'ERROR: {str(e)}',
                    'response_time': 0,
                    'icon': '❌'
                })
        
        # Format results
        result_text = "API Health Check Results:\n\n"
        
        for result in results:
            result_text += f"{result['icon']} {result['url']}\n"
            result_text += f"   Status: {result['status']}\n"
            if isinstance(result['response_time'], (int, float)):
                result_text += f"   Response Time: {result['response_time']:.0f}ms\n"
            result_text += "\n"
        
        # Summary
        healthy = sum(1 for r in results if isinstance(r['status'], int) and 200 <= r['status'] < 300)
        total = len(results)
        result_text += f"Summary: {healthy}/{total} endpoints healthy"
        
        return [{"type": "text", "text": result_text}]
    
    async def webhook_test(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Test webhook endpoint."""
        webhook_url = arguments["webhook_url"]
        payload = arguments.get("payload", {"test": True, "timestamp": "2024-01-01T00:00:00Z"})
        headers = arguments.get("headers", {"Content-Type": "application/json"})
        method = arguments.get("method", "POST")
        
        session = await self._get_session()
        
        try:
            async with session.request(
                method,
                webhook_url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                
                response_text = await response.text()
                
                result = f"Webhook Test Results:\n"
                result += f"• URL: {webhook_url}\n"
                result += f"• Method: {method}\n"
                result += f"• Status: {response.status} {response.reason}\n"
                result += f"• Response: {response_text[:500]}\n"
                
                if response.status == 200:
                    result += "✅ Webhook test successful"
                else:
                    result += "❌ Webhook test failed"
                
                return [{"type": "text", "text": result}]
        
        except Exception as e:
            return [{"type": "text", "text": f"Webhook test failed: {str(e)}"}]
    
    async def run(self):
        """Run the HTTP client MCP server."""
        try:
            async with stdio_server() as (read_stream, write_stream):
                await self.app.run(
                    read_stream,
                    write_stream,
                    self.app.create_initialization_options()
                )
        finally:
            if self.session and not self.session.closed:
                await self.session.close()

async def main():
    server = HttpClientMCP()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## Database integration with asyncpg

For MCP servers that need to interact with databases, `asyncpg` provides excellent PostgreSQL integration.

### Database MCP Server Example
```python
#!/usr/bin/env python3
"""
Database MCP Server
Demonstrates PostgreSQL integration with asyncpg.
"""
import asyncio
import asyncpg
from typing import Dict, List, Any, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import BaseModel, Field, validator
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseConfig(BaseModel):
    """Database connection configuration."""
    host: str = Field(default="localhost")
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(...)
    username: str = Field(...)
    password: str = Field(...)
    ssl: str = Field(default="prefer", regex="^(disable|allow|prefer|require)$")

class QueryRequest(BaseModel):
    """SQL query request."""
    query: str = Field(..., min_length=1, max_length=10000)
    parameters: Optional[List[Any]] = Field(default=None)
    limit: int = Field(default=100, ge=1, le=1000)

# Install asyncpg: uv add asyncpg

class DatabaseMCP:
    """Database operations MCP server."""
    
    def __init__(self, db_config: DatabaseConfig):
        self.app = Server("database-mcp")
        self.db_config = db_config
        self.pool: Optional[asyncpg.Pool] = None
        self.setup_handlers()
    
    async def _get_pool(self) -> asyncpg.Pool:
        """Get or create database connection pool."""
        if self.pool is None:
            self.pool = await asyncpg.create_pool(
                host=self.db_config.host,
                port=self.db_config.port,
                database=self.db_config.database,
                user=self.db_config.username,
                password=self.db_config.password,
                ssl=self.db_config.ssl,
                min_size=1,
                max_size=10,
                command_timeout=30
            )
        return self.pool
    
    def setup_handlers(self):
        """Set up MCP handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "execute_query",
                    "description": "Execute SQL query and return results",
                    "inputSchema": QueryRequest.schema()
                },
                {
                    "name": "list_tables",
                    "description": "List all tables in the database",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "schema": {"type": "string", "default": "public"}
                        }
                    }
                },
                {
                    "name": "describe_table",
                    "description": "Get table structure and column information",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "table_name": {"type": "string"},
                            "schema": {"type": "string", "default": "public"}
                        },
                        "required": ["table_name"]
                    }
                },
                {
                    "name": "table_stats",
                    "description": "Get statistics about a table",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "table_name": {"type": "string"},
                            "schema": {"type": "string", "default": "public"}
                        },
                        "required": ["table_name"]
                    }
                },
                {
                    "name": "connection_info",
                    "description": "Get database connection information",
                    "inputSchema": {"type": "object", "properties": {}}
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "execute_query":
                    return await self.execute_query(arguments)
                elif name == "list_tables":
                    return await self.list_tables(arguments)
                elif name == "describe_table":
                    return await self.describe_table(arguments)
                elif name == "table_stats":
                    return await self.table_stats(arguments)
                elif name == "connection_info":
                    return await self.connection_info(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.exception(f"Error in {name}")
                return [{"type": "text", "text": f"Database error: {str(e)}"}]
    
    async def execute_query(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Execute SQL query."""
        request = QueryRequest(**arguments)
        pool = await self._get_pool()
        
        # Basic SQL injection protection
        dangerous_keywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']
        query_upper = request.query.upper().strip()
        
        # Allow only SELECT queries for safety
        if not query_upper.startswith('SELECT'):
            return [{"type": "text", "text": "Only SELECT queries are allowed for security"}]
        
        try:
            async with pool.acquire() as connection:
                # Execute query with parameters
                if request.parameters:
                    rows = await connection.fetch(request.query, *request.parameters)
                else:
                    rows = await connection.fetch(request.query)
                
                # Limit results
                rows = rows[:request.limit]
                
                if not rows:
                    return [{"type": "text", "text": "Query executed successfully - no results returned"}]
                
                # Format results as table
                if rows:
                    # Get column names
                    columns = list(rows[0].keys())
                    
                    # Format as table
                    result = f"Query Results ({len(rows)} rows):\n\n"
                    
                    # Table header
                    header = " | ".join(f"{col:15}" for col in columns)
                    separator = "-" * len(header)
                    result += f"{header}\n{separator}\n"
                    
                    # Table rows
                    for row in rows:
                        row_values = []
                        for col in columns:
                            value = row[col]
                            if value is None:
                                formatted_value = "NULL"
                            elif isinstance(value, datetime):
                                formatted_value = value.strftime("%Y-%m-%d %H:%M:%S")
                            else:
                                formatted_value = str(value)
                            
                            # Truncate long values
                            if len(formatted_value) > 15:
                                formatted_value = formatted_value[:12] + "..."
                            
                            row_values.append(f"{formatted_value:15}")
                        
                        result += " | ".join(row_values) + "\n"
                    
                    # Add summary
                    if len(rows) == request.limit:
                        result += f"\n(Results limited to {request.limit} rows)"
                else:
                    result = "No results returned"
                
                return [{"type": "text", "text": result}]
        
        except asyncpg.PostgresSyntaxError as e:
            return [{"type": "text", "text": f"SQL Syntax Error: {str(e)}"}]
        except asyncpg.PostgresError as e:
            return [{"type": "text", "text": f"Database Error: {str(e)}"}]
        except Exception as e:
            return [{"type": "text", "text": f"Query failed: {str(e)}"}]
    
    async def list_tables(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """List all tables in the database."""
        schema = arguments.get("schema", "public")
        pool = await self._get_pool()
        
        try:
            query = """
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = $1
            ORDER BY table_name
            """
            
            async with pool.acquire() as connection:
                rows = await connection.fetch(query, schema)
                
                if not rows:
                    return [{"type": "text", "text": f"No tables found in schema '{schema}'"}]
                
                result = f"Tables in schema '{schema}':\n\n"
                
                for row in rows:
                    table_type = "📋" if row['table_type'] == 'BASE TABLE' else "👁️"
                    result += f"{table_type} {row['table_name']} ({row['table_type']})\n"
                
                result += f"\nTotal: {len(rows)} tables"
                
                return [{"type": "text", "text": result}]
        
        except Exception as e:
            return [{"type": "text", "text": f"Failed to list tables: {str(e)}"}]
    
    async def describe_table(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Describe table structure."""
        table_name = arguments["table_name"]
        schema = arguments.get("schema", "public")
        pool = await self._get_pool()
        
        try:
            query = """
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
            """
            
            async with pool.acquire() as connection:
                rows = await connection.fetch(query, schema, table_name)
                
                if not rows:
                    return [{"type": "text", "text": f"Table '{schema}.{table_name}' not found"}]
                
                result = f"Table Structure: {schema}.{table_name}\n\n"
                
                # Column details
                for row in rows:
                    nullable = "NULL" if row['is_nullable'] == 'YES' else "NOT NULL"
                    data_type = row['data_type']
                    
                    if row['character_maximum_length']:
                        data_type += f"({row['character_maximum_length']})"
                    
                    default = f" DEFAULT {row['column_default']}" if row['column_default'] else ""
                    
                    result += f"• {row['column_name']}: {data_type} {nullable}{default}\n"
                
                # Get indexes
                index_query = """
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE schemaname = $1 AND tablename = $2
                """
                
                indexes = await connection.fetch(index_query, schema, table_name)
                
                if indexes:
                    result += "\nIndexes:\n"
                    for idx in indexes:
                        result += f"• {idx['indexname']}\n"
                
                return [{"type": "text", "text": result}]
        
        except Exception as e:
            return [{"type": "text", "text": f"Failed to describe table: {str(e)}"}]
    
    async def table_stats(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get table statistics."""
        table_name = arguments["table_name"]
        schema = arguments.get("schema", "public")
        pool = await self._get_pool()
        
        try:
            async with pool.acquire() as connection:
                # Row count
                count_query = f'SELECT COUNT(*) FROM "{schema}"."{table_name}"'
                row_count = await connection.fetchval(count_query)
                
                # Table size
                size_query = """
                SELECT pg_size_pretty(pg_total_relation_size($1)) as total_size,
                       pg_size_pretty(pg_relation_size($1)) as table_size
                """
                size_info = await connection.fetchrow(size_query, f"{schema}.{table_name}")
                
                # Column statistics (for first few columns)
                stats_query = f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = $1 AND table_name = $2 
                ORDER BY ordinal_position 
                LIMIT 5
                """
                columns = await connection.fetch(stats_query, schema, table_name)
                
                result = f"Table Statistics: {schema}.{table_name}\n\n"
                result += f"• Row Count: {row_count:,}\n"
                result += f"• Table Size: {size_info['table_size']}\n"
                result += f"• Total Size (including indexes): {size_info['total_size']}\n"
                result += f"• Columns: {len(columns)}\n"
                
                # Sample of column types
                if columns:
                    result += "\nColumn Types (first 5):\n"
                    for col in columns:
                        result += f"• {col['column_name']}: {col['data_type']}\n"
                
                return [{"type": "text", "text": result}]
        
        except Exception as e:
            return [{"type": "text", "text": f"Failed to get table stats: {str(e)}"}]
    
    async def connection_info(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get database connection information."""
        pool = await self._get_pool()
        
        try:
            async with pool.acquire() as connection:
                # Database version
                version = await connection.fetchval("SELECT version()")
                
                # Current database and user
                current_db = await connection.fetchval("SELECT current_database()")
                current_user = await connection.fetchval("SELECT current_user")
                
                # Connection count
                conn_count = await connection.fetchval(
                    "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
                )
                
                result = f"Database Connection Info:\n\n"
                result += f"• Database: {current_db}\n"
                result += f"• User: {current_user}\n"
                result += f"• Host: {self.db_config.host}:{self.db_config.port}\n"
                result += f"• Active Connections: {conn_count}\n"
                result += f"• PostgreSQL Version: {version}\n"
                
                return [{"type": "text", "text": result}]
        
        except Exception as e:
            return [{"type": "text", "text": f"Failed to get connection info: {str(e)}"}]
    
    async def run(self):
        """Run the database MCP server."""
        try:
            async with stdio_server() as (read_stream, write_stream):
                await self.app.run(
                    read_stream,
                    write_stream,
                    self.app.create_initialization_options()
                )
        finally:
            if self.pool:
                await self.pool.close()

async def main():
    # Example configuration - in practice, load from environment
    db_config = DatabaseConfig(
        host="localhost",
        database="myapp",
        username="user",
        password="password"
    )
    
    server = DatabaseMCP(db_config)
    await server.run()

if __name__ == "__main__":
    # Example usage with environment variables
    import os
    
    if all(key in os.environ for key in ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']):
        db_config = DatabaseConfig(
            host=os.environ['DB_HOST'],
            database=os.environ['DB_NAME'],
            username=os.environ['DB_USER'],
            password=os.environ['DB_PASS']
        )
        
        server = DatabaseMCP(db_config)
        asyncio.run(server.run())
    else:
        print("Please set environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASS")
```

## State management with contextvars

Context variables provide a way to maintain request-scoped state in async applications.

### Context-Aware MCP Server
```python
#!/usr/bin/env python3
"""
Context-Aware MCP Server
Demonstrates state management using contextvars.
"""
import asyncio
from contextvars import ContextVar
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)

# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar('request_id')
user_session_var: ContextVar[Optional[Dict[str, Any]]] = ContextVar('user_session', default=None)
request_start_time_var: ContextVar[datetime] = ContextVar('request_start_time')

@dataclass
class RequestMetrics:
    """Track metrics for each request."""
    request_id: str
    tool_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    success: bool = False
    error_message: Optional[str] = None
    
    @property
    def duration_ms(self) -> float:
        """Get request duration in milliseconds."""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds() * 1000
        return 0.0

class SessionManager:
    """Manage user sessions and state."""
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.request_metrics: List[RequestMetrics] = []
    
    def create_session(self, session_id: str) -> Dict[str, Any]:
        """Create a new user session."""
        session = {
            'id': session_id,
            'created_at': datetime.now(),
            'request_count': 0,
            'data': {}
        }
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get existing session."""
        return self.sessions.get(session_id)
    
    def update_session(self, session_id: str, data: Dict[str, Any]):
        """Update session data."""
        if session_id in self.sessions:
            self.sessions[session_id]['data'].update(data)
            self.sessions[session_id]['request_count'] += 1
    
    def add_request_metric(self, metric: RequestMetrics):
        """Add request metric."""
        self.request_metrics.append(metric)
        
        # Keep only last 1000 metrics
        if len(self.request_metrics) > 1000:
            self.request_metrics = self.request_metrics[-1000:]

class ContextAwareMCP:
    """MCP server with context-aware state management."""
    
    def __init__(self):
        self.app = Server("context-aware-mcp")
        self.session_manager = SessionManager()
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up MCP handlers with context management."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "create_session",
                    "description": "Create a new user session",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": {"type": "string", "description": "Optional session ID"}
                        }
                    }
                },
                {
                    "name": "set_session_data",
                    "description": "Set data in current session",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": {"type": "string"},
                            "key": {"type": "string"},
                            "value": {"type": "string"}
                        },
                        "required": ["session_id", "key", "value"]
                    }
                },
                {
                    "name": "get_session_data",
                    "description": "Get data from current session",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": {"type": "string"},
                            "key": {"type": "string"}
                        },
                        "required": ["session_id"]
                    }
                },
                {
                    "name": "get_request_metrics",
                    "description": "Get performance metrics for recent requests",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "default": 10, "minimum": 1, "maximum": 100}
                        }
                    }
                },
                {
                    "name": "stateful_counter",
                    "description": "Increment a counter in session state",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_id": {"type": "string"},
                            "counter_name": {"type": "string", "default": "default"},
                            "increment": {"type": "integer", "default": 1}
                        },
                        "required": ["session_id"]
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            # Set up request context
            request_id = str(uuid.uuid4())
            request_id_var.set(request_id)
            request_start_time_var.set(datetime.now())
            
            # Create request metric
            metric = RequestMetrics(
                request_id=request_id,
                tool_name=name,
                start_time=request_start_time_var.get()
            )
            
            try:
                result = await self._handle_tool_with_context(name, arguments)
                metric.success = True
                return result
                
            except Exception as e:
                metric.error_message = str(e)
                logger.exception(f"Error in tool '{name}' (request {request_id})")
                return [{"type": "text", "text": f"Error: {str(e)}"}]
            
            finally:
                metric.end_time = datetime.now()
                self.session_manager.add_request_metric(metric)
    
    async def _handle_tool_with_context(self, name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Handle tool calls with context information."""
        request_id = request_id_var.get()
        
        if name == "create_session":
            return await self.create_session(arguments)
        elif name == "set_session_data":
            return await self.set_session_data(arguments)
        elif name == "get_session_data":
            return await self.get_session_data(arguments)
        elif name == "get_request_metrics":
            return await self.get_request_metrics(arguments)
        elif name == "stateful_counter":
            return await self.stateful_counter(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    async def create_session(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Create a new session."""
        session_id = arguments.get("session_id", str(uuid.uuid4()))
        request_id = request_id_var.get()
        
        session = self.session_manager.create_session(session_id)
        user_session_var.set(session)
        
        result = f"Session created successfully!\n"
        result += f"• Session ID: {session_id}\n"
        result += f"• Request ID: {request_id}\n"
        result += f"• Created at: {session['created_at'].strftime('%Y-%m-%d %H:%M:%S')}\n"
        
        return [{"type": "text", "text": result}]
    
    async def set_session_data(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Set data in session."""
        session_id = arguments["session_id"]
        key = arguments["key"]
        value = arguments["value"]
        request_id = request_id_var.get()
        
        # Get or create session
        session = self.session_manager.get_session(session_id)
        if not session:
            session = self.session_manager.create_session(session_id)
        
        user_session_var.set(session)
        
        # Update session data
        self.session_manager.update_session(session_id, {key: value})
        
        result = f"Session data updated!\n"
        result += f"• Session ID: {session_id}\n"
        result += f"• Request ID: {request_id}\n"
        result += f"• Set {key} = {value}\n"
        result += f"• Total requests in session: {session['request_count'] + 1}\n"
        
        return [{"type": "text", "text": result}]
    
    async def get_session_data(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get data from session."""
        session_id = arguments["session_id"]
        key = arguments.get("key")
        request_id = request_id_var.get()
        
        session = self.session_manager.get_session(session_id)
        if not session:
            return [{"type": "text", "text": f"Session {session_id} not found"}]
        
        user_session_var.set(session)
        
        result = f"Session Data (ID: {session_id}):\n"
        result += f"• Request ID: {request_id}\n"
        result += f"• Created: {session['created_at'].strftime('%Y-%m-%d %H:%M:%S')}\n"
        result += f"• Request count: {session['request_count']}\n\n"
        
        if key:
            # Get specific key
            value = session['data'].get(key, 'Not found')
            result += f"• {key}: {value}\n"
        else:
            # Get all data
            if session['data']:
                result += "Stored data:\n"
                for k, v in session['data'].items():
                    result += f"• {k}: {v}\n"
            else:
                result += "No data stored in session\n"
        
        return [{"type": "text", "text": result}]
    
    async def get_request_metrics(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get performance metrics."""
        limit = arguments.get("limit", 10)
        request_id = request_id_var.get()
        
        metrics = self.session_manager.request_metrics[-limit:]
        
        if not metrics:
            return [{"type": "text", "text": "No metrics available"}]
        
        result = f"Request Metrics (last {len(metrics)}):\n"
        result += f"Current Request ID: {request_id}\n\n"
        
        for metric in reversed(metrics):  # Most recent first
            status = "✅" if metric.success else "❌"
            duration = f"{metric.duration_ms:.1f}ms" if metric.end_time else "In progress"
            
            result += f"{status} {metric.tool_name} ({duration})\n"
            result += f"   ID: {metric.request_id[:8]}...\n"
            result += f"   Time: {metric.start_time.strftime('%H:%M:%S')}\n"
            
            if metric.error_message:
                result += f"   Error: {metric.error_message[:50]}...\n"
            
            result += "\n"
        
        # Summary statistics
        successful = sum(1 for m in metrics if m.success)
        avg_duration = sum(m.duration_ms for m in metrics if m.end_time) / len([m for m in metrics if m.end_time])
        
        result += f"Summary: {successful}/{len(metrics)} successful, avg {avg_duration:.1f}ms"
        
        return [{"type": "text", "text": result}]
    
    async def stateful_counter(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Increment a counter in session state."""
        session_id = arguments["session_id"]
        counter_name = arguments.get("counter_name", "default")
        increment = arguments.get("increment", 1)
        request_id = request_id_var.get()
        
        # Get or create session
        session = self.session_manager.get_session(session_id)
        if not session:
            session = self.session_manager.create_session(session_id)
        
        user_session_var.set(session)
        
        # Get current counter value
        current_value = session['data'].get(f"counter_{counter_name}", 0)
        new_value = current_value + increment
        
        # Update session
        self.session_manager.update_session(session_id, {f"counter_{counter_name}": new_value})
        
        result = f"Counter updated!\n"
        result += f"• Session ID: {session_id}\n"
        result += f"• Request ID: {request_id}\n"
        result += f"• Counter '{counter_name}': {current_value} → {new_value}\n"
        result += f"• Increment: +{increment}\n"
        
        return [{"type": "text", "text": result}]
    
    async def run(self):
        """Run the context-aware MCP server."""
        logger.info("Starting Context-Aware MCP Server")
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

async def main():
    server = ContextAwareMCP()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## Performance with asyncio

Optimizing asyncio performance for high-throughput MCP servers.

### High-Performance Patterns
```python
#!/usr/bin/env python3
"""
High-Performance MCP Server
Demonstrates performance optimization techniques with asyncio.
"""
import asyncio
from asyncio import Queue, Semaphore
from typing import Dict, List, Any, Callable, Awaitable
from dataclasses import dataclass
from datetime import datetime
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from mcp.server import Server
from mcp.server.stdio import stdio_server

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Track performance metrics."""
    requests_per_second: float = 0.0
    average_response_time: float = 0.0
    active_connections: int = 0
    queue_size: int = 0
    total_requests: int = 0

class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, rate: float, capacity: int):
        self.rate = rate  # tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
    
    async def acquire(self) -> bool:
        """Acquire a token, return True if successful."""
        now = time.time()
        # Add tokens based on elapsed time
        elapsed = now - self.last_update
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_update = now
        
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

class TaskPool:
    """Manage a pool of worker tasks."""
    
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.semaphore = Semaphore(max_workers)
        self.active_tasks = set()
    
    async def submit(self, coro: Awaitable[Any]) -> Any:
        """Submit a coroutine to the pool."""
        async with self.semaphore:
            task = asyncio.create_task(coro)
            self.active_tasks.add(task)
            
            try:
                result = await task
                return result
            finally:
                self.active_tasks.discard(task)
    
    async def shutdown(self):
        """Shutdown the task pool."""
        # Wait for all active tasks to complete
        if self.active_tasks:
            await asyncio.gather(*self.active_tasks, return_exceptions=True)

class HighPerformanceMCP:
    """High-performance MCP server with optimization techniques."""
    
    def __init__(self):
        self.app = Server("high-performance-mcp")
        
        # Performance components
        self.rate_limiter = RateLimiter(rate=100.0, capacity=100)  # 100 req/sec
        self.task_pool = TaskPool(max_workers=20)
        self.request_queue = Queue(maxsize=1000)
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        
        # Metrics
        self.metrics = PerformanceMetrics()
        self.request_times: List[float] = []
        self.start_time = time.time()
        
        # Setup
        self.setup_handlers()
        
        # Start background tasks
        asyncio.create_task(self.metrics_updater())
        asyncio.create_task(self.request_processor())
    
    def setup_handlers(self):
        """Set up optimized MCP handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "cpu_intensive_task",
                    "description": "Simulate CPU-intensive work",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "iterations": {"type": "integer", "default": 1000000, "minimum": 1000}
                        }
                    }
                },
                {
                    "name": "io_intensive_task",
                    "description": "Simulate I/O-intensive work",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "delay": {"type": "number", "default": 1.0, "minimum": 0.1, "maximum": 10.0},
                            "concurrent_ops": {"type": "integer", "default": 5, "minimum": 1, "maximum": 20}
                        }
                    }
                },
                {
                    "name": "batch_process",
                    "description": "Process items in batches for efficiency",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "items": {"type": "array", "items": {"type": "string"}},
                            "batch_size": {"type": "integer", "default": 10, "minimum": 1, "maximum": 100}
                        },
                        "required": ["items"]
                    }
                },
                {
                    "name": "get_performance_metrics",
                    "description": "Get current performance metrics",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "stress_test",
                    "description": "Run a stress test with concurrent operations",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "concurrent_requests": {"type": "integer", "default": 10, "maximum": 50},
                            "operation_type": {"type": "string", "enum": ["cpu", "io", "mixed"], "default": "mixed"}
                        }
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            start_time = time.time()
            
            # Rate limiting
            if not await self.rate_limiter.acquire():
                return [{"type": "text", "text": "Rate limit exceeded. Please try again later."}]
            
            try:
                result = await self.task_pool.submit(
                    self._handle_tool_call(name, arguments)
                )
                
                # Record metrics
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # ms
                self.request_times.append(response_time)
                
                # Keep only last 1000 response times
                if len(self.request_times) > 1000:
                    self.request_times = self.request_times[-1000:]
                
                self.metrics.total_requests += 1
                
                return result
                
            except Exception as e:
                logger.exception(f"Error in high-performance tool '{name}'")
                return [{"type": "text", "text": f"Error: {str(e)}"}]
    
    async def _handle_tool_call(self, name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Handle individual tool calls."""
        
        if name == "cpu_intensive_task":
            return await self.cpu_intensive_task(arguments)
        elif name == "io_intensive_task":
            return await self.io_intensive_task(arguments)
        elif name == "batch_process":
            return await self.batch_process(arguments)
        elif name == "get_performance_metrics":
            return await self.get_performance_metrics(arguments)
        elif name == "stress_test":
            return await self.stress_test(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    async def cpu_intensive_task(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Handle CPU-intensive work using thread pool."""
        iterations = arguments.get("iterations", 1000000)
        
        def cpu_work(n: int) -> int:
            """CPU-intensive work that should run in thread pool."""
            total = 0
            for i in range(n):
                total += i * i
            return total
        
        # Run CPU work in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        start_time = time.time()
        
        result = await loop.run_in_executor(self.thread_pool, cpu_work, iterations)
        
        end_time = time.time()
        duration = (end_time - start_time) * 1000  # ms
        
        response = f"CPU-intensive task completed!\n"
        response += f"• Iterations: {iterations:,}\n"
        response += f"• Result: {result:,}\n"
        response += f"• Duration: {duration:.1f}ms\n"
        response += f"• Used thread pool to avoid blocking event loop"
        
        return [{"type": "text", "text": response}]
    
    async def io_intensive_task(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Handle I/O-intensive work with concurrency."""
        delay = arguments.get("delay", 1.0)
        concurrent_ops = arguments.get("concurrent_ops", 5)
        
        async def io_operation(op_id: int) -> Dict[str, Any]:
            """Simulate I/O operation."""
            await asyncio.sleep(delay)
            return {
                "op_id": op_id,
                "duration": delay,
                "timestamp": datetime.now().isoformat()
            }
        
        start_time = time.time()
        
        # Run operations concurrently
        tasks = [io_operation(i) for i in range(concurrent_ops)]
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_duration = (end_time - start_time) * 1000  # ms
        
        response = f"I/O-intensive task completed!\n"
        response += f"• Operations: {concurrent_ops}\n"
        response += f"• Delay per operation: {delay}s\n"
        response += f"• Total duration: {total_duration:.1f}ms\n"
        response += f"• Concurrency speedup: {(delay * concurrent_ops * 1000) / total_duration:.1f}x\n"
        response += f"• Results: {len(results)} operations completed"
        
        return [{"type": "text", "text": response}]
    
    async def batch_process(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Process items in batches for efficiency."""
        items = arguments["items"]
        batch_size = arguments.get("batch_size", 10)
        
        async def process_batch(batch: List[str]) -> Dict[str, Any]:
            """Process a batch of items."""
            # Simulate batch processing (more efficient than individual processing)
            await asyncio.sleep(0.1)  # Simulated processing time
            
            return {
                "batch_size": len(batch),
                "processed_items": [item.upper() for item in batch],
                "checksum": sum(len(item) for item in batch)
            }
        
        # Split items into batches
        batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
        
        start_time = time.time()
        
        # Process batches concurrently
        batch_tasks = [process_batch(batch) for batch in batches]
        batch_results = await asyncio.gather(*batch_tasks)
        
        end_time = time.time()
        duration = (end_time - start_time) * 1000
        
        # Aggregate results
        total_processed = sum(r["batch_size"] for r in batch_results)
        all_processed_items = []
        for result in batch_results:
            all_processed_items.extend(result["processed_items"])
        
        response = f"Batch processing completed!\n"
        response += f"• Total items: {len(items)}\n"
        response += f"• Batch size: {batch_size}\n"
        response += f"• Number of batches: {len(batches)}\n"
        response += f"• Processing time: {duration:.1f}ms\n"
        response += f"• Items per second: {(total_processed / duration * 1000):.1f}\n"
        response += f"• Sample results: {all_processed_items[:10]}"
        
        return [{"type": "text", "text": response}]
    
    async def get_performance_metrics(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get current performance metrics."""
        response = f"Performance Metrics:\n\n"
        response += f"• Requests/second: {self.metrics.requests_per_second:.1f}\n"
        response += f"• Average response time: {self.metrics.average_response_time:.1f}ms\n"
        response += f"• Active connections: {self.metrics.active_connections}\n"
        response += f"• Queue size: {self.metrics.queue_size}\n"
        response += f"• Total requests: {self.metrics.total_requests:,}\n"
        
        # Uptime
        uptime_seconds = time.time() - self.start_time
        uptime_hours = uptime_seconds / 3600
        response += f"• Uptime: {uptime_hours:.1f} hours\n"
        
        # Memory usage (if psutil is available)
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            cpu_percent = process.cpu_percent()
            response += f"• Memory usage: {memory_mb:.1f} MB\n"
            response += f"• CPU usage: {cpu_percent:.1f}%\n"
        except ImportError:
            response += "• Install psutil for memory metrics\n"
        
        # Recent response times
        if self.request_times:
            recent_times = self.request_times[-10:]
            response += f"• Recent response times: {[f'{t:.1f}ms' for t in recent_times]}"
        
        return [{"type": "text", "text": response}]
    
    async def stress_test(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Run stress test with concurrent operations."""
        concurrent_requests = arguments.get("concurrent_requests", 10)
        operation_type = arguments.get("operation_type", "mixed")
        
        async def stress_operation(op_id: int) -> Dict[str, Any]:
            """Individual stress test operation."""
            start_time = time.time()
            
            if operation_type == "cpu":
                # CPU-bound work
                await asyncio.get_event_loop().run_in_executor(
                    self.thread_pool,
                    lambda: sum(i * i for i in range(10000))
                )
            elif operation_type == "io":
                # I/O-bound work
                await asyncio.sleep(0.1)
            else:  # mixed
                # Mixed workload
                if op_id % 2 == 0:
                    await asyncio.sleep(0.05)
                else:
                    await asyncio.get_event_loop().run_in_executor(
                        self.thread_pool,
                        lambda: sum(i for i in range(5000))
                    )
            
            end_time = time.time()
            return {
                "op_id": op_id,
                "duration": (end_time - start_time) * 1000
            }
        
        # Run stress test
        start_time = time.time()
        
        stress_tasks = [stress_operation(i) for i in range(concurrent_requests)]
        results = await asyncio.gather(*stress_tasks, return_exceptions=True)
        
        end_time = time.time()
        total_duration = (end_time - start_time) * 1000
        
        # Analyze results
        successful_ops = [r for r in results if isinstance(r, dict)]
        failed_ops = len(results) - len(successful_ops)
        
        if successful_ops:
            avg_op_time = sum(r["duration"] for r in successful_ops) / len(successful_ops)
            min_time = min(r["duration"] for r in successful_ops)
            max_time = max(r["duration"] for r in successful_ops)
        else:
            avg_op_time = min_time = max_time = 0
        
        response = f"Stress Test Results:\n\n"
        response += f"• Operation type: {operation_type}\n"
        response += f"• Concurrent operations: {concurrent_requests}\n"
        response += f"• Total duration: {total_duration:.1f}ms\n"
        response += f"• Successful operations: {len(successful_ops)}\n"
        response += f"• Failed operations: {failed_ops}\n"
        response += f"• Operations/second: {(len(successful_ops) / total_duration * 1000):.1f}\n"
        response += f"• Average operation time: {avg_op_time:.1f}ms\n"
        response += f"• Min/Max operation time: {min_time:.1f}ms / {max_time:.1f}ms\n"
        
        return [{"type": "text", "text": response}]
    
    async def metrics_updater(self):
        """Background task to update metrics."""
        while True:
            try:
                await asyncio.sleep(5)  # Update every 5 seconds
                
                # Calculate requests per second
                current_time = time.time()
                elapsed = current_time - self.start_time
                if elapsed > 0:
                    self.metrics.requests_per_second = self.metrics.total_requests / elapsed
                
                # Calculate average response time
                if self.request_times:
                    self.metrics.average_response_time = sum(self.request_times) / len(self.request_times)
                
                # Update other metrics
                self.metrics.active_connections = len(self.task_pool.active_tasks)
                self.metrics.queue_size = self.request_queue.qsize()
                
            except Exception as e:
                logger.exception("Error updating metrics")
    
    async def request_processor(self):
        """Background task to process queued requests."""
        while True:
            try:
                # This is a placeholder for request queue processing
                # In a real implementation, you might queue requests here
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.exception("Error in request processor")
    
    async def run(self):
        """Run the high-performance MCP server."""
        logger.info("Starting High-Performance MCP Server")
        try:
            async with stdio_server() as (read_stream, write_stream):
                await self.app.run(
                    read_stream,
                    write_stream,
                    self.app.create_initialization_options()
                )
        finally:
            await self.cleanup()
    
    async def cleanup(self):
        """Clean up resources."""
        await self.task_pool.shutdown()
        self.thread_pool.shutdown(wait=True)

async def main():
    server = HighPerformanceMCP()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## Production deployment with uvloop

For maximum performance in production, use uvloop as the event loop.

### Production-Ready MCP Server
```python
#!/usr/bin/env python3
"""
Production MCP Server with uvloop
Optimized for production deployment.
"""
import asyncio
import logging
import signal
import sys
from typing import Dict, List, Any
from pathlib import Path

# Production imports
try:
    import uvloop
    UVLOOP_AVAILABLE = True
except ImportError:
    UVLOOP_AVAILABLE = False

from mcp.server import Server
from mcp.server.stdio import stdio_server

# Configure production logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler('mcp_server.log') if Path('.').is_dir() else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

class ProductionMCP:
    """Production-ready MCP server with uvloop optimization."""
    
    def __init__(self):
        self.app = Server("production-mcp")
        self.shutdown_event = asyncio.Event()
        self.setup_handlers()
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """Set up graceful shutdown signal handlers."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down gracefully...")
            self.shutdown_event.set()
        
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
    
    def setup_handlers(self):
        """Set up MCP handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "health_check",
                    "description": "Check server health and performance",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "system_info",
                    "description": "Get system information",
                    "inputSchema": {"type": "object", "properties": {}}
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "health_check":
                    return await self.health_check(arguments)
                elif name == "system_info":
                    return await self.system_info(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.exception(f"Error in tool {name}")
                return [{"type": "text", "text": f"Error: {str(e)}"}]
    
    async def health_check(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Perform health check."""
        import time
        
        start_time = time.time()
        
        # Check event loop type
        loop = asyncio.get_running_loop()
        loop_type = "uvloop" if UVLOOP_AVAILABLE and hasattr(loop, '_selector') else "default"
        
        # Basic health metrics
        health_data = {
            "status": "healthy",
            "event_loop": loop_type,
            "uvloop_available": UVLOOP_AVAILABLE,
            "response_time_ms": (time.time() - start_time) * 1000
        }
        
        result = "🟢 Server Health Check:\n\n"
        for key, value in health_data.items():
            result += f"• {key}: {value}\n"
        
        return [{"type": "text", "text": result}]
    
    async def system_info(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get system information."""
        import platform
        
        info = f"System Information:\n\n"
        info += f"• Platform: {platform.platform()}\n"
        info += f"• Python: {platform.python_version()}\n"
        info += f"• Event Loop: {'uvloop' if UVLOOP_AVAILABLE else 'asyncio default'}\n"
        
        # Get process info if psutil is available
        try:
            import psutil
            process = psutil.Process()
            info += f"• Memory: {process.memory_info().rss / 1024 / 1024:.1f} MB\n"
            info += f"• CPU: {process.cpu_percent():.1f}%\n"
            info += f"• Threads: {process.num_threads()}\n"
        except ImportError:
            info += "• Install psutil for detailed process metrics\n"
        
        return [{"type": "text", "text": info}]
    
    async def run(self):
        """Run the production MCP server."""
        logger.info("Starting Production MCP Server")
        
        if UVLOOP_AVAILABLE:
            logger.info("Using uvloop for enhanced performance")
        else:
            logger.warning("uvloop not available, using default event loop")
        
        try:
            async with stdio_server() as (read_stream, write_stream):
                # Create server run task
                server_task = asyncio.create_task(
                    self.app.run(
                        read_stream,
                        write_stream,
                        self.app.create_initialization_options()
                    )
                )
                
                # Wait for either server completion or shutdown signal
                done, pending = await asyncio.wait(
                    [server_task, asyncio.create_task(self.shutdown_event.wait())],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # Cancel pending tasks
                for task in pending:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                
                logger.info("Server shutdown complete")
                
        except Exception as e:
            logger.exception("Server error")
            raise

def main():
    """Entry point with uvloop optimization."""
    
    # Install uvloop if available
    if UVLOOP_AVAILABLE:
        uvloop.install()
        print("🚀 Using uvloop for enhanced performance", file=sys.stderr)
    else:
        print("⚠️  uvloop not available, install with: uv add uvloop", file=sys.stderr)
    
    # Create and run server
    server = ProductionMCP()
    
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user", file=sys.stderr)
    except Exception as e:
        print(f"❌ Server error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### Installation and Deployment

To deploy with uvloop for maximum performance:

```bash
# Install uvloop for production performance
uv add uvloop

# Optional: Add monitoring dependencies  
uv add psutil

# Run in production
python production_mcp_server.py

# Or with explicit uvloop
python -c "import uvloop; uvloop.install(); exec(open('production_mcp_server.py').read())"
```

## Summary

This tutorial covered advanced Python MCP patterns including:

1. **File system tools with pathlib** - Secure, modern file operations
2. **HTTP requests with aiohttp** - Professional web service integration  
3. **Database integration with asyncpg** - High-performance PostgreSQL access
4. **State management with contextvars** - Request-scoped state tracking
5. **Performance optimization with asyncio** - Concurrent processing techniques
6. **Production deployment with uvloop** - Maximum performance event loop

### Key Performance Tips:

- **Use uvloop** in production for 2-4x performance improvement
- **Thread pools** for CPU-intensive work to avoid blocking the event loop
- **Connection pooling** for database and HTTP connections
- **Batch processing** for handling multiple items efficiently  
- **Rate limiting** to prevent resource exhaustion
- **Proper monitoring** with metrics and logging

These patterns enable building production-ready MCP servers that can handle high throughput while maintaining reliability and performance.