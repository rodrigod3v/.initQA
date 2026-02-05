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
    url: string;
    headers: any;
    body: any;
    testScript?: string;
    expectedResponseSchema?: any;
    executions?: ExecutionResult[];
    projectId: string;
}

export interface ProjectModel {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}
