# Python MCP Server Tutorial

This directory contains everything you need to learn MCP server development with Python.

## 📁 Contents

### Server Implementation
- `hello_world_mcp.py` - Working hello-world MCP server
- `pyproject.toml` - Modern Python project configuration
- `requirements.txt` - Direct dependencies list

### Tutorials (Read in Order)
1. **[1-python-fundamentals.md](1-python-fundamentals.md)** - Python basics for MCP
2. **[2-pip-uv-basics.md](2-pip-uv-basics.md)** - Package management with pip/uv
3. **[5-extending-hello-world.md](5-extending-hello-world.md)** - Adding features to your server
4. **[6-advanced-mcp-patterns.md](6-advanced-mcp-patterns.md)** - Production-ready patterns

## 🚀 Quick Start

1. **Create virtual environment** (using uv - recommended):
   ```bash
   # Install uv if you haven't
   brew install uv
   
   # Create and activate environment
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   uv pip install -r requirements.txt
   # or with standard pip:
   # pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   python hello_world_mcp.py
   ```

4. **Test the server**:
   ```bash
   # In another terminal
   npm install -g @modelcontextprotocol/inspector
   mcp-inspector "python hello_world_mcp.py"
   ```

## 📚 Learning Path

1. Start with Python fundamentals if you're new to async Python
2. Learn pip/uv for modern package management
3. Read the common MCP concepts in `../common/`
4. Extend the hello-world server with new features
5. Study advanced patterns for production use

## 🛠️ Development Tips

- Use `print(..., file=sys.stderr)` for debugging
- Always use `async`/`await` for I/O operations
- Add type hints for better code quality
- Test with the MCP Inspector tool
- Consider using `uvloop` for production performance

## 📦 Key Dependencies

- `mcp` - Official MCP SDK for Python
- Python 3.8+ (for async support)
- Optional: `pydantic` for validation, `aiohttp` for HTTP

## 🔗 Resources

- [Python asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
- [uv Documentation](https://github.com/astral-sh/uv)
- [MCP SDK for Python](https://github.com/modelcontextprotocol/python-sdk)