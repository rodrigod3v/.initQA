export class CreateWebScenarioDto {
    name: string;
    projectId: string;
    steps: any[];
}

export class UpdateWebScenarioDto {
    name?: string;
    steps?: any[];
}
