export interface RunTestPayload {
    requestId: string;
    environmentId?: string;
}

export interface RunTestResult {
    status: "success" | "error";
    response: any;
}
