import * as sinon from 'sinon';

export const createVSCodeMock = (sandbox: sinon.SinonSandbox) => ({
    window: {
        createStatusBarItem: sandbox.stub().returns({
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub(),
            text: '',
            command: ''
        }),
        showInformationMessage: sandbox.stub(),
        showErrorMessage: sandbox.stub(),
        createWebviewPanel: sandbox.stub().returns({
            webview: {
                html: '',
                onDidReceiveMessage: sandbox.stub()
            },
            onDidDispose: sandbox.stub(),
            reveal: sandbox.stub(),
            dispose: sandbox.stub()
        })
    },
    workspace: {
        name: 'Test Workspace',
        getConfiguration: sandbox.stub().returns({
            get: (key: string) => {
                const config: { [key: string]: any } = {
                    'timeTracker.supabaseUrl': 'test-url',
                    'timeTracker.supabaseKey': 'test-key',
                    'timeTracker.idleTimeoutMinutes': 5
                };
                return config[`timeTracker.${key}`];
            }
        }),
        onDidChangeConfiguration: sandbox.stub()
    },
    authentication: {
        getSession: sandbox.stub().resolves({
            id: 'test-session',
            accessToken: 'test-token',
            account: {
                label: 'testuser',
                id: '12345'
            }
        })
    },
    commands: {
        registerCommand: sandbox.stub(),
        executeCommand: sandbox.stub()
    }
});
