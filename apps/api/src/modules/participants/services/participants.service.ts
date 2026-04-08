import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import Papa from 'papaparse';

import { EventsRepository } from '../../events/repositories/events.repository';
import { CreateParticipantDto } from '../dto/create-participant.dto';
import { ListParticipantsQueryDto } from '../dto/list-participants-query.dto';
import { UploadedCsvFile } from '../participants.types';
import { ParticipantsRepository } from '../repositories/participants.repository';

type ParsedCsvRow = Record<string, string | undefined>;

type CsvNormalizedRow = {
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
};

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly participantsRepository: ParticipantsRepository,
    private readonly eventsRepository: EventsRepository,
  ) {}

  createManual(eventId: string, payload: CreateParticipantDto) {
    this.ensureEventExists(eventId);

    const participant = this.participantsRepository.create({
      eventId,
      name: payload.name.trim(),
      email: this.normalizeEmail(payload.email),
      phone: this.normalizeNullable(payload.phone),
      source: 'manual',
      externalId: null,
    });

    return {
      success: true,
      data: participant,
    };
  }

  list(eventId: string, query: ListParticipantsQueryDto) {
    this.ensureEventExists(eventId);

    const result = this.participantsRepository.findAllByEvent({
      eventId,
      page: query.page,
      limit: query.limit,
      search: query.search,
    });

    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  importCsv(eventId: string, file: UploadedCsvFile | undefined) {
    this.ensureEventExists(eventId);

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('CSV dosyasi gerekli.');
    }

    const parsed = Papa.parse<ParsedCsvRow>(file.buffer.toString('utf-8'), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) =>
        header
          .replace(/^\uFEFF/, '')
          .trim()
          .toLowerCase(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new BadRequestException('CSV dosyasi okunamadi.');
    }

    const rowIssues = new Map<number, string[]>();

    const addIssue = (rowIndex: number, message: string) => {
      const issues = rowIssues.get(rowIndex) ?? [];
      issues.push(message);
      rowIssues.set(rowIndex, issues);
    };

    for (const parseError of parsed.errors) {
      if (typeof parseError.row === 'number' && parseError.row >= 0) {
        addIssue(parseError.row, `CSV parse hatasi: ${parseError.message}`);
      }
    }

    const validRows: CsvNormalizedRow[] = [];

    parsed.data.forEach((row, rowIndex) => {
      if (rowIssues.has(rowIndex)) {
        return;
      }

      const normalized = this.normalizeCsvRow(row);

      if (!normalized.name) {
        addIssue(rowIndex, 'name alani zorunlu.');
      }

      if (normalized.email && !isEmail(normalized.email)) {
        addIssue(rowIndex, 'email formati gecersiz.');
      }

      if (rowIssues.has(rowIndex)) {
        return;
      }

      validRows.push({
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone,
        externalId: normalized.externalId,
      });
    });

    const imported = this.participantsRepository.bulkUpsertFromCsv(
      eventId,
      validRows,
    );

    const errors = [...rowIssues.entries()]
      .map(([rowIndex, messages]) => ({
        row: rowIndex + 2,
        message: messages.join(' | '),
      }))
      .sort((a, b) => a.row - b.row);

    return {
      success: true,
      data: {
        total: parsed.data.length,
        success: imported.length,
        failed: errors.length,
        errors,
      },
    };
  }

  remove(eventId: string, participantId: string) {
    this.ensureEventExists(eventId);

    const removed = this.participantsRepository.remove(eventId, participantId);

    if (!removed) {
      throw new NotFoundException('Katilimci bulunamadi.');
    }

    return {
      success: true,
      data: {
        id: removed.id,
      },
    };
  }

  private ensureEventExists(eventId: string) {
    const event = this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }
  }

  private normalizeCsvRow(row: ParsedCsvRow): CsvNormalizedRow {
    const name = this.pickFirst(row, ['name', 'full_name', 'ad']) ?? '';
    const email = this.pickFirst(row, ['email', 'e-mail', 'mail']);
    const phone = this.pickFirst(row, ['phone', 'telefon', 'phone_number']);
    const externalId = this.pickFirst(row, [
      'external_id',
      'externalid',
      'external-id',
    ]);

    return {
      name,
      email: email ? email.toLowerCase() : null,
      phone,
      externalId,
    };
  }

  private pickFirst(row: ParsedCsvRow, aliases: string[]) {
    for (const alias of aliases) {
      const value = row[alias];
      const normalized = this.normalizeNullable(value);

      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeEmail(value: string | undefined) {
    return this.normalizeNullable(value)?.toLowerCase() ?? null;
  }

  private normalizeNullable(value: string | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }
}
