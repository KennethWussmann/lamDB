import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Logger } from 'winston';
import { createLogger } from './logger';

/**
 * Wrapper around a subprocess that monitors it's health, detects crashes and restarts and manages graceful shutdowns
 */
export class ChildProcessMonitor {
  private logger: Logger = createLogger({ name: `${this.processName}-Monitor` });
  private running = false;
  private process: ChildProcessWithoutNullStreams | undefined;
  private awaitingStop = false;
  private ready = false;

  constructor(
    private processName: string,
    private binaryPath: string,
    private args: string[] = [],
    private env: Record<string, string> = {},
    private continous: boolean = true,
    private determineReadiness: (level: string, message: string) => boolean = () => true,
    private logTransform: (level: string, message: string) => [string, unknown] = (level, message) => [level, message],
  ) {}

  /**
   * Check if process process is running.
   * May still be unresponsive during init.
   * @returns Wether the process process is running.
   */
  isRunning = () => this.running;

  isReady = () => this.ready;

  setReady = (ready: boolean) => {
    if (!this.isRunning()) {
      throw new Error('Cannot set ready state, when it has not been started');
    }
    this.ready = ready;
  };

  /**
   * Start the process subprocess.
   * @param maxRestarts How often the process will try to restart once crashed
   * @param startTry First try
   * @returns exit code
   */
  start = (maxRestarts = 3, startTry = 1): Promise<number | undefined> => {
    if (this.running) {
      throw new Error('process already running');
    }
    this.running = true;

    return new Promise((resolve, reject) => {
      this.awaitingStop = false;
      this.logger.info('Starting process', { binary: this.binaryPath, args: this.args });
      this.process = spawn(this.binaryPath, this.args, {
        env: {
          ...process.env,
          ...this.env,
        },
      });

      const handleOutput = (originalLevel: string) => (data: any) => {
        if (data?.length <= 1) {
          return;
        }
        const logMessage = new String(data).trim();
        if (this.determineReadiness(originalLevel, logMessage)) {
          this.logger.debug('Process was detected ready');
          this.ready = true;
        }
        const [level, message] = this.logTransform(originalLevel, logMessage);
        this.logger.log(level, message);
      };

      this.process.stdout.on('data', handleOutput('info'));
      this.process.stderr.on('data', handleOutput('error'));
      this.process.on('close', (code) => {
        this.reset();

        if (!this.continous) {
          // if the process is not expected to run long, just return it's exit code and be done with it
          resolve(code ?? undefined);
          return;
        }

        if (this.awaitingStop) {
          this.logger.info('Process was stopped and exited', { code });
          resolve(code ?? undefined);
        } else {
          if (startTry > maxRestarts) {
            this.logger.error('Failed to restart process', { code });
            reject(code ?? undefined);
            return;
          }

          this.logger.error('Process has crashed and exited. Attempting restart.', { code, try: startTry });

          this.start(maxRestarts, startTry + 1)
            .then(resolve)
            .catch(reject);
        }
      });
      process.on('SIGINT', this.stop);
      process.on('SIGTERM', this.stop);
    });
  };

  /**
   * Start process if not running and wait until it's ready to receive requests
   */
  initialize = async (
    onStop: (exitCode: number | undefined) => void = () => {
      // no op
    },
  ) => {
    if (!this.isRunning()) {
      this.logger.info('Starting process');
      this.start().then(onStop).catch(onStop);
      await this.awaitReady();
    } else {
      this.logger.info('Process is running already');
    }
  };

  /**
   * Reset the local process state and stop the subprocess
   */
  stop = () => {
    this.awaitingStop = true;
    this.process?.kill();
    this.reset();
  };

  /**
   * Wait until the subprocess is ready to receive requests
   * @returns When the subprocess is ready
   */
  awaitReady = (): Promise<void> => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.ready) {
          resolve();
          clearInterval(interval);
        }
      }, 5);
    });
  };

  /**
   * Reset local state so the process can be started again after a stop.
   */
  private reset = () => {
    this.running = false;
    this.ready = false;
    this.process = undefined;
  };
}
