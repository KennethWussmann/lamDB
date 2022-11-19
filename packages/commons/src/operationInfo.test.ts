import { getOperationInfo } from './operationInfo';
import { Request } from './requestResponse';

describe('OperationInfo', () => {
  it('returns operation info for query', () => {
    const request: Request = {
      method: 'POST',
      body: JSON.stringify({
        operationName: 'TestQuery',
        variables: {},
        query:
          'query findArticles {  findManyArticle(where: {title: {contains: "Something"}}) {    id    url    title    subtitle    publication    claps  }}',
      }),
    };

    const response = getOperationInfo(request);

    expect(response).toMatchObject({
      hash: '46c7d8ac1f3608dbf86ba216788b78194cdd9964',
      name: 'TestQuery',
      type: 'query',
    });
  });
  it('returns operation info for mutation', () => {
    const request: Request = {
      method: 'POST',
      body: JSON.stringify({
        operationName: 'TestMutation',
        variables: {},
        query:
          'mutation createArticle($data: ArticleCreateInput!) {  createOneArticle(    data: $data  ) {    id    url    title    subtitle    publication    claps  }}',
      }),
    };

    const response = getOperationInfo(request);

    expect(response).toMatchObject({
      hash: '5d43ab88c9d529ef7ec451effa80fe04c424a4f8',
      name: 'TestMutation',
      type: 'mutation',
    });
  });
  it('returns undefined for empty body', () => {
    const request: Request = {
      method: 'POST',
      body: undefined,
    };

    const response = getOperationInfo(request);

    expect(response).toBeUndefined();
  });
  it('returns undefined for invalid json body', () => {
    const request: Request = {
      method: 'POST',
      body: 'not json',
    };

    const response = getOperationInfo(request);

    expect(response).toBeUndefined();
  });
  it('throws error when query did not contain operations', () => {
    const request: Request = {
      method: 'POST',
      body: JSON.stringify({
        operationName: 'Test',
        variables: {},
        query: 'fragment Test on Something { id }',
      }),
    };

    expect(() => getOperationInfo(request)).toThrow('Document does not include operation nodes');
  });
  it('throws error when query contains multiple operations', () => {
    const request: Request = {
      method: 'POST',
      body: JSON.stringify({
        operationName: 'Test',
        variables: {},
        query: 'query Test { id } query Test2 { id }',
      }),
    };

    expect(() => getOperationInfo(request)).toThrow(
      'Document includes multiple operation nodes: Only one is supported',
    );
  });
});
