export class CreateLoadTestDto {
  name: string;
  projectId: string;
  config: any;
}

export class UpdateLoadTestDto {
  name?: string;
  config?: any;
}
