import http from 'k6/http';
import { check } from 'k6';

// eslint-disable-next-line no-undef
const baseUrl = __ENV.URL;

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
  const params = { headers: { 'content-type': 'application/json', accept: 'application/json' }}
  const res = http.post(`${baseUrl}/reader`, JSON.stringify({
    query: `query GetUsers {\n  findManyUser(take: 1000) {\n\t\tid\n\t\temail\n\t\tname\n\t}\n}`,
    operationName: "GetUsers"
  }), params)
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  check(res, {
      'verify body': (r) =>
          r.body ? r.body.includes('example.com') : false,
  });

};

export default start;