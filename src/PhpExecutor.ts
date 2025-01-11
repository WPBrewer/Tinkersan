import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

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
} 