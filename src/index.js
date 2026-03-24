const app = require('./service.js');
const metrics = require('./metrics');
const logger = require('./logger');

const port = process.argv[2] || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  metrics.startMetricsReporting(5);
});

process.on('uncaughtException', (err) => {
  logger.unhandledErrorLogger(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.unhandledErrorLogger(err);
});