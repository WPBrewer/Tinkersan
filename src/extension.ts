import * as vscode from 'vscode';
import { TinkerPanel } from './TinkerPanel';
import { PhpExecutor } from './PhpExecutor';
// Import frameworks to register them
import './frameworks';
import { loadCustomBootstrappers } from './frameworks';
import { TinkerResultsProvider } from './TinkerResultsProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Tinkersan is now active!');
    const phpExecutor = new PhpExecutor();
    
    // Initialize the results provider
    const resultsProvider = TinkerResultsProvider.getInstance();
    resultsProvider.registerWebviewProvider(context);
    
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

        // Show the results panel and indicate processing
        resultsProvider.showResult('Running code...');

        try {
            const code = editor.document.getText();
            const result = await phpExecutor.execute(code);
            resultsProvider.showResult(result);
        } catch (error: any) {
            resultsProvider.showError(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(
        newFileCommand,
        runCommand
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