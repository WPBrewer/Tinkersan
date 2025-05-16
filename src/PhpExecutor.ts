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
            const projectPath      = this._getProjectPath();
            const bootstrapper     = this._getFrameworkBootstrapper();
            const bootstrapCode    = bootstrapper.getBootstrapCode(projectPath);

            const cleanUserCode = code.replace(/^<\?php\s*/, '').trim()
                .replace(/\becho\s+([^;]+);/g, '_tinkersan_echo($1);');

            const script =
                `error_reporting(E_ALL);\n` +
                `ini_set('display_errors', '1');\n\n` +
                // Start buffering to capture echoes from bootstrap & user code
                `ob_start();\n` +
                `echo '';\n` +
                // Define helper function to better display boolean values
                `function _tinkersan_echo($value) {\n` +
                `    if (is_bool($value)) {\n` +
                `        echo $value ? 'true' : 'false';\n` +
                `        return;\n` +
                `    }\n` +
                `    echo $value;\n` +
                `}\n\n` +
                `$__bootstrap_error = null;\n` +
                `try {\n` +
                `${bootstrapCode}\n\n` +
                `} catch (\\Throwable $e) {\n` +
                `    $__bootstrap_error = "Bootstrap Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine();\n` +
                `}\n\n` +
                `$__tinker_result = null;\n` +
                `$__use_error = null;\n` +
                `\n` +
                `if ($__bootstrap_error === null) {\n` +
                `    try {\n` +
                `        // Execute code directly instead of separating use statements\n` +
                `        $__tinker_result = (function() {\n` +
                `            // Execute in isolation but with echoes preserved\n` +
                `            ${cleanUserCode}\n` +
                `            return null; // Prevent last expression from being returned\n` +
                `        })();\n` +
                `    } catch (\\Throwable $e) {\n` +
                `        echo "Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\\n";\n` +
                `        $__tinker_result = null;\n` +
                `    }\n` +
                `} else {\n` +
                `    echo $__bootstrap_error . "\\n";\n` +
                `}\n` +
                // We no longer need to handle $__tinker_result here since we're tracking outputs directly
                // Flush any buffered output and then start a fresh buffer to prevent PsySH notice
                `$__output = ob_get_clean();\n` +
                `echo $__output;\n` +
                `ob_start();\n` +
                `echo '';\n` +
                ``;

            // Determine PsySH binary path (use bundled phar to avoid class conflicts)
            const pharPath   = path.join(__dirname, '..', 'bin', 'psysh.phar');
            const psyshCmd   = fs.existsSync(pharPath)
                ? `php \"${pharPath}\" --no-interaction --raw-output -v`
                : 'psysh --no-interaction --raw-output -v';

            // Run PsySH in non-interactive mode by piping the script into STDIN.
            const output = child_process.execSync(psyshCmd, {
                cwd:          projectPath,
                input:        script,
                encoding:     'utf8',
                maxBuffer:    1024 * 1024 * 10 // 10 MB
            });

            // Handle empty outputs that might be from boolean false return values
            const trimmedOutput = output.trim();
            if (trimmedOutput === '') {
                // Check if it's a simple echo of a boolean false value
                const lastStatementMatch = cleanUserCode.match(/^\s*echo\s+(.+?);?\s*$/m);
                if (lastStatementMatch) {
                    return "(Output: empty - possibly echoed a boolean false)";
                }
            }

            return trimmedOutput || `Code executed successfully with framework: ${bootstrapper.getName()} (no output)`;
        } catch ( error: any ) {
            // PsySH prints errors to stdout. Capture both stderr/stdout.
            if ( error.stdout ) {
                return error.stdout as string;
            }
            if ( error.stderr ) {
                return error.stderr as string;
            }
            return error.message;
        }
    }
    
    public getCompletions() {
        const bootstrapper = this._getFrameworkBootstrapper();
        return bootstrapper.getCompletions();
    }
} 