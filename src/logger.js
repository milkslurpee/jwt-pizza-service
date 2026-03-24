const config = require('./config');

// If logging config is missing (e.g., during tests), provide a mock logger
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
  // Real logger – require here to avoid loading the package when mocked
  const Logger = require('pizza-logger');

  // Adapt config to the structure expected by the logger package
  const adaptedConfig = {
    logging: {
      source: config.logging.source,
      url: config.logging.endpointUrl,       // package uses `url`, not `endpointUrl`
      userId: config.logging.accountId,      // package uses `userId`, not `accountId`
      apiKey: config.logging.apiKey,
    },
    factory: config.factory,                 // already contains `url` and `apiKey`
  };

  const logger = new Logger(adaptedConfig);
  module.exports = logger;
}