# Exercise 1: Setting Up MCP Servers in Claude Desktop

In this exercise, you'll install and test both the Node.js and Python hello-world MCP servers in Claude Desktop.

## Prerequisites

- Claude Desktop installed
- Node.js installed (for the Node.js server)
- Python 3.8+ installed (for the Python server)
- Completed the language fundamentals tutorials

## Part 1: Prepare the Servers

### Node.js Server Setup
```bash
cd node
npm install
# Test locally first
node index.js
# Press Ctrl+C to stop
```

### Python Server Setup
```bash
cd python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Test locally first
python hello_world_mcp.py
# Press Ctrl+C to stop
```

## Part 2: Configure Claude Desktop

1. **Find your Claude Desktop config file**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Back up your current config**:
   ```bash
   # macOS example
   cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
      ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup
   ```

3. **Edit the config file** to add both servers:
   ```json
   {
     "mcpServers": {
       "hello-world-node": {
         "command": "node",
         "args": ["/absolute/path/to/cdc-mcp/node/index.js"]
       },
       "hello-world-python": {
         "command": "python",
         "args": ["/absolute/path/to/cdc-mcp/python/hello_world_mcp.py"]
       }
     }
   }
   ```
   
   **Important**: Replace `/absolute/path/to/` with your actual path!

## Part 3: Test the Servers

1. **Restart Claude Desktop** (completely quit and reopen)

2. **Check the MCP menu** (bottom-left corner):
   - You should see both servers listed
   - They should show as "Connected" with green indicators

3. **Test the Node.js server**:
   - Type: "Use the hello-world-node server to say hello to Alice"
   - Expected: Claude uses the `say_hello` tool from the Node.js server

4. **Test the Python server**:
   - Type: "Use the hello-world-python server to say hello to Bob"
   - Expected: Claude uses the `say_hello` tool from the Python server

## Part 4: Debugging Common Issues

### Server Not Showing Up
- Check the config file syntax (valid JSON)
- Verify the absolute paths are correct
- Restart Claude Desktop completely

### Server Shows as Disconnected
- Test the server runs locally without errors
- Check Python/Node.js are in your PATH
- Look at Claude Desktop logs (Help → Show Logs)

### Permission Errors
- Make sure the script files are executable:
  ```bash
  chmod +x node/index.js
  chmod +x python/hello_world_mcp.py
  ```

## Part 5: Clean Up

After successfully testing both servers:

1. **Remove the servers from config**:
   ```bash
   # Restore your backup
   cp ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup \
      ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Restart Claude Desktop** to apply changes

## Success Criteria

You've completed this exercise when:
- ✅ Both servers appear in Claude Desktop
- ✅ Both servers show as "Connected"
- ✅ Claude can use the `say_hello` tool from each server
- ✅ You've successfully removed them afterward

## Bonus Challenge

Try modifying one of the servers to add a new tool:
1. Add a `get_time` tool that returns the current time
2. Update the config and restart Claude Desktop
3. Test your new tool

## What You Learned

- How to configure MCP servers in Claude Desktop
- The importance of absolute paths in configuration
- How to debug common MCP connection issues
- That MCP servers can be written in different languages but work the same way

## Next Steps

Now that you can install MCP servers, try:
- Creating your own simple MCP server
- Installing community MCP servers from GitHub
- Reading the debugging guide when you encounter issues