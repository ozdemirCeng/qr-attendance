import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { AttendanceRecordsRepository } from '../../attendance/repositories/attendance-records.repository';
import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';

type ExportStatus = 'pending' | 'processing' | 'ready' | 'failed';
type RegistrationType = 'walkIn' | 'registered';

type ExportJobRow = {
  fullName: string;
  email: string | null;
  phone: string | null;
  scannedAt: string;
  distanceFromVenue: number | null;
  registrationType: RegistrationType;
};

type ExportJobPayload = {
  eventId: string;
  eventName: string;
  requestedAt: string;
  rows: ExportJobRow[];
};

type ExportJobResult = {
  filePath: string;
  fileName: string;
  rowCount: number;
  downloadUrl: string;
};

@Injectable()
export class ExportsService {
  constructor(
    @InjectQueue('export.queue')
    private readonly exportQueue: Queue<ExportJobPayload, ExportJobResult>,
    private readonly eventsRepository: EventsRepository,
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    private readonly participantsRepository: ParticipantsRepository,
  ) {}

  async requestAttendanceExport(eventId: string) {
    const event = this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    const exportId = crypto.randomUUID();
    const rows = this.attendanceRecordsRepository
      .findByEventId(eventId)
      .map((record) => ({
        fullName: record.fullName,
        email: record.email,
        phone: record.phone,
        scannedAt: record.scannedAt,
        distanceFromVenue: record.distanceFromVenue,
        registrationType: this.resolveRegistrationType(record.participantId),
      }));

    await this.exportQueue.add(
      'attendance-excel',
      {
        eventId,
        eventName: event.name,
        requestedAt: new Date().toISOString(),
        rows,
      },
      {
        jobId: exportId,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return {
      success: true,
      data: {
        exportId,
        message: 'Hazirlaniyor...',
      },
    };
  }

  async getStatus(exportId: string) {
    const job = await this.getJobOrThrow(exportId);
    const queueState = await job.getState();
    const status = this.mapQueueState(queueState);
    const progress = this.resolveProgress(job.progress, status);
    const result = (job.returnvalue ?? null) as ExportJobResult | null;

    return {
      success: true,
      data: {
        exportId,
        status,
        progress,
        downloadUrl:
          status === 'ready'
            ? (result?.downloadUrl ?? `/exports/${exportId}/download`)
            : null,
        errorMessage:
          status === 'failed'
            ? (job.failedReason ?? 'Export basarisiz.')
            : null,
      },
    };
  }

  async getDownloadFilePath(exportId: string) {
    const job = await this.getJobOrThrow(exportId);
    const queueState = await job.getState();
    const status = this.mapQueueState(queueState);

    if (status !== 'ready') {
      throw new BadRequestException('Export henuz hazir degil.');
    }

    const result = (job.returnvalue ?? null) as ExportJobResult | null;

    if (!result?.filePath) {
      throw new NotFoundException('Export dosyasi bulunamadi.');
    }

    return result.filePath;
  }

  private async getJobOrThrow(exportId: string) {
    const job = await this.exportQueue.getJob(exportId);

    if (!job) {
      throw new NotFoundException('Export kaydi bulunamadi.');
    }

    return job;
  }

  private mapQueueState(state: string): ExportStatus {
    if (state === 'completed') {
      return 'ready';
    }

    if (state === 'failed') {
      return 'failed';
    }

    if (state === 'active') {
      return 'processing';
    }

    return 'pending';
  }

  private resolveProgress(progress: Job['progress'], status: ExportStatus) {
    if (typeof progress === 'number') {
      return Math.min(100, Math.max(0, Math.round(progress)));
    }

    if (typeof progress === 'object' && progress !== null) {
      const percentage = (progress as { percentage?: unknown }).percentage;

      if (typeof percentage === 'number') {
        return Math.min(100, Math.max(0, Math.round(percentage)));
      }
    }

    if (status === 'ready') {
      return 100;
    }

    if (status === 'processing') {
      return 60;
    }

    return 0;
  }

  private resolveRegistrationType(
    participantId: string | null,
  ): RegistrationType {
    if (!participantId) {
      return 'walkIn';
    }

    const participant = this.participantsRepository.findById(participantId);

    if (!participant || participant.source === 'self_registered') {
      return 'walkIn';
    }

    return 'registered';
  }
}
