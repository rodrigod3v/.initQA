export interface ApiResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

export interface ExecutionResult {
    id: string;
    status: number | string; 
    duration: number;
    response: {
        data: unknown;
        headers?: Record<string, string>;
        error?: string;
        message?: string;
    };
    request?: {
        name: string;
        method: string;
    };
    scenario?: {
        name: string;
    };
    validationResult?: {
        valid: boolean;
        errors?: unknown[];
    };
    logs?: {
        timestamp: string;
        step?: string;
        info?: string;
        error?: string;
        status?: string;
        duration?: number;
    }[];
    testResults?: {
        name: string;
        pass: boolean;
        error?: string;
    }[];
    screenshot?: string;
    createdAt: string;
}

export interface RequestModel {
    id: string;
    name: string;
    method: string;
    protocol?: 'REST' | 'GRAPHQL' | 'GRPC';
    url: string;
    headers: Record<string, string>;
    body: unknown;
    testScript?: string;
    expectedResponseSchema?: unknown;
    executions?: ExecutionResult[];
    projectId: string;
}

export interface ProjectModel {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}
