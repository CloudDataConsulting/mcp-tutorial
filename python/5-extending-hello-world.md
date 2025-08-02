# Extending the Python MCP Server

## Table of Contents
- [Adding new tools to the Python server](#adding-new-tools-to-the-python-server)
- [Working with async functions](#working-with-async-functions)
- [Type hints and validation](#type-hints-and-validation)
- [Error handling in Python MCP](#error-handling-in-python-mcp)
- [Using pydantic for validation](#using-pydantic-for-validation)
- [Adding multiple tools](#adding-multiple-tools)
- [Real-world examples](#real-world-examples)

## Adding new tools to the Python server

Let's start by examining our basic hello world server and then extend it step by step.

### Current Hello World Server
```python
#!/usr/bin/env python3
import asyncio
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server

# Create a server instance
app = Server("hello-world-mcp")

@app.list_tools()
async def list_tools():
    """List available tools."""
    return [
        {
            "name": "say_hello",
            "description": "Says hello to someone",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the person to greet"
                    }
                },
                "required": ["name"]
            }
        }
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    """Handle tool calls."""
    if name == "say_hello":
        person_name = arguments.get("name")
        return [{
            "type": "text",
            "text": f"Hello, {person_name}! This is your MCP server speaking."
        }]
    else:
        raise ValueError(f"Unknown tool: {name}")

async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

### Adding a Simple Calculator Tool
Let's add a calculator tool to demonstrate basic tool extension:

```python
#!/usr/bin/env python3
import asyncio
from typing import Dict, List, Any, Union
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("extended-hello-world-mcp")

@app.list_tools()
async def list_tools() -> List[Dict[str, Any]]:
    """List available tools."""
    return [
        {
            "name": "say_hello",
            "description": "Says hello to someone",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the person to greet"
                    }
                },
                "required": ["name"]
            }
        },
        {
            "name": "calculate",
            "description": "Perform basic arithmetic calculations",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": ["add", "subtract", "multiply", "divide"],
                        "description": "The arithmetic operation to perform"
                    },
                    "a": {
                        "type": "number",
                        "description": "First number"
                    },
                    "b": {
                        "type": "number",
                        "description": "Second number"
                    }
                },
                "required": ["operation", "a", "b"]
            }
        }
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle tool calls."""
    if name == "say_hello":
        return await handle_say_hello(arguments)
    elif name == "calculate":
        return await handle_calculate(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")

async def handle_say_hello(arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle the say_hello tool."""
    person_name = arguments.get("name")
    return [{
        "type": "text",
        "text": f"Hello, {person_name}! This is your extended MCP server speaking."
    }]

async def handle_calculate(arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle the calculate tool."""
    operation = arguments.get("operation")
    a = arguments.get("a")
    b = arguments.get("b")
    
    try:
        if operation == "add":
            result = a + b
        elif operation == "subtract":
            result = a - b
        elif operation == "multiply":
            result = a * b
        elif operation == "divide":
            if b == 0:
                return [{
                    "type": "text",
                    "text": "Error: Cannot divide by zero!"
                }]
            result = a / b
        else:
            return [{
                "type": "text",
                "text": f"Error: Unknown operation '{operation}'"
            }]
        
        return [{
            "type": "text",
            "text": f"Result: {a} {operation} {b} = {result}"
        }]
    
    except Exception as e:
        return [{
            "type": "text",
            "text": f"Calculation error: {str(e)}"
        }]

async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

## Working with async functions

Python's async/await pattern is essential for MCP servers because they often need to perform I/O operations without blocking.

### Understanding Async in MCP Context
```python
import asyncio
import aiofiles
import aiohttp
from pathlib import Path

# Async file operations
async def read_file_async(filename: str) -> str:
    """Read a file asynchronously."""
    file_path = Path(filename)
    async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
        content = await file.read()
    return content

# Async HTTP requests
async def fetch_url_async(url: str) -> dict:
    """Fetch data from a URL asynchronously."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

# Async database operations (example with asyncpg)
async def query_database_async(query: str):
    """Query database asynchronously."""
    import asyncpg
    conn = await asyncpg.connect('postgresql://user:password@localhost/db')
    try:
        result = await conn.fetch(query)
        return result
    finally:
        await conn.close()
```

### Adding Async File Operations to MCP Server
```python
import asyncio
import aiofiles
from pathlib import Path
from typing import Dict, List, Any
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("file-operations-mcp")

@app.list_tools()
async def list_tools() -> List[Dict[str, Any]]:
    """List available tools."""
    return [
        {
            "name": "read_file",
            "description": "Read the contents of a text file",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Path to the file to read"
                    }
                },
                "required": ["filename"]
            }
        },
        {
            "name": "write_file",
            "description": "Write content to a text file",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Path to the file to write"
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to write to the file"
                    }
                },
                "required": ["filename", "content"]
            }
        },
        {
            "name": "list_files",
            "description": "List files in a directory",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory path to list (defaults to current directory)",
                        "default": "."
                    }
                }
            }
        }
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle tool calls."""
    if name == "read_file":
        return await handle_read_file(arguments)
    elif name == "write_file":
        return await handle_write_file(arguments)
    elif name == "list_files":
        return await handle_list_files(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")

async def handle_read_file(arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle reading a file asynchronously."""
    filename = arguments.get("filename")
    
    try:
        # Security: Resolve path and check if it's safe
        file_path = Path(filename).resolve()
        current_dir = Path.cwd().resolve()
        
        # Basic security check: only allow files in current directory or subdirectories
        if not str(file_path).startswith(str(current_dir)):
            return [{
                "type": "text",
                "text": f"Error: Access denied. File must be in current directory or subdirectories."
            }]
        
        # Check if file exists
        if not file_path.exists():
            return [{
                "type": "text",
                "text": f"Error: File '{filename}' not found."
            }]
        
        if not file_path.is_file():
            return [{
                "type": "text",
                "text": f"Error: '{filename}' is not a file."
            }]
        
        # Read file asynchronously
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
            content = await file.read()
        
        return [{
            "type": "text",
            "text": f"Contents of {filename}:\n\n{content}"
        }]
    
    except PermissionError:
        return [{
            "type": "text",
            "text": f"Error: Permission denied reading '{filename}'"
        }]
    except UnicodeDecodeError:
        return [{
            "type": "text",
            "text": f"Error: Cannot decode '{filename}' as text. Binary file?"
        }]
    except Exception as e:
        return [{
            "type": "text",
            "text": f"Error reading file: {str(e)}"
        }]

