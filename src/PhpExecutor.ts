import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

export class PhpExecutor {
    private outputChannel: vscode.OutputChannel;
    private showDetailLog: boolean;
    private enableTableView: boolean;
    private phpPath: string = '';
    private psyshPath: string = '';

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('TinkerWP');
        const config = vscode.workspace.getConfiguration('tinkerwp');
        this.showDetailLog = config.get('showDetailLog', false);
        this.enableTableView = config.get('enableTableView', false);
        this.initPaths();
    }

    private async initPaths(): Promise<void> {
        try {
            this.phpPath = child_process.execSync('which php').toString().trim();
            const extensionPath = vscode.extensions.getExtension('WPBrewer.tinkerwp')?.extensionPath || 
                path.resolve(__dirname, '..');
            
            const localPsysh = path.join(extensionPath, 'vendor/bin/psysh');
            if (require('fs').existsSync(localPsysh)) {
                this.psyshPath = localPsysh;
            } else {
                const projectPsysh = path.resolve(__dirname, '../../vendor/bin/psysh');
                if (require('fs').existsSync(projectPsysh)) {
                    this.psyshPath = projectPsysh;
                }
            }
        } catch (error) {
            // Handle error silently, will be caught during execution
        }
    }

    public async execute(filePath: string, wpPath: string): Promise<void> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        try {
            if (!require('fs').existsSync(path.join(wpPath, 'wp-load.php'))) {
                throw new Error(`WordPress not found at ${wpPath}`);
            }

            if (!this.phpPath || !this.psyshPath) {
                await this.initPaths();
            }

            if (!this.psyshPath) {
                throw new Error('PsySH not found. Please check installation.');
            }

            const tempFile = path.join(path.dirname(filePath), '_temp_bootstrap.php');
            const bootstrapCode = this.generateBootstrapCode(wpPath, filePath);
            
            require('fs').writeFileSync(tempFile, bootstrapCode);

            if (this.showDetailLog) {
                this.outputChannel.appendLine(`Executing ${filePath}...`);
            }

            const process = child_process.spawn(this.phpPath, [this.psyshPath, tempFile], {
                cwd: path.dirname(filePath)
            });

            let stdoutBuffer = '';
            let stderrBuffer = '';

            process.stdout.on('data', (data) => {
                stdoutBuffer += data;
            });

            process.stderr.on('data', (data) => {
                stderrBuffer += data;
            });

            process.on('close', (code) => {
                if (stdoutBuffer) this.outputChannel.append(stdoutBuffer);
                if (stderrBuffer) this.outputChannel.append(stderrBuffer);
                
                require('fs').unlinkSync(tempFile);
                
                if (code !== 0 && this.showDetailLog) {
                    this.outputChannel.appendLine(`Process exited with code ${code}`);
                }
            });

        } catch (error: unknown) {
            if (error instanceof Error) {
                this.outputChannel.appendLine(`Error: ${error.message}`);
                vscode.window.showErrorMessage(`Failed to execute: ${error.message}`);
            }
        }
    }

    private generateBootstrapCode(wpPath: string, filePath: string): string {
        const absoluteWpPath = path.resolve(wpPath);
        const absoluteFilePath = path.resolve(filePath);
        const extensionPath = vscode.extensions.getExtension('WPBrewer.tinkerwp')?.extensionPath || 
            path.resolve(__dirname, '..');

        return `<?php
        define('WP_USE_THEMES', false);
        require_once '${absoluteWpPath}/wp-load.php';
        require_once '${path.join(extensionPath, 'vendor/autoload.php')}';
        
        use Symfony\\Component\\VarDumper\\VarDumper;
        use Symfony\\Component\\VarDumper\\Cloner\\VarCloner;
        use Symfony\\Component\\VarDumper\\Dumper\\CliDumper;
        
        // Configure VarDumper
        VarDumper::setHandler(function (\$var) {
            \$cloner = new VarCloner();
            \$dumper = new CliDumper();
            \$dumper->dump(\$cloner->cloneVar(\$var));
        });
        
        // Add dd() helper function
        if (!function_exists('dd')) {
            function dd(...\$args) {
                foreach (\$args as \$x) {
                    dump(\$x);
                }
                die(1);
            }
        }
        
        // Add d() helper function
        if (!function_exists('d')) {
            function d(...\$args) {
                foreach (\$args as \$x) {
                    dump(\$x);
                }
            }
        }
        
        ${this.enableTableView ? this.getTableFormatterCode() : ''}
        
        // Capture and evaluate the file content
        \$__content = file_get_contents('${absoluteFilePath}');
        \$__lines = array_filter(explode("\\n", \$__content));
        \$__last_line = end(\$__lines);
        
        // Remove PHP tags and trailing semicolon for evaluation
        \$__last_line = trim(str_replace(['<?php', '?>'], '', \$__last_line));
        \$__last_line = rtrim(\$__last_line, ';');
        
        // Execute the file
        require_once '${absoluteFilePath}';
        
        // If no output was generated and we have a last line, evaluate and dump it
        if (ob_get_length() === 0 && !empty(\$__last_line)) {
            try {
                \$__result = eval('return ' . \$__last_line . ';');
                if (isset(\$__result)) {
                    dump(\$__result);
                }
            } catch (\Throwable \$e) {
                // Silently ignore eval errors
            }
        }
        `;
    }

    private getTableFormatterCode(): string {
        return `
            function format_table_output($data) {
                if (!is_array($data) && !is_object($data)) {
                    return print_r($data, true);
                }
                
                // Handle WP_User objects array
                if (is_array($data) && !empty($data) && $data[0] instanceof WP_User) {
                    // Get the fields from get_users() args if available
                    $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
                    $args = [];
                    foreach ($backtrace as $trace) {
                        if (isset($trace['function']) && $trace['function'] === 'get_users') {
                            $args = $trace['args'][0] ?? [];
                            break;
                        }
                    }

                    $fields = isset($args['fields']) ? (array)$args['fields'] : [
                        'ID',
                        'user_login',
                        'user_nicename',
                        'user_email',
                        'user_url',
                        'user_registered',
                        'user_status',
                        'display_name',
                        'roles'
                    ];

                    $formatted = array_map(function($user) use ($fields) {
                        $row = [];
                        foreach ($fields as $field) {
                            switch ($field) {
                                case 'roles':
                                    $row[$field] = implode(', ', $user->roles);
                                    break;
                                case 'caps':
                                    $row[$field] = implode(', ', array_keys($user->allcaps));
                                    break;
                                default:
                                    $row[$field] = $user->$field ?? '';
                            }
                        }
                        return $row;
                    }, $data);
                    $data = $formatted;
                }
                
                // Convert to array if object
                $array = (array)$data;
                if (empty($array)) return "Empty result\n";
                
                // Get headers from first row
                $first_row = (array)reset($array);
                $headers = array_keys($first_row);
                
                // Calculate column widths
                $widths = array();
                foreach ($headers as $header) {
                    $widths[$header] = strlen($header);
                }
                
                foreach ($array as $row) {
                    $row = (array)$row;
                    foreach ($headers as $header) {
                        $value = isset($row[$header]) ? $row[$header] : '';
                        $widths[$header] = max($widths[$header], strlen(print_r($value, true)));
                    }
                }
                
                // Build header
                $output = "\n";
                foreach ($headers as $header) {
                    $output .= str_pad($header, $widths[$header] + 2);
                }
                $output .= "\n" . str_repeat('-', array_sum($widths) + count($widths) * 2) . "\n";
                
                // Build rows
                foreach ($array as $row) {
                    $row = (array)$row;
                    foreach ($headers as $header) {
                        $value = isset($row[$header]) ? $row[$header] : '';
                        $output .= str_pad(print_r($value, true), $widths[$header] + 2);
                    }
                    $output .= "\n";
                }
                
                return $output;
            }
        `;
    }
} 