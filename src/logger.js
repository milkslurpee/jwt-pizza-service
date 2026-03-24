
const config = require('./config');

if (!config.logging || !config.logging.endpointUrl || !config.logging.apiKey) {
  // Mock logger for tests (does nothing but prevents errors)
  module.exports = {
    httpLogger: (req, res, next) => next(),
    dbLogger: () => {},
    factoryLogger: () => {},
    unhandledErrorLogger: () => {},
    log: () => {},
    error: () => {},
  };
} else {

  const { Logger } = require('pizza-logger');

  const logger = new Logger({
    component: config.logging.source,
    endpointUrl: config.logging.endpointUrl,
    accountId: config.logging.accountId,
    apiKey: config.logging.apiKey,
  });

  module.exports = logger;

}