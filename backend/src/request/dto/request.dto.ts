export class CreateRequestDto {
    name?: string;
    method: string;
    url: string;
    headers?: any;
    body?: any;
    testScript?: string;
    projectId: string;
}

export class UpdateRequestDto {
    name?: string;
    method?: string;
    url?: string;
    headers?: any;
    body?: any;
    testScript?: string;
}
