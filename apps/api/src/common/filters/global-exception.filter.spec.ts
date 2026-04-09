import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

import { captureUnhandledException } from '../monitoring/sentry';
import { GlobalExceptionFilter } from './global-exception.filter';

jest.mock('../monitoring/sentry', () => ({
  captureUnhandledException: jest.fn(),
}));

type MockResponse = {
  statusCode: number | null;
  payload: unknown;
  getHeader: (name: string) => unknown;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  const anyString = expect.any(String) as unknown;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.clearAllMocks();
  });

  it('sets Retry-After header for 429 responses when missing', () => {
    const { host, response } = createHost('/attendance/scan', 'POST');
    const exception = new HttpException(
      {
        code: 'TOO_MANY_REQUESTS',
        message: 'Cok fazla istek gonderildi.',
        ttl: 2_500,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );

    filter.catch(exception, host);

    expect(response.getHeader('Retry-After')).toBe('3');
    expect(response.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.payload).toMatchObject({
      success: false,
      code: 'TOO_MANY_REQUESTS',
      message: 'Cok fazla istek gonderildi.',
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      path: '/attendance/scan',
      timestamp: anyString,
    });
  });

  it('preserves existing Retry-After header for 429 responses', () => {
    const { host, response } = createHost('/attendance/scan', 'POST', {
      'Retry-After': '10',
    });
    const exception = new HttpException(
      {
        code: 'TOO_MANY_REQUESTS',
        message: 'Sinir asildi.',
        retryAfter: 1,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );

    filter.catch(exception, host);

    expect(response.getHeader('Retry-After')).toBe('10');
  });

  it('captures 5xx HttpException errors and returns standardized payload', () => {
    const { host, response } = createHost('/exports/request', 'POST');
    const exception = new HttpException(
      {
        message: ['Beklenmeyen bir hata olustu'],
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(exception, host);

    expect(captureUnhandledException).toHaveBeenCalledWith(exception, {
      path: '/exports/request',
      method: 'POST',
    });
    expect(response.payload).toMatchObject({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Beklenmeyen bir hata olustu',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: '/exports/request',
      timestamp: anyString,
    });
  });

  it('handles non-HttpException errors as internal server error', () => {
    const { host, response } = createHost('/unknown', 'GET');
    const exception = new Error('boom');

    filter.catch(exception, host);

    expect(captureUnhandledException).toHaveBeenCalledWith(exception, {
      path: '/unknown',
      method: 'GET',
    });
    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.payload).toMatchObject({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Beklenmeyen bir hata olustu.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: '/unknown',
      timestamp: anyString,
    });
  });
});

function createHost(
  url: string,
  method: string,
  initialHeaders?: Record<string, string>,
) {
  const headerMap = new Map<string, string>();

  for (const [name, value] of Object.entries(initialHeaders ?? {})) {
    headerMap.set(name.toLowerCase(), value);
  }

  const response: MockResponse = {
    statusCode: null,
    payload: null,
    getHeader: (name: string) => headerMap.get(name.toLowerCase()),
    setHeader: (name: string, value: string) => {
      headerMap.set(name.toLowerCase(), value);
    },
    status: (code: number) => {
      response.statusCode = code;
      return response;
    },
    json: (body: unknown) => {
      response.payload = body;
      return response;
    },
  };

  const request = {
    url,
    method,
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return {
    host,
    response,
  };
}
