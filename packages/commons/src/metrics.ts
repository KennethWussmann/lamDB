import { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricUnits } from '@aws-lambda-powertools/metrics/lib/types';

export const metricsEnabled = process.env.ENABLE_METRICS?.toLowerCase() === 'true';
export const metrics = new Metrics();

export enum MetricName {
  READ_OPERATIONS = 'ReadOperations',
  WRITE_OPERATIONS = 'WriteOperations',
  OPERATION_ERRORS = 'OperationErrors',
  READ_THROUGHPUT = 'ReadThroughput',
  WRITE_THROUGHPUT = 'WriteThroughput',
  READ_LATENCY = 'ReadLatency',
  WRITE_LATENCY = 'WriteLatency',
  DATABASE_SIZE = 'DatabaseSize',
  MIGRATIONS_APPLIED = 'MigrationsApplied',
}

export type MetricOperationType = 'read' | 'write';
export type MetricOperationTypeName = 'operations' | 'throughput' | 'latency';

const metricOperationTypeMapping: Record<MetricOperationType, Record<MetricOperationTypeName, MetricName>> = {
  read: {
    operations: MetricName.READ_OPERATIONS,
    throughput: MetricName.READ_THROUGHPUT,
    latency: MetricName.READ_LATENCY,
  },
  write: {
    operations: MetricName.WRITE_OPERATIONS,
    throughput: MetricName.WRITE_THROUGHPUT,
    latency: MetricName.WRITE_LATENCY,
  },
};

export const getMetricName = (type: MetricOperationType, name: MetricOperationTypeName) =>
  metricOperationTypeMapping[type][name];

const writeMetric = (name: MetricName, unit: MetricUnits, value: number) => {
  if (!metricsEnabled) {
    return;
  }
  metrics.addMetric(name, unit, value);
};

export const publishMetrics = () => {
  if (!metricsEnabled) {
    return;
  }
  metrics.publishStoredMetrics();
};

export const writeErrorMetric = () => writeMetric(MetricName.OPERATION_ERRORS, MetricUnits.Count, 1);

export const writeMigrationsAppliedMetric = (count: number) =>
  writeMetric(MetricName.MIGRATIONS_APPLIED, MetricUnits.Count, count);

export const writeLatencyMetric = (type: MetricOperationType, latencyMs: number) =>
  writeMetric(getMetricName(type, 'latency'), MetricUnits.Milliseconds, latencyMs);

export const writeDatabaseSizeMetric = (bytes: number) =>
  writeMetric(MetricName.DATABASE_SIZE, MetricUnits.Bytes, bytes);

export const writeThroughputMetric = (type: MetricOperationType, bytes: number) =>
  writeMetric(getMetricName(type, 'throughput'), MetricUnits.Bytes, bytes);

export const writeOperationsMetric = (type: MetricOperationType) =>
  writeMetric(getMetricName(type, 'operations'), MetricUnits.Count, 1);
