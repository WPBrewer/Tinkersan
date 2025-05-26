import * as vscode from 'vscode';
import { TinkerPanel } from './TinkerPanel';
import { PhpExecutor } from './PhpExecutor';
// Import frameworks to register them
import './frameworks';
import { loadCustomBootstrappers } from './frameworks';
import { WordPressDetector } from './utils/WordPressDetector';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Tinkersan is now active!');
    const phpExecutor = new PhpExecutor();
    const outputChannel = vscode.window.createOutputChannel('Tinkersan');
    
    // Add status bar indicator with current framework
    const frameworkIndicator = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );
    updateFrameworkIndicator(frameworkIndicator);
    frameworkIndicator.show();
    context.subscriptions.push(frameworkIndicator);
    
    // Watch for configuration changes to update the framework indicator
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('tinkersan.framework')) {
                updateFrameworkIndicator(frameworkIndicator);
            }
            
            // Reload custom bootstrappers when configuration changes
            if (e.affectsConfiguration('tinkersan.customBootstrappers')) {
                loadCustomBootstrappers();
                vscode.window.showInformationMessage('Tinkersan custom bootstrappers reloaded');
            }
        })
    );

    // Register New File command
    let newFileCommand = vscode.commands.registerCommand('tinkersan.newFile', async () => {
        try {
            await TinkerPanel.createOrShow();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create new file: ${error.message}`);
        }
    });

    // Register Run command
    let runCommand = vscode.commands.registerCommand('tinkersan.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        if (editor.document.languageId !== 'php') {
            vscode.window.showInformationMessage('Not a PHP file');
            return;
        }

        outputChannel.clear();
        outputChannel.show(true);
        outputChannel.appendLine('Running code...\n');

        try {
            const code = editor.document.getText();
            const result = await phpExecutor.execute(code);
            outputChannel.clear();
            outputChannel.appendLine(result);
        } catch (error: any) {
            outputChannel.appendLine(`Error: ${error.message}`);
        }
    });

    // Register Create Config command
    let createConfigCommand = vscode.commands.registerCommand('tinkersan.createConfig', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Create config in .tinkersan folder
        const tinkersanDir = path.join(workspaceFolders[0].uri.fsPath, '.tinkersan');
        const configPath = path.join(tinkersanDir, '.tinkersan.json');
        
        // Check if config already exists
        if (require('fs').existsSync(configPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                'Config file already exists. Overwrite?',
                'Yes',
                'No'
            );
            if (overwrite !== 'Yes') {
                return;
            }
        }

        try {
            WordPressDetector.createSampleConfig(configPath);
            
            // Open the config file
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('Created .tinkersan/.tinkersan.json config file');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create config: ${error.message}`);
        }
    });

    // Register Show Debug Log command
    let showDebugLogCommand = vscode.commands.registerCommand('tinkersan.showDebugLog', () => {
        WordPressDetector.showDebugOutput();
        
        // Also trigger a detection to populate the log
        const detectedPath = WordPressDetector.autoDetectWordPressRoot();
        if (detectedPath) {
            vscode.window.showInformationMessage(`Current WordPress root: ${detectedPath}`);
        } else {
            vscode.window.showWarningMessage('No WordPress installation detected');
        }
    });

    // Register debug command for multiple WordPress detection
    const debugMultipleWpCommand = vscode.commands.registerCommand('tinkersan.debugMultipleWordPress', async () => {
        try {
            const { WordPressDetector } = await import('./utils/WordPressDetector');
            
            // Enable verbose logging temporarily
            const config = vscode.workspace.getConfiguration('tinkersan');
            const originalVerbose = config.get<boolean>('verboseLogging', false);
            await config.update('verboseLogging', true, vscode.ConfigurationTarget.Workspace);
            
            // Show debug output
            WordPressDetector.showDebugOutput();
            
            // Test both detection methods
            const allRoots = WordPressDetector.findAllWordPressRoots();
            const contextRoot = WordPressDetector.autoDetectWordPressRootForCurrentContext();
            
            const message = `
=== Multiple WordPress Detection Debug ===

All WordPress installations found:
${allRoots.map((root, index) => `${index + 1}. ${root}`).join('\n')}

Context-aware detection result:
${contextRoot || 'None detected'}

Current active file:
${vscode.window.activeTextEditor?.document.uri.fsPath || 'No active file'}

Check the "Tinkersan Debug" output channel for detailed logs.
`;

            vscode.window.showInformationMessage('Debug info generated. Check output channel.', 'Show Output').then(selection => {
                if (selection === 'Show Output') {
                    WordPressDetector.showDebugOutput();
                }
            });

            // Also show in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: message,
                language: 'plaintext'
            });
            await vscode.window.showTextDocument(doc);
            
            // Restore original verbose setting
            await config.update('verboseLogging', originalVerbose, vscode.ConfigurationTarget.Workspace);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Debug failed: ${error}`);
        }
    });

    context.subscriptions.push(
        newFileCommand,
        runCommand,
        createConfigCommand,
        showDebugLogCommand,
        debugMultipleWpCommand,
        outputChannel
    );
}

function updateFrameworkIndicator(statusBarItem: vscode.StatusBarItem) {
    const config = vscode.workspace.getConfiguration('tinkersan');
    const framework = config.get<string>('framework') || 'auto';
    
    if (framework === 'auto') {
        statusBarItem.text = '$(sync) PHP [Auto]';
        statusBarItem.tooltip = 'Tinkersan: Auto-detect framework';
    } else {
        statusBarItem.text = `$(code) PHP [${framework}]`;
        statusBarItem.tooltip = `Tinkersan: Using ${framework} framework`;
    }
    
    statusBarItem.command = 'workbench.action.openSettings';
}

export function deactivate() {} 