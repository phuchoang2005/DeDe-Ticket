import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const EVENT_ID = __ENV.EVENT_ID || '1';
const VUS = Number(__ENV.VUS || 20);
const RAMP_DURATION = __ENV.RAMP_DURATION || '30s';
const HOLD_DURATION = __ENV.HOLD_DURATION || '1m';
const P95_MS = Number(__ENV.P95_MS || 800);
const ERROR_RATE = Number(__ENV.ERROR_RATE || 0.001);

export const options = {
  scenarios: {
    browse_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP_DURATION, target: VUS },
        { duration: HOLD_DURATION, target: VUS },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{type:user}': [`p(95)<${P95_MS}`],
    http_req_failed: [`rate<${ERROR_RATE}`],
  },
};

export default function () {
  group('Scenario A - browse-only baseline', () => {
    const params = { tags: { type: 'user' } };

    const events = http.get(`${BASE_URL}/v1/events?limit=10`, params);
    check(events, {
      'events list returns 200': (res) => res.status === 200,
      'events list has data array': (res) => Array.isArray(res.json('data')),
    });

    const detail = http.get(`${BASE_URL}/v1/events/${EVENT_ID}`, params);
    check(detail, {
      'event detail returns 200': (res) => res.status === 200,
      'event detail has id': (res) => String(res.json('id')) === String(EVENT_ID),
    });

    const seats = http.get(`${BASE_URL}/v1/events/${EVENT_ID}/seats`, params);
    check(seats, {
      'seat map returns 200': (res) => res.status === 200,
      'seat map has seats array': (res) => Array.isArray(res.json('seats')),
    });
  });

  sleep(Math.random() * 2);
}
