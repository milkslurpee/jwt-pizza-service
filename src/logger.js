const { Logger } = require('pizza-logger');
const config = require('./config');

const logger = new Logger({
  component: config.logging.source,
  endpointUrl: config.logging.endpointUrl,
  accountId: config.logging.accountId,
  apiKey: config.logging.apiKey,
});

module.exports = logger;