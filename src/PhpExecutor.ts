import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { FrameworkBootstrapperFactory, FrameworkBootstrapper, GenericPhpBootstrapper } from './frameworks';
import { WordPressDetector } from './utils/WordPressDetector';

export class PhpExecutor {
    private _getProjectPath(): string {
        const config = vscode.workspace.getConfiguration('tinkersan');
        const projectPath = config.get<string>('projectPath');
        const verboseLogging = config.get<boolean>('verboseLogging', false);
        
        if (verboseLogging) {
            WordPressDetector.showDebugOutput();
            console.log('Tinkersan: Getting project path...');
        }
        
        if (projectPath) {
            // User has explicitly set a path
            if (verboseLogging) {
                console.log(`Tinkersan: Using configured project path: ${projectPath}`);
            }
            return projectPath;
        }
        
        // Try auto-detection
        const detectedPath = WordPressDetector.autoDetectWordPressRoot();
        if (detectedPath) {
            if (verboseLogging) {
                console.log(`Tinkersan: Auto-detected WordPress root: ${detectedPath}`);
            }
            
            // Show info message about auto-detected path
            vscode.window.showInformationMessage(
                `Auto-detected WordPress at: ${detectedPath}`,
                'Use This Path',
                'Configure Different Path',
                'Show Debug Log'
            ).then(selection => {
                if (selection === 'Use This Path') {
                    // Save the detected path to settings
                    config.update('projectPath', detectedPath, vscode.ConfigurationTarget.Workspace);
                } else if (selection === 'Configure Different Path') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'tinkersan.projectPath');
                } else if (selection === 'Show Debug Log') {
                    WordPressDetector.showDebugOutput();
                }
            });
            
            return detectedPath;
        }
        
        // Fallback to workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const fallbackPath = workspaceFolders[0].uri.fsPath;
            if (verboseLogging) {
                console.log(`Tinkersan: Using fallback workspace path: ${fallbackPath}`);
            }
            return fallbackPath;
        }
        
        throw new Error('WordPress installation not found! Please set tinkersan.projectPath in settings or create a .tinkersan config file.');
    }

    /**
     * Get project path for current context (used for execution)
     * This method uses context-aware detection for multiple WordPress installations
     */
    private _getProjectPathForCurrentContext(): string {
        const config = vscode.workspace.getConfiguration('tinkersan');
        const projectPath = config.get<string>('projectPath');
        const verboseLogging = config.get<boolean>('verboseLogging', false);
        
        if (verboseLogging) {
            WordPressDetector.showDebugOutput();
            console.log('Tinkersan: Getting project path for current context...');
        }
        
        if (projectPath) {
            // User has explicitly set a path - use it
            if (verboseLogging) {
                console.log(`Tinkersan: Using configured project path: ${projectPath}`);
            }
            return projectPath;
        }
        
        // Try context-aware auto-detection for multiple WordPress installations
        const detectedPath = WordPressDetector.autoDetectWordPressRootForCurrentContext();
        if (detectedPath) {
            if (verboseLogging) {
                console.log(`Tinkersan: Context-aware detected WordPress root: ${detectedPath}`);
            }
            return detectedPath;
        }
        
        // Fallback to the original detection method
        const fallbackPath = WordPressDetector.autoDetectWordPressRoot();
        if (fallbackPath) {
            if (verboseLogging) {
                console.log(`Tinkersan: Fallback detected WordPress root: ${fallbackPath}`);
            }
            return fallbackPath;
        }
        
        // Final fallback to workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const finalFallback = workspaceFolders[0].uri.fsPath;
            if (verboseLogging) {
                console.log(`Tinkersan: Using final fallback workspace path: ${finalFallback}`);
            }
            return finalFallback;
        }
        
        throw new Error('WordPress installation not found! Please set tinkersan.projectPath in settings or create a .tinkersan config file.');
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

    /**
     * Get framework bootstrapper for a specific project path (context-aware)
     */
    private _getFrameworkBootstrapperForContext(projectPath: string): FrameworkBootstrapper {
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
            // Use context-aware detection for execution to support multiple WordPress installations
            const projectPath = this._getProjectPathForCurrentContext();
            const bootstrapper = this._getFrameworkBootstrapperForContext(projectPath);
            const bootstrapCode = bootstrapper.getBootstrapCode(projectPath);

            // Show debug info in output
            const debugInfo = `
=== Tinkersan Debug Info ===
Current file: ${vscode.window.activeTextEditor?.document.uri.fsPath || 'No active file'}
Detected WordPress root: ${projectPath}
Framework: ${bootstrapper.getName()}
============================

`;

            // Remove PHP opening tag if present
            const cleanUserCodeRaw = code.replace(/^<\?php\s*/i, '').trim();

            // Extract use statements and convert to class_alias registrations
            const useRegex = /^\s*use\s+([^;]+);/gm;
            let aliasSetupCode = '';
            let cleanUserCode = cleanUserCodeRaw.replace(useRegex, (match, p1) => {
                const parts = p1.trim().split(/\s+as\s+/i);
                const fullClass = parts[0].trim();
                const alias = parts[1] ? parts[1].trim() : fullClass.split('\\').pop();
                aliasSetupCode += `if ( ! class_exists('${alias}') && class_exists('${fullClass}') ) { class_alias('${fullClass}', '${alias}'); }\n`;
                return '';
            }).trim();

            const script = `<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Pretty print function for Tinkersan
function _tinkersan_dump($value, $return = false) {
    $output = '';
    if (is_null($value)) { $output = "null"; }
    elseif (is_bool($value)) { $output = $value ? "true" : "false"; }
    elseif (is_scalar($value)) { $output = var_export($value, true); }
    elseif (is_object($value)) { ob_start(); var_dump($value); $output = ob_get_clean(); }
    elseif (is_array($value)) { ob_start(); print_r($value); $output = ob_get_clean(); }
    else { ob_start(); var_dump($value); $output = ob_get_clean(); }
    if ($return) { return $output; }
    echo $output;
}

// Bootstrap framework
try {
${bootstrapCode}
} catch (\Throwable $e) { echo "Bootstrap Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\n"; exit(1);} 

// Setup class aliases from use statements
${aliasSetupCode}

// Execute user code
try {
${cleanUserCode}
} catch (\Throwable $e) { echo $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine(); }
`;

            // Execute PHP directly
            const output = child_process.execSync('php', {
                cwd: projectPath,
                input: script,
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10 // 10 MB
            });

            const result = output.trim() || `Code executed successfully with framework: ${bootstrapper.getName()} (no output)`;
            return debugInfo + result;
        } catch (error: any) {
            // PHP errors come through stderr
            if (error.stderr) {
                return error.stderr;
            }
            if (error.stdout) {
                return error.stdout;
            }
            return error.message;
        }
    }
    
    public getCompletions() {
        const bootstrapper = this._getFrameworkBootstrapper();
        return bootstrapper.getCompletions();
    }
} 