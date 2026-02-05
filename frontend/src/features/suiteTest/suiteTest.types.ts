export interface SuiteTestPayload {
    projectId: string;
    environmentId?: string;
}

export interface SuiteTestResult {
    status: "success" | "error";
    results: any[];
}
