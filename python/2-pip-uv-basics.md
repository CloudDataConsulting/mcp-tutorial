# Python Package Management: pip and uv Basics

## Table of Contents
- [What are pip and uv](#what-are-pip-and-uv)
- [Installing packages and managing dependencies](#installing-packages-and-managing-dependencies)
- [Virtual environments best practices](#virtual-environments-best-practices)
- [Understanding pyproject.toml](#understanding-pyprojecttoml)
- [Common pip/uv commands](#common-pipuv-commands)
- [Publishing Python packages](#publishing-python-packages)
- [MCP Development Workflow](#mcp-development-workflow)

## What are pip and uv

### pip (Package Installer for Python)
`pip` is the standard package manager for Python. It installs packages from the Python Package Index (PyPI) and other repositories.

```bash
# Basic pip usage
pip install package_name
pip install package_name==1.2.3  # Specific version
pip install -r requirements.txt   # Install from file
pip list                          # List installed packages
pip show package_name             # Show package info
pip uninstall package_name        # Remove package
```

### uv (Ultra-fast Python Package Manager)
`uv` is a modern, Rust-based Python package manager that's significantly faster than pip and includes additional features for project management.

```bash
# Install uv
brew install uv  # macOS
pip install uv   # Any platform

# Basic uv usage
uv add package_name              # Add dependency
uv remove package_name           # Remove dependency
uv sync                         # Install all dependencies
uv run python script.py         # Run with auto-managed environment
uv pip install package_name     # Drop-in pip replacement
```

### Why Choose uv for MCP Development?

1. **Speed**: Up to 100x faster than pip for many operations
2. **Better dependency resolution**: Resolves conflicts more reliably
3. **Automatic virtual environments**: No need to manually create/activate
4. **Lock files**: Reproducible builds with `uv.lock`
5. **Modern workflow**: Streamlined project management

## Installing packages and managing dependencies

### Basic Package Installation

```bash
# Traditional pip approach
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
pip install mcp aiofiles pydantic

# Modern uv approach (creates venv automatically)
uv add mcp aiofiles pydantic
```

### MCP Server Dependencies
For a typical MCP server, you'll need:

```bash
# Core MCP framework
uv add mcp

# Async file operations
uv add aiofiles

# Data validation and parsing
uv add pydantic

# HTTP requests (if your server makes API calls)
uv add aiohttp

# Environment variable management
uv add python-dotenv

# Development tools
uv add --dev pytest black mypy ruff
```

### Managing Different Types of Dependencies

```bash
# Production dependencies
uv add requests pydantic

# Development dependencies (testing, linting, etc.)
uv add --dev pytest black mypy

# Optional dependencies
uv add --optional typing_extensions  # For older Python versions

# Install from specific sources
uv add git+https://github.com/user/repo.git
uv add ./path/to/local/package
uv add https://files.pythonhosted.org/packages/.../package.whl
```

### Version Constraints
```bash
# Exact version
uv add "requests==2.31.0"

# Minimum version
uv add "requests>=2.30.0"

# Version range
uv add "requests>=2.30.0,<3.0.0"

# Compatible version (patch updates only)
uv add "requests~=2.31.0"  # Same as >=2.31.0,<2.32.0
```

## Virtual environments best practices

### Why Virtual Environments?
Virtual environments isolate your project's dependencies, preventing conflicts between different projects.

```python
# Without virtual environments (problematic):
# Project A needs requests==2.25.0
# Project B needs requests==2.31.0
# Only one can be installed system-wide!

# With virtual environments:
# Each project has its own isolated dependencies
```

### Traditional venv Approach
```bash
# Create virtual environment
python3 -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install packages
pip install mcp

# Deactivate
deactivate

# Remove environment
rm -rf venv
```

### Modern uv Approach
```bash
# Initialize new project with virtual environment
uv init my-mcp-server
cd my-mcp-server

# uv automatically manages the virtual environment
uv add mcp                    # Adds to venv automatically
uv run python server.py       # Runs in managed environment
uv sync                       # Syncs dependencies

# No need to manually activate/deactivate!
```

### Project Structure Best Practices
```
my-mcp-server/
├── .venv/                   # Virtual environment (auto-created by uv)
├── src/
│   ├── __init__.py
│   └── mcp_server.py
├── tests/
│   └── test_server.py
├── pyproject.toml           # Project configuration
├── uv.lock                  # Lock file (like package-lock.json)
├── requirements.txt         # Optional: for pip compatibility
├── .env                     # Environment variables (don't commit)
├── .gitignore
└── README.md
```

### .gitignore for Python Projects
```gitignore
# Virtual environments
venv/
.venv/
env/
ENV/

# Python cache
__pycache__/
*.py[cod]
*$py.class
*.so

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/

# Build artifacts
dist/
build/
*.egg-info/

# uv
uv.lock
```

## Understanding pyproject.toml

`pyproject.toml` is the modern standard for Python project configuration, replacing `setup.py` and unifying configuration across tools.

### Basic Structure
```toml
[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "my-mcp-server"
version = "1.0.0"
description = "A powerful MCP server"
authors = [
    {name = "Your Name", email = "you@example.com"}
]
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.8"

# Core dependencies
dependencies = [
    "mcp>=1.0.0",
    "aiofiles>=23.0.0",
    "pydantic>=2.0.0",
]

# Optional dependency groups
[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=23.0.0",
    "mypy>=1.0.0",
    "ruff>=0.1.0",
]
http = [
    "aiohttp>=3.8.0",
]
database = [
    "asyncpg>=0.28.0",
    "sqlalchemy[asyncio]>=2.0.0",
]

# Entry points (command-line scripts)
[project.scripts]
my-mcp-server = "src.mcp_server:main"

# URLs
[project.urls]
Homepage = "https://github.com/user/my-mcp-server"
Repository = "https://github.com/user/my-mcp-server.git"
Issues = "https://github.com/user/my-mcp-server/issues"

# Tool configurations
[tool.black]
line-length = 88
target-version = ['py38']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.venv
  | build
  | dist
)/
'''

[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"

[tool.ruff]
line-length = 88
target-version = "py38"
select = ["E", "F", "W", "C90", "I", "N", "UP", "YTT", "S", "BLE", "FBT", "B", "A", "COM", "C4", "DTZ", "T10", "EM", "EXE", "ISC", "ICN", "G", "INP", "PIE", "T20", "PYI", "PT", "Q", "RSE", "RET", "SLF", "SIM", "TID", "TCH", "ARG", "PTH", "ERA", "PD", "PGH", "PL", "TRY", "NPY", "RUF"]
ignore = ["COM812", "ISC001"]  # Conflicts with formatter
```

### MCP Server Example pyproject.toml
```toml
[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "hello-world-mcp"
version = "1.0.0"
description = "A simple hello world MCP server"
authors = [
    {name = "Bernie Pruss", email = "bernie.pruss@clouddataconsulting.com"}
]
readme = "README.md"
requires-python = ">=3.8"
dependencies = [
    "mcp>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=23.0.0",
    "mypy>=1.0.0",
]

# Make the server executable as a command
[project.scripts]
hello-world-mcp = "hello_world_mcp:main"
```

## Common pip/uv commands

### Essential pip Commands
```bash
# Package management
pip install package              # Install latest version
pip install package==1.2.3      # Install specific version
pip install package>=1.2.0      # Install minimum version
pip install -e .                 # Install current project in development mode
pip install -r requirements.txt  # Install from requirements file

# Information
pip list                         # List installed packages
pip list --outdated             # Show outdated packages
pip show package                # Show package details
pip freeze                      # List packages with versions
pip freeze > requirements.txt   # Export requirements

# Uninstall
pip uninstall package           # Remove package
pip uninstall -r requirements.txt  # Remove packages from file

# Cache management
pip cache purge                 # Clear download cache
```

### Essential uv Commands
```bash
# Project management
uv init project-name            # Create new project
uv add package                  # Add dependency
uv add --dev package           # Add development dependency
uv remove package              # Remove dependency
uv sync                        # Install/update all dependencies
uv lock                        # Update lock file

# Running code
uv run python script.py        # Run script in managed environment
uv run --python 3.11 script.py # Use specific Python version

# pip-compatible commands
uv pip install package         # Drop-in pip replacement
uv pip freeze                  # List installed packages
uv pip list                    # List packages

# Virtual environment
uv venv                        # Create virtual environment
uv venv --python 3.11         # Create with specific Python version
```

### Development Workflow Examples

#### Starting a New MCP Server Project
```bash
# Option 1: Using uv (recommended)
uv init my-mcp-server
cd my-mcp-server
uv add mcp aiofiles pydantic
uv add --dev pytest black mypy

# Create the server file
uv run python -c "
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server

# Your MCP server code here
"

# Option 2: Traditional approach
mkdir my-mcp-server
cd my-mcp-server
python3 -m venv venv
source venv/bin/activate
pip install mcp aiofiles pydantic
pip install pytest black mypy
pip freeze > requirements.txt
```

#### Daily Development Workflow
```bash
# Start working (uv handles environment automatically)
uv run python my_server.py

# Add new dependency
uv add requests

# Run tests
uv run pytest

# Format code
uv run black src/

# Type checking
uv run mypy src/

# Install for other developers
uv sync  # Installs exact versions from uv.lock
```

## Publishing Python packages

### Preparing Your Package for Publication

#### 1. Complete Project Structure
```
my-mcp-server/
├── src/
│   └── my_mcp_server/
│       ├── __init__.py
│       ├── server.py
│       └── tools/
│           ├── __init__.py
│           └── file_tools.py
├── tests/
│   └── test_server.py
├── pyproject.toml
├── README.md
├── LICENSE
└── CHANGELOG.md
```

#### 2. Version Management
```toml
# pyproject.toml
[project]
name = "my-mcp-server"
version = "1.0.0"  # Semantic versioning: MAJOR.MINOR.PATCH
dynamic = ["version"]  # Or manage version dynamically

# For dynamic versioning
[tool.setuptools_scm]
write_to = "src/my_mcp_server/_version.py"
```

#### 3. Entry Points and Scripts
```toml
[project.scripts]
my-mcp-server = "my_mcp_server.server:main"

[project.entry-points."mcp.servers"]
my-server = "my_mcp_server.server:create_server"
```

### Building and Publishing

#### Building with uv
```bash
# Install build tools
uv add --dev build twine

# Build the package
uv run python -m build

# This creates:
# dist/my_mcp_server-1.0.0-py3-none-any.whl
# dist/my_mcp_server-1.0.0.tar.gz
```

#### Publishing to PyPI
```bash
# Test upload to TestPyPI first
uv run twine upload --repository testpypi dist/*

# Real upload to PyPI
uv run twine upload dist/*

# Or use environment variables for credentials
export TWINE_USERNAME="__token__"
export TWINE_PASSWORD="your-pypi-token"
uv run twine upload dist/*
```

#### Automated Publishing with GitHub Actions
```yaml
# .github/workflows/publish.yml
name: Publish to PyPI
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install uv
      run: pip install uv
    
    - name: Build package
      run: uv run python -m build
    
    - name: Publish to PyPI
      uses: pypa/gh-action-pypi-publish@release/v1
      with:
        password: ${{ secrets.PYPI_API_TOKEN }}
```

## MCP Development Workflow

### Setting Up a Professional MCP Server Project

#### 1. Project Initialization
```bash
# Create project with modern tooling
uv init professional-mcp-server
cd professional-mcp-server

# Add core dependencies
uv add mcp pydantic aiofiles

# Add development tools
uv add --dev pytest pytest-asyncio black mypy ruff pre-commit

# Optional: Add HTTP client for API integrations
uv add --optional aiohttp

# Optional: Add database support
uv add --optional asyncpg sqlalchemy[asyncio]
```

#### 2. Project Structure
```
professional-mcp-server/
├── src/
│   └── professional_mcp_server/
│       ├── __init__.py
│       ├── server.py          # Main server implementation
│       ├── config.py          # Configuration management
│       ├── models.py          # Pydantic models
│       └── tools/
│           ├── __init__.py
│           ├── base.py        # Base tool class
│           ├── file_tools.py  # File operations
│           └── api_tools.py   # API integrations
├── tests/
│   ├── __init__.py
│   ├── test_server.py
│   └── test_tools.py
├── examples/
│   └── basic_usage.py
├── docs/
│   └── api.md
├── pyproject.toml
├── README.md
├── .env.example
├── .gitignore
└── .pre-commit-config.yaml
```

#### 3. Configuration Management
```python
# src/professional_mcp_server/config.py
from pydantic import BaseSettings
from typing import Optional

class MCPServerConfig(BaseSettings):
    """Configuration for MCP server."""
    
    server_name: str = "professional-mcp-server"
    server_version: str = "1.0.0"
    debug: bool = False
    
    # API configurations
    api_timeout: int = 30
    max_file_size: int = 10_000_000  # 10MB
    
    # Optional database
    database_url: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_prefix = "MCP_"

# Usage
config = MCPServerConfig()
```

#### 4. Professional Server Implementation
```python
# src/professional_mcp_server/server.py
"""
Professional MCP Server Implementation
"""
import asyncio
import logging
from typing import Dict, List, Any
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from pydantic import ValidationError

from .config import MCPServerConfig
from .models import ToolCall, ToolResponse
from .tools import FileTools, APITools

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProfessionalMCPServer:
    """A professional-grade MCP server implementation."""
    
    def __init__(self, config: MCPServerConfig):
        self.config = config
        self.app = Server(config.server_name)
        
        # Initialize tools
        self.file_tools = FileTools(config)
        self.api_tools = APITools(config)
        
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up MCP request handlers."""
        
        @self.app.list_tools()
        async def list_tools() -> List[Dict[str, Any]]:
            """List all available tools."""
            tools = []
            tools.extend(await self.file_tools.get_tool_definitions())
            tools.extend(await self.api_tools.get_tool_definitions())
            return tools
        
        @self.app.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[Dict[str, str]]:
            """Handle tool calls with proper validation and error handling."""
            try:
                # Validate tool call
                tool_call = ToolCall(name=name, arguments=arguments)
                
                # Route to appropriate tool handler
                if name.startswith("file_"):
                    response = await self.file_tools.handle_call(tool_call)
                elif name.startswith("api_"):
                    response = await self.api_tools.handle_call(tool_call)
                else:
                    raise ValueError(f"Unknown tool: {name}")
                
                return response.to_mcp_response()
                
            except ValidationError as e:
                logger.error(f"Validation error for tool '{name}': {e}")
                return [{
                    "type": "text",
                    "text": f"Invalid arguments: {str(e)}"
                }]
            except Exception as e:
                logger.error(f"Unexpected error in tool '{name}': {e}")
                return [{
                    "type": "text",
                    "text": "An unexpected error occurred. Please try again."
                }]
    
    async def run(self):
        """Run the MCP server."""
        logger.info(f"Starting {self.config.server_name} v{self.config.server_version}")
        
        async with stdio_server() as (read_stream, write_stream):
            await self.app.run(
                read_stream,
                write_stream,
                self.app.create_initialization_options()
            )

def main():
    """Entry point for the MCP server."""
    config = MCPServerConfig()
    
    if config.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    server = ProfessionalMCPServer(config)
    asyncio.run(server.run())

if __name__ == "__main__":
    main()
```

#### 5. Development Commands
```bash
# Development workflow
uv run python -m professional_mcp_server.server  # Run server
uv run pytest                                    # Run tests
uv run black src/ tests/                        # Format code
uv run mypy src/                                # Type checking
uv run ruff check src/                          # Linting

# Pre-commit hooks (run automatically on commit)
uv run pre-commit install
uv run pre-commit run --all-files
```

### Testing MCP Servers
```python
# tests/test_server.py
import pytest
import asyncio
from professional_mcp_server.server import ProfessionalMCPServer
from professional_mcp_server.config import MCPServerConfig

@pytest.fixture
def config():
    """Test configuration."""
    return MCPServerConfig(
        server_name="test-server",
        debug=True
    )

@pytest.fixture
def server(config):
    """Test server instance."""
    return ProfessionalMCPServer(config)

@pytest.mark.asyncio
async def test_tool_list(server):
    """Test that tools are listed correctly."""
    # Test implementation here
    pass

@pytest.mark.asyncio
async def test_file_operations(server):
    """Test file tool operations."""
    # Test implementation here
    pass
```

## Next Steps

Now that you understand Python package management, you're ready to learn about:

1. **MCP concepts** - Understanding the protocol architecture
2. **Debugging MCP servers** - Testing and troubleshooting techniques
3. **Extending hello world** - Adding sophisticated tools to your server

Key takeaways:
- **uv is the modern choice** for Python package management in 2024+
- **Virtual environments** prevent dependency conflicts and ensure reproducibility
- **pyproject.toml** is the standard for modern Python project configuration
- **Proper dependency management** is crucial for maintainable MCP servers
- **Professional project structure** makes code easier to maintain and test

In the next tutorial, we'll extend our hello world MCP server with more sophisticated tools and proper validation.