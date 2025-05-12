import * as vscode from 'vscode';

export class TinkerResultsProvider {
    private static instance: TinkerResultsProvider;
    private view?: vscode.WebviewView;
    private readonly _viewType = 'tinkersan.results';
    
    private constructor() {}
    
    public static getInstance(): TinkerResultsProvider {
        if (!TinkerResultsProvider.instance) {
            TinkerResultsProvider.instance = new TinkerResultsProvider();
        }
        return TinkerResultsProvider.instance;
    }
    
    registerWebviewProvider(context: vscode.ExtensionContext) {
        const provider = new class implements vscode.WebviewViewProvider {
            resolveWebviewView(webviewView: vscode.WebviewView) {
                webviewView.webview.options = {
                    enableScripts: true
                };
                
                webviewView.webview.html = this.getWebviewContent();
                TinkerResultsProvider.instance.view = webviewView;
            }
            
            private getWebviewContent(): string {
                return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Tinkersan Results</title>
                    <style>
                        body {
                            padding: 0;
                            margin: 0;
                            font-family: var(--vscode-editor-font-family);
                            font-size: var(--vscode-editor-font-size);
                        }
                        
                        .container {
                            display: flex;
                            flex-direction: column;
                            height: 100vh;
                            overflow: hidden;
                        }
                        
                        pre {
                            margin: 0;
                            padding: 10px;
                            flex: 1;
                            overflow: auto;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        
                        .error {
                            color: var(--vscode-errorForeground);
                        }
                        
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 5px 10px;
                            background-color: var(--vscode-editor-background);
                            border-bottom: 1px solid var(--vscode-panel-border);
                        }
                        
                        .timestamp {
                            font-size: 0.8em;
                            color: var(--vscode-descriptionForeground);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <pre id="output">Run PHP code to see results here.</pre>
                    </div>
                    
                    <script>
                        const vscode = acquireVsCodeApi();
                        const output = document.getElementById('output');
                        
                        window.addEventListener('message', event => {
                            const message = event.data;
                            
                            switch (message.type) {
                                case 'result':
                                    output.classList.remove('error');
                                    output.textContent = message.content;
                                    break;
                                    
                                case 'error':
                                    output.classList.add('error');
                                    output.textContent = message.content;
                                    break;
                                    
                                case 'clear':
                                    output.classList.remove('error');
                                    output.textContent = '';
                                    break;
                            }
                        });
                    </script>
                </body>
                </html>`;
            }
        };
        
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(this._viewType, provider)
        );
        
        // Register command to clear results
        context.subscriptions.push(
            vscode.commands.registerCommand('tinkersan.clearResults', () => {
                this.clear();
            })
        );
    }
    
    public show() {
        if (this.view) {
            this.view.show(true);
        } else {
            vscode.commands.executeCommand('tinkersan-explorer.focus');
        }
    }
    
    public showResult(content: string) {
        if (this.view) {
            this.view.webview.postMessage({ type: 'result', content });
            this.show();
        }
    }
    
    public showError(content: string) {
        if (this.view) {
            this.view.webview.postMessage({ type: 'error', content });
            this.show();
        }
    }
    
    public clear() {
        if (this.view) {
            this.view.webview.postMessage({ type: 'clear' });
        }
    }
} 