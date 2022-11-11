import http from 'k6/http';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2s', target: 10 },
    { duration: '2s', target: 25 },
    { duration: '5s', target: 50 },
    { duration: '10s', target: 100 },
    { duration: '10s', target: 150 },
    { duration: '10s', target: 200 },
    { duration: '10s', target: 500 },
  ],
  thresholds: {
    'http_req_duration': ['p(99)<1500'], // 99% of requests must complete below 1.5s
    http_req_failed: ['rate<0.01']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'count'],
};

const start = () => {
  const randomPostName = randomString(8);
  const params = { 
    headers: { 'content-type': 'application/json', accept: 'application/json'}
  }
  const createResponse = http.post(`http://149.248.192.15/graphql`, JSON.stringify({
    query: `
    mutation {
      createOnePost(data:{
        title: "${randomPostName}"
        author: {
          connectOrCreate:{
            where:{
              id: 1
            },
            create: {
              email: "test@example.de",
              name: "Test",
              profile: { 
                connectOrCreate: {
                  where: {
                    id:1
                  },
                  create: {
                    bio: "My bio"
                  }
                }
              }
            }
          }
        }
      }) {
        id
        createdAt
        updatedAt
        title
        content
        published
        authorId
        author {
          id
          name
          profile {
            id
            bio
          }
        }
      }
    }
    `,
  }), params)
  check(createResponse, {
    'is status 200': (r) => r.status === 200,
  });
  check(createResponse, {
      'verify body': (r) =>
          r.body ? r.body.includes(randomPostName) : false,
  });
  const findResponse = http.post(`http://149.248.192.15/graphql`, JSON.stringify({
    query: `
    query {
      findFirstPost (where:{
        title: {
          equals: "${randomPostName}"
        }
      }) {
        id
        title
      }
    }
    `,
  }), params)
  check(findResponse, {
    'is status 200': (r) => r.status === 200,
  });
  check(findResponse, {
      'verify body': (r) =>
          r.body ? r.body.includes(randomPostName) : false,
  });

};

export default start;
