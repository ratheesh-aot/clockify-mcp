# Clockify MCP Server

A Model Context Protocol (MCP) server that provides comprehensive integration with the Clockify time tracking API. This server enables automated time entry management, project organization, task tracking, and reporting through a standardized interface.

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

## Prerequisites

- Node.js 18 or higher
- Clockify account with API access
- Clockify API key

## Installation

1. Clone or download the server files
2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Configuration

### API Key Setup
Set your Clockify API key as an environment variable:

```bash
export CLOCKIFY_API_KEY="your_api_key_here"
```

To get your API key:
1. Log in to Clockify
2. Go to Profile Settings
3. Navigate to the API section
4. Generate or copy your API key

### MCP Client Configuration

Add the server to your MCP client configuration:

```json
{
  "mcpServers": {
    "clockify": {
      "command": "node",
      "args": ["/path/to/clockify-mcp-server/dist/index.js"],
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