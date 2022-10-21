import { GraphQLClient } from 'graphql-request';
import { getSdk } from './sdk';

(async () => {
  const client = new GraphQLClient('', {
    headers: {
      Authorization: '',
    },
  });
  const sdk = getSdk(client);

  const user = await sdk.createUser({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });
  const users = await sdk.users();

  console.log(user, users);
})();
