import { Request } from '../src';
import { operationToRequest } from './utils';

/**
 * A valid query that can be used when it does matter.
 */
export const testQuery = `
query TestQuery {
  findManyArticle { id }
}
`;

/**
 * The ID of the first article created manually via createArticle operation.
 * Number depends on how many articles are already in the migration seed.
 */
export const testArticleId = 4;
export const createArticle = (
  data: Record<string, unknown> = {
    data: {
      claps: 100,
      responses: 50,
      readingTime: 365,
      url: 'https://example.com',
      title: 'Example article',
      subtitle: 'An example exciting article',
      publication: 'That One Site',
    },
  },
): Request =>
  operationToRequest(
    `
    mutation createArticle(
      $data: ArticleCreateInput!
    ) {
      createOneArticle(
        data: $data
      ) {
        id
        url
        title
        subtitle
        publication
        claps
        responses
      }
    }`,
    data,
    'CreateArticle',
  );

export const findArticle = (id = 1): Request =>
  operationToRequest(
    `
    query findArticle(
      $where: ArticleWhereUniqueInput!
    ) {
      findUniqueArticle(
        where: $where
      ) {
        id
        url
        title
        subtitle
        publication
        claps
        responses
      }
    }
    `,
    { where: { id } },
    'FindArticle',
  );
