// The jest.setup.js file is a setup script that runs before any test files execute.
// We are manually triggering the DOMContentLoaded event.

beforeAll(() => {
  document.dispatchEvent(new Event("DOMContentLoaded"));
});