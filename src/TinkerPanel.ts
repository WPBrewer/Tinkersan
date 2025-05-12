import * as vscode from 'vscode';
import { PhpExecutor } from './PhpExecutor';
import * as path from 'path';
import * as fs from 'fs';
import { TinkerResultsProvider } from './TinkerResultsProvider';

export class TinkerPanel {
    public static currentPanel: TinkerPanel | undefined;
    private editor: vscode.TextEditor | undefined;
    private phpExecutor: PhpExecutor;
    private resultsProvider: TinkerResultsProvider;
    private disposables: vscode.Disposable[] = [];

    private constructor() {
        this.phpExecutor = new PhpExecutor();
        this.resultsProvider = TinkerResultsProvider.getInstance();
    }

    public static async createOrShow() {
        if (TinkerPanel.currentPanel) {
            TinkerPanel.currentPanel.resultsProvider.show();
            return;
        }

        const panel = new TinkerPanel();
        TinkerPanel.currentPanel = panel;

        // Create a new PHP file in .tinkersan
        const projectPath = panel.phpExecutor.getProjectPath();
        const tinkerPath = path.join(projectPath, '.tinkersan');
        if (!fs.existsSync(tinkerPath)) {
            fs.mkdirSync(tinkerPath, { recursive: true });
        }

        const fileName = `tinker-${Date.now()}.php`;
        const filePath = path.join(tinkerPath, fileName);
        
        // Get current framework for comment
        const config = vscode.workspace.getConfiguration('tinkersan');
        const framework = config.get<string>('framework') || 'auto';
        
        // Create starter PHP file with framework comment
        fs.writeFileSync(filePath, `<?php
/**
 * Framework: ${framework}
 * Created: ${new Date().toISOString()}
 */

// Your PHP code here
`);

        // Open the file in editor
        const document = await vscode.workspace.openTextDocument(filePath);
        panel.editor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.One,
            preview: false
        });

        // Show results panel
        panel.resultsProvider.show();

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
        this.resultsProvider.clear();
        this.resultsProvider.showResult('Running code...');

        try {
            const result = await this.phpExecutor.execute(code);
            this.resultsProvider.showResult(result);
        } catch (error: any) {
            this.resultsProvider.showError(`Error: ${error.message}`);
        }
    }

    public dispose() {
        TinkerPanel.currentPanel = undefined;
        this.disposables.forEach(d => d.dispose());
    }
} 