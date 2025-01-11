import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

interface Snippet {
    prefix: string;      // The prefix to use for triggering the snippet
    body: string[];      // The snippet content as an array of lines
    description: string; // Description of what the snippet does
    scope: string;       // Scope where snippet is active (e.g., 'php')
    tags?: string[];     // Custom field for our tags
}

interface SnippetFile {
    [key: string]: Snippet;
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
        const snippetsFile = path.join(snippetsPath, 'snippets.json');

        // Get snippet details from user
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for your snippet',
            placeHolder: 'my-awesome-snippet'
        });

        if (!name) return;

        const prefix = await vscode.window.showInputBox({
            prompt: 'Enter trigger text for the snippet',
            placeHolder: name.toLowerCase().replace(/[^a-z0-9]/g, '_')
        });

        if (!prefix) return;

        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description',
            placeHolder: 'What does this snippet do?'
        }) || '';

        const tagsInput = await vscode.window.showInputBox({
            prompt: 'Enter tags (comma-separated)',
            placeHolder: 'woocommerce, orders, api'
        });
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

        // Prepare snippet content
        const cleanCode = code.replace(/^<\?php\s*/, '').trim();
        const bodyLines = cleanCode.split('\n');

        // Create snippet object
        const snippet: Snippet = {
            prefix,
            body: bodyLines,
            description,
            scope: 'php',
            tags
        };

        // Read existing snippets
        let snippets: SnippetFile = {};
        if (fs.existsSync(snippetsFile)) {
            snippets = JSON.parse(fs.readFileSync(snippetsFile, 'utf8'));
        }

        // Add new snippet
        snippets[name] = snippet;

        // Save snippets file
        fs.writeFileSync(snippetsFile, JSON.stringify(snippets, null, 2));

        vscode.window.showInformationMessage(`Snippet "${name}" saved successfully!`);
    }

    public async loadSnippet(): Promise<string | undefined> {
        const snippetsPath = this.getSnippetsPath();
        const snippetsFile = path.join(snippetsPath, 'snippets.json');

        if (!fs.existsSync(snippetsFile)) {
            vscode.window.showErrorMessage('No snippets found');
            return;
        }

        const snippets: SnippetFile = JSON.parse(fs.readFileSync(snippetsFile, 'utf8'));
        if (Object.keys(snippets).length === 0) {
            vscode.window.showErrorMessage('No snippets found');
            return;
        }

        // Show quick pick with snippets
        const selected = await vscode.window.showQuickPick(
            Object.entries(snippets).map(([name, snippet]) => ({
                label: name,
                description: snippet.prefix,
                detail: `${snippet.description}${snippet.tags?.length ? ` (Tags: ${snippet.tags.join(', ')})` : ''}`,
                snippet
            })),
            {
                placeHolder: 'Select a snippet to load',
                matchOnDescription: true,
                matchOnDetail: true
            }
        );

        if (selected) {
            // Just return the body lines joined with newlines
            return selected.snippet.body.join('\n');
        }
    }
} 