async def handle_write_file(arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle writing to a file asynchronously."""
    filename = arguments.get("filename")
    content = arguments.get("content")
    
    try:
        # Security check
        file_path = Path(filename).resolve()
        current_dir = Path.cwd().resolve()
        
        if not str(file_path).startswith(str(current_dir)):
            return [{
                "type": "text",
                "text": f"Error: Access denied. File must be in current directory or subdirectories."
            }]
        
        # Create parent directories if they don't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file asynchronously
        async with aiofiles.open(file_path, 'w', encoding='utf-8') as file:
            await file.write(content)
        
        return [{
            "type": "text",
            "text": f"Successfully wrote {len(content)} characters to '{filename}'"
        }]
    
    except PermissionError:
        return [{
            "type": "text",
            "text": f"Error: Permission denied writing to '{filename}'"
        }]
    except Exception as e:
        return [{
            "type": "text",
            "text": f"Error writing file: {str(e)}"
        }]

async def handle_list_files(arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle listing files in a directory."""
    directory = arguments.get("directory", ".")
    
    try:
        # Security check
        dir_path = Path(directory).resolve()
        current_dir = Path.cwd().resolve()
        
        if not str(dir_path).startswith(str(current_dir)):
            return [{
                "type": "text",
                "text": f"Error: Access denied. Directory must be in current directory or subdirectories."
            }]
        
        if not dir_path.exists():
            return [{
                "type": "text",
                "text": f"Error: Directory '{directory}' not found."
            }]
        
        if not dir_path.is_dir():
            return [{
                "type": "text",
                "text": f"Error: '{directory}' is not a directory."
            }]
        
        # List files and directories
        items = []
        for item in sorted(dir_path.iterdir()):
            if item.is_file():
                size = item.stat().st_size
                items.append(f"📄 {item.name} ({size} bytes)")
            elif item.is_dir():
                items.append(f"📁 {item.name}/")
        
        if not items:
            content = f"Directory '{directory}' is empty."
        else:
            content = f"Contents of '{directory}':\n\n" + "\n".join(items)
        
        return [{
            "type": "text",
            "text": content
        }]
    
    except PermissionError:
        return [{
            "type": "text",
            "text": f"Error: Permission denied accessing '{directory}'"
        }]
    except Exception as e:
        return [{
            "type": "text",
            "text": f"Error listing directory: {str(e)}"
        }]
```

## Type hints and validation

Type hints make Python code more maintainable and help catch errors early.

### Basic Type Hints for MCP Servers
```python
from typing import Dict, List, Any, Optional, Union, Literal
from mcp.server import Server

# Type aliases for clarity
ToolDefinition = Dict[str, Any]
ToolResponse = List[Dict[str, str]]
Arguments = Dict[str, Any]

class TypedMCPServer:
    """MCP server with comprehensive type hints."""
    
    def __init__(self, name: str) -> None:
        self.app: Server = Server(name)
        self.setup_handlers()
    
    def setup_handlers(self) -> None:
        """Set up MCP handlers with type hints."""
        
        @self.app.list_tools()
        async def list_tools() -> List[ToolDefinition]:
            return await self.get_tool_definitions()
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Arguments) -> ToolResponse:
            return await self.handle_tool_call(name, arguments)
    
    async def get_tool_definitions(self) -> List[ToolDefinition]:
        """Get tool definitions with proper typing."""
        return [
            {
                "name": "greet_person",
                "description": "Greet a person with customizable style",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "style": {
                            "type": "string", 
                            "enum": ["casual", "formal", "friendly"]
                        },
                        "include_time": {"type": "boolean", "default": False}
                    },
                    "required": ["name"]
                }
            }
        ]
    
    async def handle_tool_call(self, name: str, arguments: Arguments) -> ToolResponse:
        """Handle tool calls with proper error handling."""
        if name == "greet_person":
            return await self.greet_person(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    async def greet_person(self, arguments: Arguments) -> ToolResponse:
        """Greet a person with type-safe argument handling."""
        # Extract arguments with proper typing
        name: str = arguments["name"]
        style: Literal["casual", "formal", "friendly"] = arguments.get("style", "casual")
        include_time: bool = arguments.get("include_time", False)
        
        # Generate greeting based on style
        greetings = {
            "casual": f"Hey {name}!",
            "formal": f"Good day, {name}.",
            "friendly": f"Hello there, {name}! Nice to meet you!"
        }
        
        greeting = greetings[style]
        
        if include_time:
            from datetime import datetime
            current_time = datetime.now().strftime("%H:%M")
            greeting += f" It's currently {current_time}."
        
        return [{
            "type": "text",
            "text": greeting
        }]
```

### Advanced Type Hints with Generic Types
```python
from typing import TypeVar, Generic, Protocol, runtime_checkable
from abc import ABC, abstractmethod

T = TypeVar('T')

class ToolHandler(Generic[T], ABC):
    """Abstract base class for tool handlers."""
    
    @abstractmethod
    async def handle(self, arguments: T) -> ToolResponse:
        """Handle tool execution."""
        pass
    
    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """Get JSON schema for tool arguments."""
        pass

@runtime_checkable
class Validatable(Protocol):
    """Protocol for objects that can be validated."""
    
    def validate(self) -> bool:
        """Validate the object."""
        ...

class GreetingArguments:
    """Type-safe arguments for greeting tool."""
    
    def __init__(self, name: str, style: str = "casual", include_time: bool = False):
        self.name = name
        self.style = style
        self.include_time = include_time
    
    def validate(self) -> bool:
        """Validate arguments."""
        if not isinstance(self.name, str) or not self.name.strip():
            return False
        if self.style not in ["casual", "formal", "friendly"]:
            return False
        return True

class GreetingHandler(ToolHandler[GreetingArguments]):
    """Type-safe greeting tool handler."""
    
    async def handle(self, arguments: GreetingArguments) -> ToolResponse:
        """Handle greeting with validated arguments."""
        if not arguments.validate():
            return [{
                "type": "text",
                "text": "Invalid arguments provided"
            }]
        
        # Implementation here...
        return [{
            "type": "text",
            "text": f"Hello, {arguments.name}!"
        }]
    
    def get_schema(self) -> Dict[str, Any]:
        """Get JSON schema."""
        return {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "style": {"type": "string", "enum": ["casual", "formal", "friendly"]},
                "include_time": {"type": "boolean"}
            },
            "required": ["name"]
        }
