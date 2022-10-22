import { mock } from 'jest-mock-extended';
import { QueryEngine } from '../src';
import { testSchema, testSchemaSdl } from './testSchema';

export const getTestQueryEngine = (): jest.Mocked<QueryEngine> => {
  const queryEngine = mock<QueryEngine>();
  queryEngine.getSdl.mockResolvedValue(testSchemaSdl);
  queryEngine.getSchema.mockResolvedValue(testSchema);
  return queryEngine;
};
