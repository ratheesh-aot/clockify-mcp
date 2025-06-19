#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

interface ClockifyConfig {
  apiKey: string;
  baseUrl: string;
}

interface TimeEntry {
  id?: string;
  description?: string;
  start: string;
  end?: string;
  projectId?: string;
  taskId?: string;
  tagIds?: string[];
  billable?: boolean;
}

interface Project {
  id?: string;
  name: string;
  clientId?: string;
  workspaceId: string;
  isPublic?: boolean;
  billable?: boolean;
  color?: string;
  estimate?: {
    estimate: string;
    type: "AUTO" | "MANUAL";
  };
}

interface Task {
  id?: string;
  name: string;
  projectId: string;
  assigneeIds?: string[];
  estimate?: string;
  status?: "ACTIVE" | "DONE";
}

interface Client {
  id?: string;
  name: string;
  workspaceId: string;
  archived?: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  memberships: Array<{
    userId: string;
    hourlyRate?: {
      amount: number;
      currency: string;
    };
    costRate?: {
      amount: number;
      currency: string;
    };
    targetId: string;
    membershipType: "WORKSPACE" | "PROJECT";
    membershipStatus: "PENDING" | "ACTIVE" | "DECLINED" | "INACTIVE";
  }>;
  profilePicture?: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  settings: {
    weekStart: string;
    timeZone: string;
    timeFormat: string;
    dateFormat: string;
    sendNewsletter: boolean;
    weeklyUpdates: boolean;
    longRunning: boolean;
    timeTrackingManual: boolean;
    summaryReportSettings: {
      group: string;
      subgroup: string;
    };
    isCompactViewOn: boolean;
    dashboardSelection: string;
    dashboardViewType: string;
    dashboardPinToTop: boolean;
    projectListCollapse: number;
    collapseAllProjectLists: boolean;
    groupSimilarEntriesDisabled: boolean;
    myStartOfDay: string;
    projectPickerTaskFilter: boolean;
    lang: string;
    multiFactorEnabled: boolean;
    theme: string;
    scheduling: boolean;
    onboarding: boolean;
    pto: boolean;
  };
  status: string;
  customFields: Array<{
    customFieldId: string;
    sourceType: string;
    value: string;
  }>;
}

interface Workspace {
  id: string;
  name: string;
  hourlyRate?: {
    amount: number;
    currency: string;
  };
  memberships: Array<{
    userId: string;
    hourlyRate?: {
      amount: number;
      currency: string;
    };
    costRate?: {
      amount: number;
      currency: string;
    };
    targetId: string;
    membershipType: "WORKSPACE" | "PROJECT";
    membershipStatus: "PENDING" | "ACTIVE" | "DECLINED" | "INACTIVE";
  }>;
  workspaceSettings: {
    timeRoundingInReports: boolean;
    onlyAdminsSeeBillableRates: boolean;
    onlyAdminsCreateProject: boolean;
    onlyAdminsSeeDashboard: boolean;
    defaultBillableProjects: boolean;
    lockTimeEntries?: string;
    round: {
      round: string;
      minutes: string;
    };
    projectFavorites: boolean;
    canSeeTimeSheet: boolean;
    canSeeTracker: boolean;
    projectPickerSpecialFilter: boolean;
    forceProjects: boolean;
    forceTasks: boolean;
    forceTags: boolean;
    forceDescription: boolean;
    onlyAdminsSeeAllTimeEntries: boolean;
    onlyAdminsSeePublicProjectsEntries: boolean;
    trackTimeDownToSecond: boolean;
    projectGroupingLabel: string;
    adminOnlyPages: string[];
    automaticLock?: {
      changeDay: string;
      dayOfMonth: number;
      firstDay: string;
      olderThanPeriod: string;
      olderThanValue: number;
      type: string;
    };
    onlyAdminsCreateTag: boolean;
    onlyAdminsCreateTask: boolean;
    timeTrackingMode: string;
    isProjectPublicByDefault: boolean;
  };
  imageUrl?: string;
  featureSubscriptionType?: string;
}

class ClockifyMCPServer {
  private server: Server;
  private config: ClockifyConfig;

