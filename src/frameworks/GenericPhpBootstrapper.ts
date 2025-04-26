import * as fs from 'fs';
import * as path from 'path';
import { FrameworkBootstrapper } from './FrameworkBootstrapper';

export class GenericPhpBootstrapper implements FrameworkBootstrapper {
    public detect(basePath: string): boolean {
        // Default/fallback bootstrapper - always detects
        return true;
    }
    
    public getBootstrapCode(basePath: string): string {
        // Try to find composer autoloader
        const autoloadPath = path.join(basePath, 'vendor', 'autoload.php').replace(/\\/g, '/');
        
        return `
// Set working directory to the project root
chdir('${basePath.replace(/\\/g, '/')}');

// Try to include composer autoloader if it exists
if (file_exists('${autoloadPath}')) {
    require_once '${autoloadPath}';
}

// Setup global $tinkersan variable for session data
global $tinkersan;
$tinkersan = new stdClass();
$tinkersan->framework = 'Generic PHP';
$tinkersan->php_version = PHP_VERSION;
$tinkersan->extensions = get_loaded_extensions();

// Some useful utility functions
function get_declared_classes_by_namespace($namespace) {
    $classes = [];
    foreach (get_declared_classes() as $class) {
        if (strpos($class, $namespace) === 0) {
            $classes[] = $class;
        }
    }
    return $classes;
}

function list_files($dir, $pattern = '*.php') {
    return glob(rtrim($dir, '/') . '/' . $pattern);
}

function include_dir($dir, $pattern = '*.php') {
    $files = list_files($dir, $pattern);
    foreach ($files as $file) {
        include_once $file;
    }
    return $files;
}
`;
    }
    
    public getName(): string {
        return 'PHP';
    }
    
    public getCompletions(): any[] {
        return [
            {
                label: 'var_dump',
                kind: 15, // Function
                insertText: 'var_dump(${1:$var})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Dumps information about a variable'
            },
            {
                label: 'print_r',
                kind: 15, // Function
                insertText: 'print_r(${1:$var}, ${2:true})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Prints human-readable information about a variable'
            },
            {
                label: 'get_class',
                kind: 15, // Function
                insertText: 'get_class(${1:$object})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Returns the name of the class of an object'
            },
            {
                label: 'get_class_methods',
                kind: 15, // Function
                insertText: 'get_class_methods(${1:$class_name})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Gets the class methods names'
            },
            {
                label: 'get_class_vars',
                kind: 15, // Function
                insertText: 'get_class_vars(${1:$class_name})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get the default properties of the class'
            },
            {
                label: 'include_dir',
                kind: 15, // Function
                insertText: 'include_dir(\'${1:directory}\', \'${2:*.php}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Include all PHP files in a directory'
            }
        ];
    }
} 