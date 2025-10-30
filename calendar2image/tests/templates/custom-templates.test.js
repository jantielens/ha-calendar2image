/**
 * Integration tests for custom templates
 * These tests verify that custom templates work correctly with the TEMPLATES_DIR environment variable
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Custom Templates Integration', () => {
  const testTemplatesDir = path.join(__dirname, 'fixtures');
  const testScript = path.join(__dirname, 'custom-template-runner.js');
  
  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testTemplatesDir)) {
      fs.mkdirSync(testTemplatesDir, { recursive: true });
    }
    
    // Create a test runner script that loads the template module with correct env var
    const runnerScript = `
const path = require('path');
const fs = require('fs');

// Set env var BEFORE loading the module
process.env.TEMPLATES_DIR = process.argv[2];

const { loadTemplate, renderTemplate } = require('${path.join(__dirname, '..', '..', 'src', 'templates').replace(/\\/g, '\\\\')}');

const action = process.argv[3];
const templateName = process.argv[4];

try {
  if (action === 'load') {
    const template = loadTemplate(templateName);
    const html = template({ events: [], config: {} });
    console.log('SUCCESS:', html);
  } else if (action === 'render') {
    const events = JSON.parse(process.argv[5] || '[]');
    const config = JSON.parse(process.argv[6] || '{}');
    renderTemplate(templateName, { events, config }).then(html => {
      console.log('SUCCESS:', html);
    }).catch(err => {
      console.error('ERROR:', err.message);
      process.exit(1);
    });
  }
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
`;
    fs.writeFileSync(testScript, runnerScript);
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(testScript)) {
      fs.unlinkSync(testScript);
    }
    if (fs.existsSync(testTemplatesDir)) {
      const files = fs.readdirSync(testTemplatesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testTemplatesDir, file));
      });
      fs.rmdirSync(testTemplatesDir);
    }
  });

  afterEach(() => {
    // Clean up template files after each test
    if (fs.existsSync(testTemplatesDir)) {
      const files = fs.readdirSync(testTemplatesDir);
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(testTemplatesDir, file));
        } catch (err) {
          // Ignore
        }
      });
    }
  });

  test('should load and execute custom template from TEMPLATES_DIR', () => {
    // Create a custom template
    const customTemplate = `
      module.exports = function(data) {
        return '<html><body>Custom Template Works!</body></html>';
      };
    `;
    fs.writeFileSync(path.join(testTemplatesDir, 'test-custom.js'), customTemplate);

    // Run the test script with the custom templates directory
    const result = execSync(`node "${testScript}" "${testTemplatesDir}" load test-custom`, {
      encoding: 'utf-8'
    });

    expect(result).toContain('SUCCESS:');
    expect(result).toContain('Custom Template Works!');
  });

  test('should prioritize custom template over built-in', () => {
    // Create a custom template with the same name as a built-in
    const customTemplate = `
      module.exports = function(data) {
        return '<html><body>Custom Week View Override</body></html>';
      };
    `;
    fs.writeFileSync(path.join(testTemplatesDir, 'week-view.js'), customTemplate);

    const result = execSync(`node "${testScript}" "${testTemplatesDir}" load week-view`, {
      encoding: 'utf-8'
    });

    expect(result).toContain('SUCCESS:');
    expect(result).toContain('Custom Week View Override');
    // Verify it's using the custom template, not the built-in one
    // The built-in has specific CSS classes that the custom one doesn't have
    expect(result).not.toContain('calendar-title');
  });

  test('should render custom template with event data', () => {
    const customTemplate = `
      module.exports = function(data) {
        const { events = [] } = data;
        return \`<html><body>Events: \${events.length}</body></html>\`;
      };
    `;
    fs.writeFileSync(path.join(testTemplatesDir, 'test-events.js'), customTemplate);

    const events = JSON.stringify([
      { title: 'Event 1', start: new Date().toISOString(), end: new Date().toISOString() },
      { title: 'Event 2', start: new Date().toISOString(), end: new Date().toISOString() }
    ]);

    const result = execSync(
      `node "${testScript}" "${testTemplatesDir}" render test-events "${events.replace(/"/g, '\\"')}" "{}"`,
      { encoding: 'utf-8' }
    );

    expect(result).toContain('SUCCESS:');
    expect(result).toContain('Events: 2');
  });

  test('should fail gracefully for non-existent custom template', () => {
    expect(() => {
      execSync(`node "${testScript}" "${testTemplatesDir}" load non-existent-template`, {
        encoding: 'utf-8'
      });
    }).toThrow();
  });

  test('should fail if custom template does not export a function', () => {
    const invalidTemplate = `
      module.exports = {
        render: function() {
          return '<html></html>';
        }
      };
    `;
    fs.writeFileSync(path.join(testTemplatesDir, 'invalid.js'), invalidTemplate);

    expect(() => {
      execSync(`node "${testScript}" "${testTemplatesDir}" load invalid`, {
        encoding: 'utf-8'
      });
    }).toThrow(/must export a function/);
  });
});
