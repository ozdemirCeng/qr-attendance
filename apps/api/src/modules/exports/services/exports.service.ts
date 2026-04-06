import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportsService {
  requestAttendanceExport(eventId: string) {
    return {
      success: true,
      exportId: `${eventId}-export-1`,
      message: 'Hazirlaniyor...',
    };
  }

  getStatus(exportId: string) {
    return {
      success: true,
      exportId,
      status: 'pending',
    };
  }
}
