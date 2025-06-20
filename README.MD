# Clockify MCP Server

A Model Context Protocol (MCP) server that provides comprehensive integration with the Clockify time tracking API. This server enables automated time entry management, project organization, task tracking, and reporting through a standardized interface.

Want to read as a story [Linkedin Post](https://www.linkedin.com/pulse/building-clockify-agent-mcp-tool-claude-ai-ratheesh-kumar-r-ousjc)

## Quick Installation (Recommended)

### Install via NPM
```bash
npm install -g @ratheesh-aot/clockify-mcp-server
```

### Configure Claude Desktop or any MCP client

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "clockify": {
      "command": "clockify-mcp-server",
      "env": {
        "CLOCKIFY_API_KEY": "your_clockify_api_key"
      }
    }
  }
}
```

### Get Your Clockify API Key
1. Log in to [Clockify](https://clockify.me)
2. Go to Profile Settings → API
3. Generate or copy your API key
4. Replace `your_clockify_api_key` in the configuration above

### Start Using
Restart your MCP client (Claude Desktop) and start asking:
- "Show me my Clockify workspaces"
- "Create a time entry for 2 hours on Project Marketing"
- "Get this week's time entries"

## Features

### Core Functionality
- **Time Entry Management**: Create, read, update, delete, and stop time entries
- **Project Management**: Full CRUD operations for projects with client associations
- **Task Management**: Create and manage tasks within projects
- **Client Management**: Organize work by clients
- **Tag Management**: Categorize time entries with tags
- **User & Workspace Management**: Access user information and workspace details
- **Advanced Reporting**: Generate detailed and summary reports with filtering

### Key Capabilities
- **Real-time Time Tracking**: Start, stop, and manage ongoing time entries
- **Comprehensive Filtering**: Filter time entries by projects, tasks, clients, tags, and date ranges
- **Pagination Support**: Handle large datasets efficiently with proper pagination
- **Flexible Reporting**: Generate reports in multiple formats (JSON, PDF, CSV, XLSX)
- **Production-Ready**: Error handling, validation, and robust API interactions

## Alternative Installation (Development)

If you prefer to build from source or contribute to development:

### Prerequisites
- Node.js 18 or higher
- Clockify account with API access
- Clockify API key

### Manual Installation
1. Clone the repository:
```bash
git clone https://github.com/ratheesh-aot/clockify-mcp.git
cd clockify-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Configure with full path:
```json
{
  "mcpServers": {
    "clockify": {
      "command": "node",
      "args": ["/full/path/to/clockify-mcp/dist/index.js"],
      "env": {
        "CLOCKIFY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### User & Workspace Management
- `get_current_user`: Get current user information
- `get_workspaces`: List all accessible workspaces
- `get_workspace_users`: Get all users in a workspace

### Time Entry Management
- `create_time_entry`: Create new time entries with optional project/task associations
- `get_time_entries`: Retrieve time entries with comprehensive filtering options
- `update_time_entry`: Modify existing time entries
- `delete_time_entry`: Remove time entries
- `stop_time_entry`: Stop currently running time entries

### Project Management
- `create_project`: Create new projects with client associations
- `get_projects`: List projects with filtering and pagination
- `get_project`: Get detailed project information
- `update_project`: Modify project details
- `delete_project`: Remove projects

### Task Management
- `create_task`: Create tasks within projects
- `get_tasks`: List tasks with filtering options
- `get_task`: Get detailed task information
- `update_task`: Modify task details
- `delete_task`: Remove tasks

### Client Management
- `create_client`: Create new clients
- `get_clients`: List clients with filtering
- `update_client`: Modify client information
- `delete_client`: Remove clients

### Tag Management
- `create_tag`: Create new tags for categorization
- `get_tags`: List available tags
- `update_tag`: Modify tag details
- `delete_tag`: Remove tags

### Reporting
- `get_detailed_report`: Generate comprehensive time tracking reports
- `get_summary_report`: Generate summarized reports with grouping options

## Usage Examples

### Create a Time Entry
```javascript
{
  "tool": "create_time_entry",
  "arguments": {
    "workspaceId": "workspace_id",
    "description": "Working on feature implementation",
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T17:00:00Z",
    "projectId": "project_id",
    "billable": true
  }
}
```

### Get Time Entries with Filtering
```javascript
{
  "tool": "get_time_entries",
  "arguments": {
    "workspaceId": "workspace_id",
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z",
    "project": "project_id",
    "page": 1,
    "pageSize": 100
  }
}
```

### Create a Project
```javascript
{
  "tool": "create_project",
  "arguments": {
    "workspaceId": "workspace_id",
    "name": "Website Redesign",
    "clientId": "client_id",
    "billable": true,
    "isPublic": false,
    "color": "#FF5722"
  }
}
```

## Troubleshooting

### Common Issues

**"Command not found" error:**
```bash
# Check if installed correctly
npm list -g @ratheesh-aot/clockify-mcp-server

# Reinstall if needed
npm uninstall -g @ratheesh-aot/clockify-mcp-server
npm install -g @ratheesh-aot/clockify-mcp-server
```

**"Invalid API key" error:**
- Verify your Clockify API key is correct
- Ensure the API key has proper permissions
- Check for extra spaces or characters

**MCP connection issues:**
- Restart your MCP client (Claude Desktop)
- Verify the JSON configuration is valid
- Check that Node.js is installed and accessible

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/ratheesh-aot/clockify-mcp/issues)
- **Documentation**: [Clockify API Docs](https://docs.clockify.me/)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Created by [Ratheesh Kumar](https://github.com/ratheesh-aot)
