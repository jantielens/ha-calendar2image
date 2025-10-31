const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });

/**
 * JSON schema for calendar configuration
 */
const configSchema = {
  type: 'object',
  properties: {
    icsUrl: {
      type: 'string',
      minLength: 1,
      pattern: '^https?://'
    },
    template: {
      type: 'string',
      minLength: 1
    },
    width: {
      type: 'number',
      minimum: 100,
      maximum: 4096,
      default: 800
    },
    height: {
      type: 'number',
      minimum: 100,
      maximum: 4096,
      default: 600
    },
    grayscale: {
      type: 'boolean',
      default: false
    },
    bitDepth: {
      type: 'number',
      minimum: 1,
      maximum: 32,
      default: 8
    },
    imageType: {
      type: 'string',
      enum: ['jpg', 'png', 'bmp'],
      default: 'png'
    },
    rotate: {
      type: 'number',
      enum: [0, 90, 180, 270],
      default: 0
    },
    expandRecurringFrom: {
      type: 'number',
      default: -31
    },
    expandRecurringTo: {
      type: 'number',
      default: 31
    },
    preGenerateInterval: {
      type: 'string',
      description: 'Cron expression for pre-generation scheduling (e.g., "*/5 * * * *" for every 5 minutes)',
      pattern: '^\\S+\\s+\\S+\\s+\\S+\\s+\\S+\\s+\\S+(\\s+\\S+)?$'
    },
    locale: {
      type: 'string',
      description: 'BCP 47 locale code for date/time formatting (e.g., "en-US", "de-DE", "fr-FR")',
      pattern: '^[a-z]{2,3}(-[A-Z]{2})?$',
      default: 'en-US'
    },
    timezone: {
      type: 'string',
      description: 'IANA timezone name to convert event times (e.g., "Europe/Berlin", "America/New_York")'
    },
    extraDataUrl: {
      type: 'string',
      description: 'URL to fetch additional JSON data for templates (e.g., weather, holidays)',
      pattern: '^https?://'
    },
    extraDataCacheTtl: {
      type: 'number',
      description: 'Cache TTL in seconds for extra data (default: 300)',
      minimum: 0,
      default: 300
    },
    extraDataHeaders: {
      type: 'object',
      description: 'HTTP headers for extra data request (e.g., Authorization for Home Assistant)',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['icsUrl', 'template'],
  additionalProperties: false
};

/**
 * Validates a configuration object against the schema
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: Array }
 */
function validateConfig(config) {
  const validate = ajv.compile(configSchema);
  const valid = validate(config);

  return {
    valid,
    errors: validate.errors || []
  };
}

/**
 * Applies default values to a configuration object
 * @param {Object} config - Configuration object
 * @returns {Object} Configuration with defaults applied
 */
function applyDefaults(config) {
  return {
    ...config,
    width: config.width !== undefined ? config.width : 800,
    height: config.height !== undefined ? config.height : 600,
    grayscale: config.grayscale !== undefined ? config.grayscale : false,
    bitDepth: config.bitDepth !== undefined ? config.bitDepth : 8,
    imageType: config.imageType || 'png',
    rotate: config.rotate !== undefined ? config.rotate : 0,
    expandRecurringFrom: config.expandRecurringFrom !== undefined ? config.expandRecurringFrom : -31,
    expandRecurringTo: config.expandRecurringTo !== undefined ? config.expandRecurringTo : 31,
    locale: config.locale || 'en-US',
    extraDataCacheTtl: config.extraDataCacheTtl !== undefined ? config.extraDataCacheTtl : 300
  };
}

module.exports = {
  configSchema,
  validateConfig,
  applyDefaults
};
