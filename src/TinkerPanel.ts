import * as vscode from 'vscode';
import { PhpExecutor } from './PhpExecutor';
import * as path from 'path';
import * as fs from 'fs';

export class TinkerPanel {
    public static currentPanel: TinkerPanel | undefined;
    private editor: vscode.TextEditor | undefined;
    private outputChannel: vscode.OutputChannel;
    private phpExecutor: PhpExecutor;
    private disposables: vscode.Disposable[] = [];

    private constructor() {
        this.phpExecutor = new PhpExecutor();
        this.outputChannel = vscode.window.createOutputChannel('Tinkersan');
    }

    public static async createOrShow() {
        if (TinkerPanel.currentPanel) {
            TinkerPanel.currentPanel.outputChannel.show();
            return;
        }

        const panel = new TinkerPanel();
        TinkerPanel.currentPanel = panel;

        // Create a new PHP file in .tinkersan
        const wpPath = panel.phpExecutor.getWordPressPath();
        const tinkerPath = path.join(wpPath, '.tinkersan');
        if (!fs.existsSync(tinkerPath)) {
            fs.mkdirSync(tinkerPath, { recursive: true });
        }

        const fileName = `tinker-${Date.now()}.php`;
        const filePath = path.join(tinkerPath, fileName);
        fs.writeFileSync(filePath, '<?php\n\n// Your PHP code here\n');

        // Open the file in editor
        const document = await vscode.workspace.openTextDocument(filePath);
        panel.editor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.One,
            preview: false
        });

        // Show output channel
        panel.outputChannel.show(true);

        // Add status bar item
        const runButton = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        runButton.text = '$(play) Run PHP';
        runButton.tooltip = 'Run PHP code (⌘+Enter)';
        runButton.command = 'tinkersan.run';
        runButton.show();
        panel.disposables.push(runButton);

        // Register keyboard shortcut
        panel.disposables.push(
            vscode.commands.registerCommand('tinkersan.runShortcut', () => {
                if (panel.editor && panel.editor.document.languageId === 'php') {
                    panel.runCode();
                }
            })
        );
    }

    public async runCode() {
        if (!this.editor) {
            return;
        }

        const code = this.editor.document.getText();
        this.outputChannel.clear();
        this.outputChannel.appendLine('Running code...\n');

        try {
            const result = await this.phpExecutor.execute(code);
            this.outputChannel.appendLine(result);
        } catch (error: any) {
            this.outputChannel.appendLine(`Error: ${error.message}`);
        }
    }

    public dispose() {
        TinkerPanel.currentPanel = undefined;
        this.outputChannel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
} 