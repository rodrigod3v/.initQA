import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExecutionService } from '../request/execution/execution.service';
import { LoadExecutionService } from '../load-test/execution/load-execution.service';
import { ProjectService } from '../project/project.service';
import { Logger, Inject, forwardRef } from '@nestjs/common';

interface ExecutionJobData {
  requestId?: string;
  loadTestId?: string;
  projectId?: string;
  environmentId?: string;
}

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
    @Inject(forwardRef(() => LoadExecutionService))
    private loadExecutionService: LoadExecutionService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {
    super();
  }

  async process(job: Job<ExecutionJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    const { data } = job;

    const { requestId, environmentId, loadTestId, projectId } = job.data;

    switch (job.name) {
      case 'request':
        if (data.requestId) {
          return this.executionService.execute(
            data.requestId,
            data.environmentId,
          );
        }
        break;
      case 'load-test':
        if (data.loadTestId) {
          return this.loadExecutionService.execute(
            data.loadTestId,
            data.environmentId,
          );
        }
        break;
      case 'batch-execution':
        if (data.projectId) {
          return this.projectService.runAll(data.projectId, data.environmentId);
        }
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
}