  constructor() {
    this.config = {
      apiKey: process.env.CLOCKIFY_API_KEY || "",
      baseUrl: "https://api.clockify.me/api/v1",
    };

    this.server = new Server(
      {
        name: "clockify-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
    data?: any,
    baseUrl?: string
  ): Promise<any> {
    if (!this.config.apiKey) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Clockify API key not configured. Set CLOCKIFY_API_KEY environment variable."
      );
    }

    const url = `${baseUrl || this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "X-Api-Key": this.config.apiKey,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new McpError(
          ErrorCode.InternalError,
          `Clockify API error (${response.status}): ${errorText}`
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // User & Workspace Management
        {
          name: "get_current_user",
          description: "Get information about the current user",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_workspaces",
          description: "Get all workspaces for the current user",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_workspace_users",
          description: "Get all users in a workspace",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
            },
            required: ["workspaceId"],
          },
        },

        // Time Entry Management
        {
          name: "create_time_entry",
          description: "Create a new time entry",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              description: { type: "string", description: "Time entry description" },
              start: { type: "string", description: "Start time (ISO 8601 format)" },
              end: { type: "string", description: "End time (ISO 8601 format, optional for ongoing entries)" },
              projectId: { type: "string", description: "Project ID (optional)" },
              taskId: { type: "string", description: "Task ID (optional)" },
              tagIds: { type: "array", items: { type: "string" }, description: "Array of tag IDs (optional)" },
              billable: { type: "boolean", description: "Whether the entry is billable (optional)" },
            },
            required: ["workspaceId", "start"],
          },
        },
        {
          name: "get_time_entries",
          description: "Get time entries for a user",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              userId: { type: "string", description: "User ID (optional, defaults to current user)" },
              description: { type: "string", description: "Filter by description" },
              start: { type: "string", description: "Start date filter (ISO 8601)" },
              end: { type: "string", description: "End date filter (ISO 8601)" },
              project: { type: "string", description: "Filter by project ID" },
              task: { type: "string", description: "Filter by task ID" },
              tags: { type: "string", description: "Filter by tag IDs (comma-separated)" },
              projectRequired: { type: "boolean", description: "Filter entries that require project" },
              taskRequired: { type: "boolean", description: "Filter entries that require task" },
              consideredRunning: { type: "boolean", description: "Include running time entries" },
              hydrated: { type: "boolean", description: "Include additional data" },
              inProgress: { type: "boolean", description: "Filter by running status" },
              page: { type: "number", description: "Page number (default: 1)" },
              pageSize: { type: "number", description: "Page size (default: 50, max: 5000)" },
            },
            required: ["workspaceId"],
          },
        },
        {
          name: "update_time_entry",
          description: "Update an existing time entry",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              timeEntryId: { type: "string", description: "Time entry ID" },
              description: { type: "string", description: "Time entry description" },
              start: { type: "string", description: "Start time (ISO 8601 format)" },
              end: { type: "string", description: "End time (ISO 8601 format)" },
              projectId: { type: "string", description: "Project ID" },
              taskId: { type: "string", description: "Task ID" },
              tagIds: { type: "array", items: { type: "string" }, description: "Array of tag IDs" },
              billable: { type: "boolean", description: "Whether the entry is billable" },
            },
            required: ["workspaceId", "timeEntryId"],
          },
        },
        {
          name: "delete_time_entry",
          description: "Delete a time entry",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              timeEntryId: { type: "string", description: "Time entry ID" },
            },
            required: ["workspaceId", "timeEntryId"],
          },
        },
        {
          name: "stop_time_entry",
          description: "Stop a running time entry",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              userId: { type: "string", description: "User ID" },
              end: { type: "string", description: "End time (ISO 8601 format, optional - defaults to now)" },
            },
            required: ["workspaceId", "userId"],
          },
        },

        // Project Management
        {
          name: "create_project",
          description: "Create a new project",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              name: { type: "string", description: "Project name" },
              clientId: { type: "string", description: "Client ID (optional)" },
              isPublic: { type: "boolean", description: "Whether project is public (optional)" },
              billable: { type: "boolean", description: "Whether project is billable (optional)" },
              color: { type: "string", description: "Project color (hex code, optional)" },
              estimate: {
                type: "object",
                properties: {
                  estimate: { type: "string", description: "Estimate duration (ISO 8601 duration)" },
                  type: { type: "string", enum: ["AUTO", "MANUAL"], description: "Estimate type" },
                },
                description: "Project estimate (optional)",
              },
            },
            required: ["workspaceId", "name"],
          },
        },
        {
          name: "get_projects",
          description: "Get all projects in a workspace",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              archived: { type: "boolean", description: "Filter by archived status" },
              name: { type: "string", description: "Filter by project name" },
              clientIds: { type: "string", description: "Filter by client IDs (comma-separated)" },
              containsClient: { type: "boolean", description: "Filter projects that have clients" },
              clientStatus: { type: "string", enum: ["ACTIVE", "ARCHIVED"], description: "Filter by client status" },
              users: { type: "string", description: "Filter by user IDs (comma-separated)" },
              isTemplate: { type: "boolean", description: "Filter by template status" },
              sortColumn: { type: "string", description: "Sort column" },
              sortOrder: { type: "string", enum: ["ASCENDING", "DESCENDING"], description: "Sort order" },
              page: { type: "number", description: "Page number (default: 1)" },
              pageSize: { type: "number", description: "Page size (default: 50, max: 5000)" },
            },
            required: ["workspaceId"],
          },
        },
        {
          name: "get_project",
          description: "Get a specific project by ID",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
            },
            required: ["workspaceId", "projectId"],
          },
        },
        {
          name: "update_project",
          description: "Update an existing project",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
              name: { type: "string", description: "Project name" },
              clientId: { type: "string", description: "Client ID" },
              isPublic: { type: "boolean", description: "Whether project is public" },
              billable: { type: "boolean", description: "Whether project is billable" },
              color: { type: "string", description: "Project color (hex code)" },
              archived: { type: "boolean", description: "Whether project is archived" },
            },
            required: ["workspaceId", "projectId"],
          },
        },
        {
          name: "delete_project",
          description: "Delete a project",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
            },
            required: ["workspaceId", "projectId"],
          },
        },

        // Task Management
        {
          name: "create_task",
          description: "Create a new task in a project",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
              name: { type: "string", description: "Task name" },
              assigneeIds: { type: "array", items: { type: "string" }, description: "Array of assignee user IDs (optional)" },
              estimate: { type: "string", description: "Task estimate (ISO 8601 duration, optional)" },
              status: { type: "string", enum: ["ACTIVE", "DONE"], description: "Task status (optional)" },
            },
            required: ["workspaceId", "projectId", "name"],
          },
        },
        {
          name: "get_tasks",
          description: "Get all tasks in a project",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
              isActive: { type: "boolean", description: "Filter by active status" },
              name: { type: "string", description: "Filter by task name" },
              page: { type: "number", description: "Page number (default: 1)" },
              pageSize: { type: "number", description: "Page size (default: 50, max: 5000)" },
            },
            required: ["workspaceId", "projectId"],
          },
        },
        {
          name: "get_task",
          description: "Get a specific task by ID",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
              taskId: { type: "string", description: "Task ID" },
            },
            required: ["workspaceId", "projectId", "taskId"],
          },
        },
        {
          name: "update_task",
          description: "Update an existing task",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
              taskId: { type: "string", description: "Task ID" },
              name: { type: "string", description: "Task name" },
              assigneeIds: { type: "array", items: { type: "string" }, description: "Array of assignee user IDs" },
              estimate: { type: "string", description: "Task estimate (ISO 8601 duration)" },
              status: { type: "string", enum: ["ACTIVE", "DONE"], description: "Task status" },
            },
            required: ["workspaceId", "projectId", "taskId"],
          },
        },
        {
          name: "delete_task",
          description: "Delete a task",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              projectId: { type: "string", description: "Project ID" },
              taskId: { type: "string", description: "Task ID" },
            },
            required: ["workspaceId", "projectId", "taskId"],
          },
        },

        // Client Management
        {
          name: "create_client",
          description: "Create a new client",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              name: { type: "string", description: "Client name" },
              archived: { type: "boolean", description: "Whether client is archived (optional)" },
            },
            required: ["workspaceId", "name"],
          },
        },
        {
          name: "get_clients",
          description: "Get all clients in a workspace",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              archived: { type: "boolean", description: "Filter by archived status" },
              name: { type: "string", description: "Filter by client name" },
              page: { type: "number", description: "Page number (default: 1)" },
              pageSize: { type: "number", description: "Page size (default: 50, max: 5000)" },
            },
            required: ["workspaceId"],
          },
        },
        {
          name: "update_client",
          description: "Update an existing client",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              clientId: { type: "string", description: "Client ID" },
              name: { type: "string", description: "Client name" },
              archived: { type: "boolean", description: "Whether client is archived" },
            },
            required: ["workspaceId", "clientId"],
          },
        },
        {
          name: "delete_client",
          description: "Delete a client",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              clientId: { type: "string", description: "Client ID" },
            },
            required: ["workspaceId", "clientId"],
          },
        },

        // Tag Management
        {
          name: "create_tag",
          description: "Create a new tag",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              name: { type: "string", description: "Tag name" },
              archived: { type: "boolean", description: "Whether tag is archived (optional)" },
            },
            required: ["workspaceId", "name"],
          },
        },
        {
          name: "get_tags",
          description: "Get all tags in a workspace",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              archived: { type: "boolean", description: "Filter by archived status" },
              name: { type: "string", description: "Filter by tag name" },
              page: { type: "number", description: "Page number (default: 1)" },
              pageSize: { type: "number", description: "Page size (default: 50, max: 5000)" },
            },
            required: ["workspaceId"],
          },
        },
        {
          name: "update_tag",
          description: "Update an existing tag",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              tagId: { type: "string", description: "Tag ID" },
              name: { type: "string", description: "Tag name" },
              archived: { type: "boolean", description: "Whether tag is archived" },
            },
            required: ["workspaceId", "tagId"],
          },
        },
        {
          name: "delete_tag",
          description: "Delete a tag",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              tagId: { type: "string", description: "Tag ID" },
            },
            required: ["workspaceId", "tagId"],
          },
        },

        // Reports
        {
          name: "get_detailed_report",
          description: "Generate a detailed time tracking report",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              dateRangeStart: { type: "string", description: "Start date (ISO 8601 format)" },
              dateRangeEnd: { type: "string", description: "End date (ISO 8601 format)" },
              users: { type: "array", items: { type: "string" }, description: "Array of user IDs to filter" },
              clients: { type: "array", items: { type: "string" }, description: "Array of client IDs to filter" },
              projects: { type: "array", items: { type: "string" }, description: "Array of project IDs to filter" },
              tasks: { type: "array", items: { type: "string" }, description: "Array of task IDs to filter" },
              tags: { type: "array", items: { type: "string" }, description: "Array of tag IDs to filter" },
              billable: { type: "boolean", description: "Filter by billable status" },
              description: { type: "string", description: "Filter by description" },
              withoutDescription: { type: "boolean", description: "Filter entries without description" },
              customFieldIds: { type: "array", items: { type: "string" }, description: "Array of custom field IDs" },
              sortColumn: { type: "string", description: "Sort column (DATE, USER, PROJECT, etc.)" },
              sortOrder: { type: "string", enum: ["ASCENDING", "DESCENDING"], description: "Sort order" },
              page: { type: "number", description: "Page number (default: 1)" },
              pageSize: { type: "number", description: "Page size (default: 50, max: 1000)" },
              exportType: { type: "string", enum: ["JSON", "PDF", "CSV", "XLSX"], description: "Export format" },
            },
            required: ["workspaceId", "dateRangeStart", "dateRangeEnd"],
          },
        },
        {
          name: "get_summary_report",
          description: "Generate a summary time tracking report",
          inputSchema: {
            type: "object",
            properties: {
              workspaceId: { type: "string", description: "Workspace ID" },
              dateRangeStart: { type: "string", description: "Start date (ISO 8601 format)" },
              dateRangeEnd: { type: "string", description: "End date (ISO 8601 format)" },
              users: { type: "array", items: { type: "string" }, description: "Array of user IDs to filter" },
              clients: { type: "array", items: { type: "string" }, description: "Array of client IDs to filter" },
              projects: { type: "array", items: { type: "string" }, description: "Array of project IDs to filter" },
              tasks: { type: "array", items: { type: "string" }, description: "Array of task IDs to filter" },
              tags: { type: "array", items: { type: "string" }, description: "Array of tag IDs to filter" },
              billable: { type: "boolean", description: "Filter by billable status" },
              groups: { type: "array", items: { type: "string" }, description: "Group by fields (USER, PROJECT, CLIENT, etc.)" },
              sortColumn: { type: "string", description: "Sort column" },
              sortOrder: { type: "string", enum: ["ASCENDING", "DESCENDING"], description: "Sort order" },
              exportType: { type: "string", enum: ["JSON", "PDF", "CSV", "XLSX"], description: "Export format" },
            },
            required: ["workspaceId", "dateRangeStart", "dateRangeEnd"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // User & Workspace Management
          case "get_current_user":
            return await this.getCurrentUser();
          case "get_workspaces":
            return await this.getWorkspaces();
          case "get_workspace_users":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.getWorkspaceUsers(args.workspaceId as string);

          // Time Entry Management
          case "create_time_entry":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.createTimeEntry(args as any);
          case "get_time_entries":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.getTimeEntries(args as any);
          case "update_time_entry":
            if (!args?.workspaceId || !args?.timeEntryId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and timeEntryId are required');
            return await this.updateTimeEntry(args as any);
          case "delete_time_entry":
            if (!args?.workspaceId || !args?.timeEntryId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and timeEntryId are required');
            return await this.deleteTimeEntry(args.workspaceId as string, args.timeEntryId as string);
          case "stop_time_entry":
            if (!args?.workspaceId || !args?.userId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and userId are required');
            return await this.stopTimeEntry(args as any);

          // Project Management
          case "create_project":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.createProject(args as any);
          case "get_projects":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.getProjects(args as any);
          case "get_project":
            if (!args?.workspaceId || !args?.projectId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and projectId are required');
            return await this.getProject(args.workspaceId as string, args.projectId as string);
          case "update_project":
            if (!args?.workspaceId || !args?.projectId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and projectId are required');
            return await this.updateProject(args as any);
          case "delete_project":
            if (!args?.workspaceId || !args?.projectId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and projectId are required');
            return await this.deleteProject(args.workspaceId as string, args.projectId as string);

          // Task Management
          case "create_task":
            if (!args?.workspaceId || !args?.projectId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and projectId are required');
            return await this.createTask(args as any);
          case "get_tasks":
            if (!args?.workspaceId || !args?.projectId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and projectId are required');
            return await this.getTasks(args as any);
          case "get_task":
            if (!args?.workspaceId || !args?.projectId || !args?.taskId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId, projectId and taskId are required');
            return await this.getTask(args.workspaceId as string, args.projectId as string, args.taskId as string);
          case "update_task":
            if (!args?.workspaceId || !args?.projectId || !args?.taskId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId, projectId and taskId are required');
            return await this.updateTask(args as any);
          case "delete_task":
            if (!args?.workspaceId || !args?.projectId || !args?.taskId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId, projectId and taskId are required');
            return await this.deleteTask(args.workspaceId as string, args.projectId as string, args.taskId as string);

          // Client Management
          case "create_client":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.createClient(args as any);
          case "get_clients":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.getClients(args as any);
          case "update_client":
            if (!args?.workspaceId || !args?.clientId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and clientId are required');
            return await this.updateClient(args as any);
          case "delete_client":
            if (!args?.workspaceId || !args?.clientId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and clientId are required');
            return await this.deleteClient(args.workspaceId as string, args.clientId as string);

          // Tag Management
          case "create_tag":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.createTag(args as any);
          case "get_tags":
            if (!args?.workspaceId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
            return await this.getTags(args as any);
          case "update_tag":
            if (!args?.workspaceId || !args?.tagId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and tagId are required');
            return await this.updateTag(args as any);
          case "delete_tag":
            if (!args?.workspaceId || !args?.tagId) throw new McpError(ErrorCode.InvalidParams, 'workspaceId and tagId are required');
            return await this.deleteTag(args.workspaceId as string, args.tagId as string);

          // Reports
          case "get_detailed_report":
            return await this.getDetailedReport(args);
          case "get_summary_report":
            return await this.getSummaryReport(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // User & Workspace Management Methods
  private async getCurrentUser() {
    const user = await this.makeRequest("/user");
    return {
      content: [
        {
          type: "text",
          text: `Current user: ${user.name} (${user.email})\nActive Workspace: ${user.activeWorkspace}\nUser ID: ${user.id}`,
        },
      ],
      isError: false,
    };
  }

  private async getWorkspaces() {
    const workspaces = await this.makeRequest("/workspaces");
    return {
      content: [
        {
          type: "text",
          text: `Found ${workspaces.length} workspace(s):\n${workspaces
            .map((w: Workspace) => `- ${w.name} (${w.id})`)
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  private async getWorkspaceUsers(workspaceId: string | undefined) {
    const users = await this.makeRequest(`/workspaces/${workspaceId}/users`);
    return {
      content: [
        {
          type: "text",
          text: `Found ${users.length} user(s) in workspace:\n${users
            .map((u: User) => `- ${u.name} (${u.email}) - ${u.id}`)
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  // Time Entry Management Methods
  private async createTimeEntry(args: any) {
    const { workspaceId, ...timeEntryData } = args;
    
    // Ensure start time is in ISO format
    if (!timeEntryData.start.includes("T")) {
      timeEntryData.start = new Date(timeEntryData.start).toISOString();
    }
    
    // If end time is provided, ensure it's in ISO format
    if (timeEntryData.end && !timeEntryData.end.includes("T")) {
      timeEntryData.end = new Date(timeEntryData.end).toISOString();
    }

    const timeEntry = await this.makeRequest(
      `/workspaces/${workspaceId}/time-entries`,
      "POST",
      timeEntryData
    );

    return {
      content: [
        {
          type: "text",
          text: `Time entry created successfully!\nID: ${timeEntry.id}\nDescription: ${timeEntry.description || "No description"}\nStart: ${timeEntry.timeInterval.start}\nEnd: ${timeEntry.timeInterval.end || "Ongoing"}`,
        },
      ],
      isError: false,
    };
  }

  private async getTimeEntries(args: any) {
    const { workspaceId, userId, ...params } = args;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = userId 
      ? `/workspaces/${workspaceId}/user/${userId}/time-entries`
      : `/workspaces/${workspaceId}/time-entries`;
    
    const fullEndpoint = queryParams.toString() 
      ? `${endpoint}?${queryParams.toString()}`
      : endpoint;

    const timeEntries = await this.makeRequest(fullEndpoint);

    return {
      content: [
        {
          type: "text",
          text: `Found ${timeEntries.length} time entries:\n${timeEntries
            .map((entry: any) => 
              `- ${entry.description || "No description"} | ${entry.timeInterval.start} - ${entry.timeInterval.end || "Ongoing"} | ${entry.timeInterval.duration || "Running"}`
            )
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  private async updateTimeEntry(args: any) {
    const { workspaceId, timeEntryId, ...updateData } = args;

    // Ensure dates are in ISO format
    if (updateData.start && !updateData.start.includes("T")) {
      updateData.start = new Date(updateData.start).toISOString();
    }
    if (updateData.end && !updateData.end.includes("T")) {
      updateData.end = new Date(updateData.end).toISOString();
    }

    const timeEntry = await this.makeRequest(
      `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      "PUT",
      updateData
    );

    return {
      content: [
        {
          type: "text",
          text: `Time entry updated successfully!\nID: ${timeEntry.id}\nDescription: ${timeEntry.description || "No description"}\nStart: ${timeEntry.timeInterval.start}\nEnd: ${timeEntry.timeInterval.end || "Ongoing"}`,
        },
      ],
      isError: false,
    };
  }

  private async deleteTimeEntry(workspaceId: string, timeEntryId: string) {
    await this.makeRequest(
      `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      "DELETE"
    );

    return {
      content: [
        {
          type: "text",
          text: `Time entry ${timeEntryId} deleted successfully!`,
        },
      ],
      isError: false,
    };
  }

  private async stopTimeEntry(args: any) {
    const { workspaceId, userId, end } = args;
    const endTime = end || new Date().toISOString();

    const result = await this.makeRequest(
      `/workspaces/${workspaceId}/user/${userId}/time-entries`,
      "PATCH" as "PATCH",
      { end: endTime }
    );

    return {
      content: [
        {
          type: "text",
          text: `Time entry stopped at ${endTime}\nDuration: ${result.timeInterval.duration}`,
        },
      ],
      isError: false,
    };
  }

  // Project Management Methods
  private async createProject(args: any) {
    const { workspaceId, ...projectData } = args;

    const project = await this.makeRequest(
      `/workspaces/${workspaceId}/projects`,
      "POST",
      projectData
    );

    return {
      content: [
        {
          type: "text",
          text: `Project created successfully!\nID: ${project.id}\nName: ${project.name}\nClient: ${project.clientName || "No client"}\nPublic: ${project.public}\nBillable: ${project.billable}`,
        },
      ],
      isError: false,
    };
  }

  private async getProjects(args: any) {
    const { workspaceId, ...params } = args;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = queryParams.toString()
      ? `/workspaces/${workspaceId}/projects?${queryParams.toString()}`
      : `/workspaces/${workspaceId}/projects`;

    const projects = await this.makeRequest(endpoint);

    return {
      content: [
        {
          type: "text",
          text: `Found ${projects.length} project(s):\n${projects
            .map((p: any) => `- ${p.name} (${p.id}) | Client: ${p.clientName || "None"} | Billable: ${p.billable}`)
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  private async getProject(workspaceId: string, projectId: string) {
    const project = await this.makeRequest(`/workspaces/${workspaceId}/projects/${projectId}`);

    return {
      content: [
        {
          type: "text",
          text: `Project Details:\nName: ${project.name}\nID: ${project.id}\nClient: ${project.clientName || "No client"}\nPublic: ${project.public}\nBillable: ${project.billable}\nColor: ${project.color}\nArchived: ${project.archived}`,
        },
      ],
      isError: false,
    };
  }

  private async updateProject(args: any) {
    const { workspaceId, projectId, ...updateData } = args;

    const project = await this.makeRequest(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      "PUT",
      updateData
    );

    return {
      content: [
        {
          type: "text",
          text: `Project updated successfully!\nName: ${project.name}\nClient: ${project.clientName || "No client"}\nBillable: ${project.billable}`,
        },
      ],
      isError: false,
    };
  }

  private async deleteProject(workspaceId: string, projectId: string) {
    await this.makeRequest(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      "DELETE"
    );

    return {
      content: [
        {
          type: "text",
          text: `Project ${projectId} deleted successfully!`,
        },
      ],
      isError: false,
    };
  }

  // Task Management Methods
  private async createTask(args: any) {
    const { workspaceId, projectId, ...taskData } = args;

    const task = await this.makeRequest(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      "POST",
      taskData
    );

    return {
      content: [
        {
          type: "text",
          text: `Task created successfully!\nID: ${task.id}\nName: ${task.name}\nProject: ${projectId}\nStatus: ${task.status}\nEstimate: ${task.estimate || "No estimate"}`,
        },
      ],
      isError: false,
    };
  }

  private async getTasks(args: any) {
    const { workspaceId, projectId, ...params } = args;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = queryParams.toString()
      ? `/workspaces/${workspaceId}/projects/${projectId}/tasks?${queryParams.toString()}`
      : `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

    const tasks = await this.makeRequest(endpoint);

    return {
      content: [
        {
          type: "text",
          text: `Found ${tasks.length} task(s):\n${tasks
            .map((t: any) => `- ${t.name} (${t.id}) | Status: ${t.status} | Estimate: ${t.estimate || "None"}`)
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  private async getTask(workspaceId: string, projectId: string, taskId: string) {
    const task = await this.makeRequest(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`
    );

    return {
      content: [
        {
          type: "text",
          text: `Task Details:\nName: ${task.name}\nID: ${task.id}\nProject: ${projectId}\nStatus: ${task.status}\nEstimate: ${task.estimate || "No estimate"}\nAssignees: ${task.assigneeIds?.length || 0}`,
        },
      ],
      isError: false,
    };
  }

  private async updateTask(args: any) {
    const { workspaceId, projectId, taskId, ...updateData } = args;

    const task = await this.makeRequest(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      "PUT",
      updateData
    );

    return {
      content: [
        {
          type: "text",
          text: `Task updated successfully!\nName: ${task.name}\nStatus: ${task.status}\nEstimate: ${task.estimate || "No estimate"}`,
        },
      ],
      isError: false,
    };
  }

  private async deleteTask(workspaceId: string, projectId: string, taskId: string) {
    await this.makeRequest(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      "DELETE"
    );

    return {
      content: [
        {
          type: "text",
          text: `Task ${taskId} deleted successfully!`,
        },
      ],
      isError: false,
    };
  }

  // Client Management Methods
  private async createClient(args: any) {
    const { workspaceId, ...clientData } = args;

    const client = await this.makeRequest(
      `/workspaces/${workspaceId}/clients`,
      "POST",
      clientData
    );

    return {
      content: [
        {
          type: "text",
          text: `Client created successfully!\nID: ${client.id}\nName: ${client.name}\nArchived: ${client.archived}`,
        },
      ],
      isError: false,
    };
  }

  private async getClients(args: any) {
    const { workspaceId, ...params } = args;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = queryParams.toString()
      ? `/workspaces/${workspaceId}/clients?${queryParams.toString()}`
      : `/workspaces/${workspaceId}/clients`;

    const clients = await this.makeRequest(endpoint);

    return {
      content: [
        {
          type: "text",
          text: `Found ${clients.length} client(s):\n${clients
            .map((c: any) => `- ${c.name} (${c.id}) | Archived: ${c.archived}`)
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  private async updateClient(args: any) {
    const { workspaceId, clientId, ...updateData } = args;

    const client = await this.makeRequest(
      `/workspaces/${workspaceId}/clients/${clientId}`,
      "PUT",
      updateData
    );

    return {
      content: [
        {
          type: "text",
          text: `Client updated successfully!\nName: ${client.name}\nArchived: ${client.archived}`,
        },
      ],
      isError: false,
    };
  }

  private async deleteClient(workspaceId: string, clientId: string) {
    await this.makeRequest(
      `/workspaces/${workspaceId}/clients/${clientId}`,
      "DELETE"
    );

    return {
      content: [
        {
          type: "text",
          text: `Client ${clientId} deleted successfully!`,
        },
      ],
      isError: false,
    };
  }

  // Tag Management Methods
  private async createTag(args: any) {
    const { workspaceId, ...tagData } = args;

    const tag = await this.makeRequest(
      `/workspaces/${workspaceId}/tags`,
      "POST",
      tagData
    );

    return {
      content: [
        {
          type: "text",
          text: `Tag created successfully!\nID: ${tag.id}\nName: ${tag.name}\nArchived: ${tag.archived}`,
        },
      ],
      isError: false,
    };
  }

  private async getTags(args: any) {
    const { workspaceId, ...params } = args;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = queryParams.toString()
      ? `/workspaces/${workspaceId}/tags?${queryParams.toString()}`
      : `/workspaces/${workspaceId}/tags`;

    const tags = await this.makeRequest(endpoint);

    return {
      content: [
        {
          type: "text",
          text: `Found ${tags.length} tag(s):\n${tags
            .map((t: any) => `- ${t.name} (${t.id}) | Archived: ${t.archived}`)
            .join("\n")}`,
        },
      ],
      isError: false,
    };
  }

  private async updateTag(args: any) {
    const { workspaceId, tagId, ...updateData } = args;

    const tag = await this.makeRequest(
      `/workspaces/${workspaceId}/tags/${tagId}`,
      "PUT",
      updateData
    );

    return {
      content: [
        {
          type: "text",
          text: `Tag updated successfully!\nName: ${tag.name}\nArchived: ${tag.archived}`,
        },
      ],
      isError: false,
    };
  }

  private async deleteTag(workspaceId: string, tagId: string) {
    await this.makeRequest(
      `/workspaces/${workspaceId}/tags/${tagId}`,
      "DELETE"
    );

    return {
      content: [
        {
          type: "text",
          text: `Tag ${tagId} deleted successfully!`,
        },
      ],
      isError: false,
    };
  }

  // Report Methods
  private async getDetailedReport(args: any) {
    const { workspaceId, ...reportData } = args;

    const payload = {
      dateRangeStart: reportData.dateRangeStart,
      dateRangeEnd: reportData.dateRangeEnd,
      detailedFilter: {
        sortColumn: reportData.sortColumn || "DATE",
        sortOrder: reportData.sortOrder || "DESCENDING",
        page: reportData.page || 1,
        pageSize: Math.min(reportData.pageSize || 50, 1000),
        options: {
          totals: "CALCULATE",
        },
      },
      users: reportData.users ? { ids: reportData.users } : undefined,
      clients: reportData.clients ? { ids: reportData.clients } : undefined,
      projects: reportData.projects ? { ids: reportData.projects } : undefined,
      tasks: reportData.tasks ? { ids: reportData.tasks } : undefined,
      tags: reportData.tags ? { ids: reportData.tags } : undefined,
      billable: reportData.billable,
      description: reportData.description,
      withoutDescription: reportData.withoutDescription,
      customFieldIds: reportData.customFieldIds,
      exportType: reportData.exportType || "JSON",
    };

    // Remove undefined properties
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    const report = await this.makeRequest(
      `/workspaces/${workspaceId}/reports/detailed`,
      "POST",
      payload,
      "https://reports.api.clockify.me/v1"
    );

    const summary = `Detailed Report Summary:
Total Entries: ${report.timeentries?.length || 0}
Total Duration: ${report.totals?.[0]?.totalTime || "0:00:00"}
Date Range: ${reportData.dateRangeStart} to ${reportData.dateRangeEnd}`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      isError: false,
    };
  }

  private async getSummaryReport(args: any) {
    const { workspaceId, ...reportData } = args;

    const payload = {
      dateRangeStart: reportData.dateRangeStart,
      dateRangeEnd: reportData.dateRangeEnd,
      summaryFilter: {
        groups: reportData.groups || ["PROJECT"],
        sortColumn: reportData.sortColumn || "DURATION",
        sortOrder: reportData.sortOrder || "DESCENDING",
      },
      users: reportData.users ? { ids: reportData.users } : undefined,
      clients: reportData.clients ? { ids: reportData.clients } : undefined,
      projects: reportData.projects ? { ids: reportData.projects } : undefined,
      tasks: reportData.tasks ? { ids: reportData.tasks } : undefined,
      tags: reportData.tags ? { ids: reportData.tags } : undefined,
      billable: reportData.billable,
      exportType: reportData.exportType || "JSON",
    };

    // Remove undefined properties
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    const report = await this.makeRequest(
      `/workspaces/${workspaceId}/reports/summary`,
      "POST",
      payload,
      "https://reports.api.clockify.me/v1"
    );

    const summary = `Summary Report:
Groups: ${reportData.groups?.join(", ") || "PROJECT"}
Total Duration: ${report.totals?.[0]?.totalTime || "0:00:00"}
Date Range: ${reportData.dateRangeStart} to ${reportData.dateRangeEnd}
Group Count: ${report.groupOne?.length || 0}`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      isError: false,
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Clockify MCP server running on stdio");
  }
}

const server = new ClockifyMCPServer();
server.run().catch(console.error);