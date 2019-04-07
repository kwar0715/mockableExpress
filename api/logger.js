const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

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
 * Configure log file and rotation
 *
 * @type {module:winston-daily-rotate-file.DailyRotateFile | DailyRotateFileTransportInstance}
 */
const appRotationFile = new transports.DailyRotateFile({
  filename: "./logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "info"
});

/**
 * Configure error log file and rotation
 *
 * @type {module:winston-daily-rotate-file.DailyRotateFile | DailyRotateFileTransportInstance}
 */
const errorRotationFile = new transports.DailyRotateFile({
  filename: "./logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "error"
});

/**
 * Create logger with necessary configurations
 *
 * @type {winston.Logger}
 */
const logger = createLogger({
  format: combine(label({ label: env }), timestamp(), customLogFormat),
  transports: [new transports.Console(), appRotationFile, errorRotationFile]
});

module.exports = logger;
