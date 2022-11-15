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
});
