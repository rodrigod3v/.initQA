import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExecutionService } from '../request/execution/execution.service';
import { LoadExecutionService } from '../load-test/execution/load-execution.service';
import { ProjectService } from '../project/project.service';
import { Logger } from '@nestjs/common';

interface ExecutionJobData {
  requestId?: string;
  environmentId?: string;
  loadTestId?: string;
  projectId?: string;
}

@Processor('execution')
export class ExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(
    private executionService: ExecutionService,
    private loadExecutionService: LoadExecutionService,
    private projectService: ProjectService,
  ) {
    super();
  }

  async process(job: Job<ExecutionJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    const { requestId, environmentId, loadTestId, projectId } = job.data;

    switch (job.name) {
      case 'request':
        return this.executionService.execute(
          requestId as string,
          environmentId as string,
        );
      case 'load-test':
        return this.loadExecutionService.execute(
          loadTestId as string,
          environmentId as string,
        );
      case 'batch-execution':
        return this.projectService.runAll(
          projectId as string,
          environmentId as string,
        );
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
}
