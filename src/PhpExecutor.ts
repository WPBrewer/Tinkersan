import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { FrameworkBootstrapperFactory, FrameworkBootstrapper, GenericPhpBootstrapper } from './frameworks';

export class PhpExecutor {
    private _getProjectPath(): string {
        const config = vscode.workspace.getConfiguration('tinkersan');
        const projectPath = config.get<string>('projectPath');
        
        if (!projectPath) {
            // Try to use the workspace folder as the default project path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                return workspaceFolders[0].uri.fsPath;
            }
            throw new Error('Project path not configured! Please set tinkersan.projectPath in settings.');
        }
        
        return projectPath;
    }

    private _getFrameworkName(): string {
        const config = vscode.workspace.getConfiguration('tinkersan');
        return config.get<string>('framework') || 'auto';
    }

    private _getFrameworkBootstrapper(): FrameworkBootstrapper {
        const projectPath = this._getProjectPath();
        const frameworkName = this._getFrameworkName();
        
        if (frameworkName === 'auto') {
            // Auto-detect framework
            const bootstrapper = FrameworkBootstrapperFactory.detect(projectPath);
            if (bootstrapper) {
                return bootstrapper;
            }
            // Fall back to generic PHP if no framework detected
            return FrameworkBootstrapperFactory.getByName('PHP') || new GenericPhpBootstrapper();
        } else {
            // Use specified framework
            const bootstrapper = FrameworkBootstrapperFactory.getByName(frameworkName);
            if (bootstrapper) {
                return bootstrapper;
            }
            // Fall back to generic PHP if specified framework not found
            return FrameworkBootstrapperFactory.getByName('PHP') || new GenericPhpBootstrapper();
        }
    }

    public getProjectPath(): string {
        return this._getProjectPath();
    }

    private getTinkerPath(): string {
        const projectPath = this._getProjectPath();
        const tinkerPath = path.join(projectPath, '.tinkersan');

        if (!fs.existsSync(tinkerPath)) {
            fs.mkdirSync(tinkerPath, { recursive: true });
        }

        return tinkerPath;
    }

    private async saveTempFile(code: string, name?: string): Promise<string> {
        const tinkerPath = this.getTinkerPath();
        const fileName = name || `tinker-${Date.now()}.php`;
        const filePath = path.join(tinkerPath, fileName);
        
        fs.writeFileSync(filePath, code);
        return filePath;
    }

    public async execute(code: string): Promise<string> {
        try {
            const projectPath = this._getProjectPath();
            const bootstrapper = this._getFrameworkBootstrapper();
            
            // Create temporary execution wrapper
            const wrapperCode = `<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Start output buffering to capture PHP errors
ob_start();

${bootstrapper.getBootstrapCode(projectPath)}

function tinker_output($value) {
    if ($value === null) return 'null';
    if (is_array($value) || is_object($value)) {
        return print_r($value, true);
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    return var_export($value, true);
}

try {
    // User code execution
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
    ob_end_clean();
    echo "Error: " . $e->getMessage() . " in line " . $e->getLine();
}`;
            
            const tempFile = await this.saveTempFile(wrapperCode, `temp-${Date.now()}.php`);
            
            try {
                // Make sure the temp file is readable
                fs.chmodSync(tempFile, '0644');

                // Execute the code and capture output
                const output = child_process.execSync(`php "${tempFile}"`, {
                    encoding: 'utf8',
                    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                    cwd: projectPath
                });
                return output || `Code executed successfully with framework: ${bootstrapper.getName()} (no output)`;
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
    
    public getCompletions() {
        const bootstrapper = this._getFrameworkBootstrapper();
        return bootstrapper.getCompletions();
    }
}