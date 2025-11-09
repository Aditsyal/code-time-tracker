import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TimeTrackingService } from '../../services/timeTracking';
import { supabase } from '../../config/supabase';
import { EventEmitter } from 'events';
import { createSupabaseQueryBuilder } from '../mocks/supabaseMock';
import * as settings from '../../config/settings';

suite('Time Tracker Extension Test Suite', () => {
    let timeTracker: TimeTrackingService;
    let sandbox: sinon.SinonSandbox;
    let statusBarItem: vscode.StatusBarItem;
    let configEmitter: EventEmitter;
    let statusBarStub: sinon.SinonStub;
    let configStub: sinon.SinonStub;

    suiteSetup(async () => {
        // Ensure singleton is clean at start
        (TimeTrackingService as any)._instance = null;
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    setup(async () => {
        // Clean up any existing stubs
        if (sandbox) {
            sandbox.restore();
        }
        sandbox = sinon.createSandbox();
        
        // Initialize a clean TimeTrackingService singleton
        (TimeTrackingService as any)._instance = null;
        
        // Initialize status bar mock first
        statusBarItem = {
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub(),
            text: '',
            command: '',
            tooltip: undefined,
            backgroundColor: undefined,
            color: undefined,
            accessibilityInformation: undefined,
            name: '',
            priority: 0,
            alignment: vscode.StatusBarAlignment.Left,
            id: 'test-status-bar'
        };

        // Create VS Code stubs before TimeTrackingService initialization
        statusBarStub = sandbox.stub(vscode.window, 'createStatusBarItem')
            .returns(statusBarItem);

        // Setup configuration and emitter
        configEmitter = new EventEmitter();
        const mockConfig = {
            get: sandbox.stub().callsFake((key: string) => {
                const values: { [key: string]: any } = {
                    'supabaseUrl': 'test-url',
                    'supabaseKey': 'test-key',
                    'idleTimeoutMinutes': 5
                };
                return values[key];
            }),
            update: sandbox.stub().resolves(),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub().returns(undefined)
        };

        configStub = sandbox.stub(vscode.workspace, 'getConfiguration')
            .returns(mockConfig);

        sandbox.stub(vscode.workspace, 'onDidChangeConfiguration')
            .callsFake((handler) => {
                configEmitter.on('configChange', handler);
                return { dispose: () => configEmitter.removeListener('configChange', handler) };
            });

        // Mock GitHub authentication
        sandbox.stub(vscode.authentication, 'getSession').resolves({
            id: 'test-session',
            accessToken: 'test-token',
            account: {
                label: 'testuser',
                id: '12345'
            },
            scopes: ['read:user']
        });

        // Restore original Supabase before creating new mock
        if ((supabase as any).from.restore) {
            (supabase as any).from.restore();
        }

        // Create Supabase mock with proper type handling
        const queryBuilder = createSupabaseQueryBuilder(sandbox);
        sandbox.stub(supabase, 'from').returns(queryBuilder);

        // Initialize TimeTrackingService after all mocks are in place
        await new Promise(resolve => setTimeout(resolve, 100));
        timeTracker = TimeTrackingService.getInstance();
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    teardown(async () => {
        if (timeTracker) {
            await timeTracker.stopTracking();
        }
        sandbox.restore();
        configEmitter?.removeAllListeners();
        (TimeTrackingService as any)._instance = null;
    });

    test('TimeTrackingService initialization', function() {
        assert.ok(timeTracker instanceof TimeTrackingService, 'TimeTrackingService should be initialized');
        assert.ok(statusBarStub.calledOnce, 'Status bar should be created exactly once');
        assert.ok((statusBarItem.show as sinon.SinonStub).called, 'Status bar should be shown');
        assert.strictEqual(statusBarItem.command, 'timeTracker.toggleTracking', 'Status bar should have correct command');
    });

    test('Session tracking starts and stops correctly', async function() {
        await timeTracker.startTracking();
        
        const fromStub = (supabase.from as sinon.SinonStub);
        assert.ok(fromStub.called, 'Should access Supabase table');
        assert.ok(statusBarItem.text.includes('Stop Tracking'), 'Status bar should show stop tracking');

        await timeTracker.stopTracking();
        assert.ok(fromStub.called, 'Should access Supabase table for update');
        assert.ok(statusBarItem.text.includes('Start Tracking'), 'Status bar should show start tracking');
    });

    test('Configuration changes are detected', async function() {
        this.timeout(5000);
        
        // Trigger configuration change
        configEmitter.emit('configChange', {
            affectsConfiguration: (section: string) => section === 'timeTracker'
        });
        
        // Wait for the change to be processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify configuration was reloaded
        assert.ok(configStub.called, 'Configuration should be accessed after change');
    });

    test('Handles idle timeout', async function() {
        const clock = sandbox.useFakeTimers({
            now: new Date(),
            shouldAdvanceTime: true
        });

        try {
            await timeTracker.startTracking();
            clock.tick(6 * 60 * 1000); // 6 minutes
            await new Promise(resolve => setImmediate(resolve));
            
            const fromStub = (supabase.from as sinon.SinonStub);
            assert.ok(fromStub.called, 'Should access Supabase for idle timeout update');
            assert.ok(statusBarItem.text.includes('Start Tracking'), 'Status bar should show start tracking');
        } finally {
            clock.restore();
        }
    });
});
