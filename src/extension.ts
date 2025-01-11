import * as vscode from 'vscode';
import { TinkerPanel } from './TinkerPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('TinkerWP is now active!');

    let disposable = vscode.commands.registerCommand('tinkerwp.openEditor', () => {
        TinkerPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {} 