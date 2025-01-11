import * as vscode from 'vscode';
import { TinkerPanel } from './TinkerPanel';
import { PhpExecutor } from './PhpExecutor';

export function activate(context: vscode.ExtensionContext) {
    console.log('TinkerWP is now active!');
    const phpExecutor = new PhpExecutor();
    const outputChannel = vscode.window.createOutputChannel('TinkerWP');

    // Register New File command
    let newFileCommand = vscode.commands.registerCommand('tinkerwp.newFile', async () => {
        try {
            await TinkerPanel.createOrShow();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create new file: ${error.message}`);
        }
    });

    // Register Run command
    let runCommand = vscode.commands.registerCommand('tinkerwp.run', async () => {
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

    context.subscriptions.push(newFileCommand, runCommand, outputChannel);
}

export function deactivate() {} 