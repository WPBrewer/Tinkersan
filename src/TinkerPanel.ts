import * as vscode from 'vscode';

export class TinkerPanel {
    public static currentPanel: TinkerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getWebviewContent();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'runCode':
                        // TODO: Implement code running
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (TinkerPanel.currentPanel) {
            TinkerPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'tinkerPhp',
            'TinkerWP',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        TinkerPanel.currentPanel = new TinkerPanel(panel, extensionUri);
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TinkerWP</title>
            <style>
                body {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    margin: 0;
                    padding: 10px;
                }
                #editor {
                    height: 70%;
                    width: 100%;
                    border: 1px solid var(--vscode-editor-lineHighlightBorder);
                    margin-bottom: 10px;
                }
                #output {
                    height: 30%;
                    width: 100%;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editor-lineHighlightBorder);
                    color: var(--vscode-editor-foreground);
                    padding: 10px;
                    font-family: monospace;
                    overflow: auto;
                }
                .toolbar {
                    padding: 10px 0;
                    display: flex;
                    gap: 10px;
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <button id="run">Run Code (⌘+Enter)</button>
                <button id="save">Save</button>
                <button id="clear">Clear Output</button>
            </div>
            <div id="editor"></div>
            <div id="output"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs/loader.js"></script>
            <script>
                require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs' }});
                require(['vs/editor/editor.main'], function() {
                    const editor = monaco.editor.create(document.getElementById('editor'), {
                        value: '<?php\\n\\n// Your PHP code here\\n',
                        language: 'php',
                        theme: 'vs-dark',
                        minimap: { enabled: false }
                    });

                    document.getElementById('run').addEventListener('click', () => {
                        const code = editor.getValue();
                        vscode.postMessage({
                            command: 'runCode',
                            code: code
                        });
                    });

                    // Add keyboard shortcut
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                        document.getElementById('run').click();
                    });
                });
            </script>
        </body>
        </html>`;
    }

    public dispose() {
        TinkerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
} 