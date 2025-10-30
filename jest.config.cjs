module.exports = {
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    testEnvironment: 'jsdom',
    // Preserve setupFilesAfterEnv that was previously declared in package.json
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"]
};
