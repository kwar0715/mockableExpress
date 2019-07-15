const { createLogger, format, transports } = require("winston");

const { combine, timestamp, label, printf } = format;
const env = "LOCAL";

/**
 * Create custom log format
 */
const customLogFormat = printf(info => {
  return JSON.stringify({
    time: info.timestamp,
    env: info.label,
    level: info.level,
    message: info.message,
    charCount: info.message.length
  });
});

/**
 * Create logger with necessary configurations
 *
 * @type {winston.Logger}
 */
const logger = createLogger({
  format: combine(label({ label: env }), timestamp(), customLogFormat),
  transports: [new transports.Console()]
});

module.exports = logger;
