import * as Sentry from '@sentry/node';

let isSentryInitialized = false;

export function initializeSentry(dsn: string | undefined) {
  if (!dsn || isSentryInitialized) {
    return false;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 0,
  });

  isSentryInitialized = true;

  return true;
}

export function captureUnhandledException(
  exception: unknown,
  context?: { path?: string; method?: string },
) {
  if (!isSentryInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.path) {
      scope.setTag('path', context.path);
    }

    if (context?.method) {
      scope.setTag('method', context.method);
    }

    Sentry.captureException(exception);
  });
}
