import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

interface Snippet {
    name: string;
    description: string;
    code: string;
    tags: string[];
    created: number;
}

interface QuickPickSnippet extends vscode.QuickPickItem {
    snippet: Snippet;
}

export class PhpExecutor {
    private _getWordPressPath(): string {
        const config = vscode.workspace.getConfiguration('tinkerwp');
        const wpPath = config.get<string>('wordpressPath');
        
        if (!wpPath) {
            throw new Error('WordPress path not configured! Please set tinkerwp.wordpressPath in settings.');
        }
        
        return wpPath;
    }

    public getWordPressPath(): string {
        return this._getWordPressPath();
    }

    private getTinkerPath(): string {
        const wpPath = this._getWordPressPath();
        const tinkerPath = path.join(wpPath, '.tinkerwp');

        if (!fs.existsSync(tinkerPath)) {
            fs.mkdirSync(tinkerPath, { recursive: true });
        }

        return tinkerPath;
    }

    private getSnippetsPath(): string {
        const tinkerPath = this.getTinkerPath();
        const config = vscode.workspace.getConfiguration('tinkerwp');
        const snippetsFolder = config.get<string>('snippetsFolder') || 'snippets';
        const snippetsPath = path.join(tinkerPath, snippetsFolder);

        if (!fs.existsSync(snippetsPath)) {
            fs.mkdirSync(snippetsPath, { recursive: true });
            // Create index file if it doesn't exist
            const indexPath = path.join(snippetsPath, 'index.json');
            if (!fs.existsSync(indexPath)) {
                fs.writeFileSync(indexPath, JSON.stringify({ snippets: [] }, null, 2));
            }
        }

        return snippetsPath;
    }

    public async saveSnippet(code: string, name?: string): Promise<string> {
        const tinkerPath = this.getTinkerPath();
        const fileName = name || `tinker-${Date.now()}.php`;
        const filePath = path.join(tinkerPath, fileName);
        
        fs.writeFileSync(filePath, code);
        return filePath;
    }

    public async execute(code: string): Promise<string> {
        try {
            const wpPath = this._getWordPressPath();
            
            // Create temporary execution wrapper
            const wrapperCode = `<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

if (!file_exists('${path.join(wpPath, 'wp-load.php')}')) {
    die('WordPress wp-load.php not found. Check your path configuration.');
}

require_once '${path.join(wpPath, 'wp-load.php')}';

function tinker_output($value) {
    if ($value === null) return '';
    if (is_array($value) || is_object($value)) {
        return print_r($value, true);
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    return var_export($value, true);
}

try {
    ob_start();
    $tinker_result = (function() {
        ${code.replace(/^<\?php\s*/, '').trim()}
    })();
    $output = ob_get_clean();
    
    if ($output) {
        echo $output;
    } elseif ($tinker_result !== null) {
        echo tinker_output($tinker_result);
    }
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . " in line " . $e->getLine();
}`;
            
            const tempFile = await this.saveSnippet(wrapperCode, `temp-${Date.now()}.php`);
            
            try {
                // Make sure the temp file is readable
                fs.chmodSync(tempFile, '0644');

                // Execute the code and capture output
                const output = child_process.execSync(`php "${tempFile}"`, {
                    encoding: 'utf8',
                    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                    cwd: wpPath
                });
                return output || 'Code executed successfully (no output)';
            } finally {
                // Clean up temp file
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            }
        } catch (error: any) {
            if (error.stderr) {
                return `Error: ${error.stderr}`;
            }
            return `Error: ${error.message}`;
        }
    }

    public async saveAsSnippet(code: string): Promise<void> {
        const snippetsPath = this.getSnippetsPath();
        const indexPath = path.join(snippetsPath, 'index.json');

        // Get snippet details from user
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for your snippet',
            placeHolder: 'my-awesome-snippet'
        });

        if (!name) return;

        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description (optional)',
            placeHolder: 'What does this snippet do?'
        }) || '';

        const tagsInput = await vscode.window.showInputBox({
            prompt: 'Enter tags (comma-separated)',
            placeHolder: 'woocommerce, orders, api'
        });
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

        // Create snippet object
        const snippet: Snippet = {
            name,
            description,
            code: code.replace(/^<\?php\s*/, '').trim(),
            tags,
            created: Date.now()
        };

        // Save snippet file
        const snippetPath = path.join(snippetsPath, `${name}.php`);
        fs.writeFileSync(snippetPath, `<?php\n/**\n * ${description}\n * Tags: ${tags.join(', ')}\n */\n\n${snippet.code}`);

        // Update index
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        index.snippets = index.snippets.filter((s: Snippet) => s.name !== name);
        index.snippets.push(snippet);
        index.snippets.sort((a: Snippet, b: Snippet) => a.name.localeCompare(b.name));
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

        vscode.window.showInformationMessage(`Snippet "${name}" saved successfully!`);
    }

    public async loadSnippet(): Promise<string | undefined> {
        const snippetsPath = this.getSnippetsPath();
        const indexPath = path.join(snippetsPath, 'index.json');

        if (!fs.existsSync(indexPath)) {
            vscode.window.showErrorMessage('No snippets found');
            return;
        }

        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        if (!index.snippets.length) {
            vscode.window.showErrorMessage('No snippets found');
            return;
        }

        // Show quick pick with snippets
        const selected = await vscode.window.showQuickPick<QuickPickSnippet>(
            index.snippets.map((s: Snippet) => ({
                label: s.name,
                description: s.description,
                detail: s.tags.length ? `Tags: ${s.tags.join(', ')}` : undefined,
                snippet: s
            })),
            {
                placeHolder: 'Select a snippet to load',
                matchOnDescription: true,
                matchOnDetail: true
            }
        );

        if (selected) {
            // Load the actual file to get any updates
            const snippetPath = path.join(snippetsPath, `${selected.snippet.name}.php`);
            if (fs.existsSync(snippetPath)) {
                const content = fs.readFileSync(snippetPath, 'utf8');
                // Extract code from the file (skip comments)
                const codeMatch = content.match(/\*\/\s*([\s\S]*)/);
                return codeMatch ? codeMatch[1].trim() : selected.snippet.code;
            }
            return selected.snippet.code;
        }
    }
} 