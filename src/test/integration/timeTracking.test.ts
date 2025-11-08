import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TimeTrackingService } from '../../services/timeTracking';
import { supabase } from '../../config/supabase';
import { createSupabaseQueryBuilder } from '../mocks/supabaseMock';

suite('Time Tracker Integration Tests', () => {
    let timeTracker: TimeTrackingService;
    let sandbox: sinon.SinonSandbox;

    suiteSetup(async () => {
        sandbox = sinon.createSandbox();

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

        // Mock Supabase
        const queryBuilder = createSupabaseQueryBuilder(sandbox);
        sandbox.stub(supabase, 'from').returns(queryBuilder);

        // Wait for extension to activate
        await vscode.extensions.getExtension('your-publisher.code-time-tracker')?.activate();
        timeTracker = TimeTrackingService.getInstance();

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    suiteTeardown(async () => {
        if (timeTracker) {
            await timeTracker.stopTracking();
        }
        sandbox.restore();
    });

    setup(async () => {
        // Reset service state before each test
        await timeTracker.stopTracking();
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('Complete tracking flow', async function() {
        this.timeout(10000); // 10 second timeout for integration test

        // Start tracking
        await timeTracker.startTracking();

        // Simulate some activity
        const doc = await vscode.workspace.openTextDocument({ content: 'test content' });
        const editor = await vscode.window.showTextDocument(doc);
        await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), 'some new content\n');
        });

        // Wait a bit to record some time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Stop tracking
        await timeTracker.stopTracking();

        // Verify data in Supabase
        const { data, error } = await supabase
            .from('sessions')
            .select()
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        assert.ok(!error, 'Should not have error fetching session');
        assert.ok(data, 'Should have session data');
        assert.ok(data.start_time, 'Should have start time');
        assert.ok(data.end_time, 'Should have end time');
        assert.ok(data.duration > 0, 'Should have positive duration');
    });

    test('GitHub authentication flow', async function() {
        this.timeout(5000);

        // Verify authentication works
        const session = await vscode.authentication.getSession(
            'github', 
            ['read:user'], 
            { createIfNone: true }
        );

        assert.ok(session, 'Should have valid GitHub session');
        assert.ok(session.accessToken, 'Should have access token');
        assert.ok(session.account, 'Should have account info');
        assert.strictEqual(session.account.id, '12345', 'Should have correct user ID');
    });

    test('Idle detection', async function() {
        this.timeout(10000);

        // Start tracking
        await timeTracker.startTracking();

        // Wait for idle timeout
        await new Promise(resolve => setTimeout(resolve, 6000));

        // Verify tracking was stopped
        const { data } = await supabase
            .from('sessions')
            .select()
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        assert.ok(data.end_time, 'Session should be ended due to idle timeout');
    });
});
