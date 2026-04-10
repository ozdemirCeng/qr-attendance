import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import Papa from 'papaparse';

import { EventsRepository } from '../../events/repositories/events.repository';
import { CreateParticipantDto } from '../dto/create-participant.dto';
import { SelfRegisterParticipantDto } from '../dto/self-register-participant.dto';
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

  async createManual(eventId: string, payload: CreateParticipantDto) {
    await this.ensureEventExists(eventId);
    const normalizedEmail = this.normalizeEmail(payload.email);
    const normalizedPhone = this.normalizeNullable(payload.phone);

    if (
      normalizedEmail &&
      (await this.participantsRepository.findByEventAndEmail(
        eventId,
        normalizedEmail,
      ))
    ) {
      throw new BadRequestException(
        'Bu e-posta ile kayitli bir katilimci zaten bulunuyor.',
      );
    }

    if (
      normalizedPhone &&
      (await this.participantsRepository.findByEventAndPhone(
        eventId,
        normalizedPhone,
      ))
    ) {
      throw new BadRequestException(
        'Bu telefon ile kayitli bir katilimci zaten bulunuyor.',
      );
    }

    const participant = await this.participantsRepository.create({
      eventId,
      name: payload.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      source: 'manual',
      externalId: null,
    });

    return {
      success: true,
      data: participant,
    };
  }

  async selfRegister(payload: SelfRegisterParticipantDto) {
    await this.ensureEventExists(payload.eventId);

    const normalizedEmail = this.normalizeEmail(payload.email);
    const normalizedPhone = this.normalizeNullable(payload.phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException(
        'En az bir iletisim bilgisi (e-posta veya telefon) gereklidir.',
      );
    }

    if (
      normalizedEmail &&
      (await this.participantsRepository.findByEventAndEmail(
        payload.eventId,
        normalizedEmail,
      ))
    ) {
      throw new BadRequestException(
        'Bu e-posta ile zaten kayit olunmus.',
      );
    }

    if (
      normalizedPhone &&
      (await this.participantsRepository.findByEventAndPhone(
        payload.eventId,
        normalizedPhone,
      ))
    ) {
      throw new BadRequestException(
        'Bu telefon ile zaten kayit olunmus.',
      );
    }

    const participant = await this.participantsRepository.create({
      eventId: payload.eventId,
      name: payload.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      source: 'self_registered',
      externalId: null,
    });

    return {
      success: true,
      data: participant,
    };
  }

  async list(eventId: string, query: ListParticipantsQueryDto) {
    await this.ensureEventExists(eventId);

    const result = await this.participantsRepository.findAllByEvent({
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

  async importCsv(eventId: string, file: UploadedCsvFile | undefined) {
    await this.ensureEventExists(eventId);

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

    const imported = await this.participantsRepository.bulkUpsertFromCsv(
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

  async remove(eventId: string, participantId: string) {
    await this.ensureEventExists(eventId);

    const removed = await this.participantsRepository.remove(
      eventId,
      participantId,
    );

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

  private async ensureEventExists(eventId: string) {
    const event = await this.eventsRepository.findById(eventId);

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
