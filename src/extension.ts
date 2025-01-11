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

    // Register Save Snippet command
    let saveSnippetCommand = vscode.commands.registerCommand('tinkerwp.saveSnippet', async () => {
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
    let loadSnippetCommand = vscode.commands.registerCommand('tinkerwp.loadSnippet', async () => {
        try {
            const code = await phpExecutor.loadSnippet();
            if (code) {
                // Create a new file with the snippet
                await TinkerPanel.createOrShow();
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await editor.edit(editBuilder => {
                        const fullText = editor.document.getText();
                        const fullRange = new vscode.Range(
                            editor.document.positionAt(0),
                            editor.document.positionAt(fullText.length)
                        );
                        editBuilder.replace(fullRange, `<?php\n\n${code}`);
                    });
                }
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load snippet: ${error.message}`);
        }
    });

    context.subscriptions.push(
        newFileCommand,
        runCommand,
        saveSnippetCommand,
        loadSnippetCommand,
        outputChannel
    );
}

export function deactivate() {} 