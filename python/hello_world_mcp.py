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