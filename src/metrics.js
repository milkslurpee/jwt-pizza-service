const config = require('./config');
const os = require('os');

let httpCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
let totalRequestLatency = 0;
let requestCount = 0;

let authSuccess = 0, authFailure = 0;
let pizzaSold = 0;
let pizzaFailed = 0;
let pizzaRevenue = 0;
let pizzaLatencyTotal = 0;
let pizzaLatencyCount = 0;

let activeUsersSet = new Set();

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
    totalRequestLatency += Date.now() - start;
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
  activeUsersSet.add(userId);
}

function buildPayload() {
  const ts = Date.now() * 1_000_000;
  const source = config.metrics.source;

  const dataPoint = (value) => ({
    asDouble: value,
    timeUnixNano: ts,
    attributes: [{ key: 'source', value: { stringValue: source } }],
  });

  const scopeMetrics = {
    scope: {},
    metrics: [],
  };

  for (const [method, count] of Object.entries(httpCounts)) {
    if (count > 0) {
      scopeMetrics.metrics.push({
        name: 'http_requests_total',
        unit: '1',
        sum: {
          dataPoints: [{
            ...dataPoint(count),
            attributes: [
              { key: 'source', value: { stringValue: source } },
              { key: 'method', value: { stringValue: method } },
            ],
          }],
          aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
          isMonotonic: true,
        },
      });
    }
  }

  if (requestCount > 0) {
    scopeMetrics.metrics.push({
      name: 'request_latency_avg',
      unit: 'ms',
      gauge: {
        dataPoints: [dataPoint(totalRequestLatency / requestCount)],
      },
    });
  }

  if (authSuccess > 0) {
    scopeMetrics.metrics.push({
      name: 'auth_attempts_total',
      unit: '1',
      sum: {
        dataPoints: [{
          ...dataPoint(authSuccess),
          attributes: [
            { key: 'source', value: { stringValue: source } },
            { key: 'result', value: { stringValue: 'success' } },
          ],
        }],
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
      },
    });
  }
  if (authFailure > 0) {
    scopeMetrics.metrics.push({
      name: 'auth_attempts_total',
      unit: '1',
      sum: {
        dataPoints: [{
          ...dataPoint(authFailure),
          attributes: [
            { key: 'source', value: { stringValue: source } },
            { key: 'result', value: { stringValue: 'failure' } },
          ],
        }],
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
      },
    });
  }

  if (pizzaSold > 0) {
    scopeMetrics.metrics.push({
      name: 'pizza_sold_total',
      unit: '1',
      sum: {
        dataPoints: [dataPoint(pizzaSold)],
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
      },
    });
  }

  if (pizzaFailed > 0) {
    scopeMetrics.metrics.push({
      name: 'pizza_failed_total',
      unit: '1',
      sum: {
        dataPoints: [dataPoint(pizzaFailed)],
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
      },
    });
  }

  if (pizzaRevenue > 0) {
    scopeMetrics.metrics.push({
      name: 'pizza_revenue_total',
      unit: '1',
      sum: {
        dataPoints: [dataPoint(pizzaRevenue)],
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
      },
    });
  }

  if (pizzaLatencyCount > 0) {
    scopeMetrics.metrics.push({
      name: 'pizza_latency_avg',
      unit: 'ms',
      gauge: {
        dataPoints: [dataPoint(pizzaLatencyTotal / pizzaLatencyCount)],
      },
    });
  }

  const sys = getSystemMetrics();
  scopeMetrics.metrics.push({
    name: 'system_cpu_percent',
    unit: '%',
    gauge: { dataPoints: [dataPoint(sys.cpu)] },
  });
  scopeMetrics.metrics.push({
    name: 'system_memory_percent',
    unit: '%',
    gauge: { dataPoints: [dataPoint(sys.mem)] },
  });

  scopeMetrics.metrics.push({
    name: 'active_users',
    unit: '1',
    gauge: { dataPoints: [dataPoint(activeUsersSet.size)] },
  });

  return {
    resourceMetrics: [
      {
        resource: {},
        scopeMetrics: [scopeMetrics],
      },
    ],
  };
}

async function sendMetrics() {
  const payload = buildPayload();
  if (payload.resourceMetrics[0].scopeMetrics[0].metrics.length === 0) return;

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

    if (!res.ok) {
      console.error('Metrics send failed', await res.text());
    } else {
      activeUsersSet.clear();
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