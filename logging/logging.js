const winston = require('winston');

const { combine, timestamp, label, printf } = winston.format;

const myFormat = printf(info => {
  return `${info.timestamp} ${info.level.toUpperCase()} [${info.module}] ${info.message}`;
});

const loggerConf = {
    level: 'info',
    format: combine(
        timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        myFormat
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: '/var/log/gisapi.log' }), // for production use
        // new winston.transports.Console() // for development use
    ],
}

const logger = winston.createLogger(loggerConf);

module.exports = logger;