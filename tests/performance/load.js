import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Shop up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
};

export default function () {
  const res = http.get('http://localhost:5000/api/v1/');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
