/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'mjs'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/ui/**/*.js', // UI files require DOM, tested separately
        '!src/main.js',    // Connector requires Trello SDK (browser global)
    ],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
    },
    coverageReporters: ['text', 'text-summary', 'html'],
    verbose: true,
};
