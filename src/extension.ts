import * as vscode from 'vscode';
import { TinkerPanel } from './TinkerPanel';
import { PhpExecutor } from './PhpExecutor';
// Import frameworks to register them
import './frameworks';

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
            outputChannel.appendLine(result);
        } catch (error: any) {
            outputChannel.appendLine(`Error: ${error.message}`);
        }
    });

    // Register Save Snippet command
    let saveSnippetCommand = vscode.commands.registerCommand('tinkersan.saveSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        if (editor.document.languageId !== 'php') {
            vscode.window.showInformationMessage('Not a PHP file');
            return;
        }

        try {
            const code = editor.document.getText();
            await phpExecutor.saveAsSnippet(code);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to save snippet: ${error.message}`);
        }
    });

    // Register Load Snippet command
    let loadSnippetCommand = vscode.commands.registerCommand('tinkersan.loadSnippet', async () => {
        try {
            const code = await phpExecutor.loadSnippet();
            if (code) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    // Insert at current cursor position
                    const position = editor.selection.active;
                    await editor.edit(editBuilder => {
                        editBuilder.insert(position, code);
                    });
                } else {
                    // If no editor is active, create new file
                    await TinkerPanel.createOrShow();
                    const newEditor = vscode.window.activeTextEditor;
                    if (newEditor) {
                        await newEditor.edit(editBuilder => {
                            const fullText = newEditor.document.getText();
                            const startPosition = newEditor.document.positionAt(
                                fullText.indexOf('// Your PHP code here')
                            );
                            const endPosition = newEditor.document.positionAt(
                                fullText.indexOf('// Your PHP code here') + '// Your PHP code here'.length
                            );
                            editBuilder.replace(new vscode.Range(startPosition, endPosition), code);
                        });
                    }
                }
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load snippet: ${error.message}`);
        }
    });

    // Register Save Selection as Snippet command
    let saveSelectionCommand = vscode.commands.registerCommand('tinkersan.saveSelectionAsSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        if (editor.document.languageId !== 'php') {
            vscode.window.showInformationMessage('Not a PHP file');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('No code selected');
            return;
        }

        try {
            const selectedCode = editor.document.getText(selection);
            await phpExecutor.saveAsSnippet(selectedCode);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to save snippet: ${error.message}`);
        }
    });

    context.subscriptions.push(
        newFileCommand,
        runCommand,
        saveSnippetCommand,
        loadSnippetCommand,
        saveSelectionCommand,
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