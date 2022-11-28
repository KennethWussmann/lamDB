import http from 'k6/http';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check } from 'k6';

// eslint-disable-next-line no-undef
const baseUrl = __ENV.URL;
// eslint-disable-next-line no-undef
const apiToken = __ENV.API_TOKEN;

export const options = {
  stages: [
    { duration: '10s', target: 200 },
    //{ duration: '10s', target: 400 },
    //{ duration: '10s', target: 600 },
    //{ duration: '10s', target: 800 },
    //{ duration: '10s', target: 1000 },
  ],
  thresholds: {
    'http_req_duration': ['p(99)<1700'], // 99% of requests must complete below 1.7s
    http_req_failed: ['rate<0.01']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)', 'count'],
};

const start = () => {
  const randomArticleName = randomString(8);
  const params = { 
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: apiToken }
  }
  const res = http.post(`${baseUrl}/graphql`, JSON.stringify({
    query: `
    mutation createArticle {
      createOneArticle(data: {
        claps: 100,
        readingTime: 365,
        url: "https://example.com",
        title: "${randomArticleName}"
        subtitle: "An example exciting article",
        publication: "That One Site"
      }) {
        id
        url
        title
        subtitle
        publication
        claps
      }
    }
    `,
    operationName: "createArticle",
  }), params)
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  check(res, {
      'verify body': (r) =>
          r.body ? r.body.includes(randomArticleName) : false,
  });
};

export default start;