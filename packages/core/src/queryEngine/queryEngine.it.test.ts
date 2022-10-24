import { databasePath, prismaSchemaPath, queryEnginePath } from '../../test/binaryPaths';
import { initDatabase } from '../../test/initDatabase';
import { createArticle, findArticle, testArticleId } from '../../test/testOperation';
import { QueryEngine } from './queryEngine';

const engine = new QueryEngine({
  libraryPath: queryEnginePath,
  databaseFilePath: databasePath,
  prismaSchemaPath: prismaSchemaPath,
});

describe('queryEngine', () => {
  beforeEach(initDatabase);

  it('creates mutation successfully and finds created entity', async () => {
    const mutationResponse = await engine.execute(createArticle());
    expect(mutationResponse).toMatchSnapshot();

    const queryResponse = await engine.execute(findArticle(testArticleId));
    expect(queryResponse).toMatchSnapshot();
  });

  it('returns SDL correctly', async () => {
    expect(await engine.getSdl()).toMatchSnapshot();
  });

  it('returns GraphQL schema correctly', async () => {
    expect(await engine.getSchema()).toMatchSnapshot();
  });
});