```

## Error handling in Python MCP

Proper error handling ensures your MCP server provides helpful feedback and doesn't crash unexpectedly.

### Error Handling Patterns
```python
import logging
from typing import Dict, List, Any
from enum import Enum
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorType(Enum):
    """Types of errors that can occur."""
    VALIDATION_ERROR = "validation_error"
    PERMISSION_ERROR = "permission_error"
    NOT_FOUND_ERROR = "not_found_error"
    NETWORK_ERROR = "network_error"
    UNKNOWN_ERROR = "unknown_error"

@dataclass
class MCPError:
    """Structured error representation."""
    error_type: ErrorType
    message: str
    details: Dict[str, Any] = None
    
    def to_response(self) -> List[Dict[str, str]]:
        """Convert to MCP response format."""
        return [{
            "type": "text",
            "text": f"Error: {self.message}"
        }]

class ErrorHandler:
    """Centralized error handling for MCP servers."""
    
    @staticmethod
    def handle_exception(e: Exception, context: str = "") -> MCPError:
        """Convert exceptions to structured errors."""
        if isinstance(e, ValueError):
            return MCPError(
                error_type=ErrorType.VALIDATION_ERROR,
                message=str(e),
                details={"context": context}
            )
        elif isinstance(e, PermissionError):
            return MCPError(
                error_type=ErrorType.PERMISSION_ERROR,
                message="Access denied",
                details={"context": context}
            )
        elif isinstance(e, FileNotFoundError):
            return MCPError(
                error_type=ErrorType.NOT_FOUND_ERROR,
                message=f"File not found: {str(e)}",
                details={"context": context}
            )
        else:
            logger.exception(f"Unexpected error in {context}")
            return MCPError(
                error_type=ErrorType.UNKNOWN_ERROR,
                message="An unexpected error occurred",
                details={"context": context, "exception_type": type(e).__name__}
            )

