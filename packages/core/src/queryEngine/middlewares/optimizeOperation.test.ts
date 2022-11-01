import { createLogger } from '../../logger';
import { optimizeOperation } from './optimizeOperation';
import { getTestQueryEngine } from '../../../test/testQueryEngine';
import { operationToRequest } from '../../../test/utils';
import { MiddlewareContext } from './middleware';

let context: Pick<MiddlewareContext, 'queryEngine' | 'logger'>;

const findArticlesQuery = `
query findArticles(
  $where: ArticleWhereInput
  $orderBy: [ArticleOrderByWithRelationInput]
  $cursor: ArticleWhereUniqueInput
  $take: Int
  $skip: Int
  $distinct: [ArticleScalarFieldEnum]
) {
  findManyArticle(
    where: $where
    orderBy: $orderBy
    cursor: $cursor
    take: $take
    skip: $skip
    distinct: $distinct
  ) {
    id
    url
    title
    subtitle
    publication
    claps
  }
}`;
const findArticleByIdQuery = `
query findArticle(
  $id: Int!
) {
  findUniqueArticle(
    where: { id: $id }
  ) {
    id
    url
    title
    subtitle
    publication
    claps
  }
}`;

describe('optimizeOperation middleware', () => {
  beforeEach(() => {
    context = {
      queryEngine: getTestQueryEngine(),
      logger: createLogger({ name: 'test' }),
    };
  });

  it.each([
    [findArticlesQuery, { where: { title: { contains: 'Something' } } }],
    [findArticlesQuery, { where: { title: { contains: 'Something' } }, order: null, cursor: null }],
    [findArticlesQuery, { where: { title: { contains: 'Something' } }, order: null, skip: 1 }],
    // TODO: Variables are only partially supported. You can only pass entire input vars
    [findArticleByIdQuery, { id: 1 }],
  ])('inlines operation variables and removes variable definitions', async (query, variables) => {
    const next = jest.fn();

    await optimizeOperation(
      {
        ...context,
        request: operationToRequest(query, variables),
      },
      next,
    );

    expect(next).toHaveBeenCalled();

    const modifiedRequest = (next.mock.calls[0][0] as MiddlewareContext).request;
    expect(modifiedRequest).toMatchSnapshot();
  });

  it('inlines fragment and removes fragment definition', async () => {
    const next = jest.fn();

    await optimizeOperation(
      {
        ...context,
        request: operationToRequest(
          `
          fragment ArticleFragment on Article {
            id
            url
            title
            subtitle
            publication
            claps
          }
          query findAll {
            findManyArticle {
              ...ArticleFragment
            }
          }
          `,
        ),
      },
      next,
    );

    expect(next).toHaveBeenCalled();

    const modifiedRequest = (next.mock.calls[0][0] as MiddlewareContext).request;
    expect(modifiedRequest).toMatchSnapshot();
  });
});
