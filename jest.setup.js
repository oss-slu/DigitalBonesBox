// The jest.setup.js file is a setup script that runs before any test files execute.
// We are manually triggering the DOMContentLoaded event.

global.TextEncoder = require("util").TextEncoder;

beforeAll(() => {
  document.dispatchEvent(new Event("DOMContentLoaded"));
});