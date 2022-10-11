import http from 'k6/http';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
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
    'http_req_duration': ['p(99)<1500'], // 99% of requests must complete below 1.5s
    http_req_failed: ['rate<0.01']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'count'],
};

const start = () => {
  const randomFirstName = randomString(8);
  const params = { headers: { 'content-type': 'application/json', accept: 'application/json' }}
  const res = http.post(`${baseUrl}/writer`, JSON.stringify({
    query: `mutation CreateUser {createOneUser(data: { name: "${randomFirstName}", email: "${randomFirstName}@example.com" }) { id name }}`,
    operationName: "CreateUser"
  }), params)
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  check(res, {
      'verify body': (r) =>
          r.body ? r.body.includes(randomFirstName) : false,
  });

};

export default start;
