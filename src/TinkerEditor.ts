import * as vscode from 'vscode';
import * as path from 'path';
import { PhpExecutor } from './PhpExecutor';

export class TinkerEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new TinkerEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(TinkerEditorProvider.viewType, provider);
    }

    private static readonly viewType = 'tinkersan.editor';
    private readonly phpExecutor: PhpExecutor;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.phpExecutor = new PhpExecutor();
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'monaco-editor', 'min'))
            ]
        };

        // Load Monaco Editor
        const monacoHtml = this.getMonacoHtml(webviewPanel.webview, document);
        webviewPanel.webview.html = monacoHtml;

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'execute':
                    try {
                        const result = await this.phpExecutor.execute(e.code);
                        webviewPanel.webview.postMessage({ type: 'output', value: result });
                    } catch (error: any) {
                        webviewPanel.webview.postMessage({ type: 'error', value: error.message });
                    }
                    break;
            }
        });

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webviewPanel.webview.postMessage({ type: 'update', value: document.getText() });
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private getMonacoHtml(webview: vscode.Webview, document: vscode.TextDocument): string {
        const monacoBase = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'monaco-editor', 'min'))
        );

        return /* html */ `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tinkersan</title>
                <style>
                    body {
                        padding: 0;
                        margin: 0;
                        width: 100%;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    #toolbar {
                        padding: 8px;
                        display: flex;
                        gap: 8px;
                    }
                    #editor {
                        flex: 1;
                        border-top: 1px solid var(--vscode-editorWidget-border);
                    }
                    #output {
                        height: 150px;
                        border-top: 1px solid var(--vscode-editorWidget-border);
                        padding: 8px;
                        overflow: auto;
                        font-family: var(--vscode-editor-font-family);
                        white-space: pre-wrap;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 4px 12px;
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div id="toolbar">
                    <button id="run">Run (⌘+Enter)</button>
                    <button id="clear">Clear Output</button>
                </div>
                <div id="editor"></div>
                <div id="output"></div>
                
                <script src="${monacoBase}/vs/loader.js"></script>
                <script>
                    const vscode = acquireVsCodeApi();
                    let editor;
                    
                    require.config({ paths: { vs: '${monacoBase}/vs' } });
                    require(['vs/editor/editor.main'], () => {
                        // Register PHP language features
                        monaco.languages.register({ id: 'php' });
                        
                        // Create editor
                        editor = monaco.editor.create(document.getElementById('editor'), {
                            value: ${JSON.stringify(document.getText())},
                            language: 'php',
                            theme: 'vs-dark',
                            automaticLayout: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false
                        });

                        // Add WordPress completions
                        monaco.languages.registerCompletionItemProvider('php', {
                            provideCompletionItems: () => ({
                                suggestions: [
                                    {
                                        label: 'get_post',
                                        kind: monaco.languages.CompletionItemKind.Function,
                                        insertText: 'get_post(${1:$post_id})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Get post data given a post ID or post object'
                                    },
                                    {
                                        label: 'wc_get_order',
                                        kind: monaco.languages.CompletionItemKind.Function,
                                        insertText: 'wc_get_order(${1:$order_id})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Get WooCommerce order object'
                                    },
                                    // Add more WordPress/WooCommerce functions here
                                ]
                            })
                        });

                        // Run button
                        document.getElementById('run').addEventListener('click', () => {
                            const code = editor.getValue();
                            vscode.postMessage({ type: 'execute', code });
                        });

                        // Clear button
                        document.getElementById('clear').addEventListener('click', () => {
                            document.getElementById('output').textContent = '';
                        });

                        // Keyboard shortcut
                        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                            document.getElementById('run').click();
                        });
                    });

                    // Handle messages
                    window.addEventListener('message', event => {
                        const message = event.data;
                        const output = document.getElementById('output');

                        switch (message.type) {
                            case 'update':
                                if (editor) {
                                    const position = editor.getPosition();
                                    editor.setValue(message.value);
                                    editor.setPosition(position);
                                }
                                break;
                            case 'output':
                                output.textContent = message.value;
                                break;
                            case 'error':
                                output.textContent = 'Error: ' + message.value;
                                output.style.color = 'var(--vscode-errorForeground)';
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}