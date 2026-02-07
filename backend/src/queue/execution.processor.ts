import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExecutionService } from '../request/execution/execution.service';
import { LoadExecutionService } from '../load-test/execution/load-execution.service';
import { ProjectService } from '../project/project.service';
import { Logger } from '@nestjs/common';

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

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'request':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.executionService.execute(job.data.requestId, job.data.environmentId);
      case 'load-test':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.loadExecutionService.execute(job.data.loadTestId, job.data.environmentId);
      case 'batch-execution':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.projectService.runAll(job.data.projectId, job.data.environmentId);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
}
