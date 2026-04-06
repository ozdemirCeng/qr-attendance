import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('import.queue')
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  process(job: Job<Record<string, unknown>>): Promise<Record<string, unknown>> {
    this.logger.log(`Processing import job ${job.id}`);

    return Promise.resolve({
      jobId: job.id,
      status: 'processed',
      queue: 'import.queue',
      processedAt: new Date().toISOString(),
    });
  }
}
