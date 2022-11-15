// istanbul ignore file
import { createLogger as createWinstonLogger, format } from 'winston';
import { Console } from 'winston/lib/winston/transports';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const createLogger = (
  meta: Record<string, unknown> | undefined = undefined,
  logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info',
) =>
  createWinstonLogger({
    level: logLevel,
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: meta,
    transports: [new Console()],
  });
