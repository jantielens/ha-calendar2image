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
    expandRecurringFrom: {
      type: 'number',
      default: -31
    },
    expandRecurringTo: {
      type: 'number',
      default: 31
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
    expandRecurringFrom: config.expandRecurringFrom !== undefined ? config.expandRecurringFrom : -31,
    expandRecurringTo: config.expandRecurringTo !== undefined ? config.expandRecurringTo : 31
  };
}

module.exports = {
  configSchema,
  validateConfig,
  applyDefaults
};
