export interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: any;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

export interface ExecutionResult {
    id: string;
    status: number;
    duration: number;
    response: {
        data: any;
        headers?: any;
        error?: string;
        message?: string;
    };
    request?: {
        name: string;
        method: string;
    };
    validationResult?: {
        valid: boolean;
        errors?: any[];
    };
    testResults?: {
        name: string;
        pass: boolean;
        error?: string;
    }[];
    createdAt?: string;
}

export interface RequestModel {
    id: string;
    name?: string;
    method: string;
    protocol?: 'REST' | 'GRAPHQL' | 'GRPC';
    url: string;
    headers: any;
    body: any; // Data
    testScript?: string; // Functional
    expectedResponseSchema?: any; // Contract
    executions?: ExecutionResult[];
    projectId: string;
}

export interface ProjectModel {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}
