import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('export.queue')
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  process(job: Job<Record<string, unknown>>): Promise<Record<string, unknown>> {
    this.logger.log(`Processing export job ${job.id}`);

    return Promise.resolve({
      jobId: job.id,
      status: 'processed',
      queue: 'export.queue',
      processedAt: new Date().toISOString(),
    });
  }
}
