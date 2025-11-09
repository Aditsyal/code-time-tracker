import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

async function runTestFiles(patterns: string[]): Promise<number> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 15000, // Increased timeout for slower test environments
        retries: 2 // Allow retries for flaky tests
    });

    const testsRoot = path.resolve(__dirname, '..');
    
    try {
        // Find all test files matching any of the patterns
        const filePromises = patterns.map(pattern => 
            glob(pattern, { cwd: testsRoot })
        );
        const fileArrays = await Promise.all(filePromises);
        const files = fileArrays.flat();
        
        // Add files to the test suite
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        // Run the tests
        return new Promise((resolve, reject) => {
            try {
                mocha.run((failures: number) => {
                    resolve(failures);
                });
            } catch (err) {
                console.error(err);
                reject(err);
            }
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export async function run(): Promise<void> {
    try {
        // Run unit tests first
        console.log('Running unit tests...');
        const unitFailures = await runTestFiles(['suite/**/*.test.js']);
        
        if (unitFailures > 0) {
            throw new Error(`${unitFailures} unit tests failed.`);
        }

        // Then run integration tests
        console.log('Running integration tests...');
        const integrationFailures = await runTestFiles(['integration/**/*.test.js']);
        
        if (integrationFailures > 0) {
            throw new Error(`${integrationFailures} integration tests failed.`);
        }

        if (unitFailures === 0 && integrationFailures === 0) {
            console.log('All tests passed successfully!');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}
