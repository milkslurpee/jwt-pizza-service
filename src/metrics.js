const config = require('./config');
const os = require('os');

// In‑memory counters
let httpCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
let totalRequestLatency = 0;
let requestCount = 0;

let authSuccess = 0, authFailure = 0;
let pizzaSold = 0;
let pizzaFailed = 0;
let pizzaRevenue = 0;
let pizzaLatencyTotal = 0;
let pizzaLatencyCount = 0;

let activeUsers = new Set();

function getSystemMetrics() {
  return {
    cpu: (os.loadavg()[0] / os.cpus().length) * 100,
    mem: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
  };
}

function requestTracker(req, res, next) {
  const method = req.method;
  if (method in httpCounts) httpCounts[method]++;

  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    totalRequestLatency += latency;
    requestCount++;
  });

  next();
}

function recordAuthAttempt(success) {
  success ? authSuccess++ : authFailure++;
}

function recordPizzaPurchase(success, latencyMs, revenue, pizzasCount = 1) {
  if (success) {
    pizzaSold += pizzasCount;
    pizzaRevenue += revenue;
  } else {
    pizzaFailed++;
  }
  pizzaLatencyTotal += latencyMs;
  pizzaLatencyCount++;
}

function recordActiveUser(userId) {
  activeUsers.add(userId);
}

function buildPayload() {
  const ts = Date.now() * 1_000_000;
  const source = config.metrics.source;
  const streams = [];

  const addMetric = (metric, value, extraLabels = {}) => {
    if (value !== 0) {
      streams.push({
        stream: { source, metric, ...extraLabels },
        values: [[ts, value.toString()]],
      });
    }
  };

  for (const [method, count] of Object.entries(httpCounts)) {
    addMetric('http_requests', count, { method });
  }

  if (requestCount > 0) {
    addMetric('request_latency_avg_ms', totalRequestLatency / requestCount);
  }

  addMetric('auth_attempts', authSuccess, { result: 'success' });
  addMetric('auth_attempts', authFailure, { result: 'failure' });

  addMetric('pizza_sold', pizzaSold);
  addMetric('pizza_failed', pizzaFailed);
  addMetric('pizza_revenue', pizzaRevenue);
  if (pizzaLatencyCount > 0) {
    addMetric('pizza_latency_avg_ms', pizzaLatencyTotal / pizzaLatencyCount);
  }

  const sys = getSystemMetrics();
  addMetric('system_cpu_percent', sys.cpu);
  addMetric('system_memory_percent', sys.mem);

  addMetric('active_users', activeUsers.size);

  return { streams };
}

async function sendMetrics() {
  const payload = buildPayload();
  if (payload.streams.length === 0) return;

  const { endpointUrl, accountId, apiKey } = config.metrics;
  const auth = Buffer.from(`${accountId}:${apiKey}`).toString('base64');

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      httpCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
      totalRequestLatency = 0;
      requestCount = 0;
      authSuccess = 0;
      authFailure = 0;
      pizzaSold = 0;
      pizzaFailed = 0;
      pizzaRevenue = 0;
      pizzaLatencyTotal = 0;
      pizzaLatencyCount = 0;
      activeUsers.clear();
    } else {
      console.error('Metrics send failed', await res.text());
    }
  } catch (err) {
    console.error('Metrics error', err);
  }
}

function startMetricsReporting(intervalSec = 15) {
  setInterval(sendMetrics, intervalSec * 1000);
}

module.exports = {
  requestTracker,
  recordAuthAttempt,
  recordPizzaPurchase,
  recordActiveUser,
  startMetricsReporting,
};