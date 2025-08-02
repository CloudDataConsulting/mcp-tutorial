# Python Fundamentals for MCP Development

## Table of Contents
- [What is Python](#what-is-python)
- [Why Python for MCP Servers](#why-python-for-mcp-servers)
- [Understanding async/await in Python](#understanding-asyncawait-in-python)
- [Python Modules and Packages](#python-modules-and-packages)
- [Virtual Environments (venv, uv)](#virtual-environments-venv-uv)
- [Running Python Scripts](#running-python-scripts)
- [Understanding pyproject.toml and requirements.txt](#understanding-pyprojecttoml-and-requirementstxt)
- [Practical Examples](#practical-examples)

## What is Python

Python is a high-level, interpreted programming language known for its simplicity and readability. It's excellent for rapid development and has a vast ecosystem of libraries for almost any task.

### Key Features:
- **Readable syntax**: Python code reads almost like English
- **Interpreted**: No compilation step needed - run code directly
- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Extensive libraries**: Rich standard library plus hundreds of thousands of third-party packages
- **Strong typing**: Optional type hints for better code quality

### Installing Python
```bash
# Check if Python is installed
python3 --version
pip --version

# macOS with Homebrew (recommended):
brew install python

# Ubuntu/Debian:
sudo apt update && sudo apt install python3 python3-pip

# Windows: Download from python.org or use winget:
winget install Python.Python.3
```

## Why Python for MCP Servers

MCP (Model Context Protocol) servers are ideal for Python because:

1. **Async Support**: Python's `asyncio` library handles concurrent operations elegantly
2. **JSON Processing**: Built-in JSON support makes handling MCP messages simple
3. **Rich Ecosystem**: Libraries for file operations, HTTP requests, databases, and more
4. **Type Hints**: Optional typing helps catch errors early and improves code clarity
5. **Readable Code**: Python's syntax makes MCP server logic easy to follow

Looking at our hello-world MCP server:
```python
#!/usr/bin/env python3
import asyncio
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server

# Create a server instance
app = Server("hello-world-mcp")
```

## Understanding async/await in Python

Python's `asyncio` library enables writing concurrent code using async/await syntax.

### Synchronous vs Asynchronous
```python
import time
import asyncio
import aiohttp

# Synchronous (blocking) - avoid for I/O operations
def blocking_request():
    import requests
    response = requests.get('https://api.example.com/data')
    return response.json()

# Asynchronous (non-blocking) - preferred for I/O
async def async_request():
    async with aiohttp.ClientSession() as session:
        async with session.get('https://api.example.com/data') as response:
            return await response.json()

# Multiple async operations can run concurrently
async def multiple_requests():
    tasks = [
        async_request(),
        async_request(),
        async_request()
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### Async/Await in MCP Servers
Our MCP server uses async/await throughout:
```python
# Handler functions are async
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
        # This could involve async operations like:
        # - Reading files: await aiofiles.open(...).read()
        # - API calls: await session.get(...)
        # - Database queries: await db.fetch(...)
        return [{
            "type": "text",
            "text": f"Hello, {person_name}! This is your MCP server speaking."
        }]
    else:
        raise ValueError(f"Unknown tool: {name}")

# Main function runs the event loop
async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

# Entry point
if __name__ == "__main__":
    asyncio.run(main())
```

### Key Async Concepts
```python
import asyncio

# 1. Awaiting a coroutine
async def fetch_data():
    await asyncio.sleep(1)  # Simulate I/O operation
    return "data"

# 2. Running multiple operations concurrently
async def concurrent_example():
    # Sequential (slow)
    result1 = await fetch_data()
    result2 = await fetch_data()
    
    # Concurrent (fast)
    result1, result2 = await asyncio.gather(
        fetch_data(),
        fetch_data()
    )

# 3. Error handling with async
async def safe_operation():
    try:
        result = await risky_async_operation()
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None
```

## Python Modules and Packages

Python's module system helps organize code into reusable components.

### Basic Module Structure
```python
# math_utils.py
def add(a, b):
    """Add two numbers."""
    return a + b

def multiply(a, b):
    """Multiply two numbers."""
    return a * b

# Constants
PI = 3.14159

# main.py
from math_utils import add, multiply, PI
import math_utils  # Alternative: import entire module

result = add(5, 3)
product = multiply(4, 7)
print(f"Pi is approximately {PI}")
```

### Package Structure
```
my_mcp_server/
├── __init__.py          # Makes it a package
├── server.py            # Main server code
├── tools/
│   ├── __init__.py
│   ├── file_tools.py    # File-related tools
│   └── api_tools.py     # API-related tools
└── utils/
    ├── __init__.py
    └── helpers.py       # Utility functions
```

```python
# tools/__init__.py
from .file_tools import read_file_tool, write_file_tool
from .api_tools import fetch_url_tool

__all__ = ['read_file_tool', 'write_file_tool', 'fetch_url_tool']

# server.py
from tools import read_file_tool, write_file_tool, fetch_url_tool
```

### MCP Server Module Example
```python
# mcp_server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
import asyncio
import json
from pathlib import Path

class MyMCPServer:
    def __init__(self, name: str):
        self.app = Server(name)
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up MCP handlers."""
        @self.app.list_tools()
        async def list_tools():
            return self.get_tool_definitions()
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: dict):
            return await self.handle_tool_call(name, arguments)
    
    def get_tool_definitions(self):
        """Return tool definitions."""
        return [
            {
                "name": "greet",
                "description": "Greet someone with a customizable message",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "style": {"type": "string", "enum": ["casual", "formal"]}
                    },
                    "required": ["name"]
                }
            }
        ]
    
    async def handle_tool_call(self, name: str, arguments: dict):
        """Handle tool calls."""
        if name == "greet":
            return await self.greet_tool(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    async def greet_tool(self, arguments: dict):
        """Handle greeting tool."""
        name = arguments["name"]
        style = arguments.get("style", "casual")
        
        if style == "formal":
            message = f"Good day, {name}. I hope you are well."
        else:
            message = f"Hey {name}! How's it going?"
        
        return [{"type": "text", "text": message}]
    
    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

# Usage
if __name__ == "__main__":
    server = MyMCPServer("my-mcp-server")
    asyncio.run(server.run())
```

## Virtual Environments (venv, uv)

Virtual environments isolate Python dependencies for each project, preventing conflicts between different projects' requirements.

### Using venv (Built-in)
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install packages
pip install mcp

# Deactivate when done
deactivate

# Remove environment
rm -rf venv
```

### Using uv (Modern, Fast Alternative)
UV is a modern Python package manager that's significantly faster than pip:

```bash
# Install uv
brew install uv  # macOS
# or: pip install uv

# Create project with virtual environment
uv init my-mcp-project
cd my-mcp-project

# Add dependencies
uv add mcp
uv add aiofiles  # For async file operations
uv add pydantic  # For data validation

# Run script with automatic environment management
uv run python hello_world_mcp.py

# Install from requirements.txt
uv pip install -r requirements.txt

# Generate requirements.txt
uv pip freeze > requirements.txt
```

### Environment Management Best Practices
```bash
# Project structure with virtual environment
my-mcp-server/
├── venv/                # Virtual environment (don't commit)
├── src/
│   └── mcp_server.py
├── requirements.txt     # Dependencies
├── pyproject.toml      # Project configuration
└── README.md

# .gitignore should include:
venv/
__pycache__/
*.pyc
.env
```

### Environment Variables
```python
import os
from pathlib import Path

# Reading environment variables
api_key = os.getenv('API_KEY', 'default_key')
debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'

# Using .env files with python-dotenv
# pip install python-dotenv
from dotenv import load_dotenv

load_dotenv()  # Load .env file
api_key = os.getenv('API_KEY')
```

## Running Python Scripts

### Direct Execution
```bash
# Run a Python file
python3 script.py

# Run with arguments
python3 script.py arg1 arg2

# Run with environment variables
DEBUG=True python3 script.py

# Run as module
python3 -m my_package.module
```

### Making Scripts Executable
```python
#!/usr/bin/env python3
"""
MCP Server Example
This script can be run directly after making it executable.
"""
import sys
import asyncio

def main():
    print("Hello from MCP server!")
    print(f"Python version: {sys.version}")
    print(f"Arguments: {sys.argv[1:]}")

if __name__ == "__main__":
    main()
```

```bash
# Make script executable
chmod +x script.py

# Run directly
./script.py

# Or use uv for automatic environment management
uv run script.py
```

### Command Line Arguments
```python
#!/usr/bin/env python3
import sys
import argparse

# Simple argument parsing
def simple_args():
    print(f"Script name: {sys.argv[0]}")
    print(f"Arguments: {sys.argv[1:]}")

# Advanced argument parsing
def advanced_args():
    parser = argparse.ArgumentParser(description='MCP Server')
    parser.add_argument('--port', type=int, default=8000, help='Server port')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('name', help='Server name')
    
    args = parser.parse_args()
    print(f"Server: {args.name}, Port: {args.port}, Debug: {args.debug}")

if __name__ == "__main__":
    advanced_args()
```

## Understanding pyproject.toml and requirements.txt

Modern Python projects use `pyproject.toml` for configuration and metadata.

### pyproject.toml Structure
```toml
[build-system]
requires = ["setuptools>=45", "wheel", "setuptools_scm[toml]>=6.2"]
build-backend = "setuptools.build_meta"

[project]
name = "my-mcp-server"
version = "1.0.0"
description = "An awesome MCP server"
authors = [{name = "Your Name", email = "you@example.com"}]
readme = "README.md"
requires-python = ">=3.8"
dependencies = [
    "mcp>=1.0.0",
    "aiofiles>=23.0.0",
    "pydantic>=2.0.0"
]

# Optional dependencies
[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=23.0.0",
    "mypy>=1.0.0"
]

# Command line scripts
[project.scripts]
my-mcp-server = "my_mcp_server:main"

# Tool configuration
[tool.black]
line-length = 88
target-version = ['py38']

[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
```

### requirements.txt (Legacy but Still Common)
```txt
# Core dependencies
mcp>=1.0.0
aiofiles>=23.0.0
pydantic>=2.0.0

# Development dependencies (usually in requirements-dev.txt)
pytest>=7.0.0
black>=23.0.0
mypy>=1.0.0

# Version pinning examples
requests==2.31.0      # Exact version
numpy>=1.20.0,<2.0.0  # Version range
flask~=2.3.0          # Compatible version (>=2.3.0, <2.4.0)
```

### Dependency Management Comparison
```bash
# Traditional approach
pip install -r requirements.txt
pip freeze > requirements.txt

# Modern approach with uv
uv add mcp aiofiles pydantic
uv add --dev pytest black mypy  # Development dependencies
uv sync  # Install all dependencies from lock file

# Export to requirements.txt
uv pip freeze > requirements.txt
```

## Practical Examples

### Example 1: File-Reading MCP Tool with Type Hints
```python
#!/usr/bin/env python3
"""
File Reader MCP Server
Demonstrates async file operations with proper error handling.
"""
import asyncio
from pathlib import Path
from typing import List, Dict, Any
import aiofiles
from mcp.server import Server
from mcp.server.stdio import stdio_server

class FileReaderMCP:
    def __init__(self):
        self.app = Server("file-reader-mcp")
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up MCP request handlers."""
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            return [
                {
                    "name": "read_file",
                    "description": "Read the contents of a text file",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "filename": {
                                "type": "string",
                                "description": "Name of the file to read"
                            }
                        },
                        "required": ["filename"]
                    }
                }
            ]
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            if name == "read_file":
                return await self.read_file_tool(arguments)
            else:
                raise ValueError(f"Unknown tool: {name}")
    
    async def read_file_tool(self, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Read file tool implementation."""
        filename = arguments["filename"]
        
        try:
            # Security: Only allow reading files in current directory
            file_path = Path.cwd() / filename
            
            # Check if file exists and is a file
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
            
        except Exception as e:
            return [{
                "type": "text",
                "text": f"Error reading file {filename}: {str(e)}"
            }]
    
    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

async def main():
    """Entry point."""
    server = FileReaderMCP()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### Example 2: Understanding Python's Event Loop
```python
import asyncio
import time

async def demo_event_loop():
    """Demonstrate how Python's event loop works."""
    print("1: Start")
    
    # Schedule a task to run later
    asyncio.create_task(delayed_print("4: Task callback", 0))
    
    # Await a coroutine immediately
    await immediate_print("3: Immediate coroutine")
    
    print("2: Middle")
    
    # Give the event loop a chance to run scheduled tasks
    await asyncio.sleep(0.01)
    
    print("5: End")

async def delayed_print(message: str, delay: float):
    """Print a message after a delay."""
    await asyncio.sleep(delay)
    print(message)

async def immediate_print(message: str):
    """Print a message immediately."""
    print(message)

# Run the demo
if __name__ == "__main__":
    asyncio.run(demo_event_loop())
    
# Output:
# 1: Start
# 3: Immediate coroutine
# 2: Middle
# 4: Task callback
# 5: End
```

### Example 3: Error Handling Patterns
```python
import asyncio
import random
from typing import Optional, Dict, Any

class RobustMCPServer:
    def __init__(self):
        self.app = Server("robust-mcp")
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            try:
                if name == "risky_operation":
                    result = await self.risky_operation(arguments)
                    return [{
                        "type": "text",
                        "text": f"Success: {result}"
                    }]
                else:
                    raise ValueError(f"Unknown tool: {name}")
                    
            except ValueError as e:
                # Handle known errors
                return [{
                    "type": "text",
                    "text": f"Invalid request: {str(e)}"
                }]
            except Exception as e:
                # Log unexpected errors (goes to stderr)
                print(f"Unexpected error in tool '{name}': {str(e)}", file=sys.stderr)
                
                # Return user-friendly error message
                return [{
                    "type": "text",
                    "text": "Sorry, something unexpected happened. Please try again."
                }]
    
    async def risky_operation(self, arguments: Dict[str, Any]) -> str:
        """Simulate an operation that might fail."""
        # Simulate network delay
        await asyncio.sleep(0.1)
        
        # Randomly fail sometimes
        if random.random() < 0.3:
            raise ConnectionError("Network connection failed")
        
        return f"Operation completed successfully with args: {arguments}"

# Context manager for cleanup
class ManagedResource:
    async def __aenter__(self):
        print("Acquiring resource...")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Cleaning up resource...")
        if exc_type:
            print(f"Exception occurred: {exc_type.__name__}")

async def example_with_cleanup():
    """Example showing proper resource management."""
    async with ManagedResource() as resource:
        # Do work with resource
        await asyncio.sleep(1)
        # Resource is automatically cleaned up
```

## Next Steps

Now that you understand Python fundamentals for MCP development, you're ready to learn about:

1. **Package management** with pip and uv (next tutorial)
2. **MCP architecture** and how Python servers communicate with clients
3. **Building more complex tools** with proper validation and error handling

Key takeaways:
- Python's async/await enables non-blocking I/O operations essential for MCP servers
- Type hints improve code quality and catch errors early
- Virtual environments prevent dependency conflicts between projects
- Modern tooling like `uv` makes Python package management fast and reliable
- `pyproject.toml` is the modern standard for Python project configuration
- Proper error handling is crucial for robust MCP servers

In the next tutorial, we'll explore Python package management with pip and uv, including best practices for managing dependencies and publishing packages.