# Usage in MCP server
class RobustMCPServer:
    def __init__(self):
        self.app = Server("robust-mcp")
        self.error_handler = ErrorHandler()
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                # Validate tool name
                if not name:
                    raise ValueError("Tool name cannot be empty")
                
                if name == "risky_operation":
                    return await self.handle_risky_operation(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
                    
            except Exception as e:
                error = self.error_handler.handle_exception(e, f"tool call: {name}")
                return error.to_response()
    
    async def handle_risky_operation(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Example of handling a risky operation with proper error handling."""
        try:
            # Validate arguments
            if "filename" not in arguments:
                raise ValueError("filename is required")
            
            filename = arguments["filename"]
            
            # Perform risky operation
            result = await self.perform_file_operation(filename)
            
            return [{
                "type": "text",
                "text": f"Operation successful: {result}"
            }]
            
        except FileNotFoundError:
            # Re-raise to be handled by centralized error handler
            raise
        except PermissionError:
            # Re-raise to be handled by centralized error handler
            raise
        except Exception as e:
            # Log unexpected errors but re-raise for centralized handling
            logger.error(f"Unexpected error in risky_operation: {e}")
            raise
    
    async def perform_file_operation(self, filename: str) -> str:
        """Simulate a file operation that might fail."""
        from pathlib import Path
        
        file_path = Path(filename)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File {filename} does not exist")
        
        if not file_path.is_file():
            raise ValueError(f"{filename} is not a file")
        
        # Simulate some processing
        return f"Processed {filename} successfully"
```

## Using pydantic for validation

Pydantic provides powerful data validation and serialization for Python applications.

### Setting Up Pydantic Models
```python
from pydantic import BaseModel, Field, validator, ValidationError
from typing import Optional, Literal, List
from enum import Enum
import asyncio

# Install pydantic: uv add pydantic

class GreetingStyle(str, Enum):
    """Enum for greeting styles."""
    CASUAL = "casual"
    FORMAL = "formal"
    FRIENDLY = "friendly"

class GreetingRequest(BaseModel):
    """Pydantic model for greeting request validation."""
    name: str = Field(..., min_length=1, max_length=100, description="Name to greet")
    style: GreetingStyle = Field(default=GreetingStyle.CASUAL, description="Greeting style")
    include_time: bool = Field(default=False, description="Include current time in greeting")
    repeat_count: int = Field(default=1, ge=1, le=5, description="Number of times to repeat greeting")
    
    @validator('name')
    def name_must_be_valid(cls, v):
        """Validate name contains only letters and spaces."""
        if not v.replace(' ', '').isalpha():
            raise ValueError('Name must contain only letters and spaces')
        return v.title()  # Capitalize properly
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "name": "Alice",
                "style": "friendly",
                "include_time": True,
                "repeat_count": 2
            }
        }

class FileOperationRequest(BaseModel):
    """Model for file operations."""
    filename: str = Field(..., description="Path to the file")
    content: Optional[str] = Field(None, description="Content to write (for write operations)")
    encoding: str = Field(default="utf-8", description="File encoding")
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename for security."""
        from pathlib import Path
        
        # Basic security checks
        if '..' in v or v.startswith('/'):
            raise ValueError('Invalid filename: path traversal detected')
        
        if len(v) > 255:
            raise ValueError('Filename too long')
        
        return v

# MCP Server with Pydantic validation
class ValidatedMCPServer:
    def __init__(self):
        self.app = Server("validated-mcp")
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "validated_greeting",
                    "description": "Send a validated greeting",
                    "inputSchema": GreetingRequest.schema()  # Auto-generate schema!
                },
                {
                    "name": "safe_file_read",
                    "description": "Safely read a file with validation",
                    "inputSchema": FileOperationRequest.schema()
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "validated_greeting":
                    # Validate arguments using Pydantic
                    request = GreetingRequest(**arguments)
                    return await self.handle_validated_greeting(request)
                
                elif name == "safe_file_read":
                    request = FileOperationRequest(**arguments)
                    return await self.handle_safe_file_read(request)
                
                else:
                    raise ValueError(f"Unknown tool: {name}")
                    
            except ValidationError as e:
                # Pydantic validation error
                error_details = []
                for error in e.errors():
                    field = " -> ".join(str(x) for x in error['loc'])
                    error_details.append(f"{field}: {error['msg']}")
                
                return [{
                    "type": "text",
                    "text": f"Validation errors:\n" + "\n".join(error_details)
                }]
            
            except Exception as e:
                logger.exception("Unexpected error in tool call")
                return [{
                    "type": "text",
                    "text": f"Error: {str(e)}"
                }]
    
    async def handle_validated_greeting(self, request: GreetingRequest) -> List[Dict[str, str]]:
        """Handle greeting with validated Pydantic model."""
        greetings = {
            GreetingStyle.CASUAL: f"Hey {request.name}!",
            GreetingStyle.FORMAL: f"Good day, {request.name}.",
            GreetingStyle.FRIENDLY: f"Hello there, {request.name}! Great to see you!"
        }
        
        greeting = greetings[request.style]
        
        if request.include_time:
            from datetime import datetime
            current_time = datetime.now().strftime("%H:%M")
            greeting += f" It's currently {current_time}."
        
        # Repeat greeting if requested
        messages = []
        for i in range(request.repeat_count):
            if request.repeat_count > 1:
                messages.append(f"({i+1}) {greeting}")
            else:
                messages.append(greeting)
        
        return [{
            "type": "text",
            "text": "\n".join(messages)
        }]
    
    async def handle_safe_file_read(self, request: FileOperationRequest) -> List[Dict[str, str]]:
        """Handle file reading with validation."""
        from pathlib import Path
        import aiofiles
        
        try:
            file_path = Path(request.filename).resolve()
            
            # Additional security checks
            current_dir = Path.cwd().resolve()
            if not str(file_path).startswith(str(current_dir)):
                return [{
                    "type": "text",
                    "text": "Error: File access outside current directory denied"
                }]
            
            if not file_path.exists():
                return [{
                    "type": "text",
                    "text": f"Error: File '{request.filename}' not found"
                }]
            
            # Read file with specified encoding
            async with aiofiles.open(file_path, 'r', encoding=request.encoding) as file:
                content = await file.read()
            
            return [{
                "type": "text",
                "text": f"Contents of {request.filename}:\n\n{content}"
            }]
            
        except UnicodeDecodeError:
            return [{
                "type": "text",
                "text": f"Error: Cannot decode file with {request.encoding} encoding"
            }]
        except Exception as e:
            return [{
                "type": "text",
                "text": f"Error reading file: {str(e)}"
            }]
```

### Advanced Pydantic Features
```python
from pydantic import BaseModel, Field, validator, root_validator
from typing import Union, List, Optional
from datetime import datetime, date

class AdvancedToolRequest(BaseModel):
    """Advanced Pydantic model with custom validators."""
    
    # Union types
    identifier: Union[int, str] = Field(..., description="Numeric ID or string identifier")
    
    # Custom field types
    created_date: Optional[date] = Field(None, description="Creation date")
    tags: List[str] = Field(default_factory=list, description="Associated tags")
    
    # Constrained types
    priority: int = Field(default=1, ge=1, le=10, description="Priority level 1-10")
    
    @validator('identifier')
    def validate_identifier(cls, v):
        """Custom validation for identifier."""
        if isinstance(v, str):
            if len(v) < 3:
                raise ValueError('String identifier must be at least 3 characters')
            if not v.isalnum():
                raise ValueError('String identifier must be alphanumeric')
        elif isinstance(v, int):
            if v <= 0:
                raise ValueError('Numeric identifier must be positive')
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags list."""
        if len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        
        # Remove duplicates and empty strings
        clean_tags = list(set(tag.strip() for tag in v if tag.strip()))
        return clean_tags
    
    @root_validator
    def validate_model(cls, values):
        """Cross-field validation."""
        created_date = values.get('created_date')
        priority = values.get('priority')
        
        # High priority items must have a creation date
        if priority >= 8 and not created_date:
            raise ValueError('High priority items (8+) must have a creation date')
        
        return values
    
    class Config:
        # Allow extra fields to be ignored instead of raising error
        extra = "ignore"
        # Validate assignment (validate when fields are set after creation)
        validate_assignment = True
        # Custom JSON encoders
        json_encoders = {
            date: lambda v: v.isoformat()
        }

# Usage in MCP server
async def handle_advanced_tool(arguments: Dict[str, Any]) -> List[Dict[str, str]]:
    """Handle tool with advanced Pydantic validation."""
    try:
        # Parse and validate arguments
        request = AdvancedToolRequest(**arguments)
        
        # Use validated data
        result = f"Processing item {request.identifier} with priority {request.priority}"
        if request.tags:
            result += f"\nTags: {', '.join(request.tags)}"
        if request.created_date:
            result += f"\nCreated: {request.created_date}"
        
        return [{
            "type": "text",
            "text": result
        }]
        
    except ValidationError as e:
        # Return detailed validation errors
        errors = []
        for error in e.errors():
            field = " -> ".join(str(x) for x in error['loc']) if error['loc'] else 'root'
            errors.append(f"• {field}: {error['msg']}")
        
        return [{
            "type": "text",
            "text": f"Validation failed:\n" + "\n".join(errors)
        }]
```

## Adding multiple tools

Let's create a comprehensive MCP server with multiple well-organized tools.

### Organized Multi-Tool Server
```python
#!/usr/bin/env python3
"""
Comprehensive MCP Server with Multiple Tools
Demonstrates organization, validation, and error handling.
"""
import asyncio
import aiofiles
import aiohttp
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import BaseModel, Field, ValidationError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for validation
class GreetingRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    style: str = Field(default="casual", regex="^(casual|formal|friendly)$")
    include_time: bool = Field(default=False)

class FileRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    content: Optional[str] = None
    
    @validator('filename')
    def validate_filename(cls, v):
        if '..' in v or v.startswith('/') or '\\' in v:
            raise ValueError('Invalid filename')
        return v

class CalculatorRequest(BaseModel):
    operation: str = Field(..., regex="^(add|subtract|multiply|divide|power)$")
    a: float = Field(...)
    b: float = Field(...)

class HttpRequest(BaseModel):
    url: str = Field(..., regex=r'^https?://')
    method: str = Field(default="GET", regex="^(GET|POST)$")
    headers: Optional[Dict[str, str]] = None

class ComprehensiveMCPServer:
    """A comprehensive MCP server with multiple organized tools."""
    
    def __init__(self):
        self.app = Server("comprehensive-mcp")
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up all MCP handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                # Text processing tools
                {
                    "name": "greet",
                    "description": "Greet someone with customizable style",
                    "inputSchema": GreetingRequest.schema()
                },
                {
                    "name": "text_stats",
                    "description": "Analyze text and provide statistics",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Text to analyze"}
                        },
                        "required": ["text"]
                    }
                },
                
                # File operations
                {
                    "name": "read_file",
                    "description": "Read contents of a text file",
                    "inputSchema": FileRequest.schema()
                },
                {
                    "name": "write_file",
                    "description": "Write content to a text file",
                    "inputSchema": FileRequest.schema()
                },
                {
                    "name": "list_directory",
                    "description": "List contents of a directory",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string", "default": "."}
                        }
                    }
                },
                
                # Mathematical operations
                {
                    "name": "calculate",
                    "description": "Perform mathematical calculations",
                    "inputSchema": CalculatorRequest.schema()
                },
                
                # Network operations
                {
                    "name": "http_request",
                    "description": "Make HTTP requests",
                    "inputSchema": HttpRequest.schema()
                },
                
                # System operations
                {
                    "name": "system_info",
                    "description": "Get system information",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            """Route tool calls to appropriate handlers."""
            try:
                # Text processing tools
                if name == "greet":
                    return await self.handle_greet(arguments)
                elif name == "text_stats":
                    return await self.handle_text_stats(arguments)
                
                # File operations
                elif name == "read_file":
                    return await self.handle_read_file(arguments)
                elif name == "write_file":
                    return await self.handle_write_file(arguments)
                elif name == "list_directory":
                    return await self.handle_list_directory(arguments)
                
                # Mathematical operations
                elif name == "calculate":
                    return await self.handle_calculate(arguments)
                
                # Network operations
                elif name == "http_request":
                    return await self.handle_http_request(arguments)
                
                # System operations
                elif name == "system_info":
                    return await self.handle_system_info(arguments)
                
                else:
                    raise ValueError(f"Unknown tool: {name}")
                    
            except ValidationError as e:
                return self._format_validation_error(e)
            except Exception as e:
                logger.exception(f"Error in tool '{name}'")
                return [{
                    "type": "text",
                    "text": f"Error: {str(e)}"
                }]
    
    # Text processing tools
    async def handle_greet(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Handle greeting with validation."""
        request = GreetingRequest(**arguments)
        
        greetings = {
            "casual": f"Hey {request.name}!",
            "formal": f"Good day, {request.name}.",
            "friendly": f"Hello there, {request.name}! Great to see you!"
        }
        
        greeting = greetings[request.style]
        
        if request.include_time:
            current_time = datetime.now().strftime("%H:%M")
            greeting += f" It's currently {current_time}."
        
        return [{"type": "text", "text": greeting}]
    
    async def handle_text_stats(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Analyze text and provide statistics."""
        text = arguments.get("text", "")
        
        # Calculate statistics
        char_count = len(text)
        word_count = len(text.split())
        line_count = text.count('\n') + 1 if text else 0
        sentence_count = text.count('.') + text.count('!') + text.count('?')
        
        # Most common words
        words = text.lower().split()
        word_freq = {}
        for word in words:
            word = word.strip('.,!?;:"()[]{}')
            if word:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
        
        stats = f"""Text Statistics:
• Characters: {char_count}
• Words: {word_count}
• Lines: {line_count}
• Sentences: ~{sentence_count}

Top 5 words:"""
        
        for word, count in top_words:
            stats += f"\n• {word}: {count}"
        
        return [{"type": "text", "text": stats}]
    
    # File operations
    async def handle_read_file(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Read file with security checks."""
        request = FileRequest(**arguments)
        
        try:
            file_path = Path(request.filename).resolve()
            current_dir = Path.cwd().resolve()
            
            if not str(file_path).startswith(str(current_dir)):
                return [{"type": "text", "text": "Error: Access denied"}]
            
            if not file_path.exists():
                return [{"type": "text", "text": f"Error: File '{request.filename}' not found"}]
            
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
                content = await file.read()
            
            return [{
                "type": "text",
                "text": f"Contents of {request.filename}:\n\n{content}"
            }]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error reading file: {str(e)}"}]
    
    async def handle_write_file(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Write file with security checks."""
        request = FileRequest(**arguments)
        
        if not request.content:
            return [{"type": "text", "text": "Error: No content provided to write"}]
        
        try:
            file_path = Path(request.filename).resolve()
            current_dir = Path.cwd().resolve()
            
            if not str(file_path).startswith(str(current_dir)):
                return [{"type": "text", "text": "Error: Access denied"}]
            
            # Create parent directories if needed
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(file_path, 'w', encoding='utf-8') as file:
                await file.write(request.content)
            
            return [{
                "type": "text",
                "text": f"Successfully wrote {len(request.content)} characters to '{request.filename}'"
            }]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error writing file: {str(e)}"}]
    
    async def handle_list_directory(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """List directory contents."""
        directory = arguments.get("path", ".")
        
        try:
            dir_path = Path(directory).resolve()
            current_dir = Path.cwd().resolve()
            
            if not str(dir_path).startswith(str(current_dir)):
                return [{"type": "text", "text": "Error: Access denied"}]
            
            if not dir_path.exists():
                return [{"type": "text", "text": f"Error: Directory '{directory}' not found"}]
            
            items = []
            for item in sorted(dir_path.iterdir()):
                if item.is_file():
                    size = item.stat().st_size
                    items.append(f"📄 {item.name} ({size} bytes)")
                elif item.is_dir():
                    items.append(f"📁 {item.name}/")
            
            if not items:
                content = f"Directory '{directory}' is empty."
            else:
                content = f"Contents of '{directory}':\n\n" + "\n".join(items)
            
            return [{"type": "text", "text": content}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error listing directory: {str(e)}"}]
    
    # Mathematical operations
    async def handle_calculate(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Perform calculations with validation."""
        request = CalculatorRequest(**arguments)
        
        try:
            if request.operation == "add":
                result = request.a + request.b
            elif request.operation == "subtract":
                result = request.a - request.b
            elif request.operation == "multiply":
                result = request.a * request.b
            elif request.operation == "divide":
                if request.b == 0:
                    return [{"type": "text", "text": "Error: Division by zero"}]
                result = request.a / request.b
            elif request.operation == "power":
                result = request.a ** request.b
            
            return [{
                "type": "text",
                "text": f"Result: {request.a} {request.operation} {request.b} = {result}"
            }]
            
        except Exception as e:
            return [{"type": "text", "text": f"Calculation error: {str(e)}"}]
    
    # Network operations
    async def handle_http_request(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Make HTTP requests."""
        request = HttpRequest(**arguments)
        
        try:
            timeout = aiohttp.ClientTimeout(total=10)  # 10 second timeout
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                if request.method == "GET":
                    async with session.get(request.url, headers=request.headers) as response:
                        content = await response.text()
                        return [{
                            "type": "text",
                            "text": f"HTTP {response.status} from {request.url}:\n\n{content[:1000]}..."
                        }]
                elif request.method == "POST":
                    async with session.post(request.url, headers=request.headers) as response:
                        content = await response.text()
                        return [{
                            "type": "text",
                            "text": f"HTTP {response.status} from {request.url}:\n\n{content[:1000]}..."
                        }]
                        
        except asyncio.TimeoutError:
            return [{"type": "text", "text": "Error: Request timeout"}]
        except Exception as e:
            return [{"type": "text", "text": f"HTTP request error: {str(e)}"}]
    
    # System operations
    async def handle_system_info(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get system information."""
        import platform
        import sys
        from datetime import datetime
        
        info = f"""System Information:
• Platform: {platform.platform()}
• Python Version: {sys.version}
• Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
• Working Directory: {Path.cwd()}
• MCP Server: Comprehensive MCP v1.0.0"""
        
        return [{"type": "text", "text": info}]
    
    def _format_validation_error(self, e: ValidationError) -> List[Dict[str, str]]:
        """Format Pydantic validation errors."""
        errors = []
        for error in e.errors():
            field = " -> ".join(str(x) for x in error['loc']) if error['loc'] else 'root'
            errors.append(f"• {field}: {error['msg']}")
        
        return [{
            "type": "text",
            "text": f"Validation errors:\n" + "\n".join(errors)
        }]
    
    async def run(self):
        """Run the MCP server."""
        logger.info("Starting Comprehensive MCP Server")
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

async def main():
    """Entry point."""
    server = ComprehensiveMCPServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## Real-world examples

### Example 1: File Processing MCP Server
This example shows a practical MCP server for file processing tasks:

```python
#!/usr/bin/env python3
"""
File Processing MCP Server
Handles common file operations with proper validation and error handling.
"""
import asyncio
import aiofiles
import json
import csv
from pathlib import Path
from typing import Dict, List, Any, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import BaseModel, Field, ValidationError
import logging

logger = logging.getLogger(__name__)

class FileProcessingServer:
    """MCP server for file processing operations."""
    
    def __init__(self):
        self.app = Server("file-processing-mcp")
        self.max_file_size = 10 * 1024 * 1024  # 10MB limit
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "analyze_csv",
                    "description": "Analyze a CSV file and provide statistics",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "filename": {"type": "string", "description": "Path to CSV file"}
                        },
                        "required": ["filename"]
                    }
                },
                {
                    "name": "merge_json_files",
                    "description": "Merge multiple JSON files into one",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "input_files": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of JSON files to merge"
                            },
                            "output_file": {"type": "string", "description": "Output filename"}
                        },
                        "required": ["input_files", "output_file"]
                    }
                },
                {
                    "name": "find_text_in_files",
                    "description": "Search for text across multiple files",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "pattern": {"type": "string", "description": "Text pattern to search for"},
                            "directory": {"type": "string", "default": ".", "description": "Directory to search in"},
                            "file_extension": {"type": "string", "default": ".txt", "description": "File extension to search"}
                        },
                        "required": ["pattern"]
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "analyze_csv":
                    return await self.analyze_csv(arguments)
                elif name == "merge_json_files":
                    return await self.merge_json_files(arguments)
                elif name == "find_text_in_files":
                    return await self.find_text_in_files(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.exception(f"Error in {name}")
                return [{"type": "text", "text": f"Error: {str(e)}"}]
    
    async def analyze_csv(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Analyze a CSV file and provide statistics."""
        filename = arguments["filename"]
        
        try:
            file_path = await self._validate_file_path(filename)
            
            # Read CSV file
            rows = []
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
                content = await file.read()
                
            # Parse CSV
            lines = content.strip().split('\n')
            if not lines:
                return [{"type": "text", "text": "Error: CSV file is empty"}]
            
            # Get headers
            import csv
            from io import StringIO
            csv_reader = csv.reader(StringIO(content))
            headers = next(csv_reader)
            
            # Count rows and analyze data
            data_rows = list(csv_reader)
            num_rows = len(data_rows)
            num_columns = len(headers)
            
            # Analyze each column
            column_stats = {}
            for i, header in enumerate(headers):
                values = [row[i] if i < len(row) else '' for row in data_rows]
                non_empty = [v for v in values if v.strip()]
                
                column_stats[header] = {
                    "non_empty_count": len(non_empty),
                    "empty_count": len(values) - len(non_empty),
                    "unique_values": len(set(non_empty)) if non_empty else 0
                }
            
            # Format results
            result = f"CSV Analysis for {filename}:\n\n"
            result += f"• Total rows: {num_rows} (excluding header)\n"
            result += f"• Total columns: {num_columns}\n\n"
            result += "Column Analysis:\n"
            
            for header, stats in column_stats.items():
                result += f"• {header}:\n"
                result += f"  - Non-empty: {stats['non_empty_count']}\n"
                result += f"  - Empty: {stats['empty_count']}\n"
                result += f"  - Unique values: {stats['unique_values']}\n"
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error analyzing CSV: {str(e)}"}]
    
    async def merge_json_files(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Merge multiple JSON files into one."""
        input_files = arguments["input_files"]
        output_file = arguments["output_file"]
        
        try:
            merged_data = {}
            processed_files = []
            
            for filename in input_files:
                file_path = await self._validate_file_path(filename)
                
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
                    content = await file.read()
                    data = json.loads(content)
                    
                    if isinstance(data, dict):
                        merged_data.update(data)
                    elif isinstance(data, list):
                        if 'items' not in merged_data:
                            merged_data['items'] = []
                        merged_data['items'].extend(data)
                    
                    processed_files.append(filename)
            
            # Write merged data
            output_path = await self._validate_file_path(output_file, for_writing=True)
            
            async with aiofiles.open(output_path, 'w', encoding='utf-8') as file:
                await file.write(json.dumps(merged_data, indent=2))
            
            result = f"Successfully merged {len(processed_files)} JSON files into '{output_file}':\n"
            result += f"• Processed files: {', '.join(processed_files)}\n"
            result += f"• Output size: {len(json.dumps(merged_data))} characters"
            
            return [{"type": "text", "text": result}]
            
        except json.JSONDecodeError as e:
            return [{"type": "text", "text": f"JSON parsing error: {str(e)}"}]
        except Exception as e:
            return [{"type": "text", "text": f"Error merging files: {str(e)}"}]
    
    async def find_text_in_files(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Search for text across multiple files."""
        pattern = arguments["pattern"]
        directory = arguments.get("directory", ".")
        file_extension = arguments.get("file_extension", ".txt")
        
        try:
            dir_path = await self._validate_directory_path(directory)
            
            matches = []
            searched_files = 0
            
            # Search through files
            for file_path in dir_path.rglob(f"*{file_extension}"):
                if file_path.is_file():
                    searched_files += 1
                    
                    try:
                        async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
                            content = await file.read()
                            
                        lines = content.split('\n')
                        for line_num, line in enumerate(lines, 1):
                            if pattern.lower() in line.lower():
                                matches.append({
                                    "file": str(file_path.relative_to(dir_path)),
                                    "line": line_num,
                                    "content": line.strip()
                                })
                    except UnicodeDecodeError:
                        # Skip binary files
                        continue
            
            # Format results
            if not matches:
                result = f"No matches found for '{pattern}' in {searched_files} files"
            else:
                result = f"Found {len(matches)} matches for '{pattern}' in {searched_files} files:\n\n"
                
                for match in matches[:50]:  # Limit to first 50 matches
                    result += f"• {match['file']}:{match['line']} - {match['content']}\n"
                
                if len(matches) > 50:
                    result += f"\n... and {len(matches) - 50} more matches"
            
            return [{"type": "text", "text": result}]
            
        except Exception as e:
            return [{"type": "text", "text": f"Error searching files: {str(e)}"}]
    
    async def _validate_file_path(self, filename: str, for_writing: bool = False) -> Path:
        """Validate and resolve file path with security checks."""
        if not filename or '..' in filename or filename.startswith('/'):
            raise ValueError("Invalid filename")
        
        file_path = Path(filename).resolve()
        current_dir = Path.cwd().resolve()
        
        if not str(file_path).startswith(str(current_dir)):
            raise ValueError("Access denied: file outside current directory")
        
        if not for_writing:
            if not file_path.exists():
                raise FileNotFoundError(f"File '{filename}' not found")
            
            if not file_path.is_file():
                raise ValueError(f"'{filename}' is not a file")
            
            # Check file size
            if file_path.stat().st_size > self.max_file_size:
                raise ValueError(f"File too large (max {self.max_file_size} bytes)")
        
        return file_path
    
    async def _validate_directory_path(self, directory: str) -> Path:
        """Validate directory path."""
        if '..' in directory or directory.startswith('/'):
            raise ValueError("Invalid directory path")
        
        dir_path = Path(directory).resolve()
        current_dir = Path.cwd().resolve()
        
        if not str(dir_path).startswith(str(current_dir)):
            raise ValueError("Access denied: directory outside current directory")
        
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory '{directory}' not found")
        
        if not dir_path.is_dir():
            raise ValueError(f"'{directory}' is not a directory")
        
        return dir_path
    
    async def run(self):
        """Run the file processing MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

async def main():
    server = FileProcessingServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## Next Steps

You've now learned how to extend Python MCP servers with:

1. **Multiple tools** with proper organization and routing
2. **Async operations** for file I/O and network requests
3. **Type hints** for better code quality and maintainability
4. **Pydantic validation** for robust input validation
5. **Error handling** patterns for production-ready servers
6. **Real-world examples** showing practical applications

Key takeaways:
- **Structure your code** with separate handler functions for each tool
- **Use Pydantic models** for automatic validation and schema generation
- **Implement proper error handling** to provide helpful feedback
- **Add security checks** to prevent unauthorized file access
- **Use type hints** to catch errors early and improve code clarity
- **Follow async patterns** for non-blocking I/O operations

In the next tutorial, we'll explore advanced MCP patterns including authentication, state management, and production deployment strategies.