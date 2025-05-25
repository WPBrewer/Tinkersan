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
            const bootstrapCode = bootstrapper.getBootstrapCode(projectPath);

            // Remove PHP opening tag if present
            const cleanUserCode = code.replace(/^<\?php\s*/i, '').trim();

            const script = `<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Pretty print function for Tinkersan
function _tinkersan_dump($value, $return = false) {
    $output = '';
    
    if (is_null($value)) {
        $output = "null";
    } elseif (is_bool($value)) {
        $output = $value ? "true" : "false";
    } elseif (is_scalar($value)) {
        $output = var_export($value, true);
    } elseif (is_object($value)) {
        // Use var_dump for all objects to show full details
        ob_start();
        var_dump($value);
        $output = ob_get_clean();
    } elseif (is_array($value)) {
        ob_start();
        print_r($value);
        $output = ob_get_clean();
    } else {
        ob_start();
        var_dump($value);
        $output = ob_get_clean();
    }
    
    if ($return) {
        return $output;
    }
    echo $output;
}

// Bootstrap framework
try {
    ${bootstrapCode}
} catch (\\Throwable $e) {
    echo "Bootstrap Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\\n";
    exit(1);
}

// Parse and execute user code with expression evaluation
$__tinkersan_code = <<<'TINKERSAN_CODE'
${cleanUserCode}
TINKERSAN_CODE;

// Simple statement parser - split by semicolons but respect braces
$__tinkersan_statements = [];
$__tinkersan_current = '';
$__tinkersan_brace_depth = 0;
$__tinkersan_in_string = false;
$__tinkersan_string_char = '';

for ($i = 0; $i < strlen($__tinkersan_code); $i++) {
    $char = $__tinkersan_code[$i];
    $prev_char = $i > 0 ? $__tinkersan_code[$i - 1] : '';
    
    // Handle string detection
    if (!$__tinkersan_in_string && ($char === '"' || $char === "'") && $prev_char !== '\\\\') {
        $__tinkersan_in_string = true;
        $__tinkersan_string_char = $char;
    } elseif ($__tinkersan_in_string && $char === $__tinkersan_string_char && $prev_char !== '\\\\') {
        $__tinkersan_in_string = false;
    }
    
    $__tinkersan_current .= $char;
    
    if (!$__tinkersan_in_string) {
        if ($char === '{') $__tinkersan_brace_depth++;
        elseif ($char === '}') $__tinkersan_brace_depth--;
        elseif ($char === ';' && $__tinkersan_brace_depth === 0) {
            $__tinkersan_statements[] = trim($__tinkersan_current);
            $__tinkersan_current = '';
        }
    }
}

// Don't forget the last statement (might not have semicolon)
if ($__tinkersan_current = trim($__tinkersan_current)) {
    $__tinkersan_statements[] = $__tinkersan_current;
}

// Execute statements
$__tinkersan_last_value = null;
$__tinkersan_has_output = false;

foreach ($__tinkersan_statements as $__tinkersan_index => $__tinkersan_statement) {
    if (empty($__tinkersan_statement)) continue;
    
    $__tinkersan_is_last = ($__tinkersan_index === count($__tinkersan_statements) - 1);
    
    // Check if statement already outputs something
    $__tinkersan_outputs = preg_match('/^\\s*(echo|print|printf|var_dump|print_r|dump|dd)\\s/i', $__tinkersan_statement);
    
    if ($__tinkersan_outputs) {
        $__tinkersan_has_output = true;
    }
    
    try {
        if ($__tinkersan_is_last && !$__tinkersan_outputs && !preg_match('/^\\s*(return|die|exit)\\s/i', $__tinkersan_statement)) {
            // Try to evaluate as expression and capture result
            $__tinkersan_last_value = eval('return ' . $__tinkersan_statement . ';');
        } else {
            // Execute as statement
            eval($__tinkersan_statement . (substr($__tinkersan_statement, -1) !== ';' ? ';' : ''));
        }
    } catch (\\ParseError $e) {
        // If return fails, try executing as statement
        if ($__tinkersan_is_last && !$__tinkersan_outputs) {
            eval($__tinkersan_statement . (substr($__tinkersan_statement, -1) !== ';' ? ';' : ''));
        } else {
            throw $e;
        }
    }
}

// Auto-display last value if no explicit output
if ($__tinkersan_last_value !== null && !$__tinkersan_has_output) {
    echo "\\n=> ";
    _tinkersan_dump($__tinkersan_last_value);
    echo "\\n";
}
`;

            // Execute PHP directly
            const output = child_process.execSync('php', {
                cwd: projectPath,
                input: script,
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10 // 10 MB
            });

            return output.trim() || `Code executed successfully with framework: ${bootstrapper.getName()} (no output)`;
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