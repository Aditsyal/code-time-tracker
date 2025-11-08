import * as assert from 'assert';
import * as vscode from 'vscode';
import * as mocha from 'mocha';
import { TimeTrackingService } from '../services/timeTracking';
import { AuthenticationService } from '../services/authentication';

suite('Time Tracker Extension Test Suite', () => {
	vscode.window.showInformationMessage('Starting test suite');

	test('Time Tracking Service Initialization', () => {
		const service = TimeTrackingService.getInstance();
		assert.ok(service, 'TimeTrackingService should be initialized');
	});

	test('Authentication Service Initialization', () => {
		 const authService = AuthenticationService.getInstance();
		assert.ok(authService, 'AuthenticationService should be initialized');
	});

	test('Configuration Loading', () => {
		const config = vscode.workspace.getConfiguration('timeTracker');
		assert.ok(config, 'Configuration should be loaded');
	});

	test('Commands Registration', async () => {
		const commands = await vscode.commands.getCommands();
		assert.ok(commands.includes('code-time-tracker.login'), 'Login command should be registered');
		assert.ok(commands.includes('code-time-tracker.startTracking'), 'Start tracking command should be registered');
		assert.ok(commands.includes('code-time-tracker.stopTracking'), 'Stop tracking command should be registered');
		assert.ok(commands.includes('code-time-tracker.showDashboard'), 'Show dashboard command should be registered');
	});
});
