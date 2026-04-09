import {
  ApiError,
  ApiErrorPayload,
  apiFetch,
  resolveApiErrorCode,
  resolveApiErrorMessage,
} from "@/lib/api";

export type ParticipantSource = "csv" | "manual" | "self_registered";

export type ParticipantItem = {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: ParticipantSource;
  externalId: string | null;
  createdAt: string;
};

export type ListParticipantsResponse = {
  success: true;
  data: ParticipantItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ParticipantActionResponse = {
  success: true;
  data: ParticipantItem;
};

export type RemoveParticipantResponse = {
  success: true;
  data: {
    id: string;
  };
};

export type CsvImportResponse = {
  success: true;
  data: {
    total: number;
    success: number;
    failed: number;
    errors: Array<{
      row: number;
      message: string;
    }>;
  };
};

export async function listParticipants(eventId: string, page = 1, limit = 20, search = "") {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  return apiFetch<ListParticipantsResponse>(
    `/events/${eventId}/participants?${params.toString()}`,
  );
}

export async function createParticipantManual(
  eventId: string,
  payload: { name: string; email?: string; phone?: string },
) {
  return apiFetch<ParticipantActionResponse>(`/events/${eventId}/participants/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeParticipant(eventId: string, participantId: string) {
  return apiFetch<RemoveParticipantResponse>(
    `/events/${eventId}/participants/${participantId}`,
    {
      method: "DELETE",
    },
  );
}

export async function importParticipantsCsv(
  eventId: string,
  file: File,
  onProgress?: (value: number) => void,
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }

  const formData = new FormData();
  formData.append("file", file);

  return new Promise<CsvImportResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${baseUrl}/events/${eventId}/participants/import-csv`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          resolveApiErrorMessage({ code: "NETWORK_ERROR", statusCode: 0 }),
          0,
          "NETWORK_ERROR",
        ),
      );
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      const payload = parseResponsePayload(xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload as CsvImportResponse);
        return;
      }

      const errorPayload = payload as ApiErrorPayload;
      const code = resolveApiErrorCode(xhr.status, errorPayload.code);
      const message = resolveApiErrorMessage({
        code,
        statusCode: xhr.status,
        fallbackMessage: errorPayload.message,
      });
      reject(new ApiError(message, xhr.status, code));
    };

    xhr.send(formData);
  });
}

function parseResponsePayload(raw: string) {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}
