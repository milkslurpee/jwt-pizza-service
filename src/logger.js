const config = require('./config');

if (process.env.NODE_ENV === 'test' || !config.logging || !config.logging.endpointUrl || !config.logging.apiKey) {
  module.exports = {
    httpLogger: (req, res, next) => next(),
    dbLogger: () => {},
    factoryLogger: () => {},
    unhandledErrorLogger: () => {},
    log: () => {},
    error: () => {},
  };
} else {
  const Logger = require('pizza-logger');
  const adaptedConfig = {
    logging: {
      source: config.logging.source,
      url: config.logging.endpointUrl,
      userId: config.logging.accountId,
      apiKey: config.logging.apiKey,
    },
    factory: config.factory,
  };
  const logger = new Logger(adaptedConfig);
  module.exports = logger;
}