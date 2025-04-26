/**
 * Example custom bootstrapper for Tinkersan
 * 
 * This file demonstrates how to create a custom framework bootstrapper
 * for Tinkersan. Save this file in your project and configure
 * the path in your VS Code settings.json:
 * 
 * "tinkersan.customBootstrappers": [
 *   "./path/to/CustomBootstrapper.js"
 * ]
 */

// Example bootstrapper for CakePHP
class CakePHPBootstrapper {
    /**
     * Detect if this framework is present in the project
     */
    detect(basePath) {
        const fs = require('fs');
        const path = require('path');
        
        // Check for CakePHP-specific files/directories
        return (
            fs.existsSync(path.join(basePath, 'config', 'app.php')) &&
            fs.existsSync(path.join(basePath, 'src', 'Application.php'))
        );
    }
    
    /**
     * Get PHP code to bootstrap the framework
     */
    getBootstrapCode(basePath) {
        const path = require('path');
        
        // Convert backslashes to forward slashes for PHP
        const cleanPath = basePath.replace(/\\/g, '/');
        const bootstrapPath = path.join(cleanPath, 'config', 'bootstrap.php').replace(/\\/g, '/');
        
        return `
// Set working directory to the CakePHP root
chdir('${cleanPath}');

// Check if bootstrap file exists
if (!file_exists('${bootstrapPath}')) {
    die('CakePHP bootstrap file not found at ${bootstrapPath}');
}

// Define constants that CakePHP expects
if (!defined('DS')) {
    define('DS', DIRECTORY_SEPARATOR);
}
if (!defined('ROOT')) {
    define('ROOT', '${cleanPath}');
}
if (!defined('APP_DIR')) {
    define('APP_DIR', 'src');
}
if (!defined('APP')) {
    define('APP', ROOT . DS . APP_DIR . DS);
}
if (!defined('CONFIG')) {
    define('CONFIG', ROOT . DS . 'config' . DS);
}

// Load composer autoloader
require_once '${path.join(cleanPath, 'vendor', 'autoload.php').replace(/\\/g, '/')}';

// Include bootstrap
require_once '${bootstrapPath}';

// Setup Tinkersan variable
global $tinkersan;
$tinkersan = new \\stdClass();
$tinkersan->framework = 'CakePHP';
$tinkersan->app = \\Cake\\Core\\Configure::read();

// Import common classes
use Cake\\Core\\Configure;
use Cake\\Datasource\\ConnectionManager;
use Cake\\ORM\\TableRegistry;
`;
    }
    
    /**
     * Get the name of this framework
     */
    getName() {
        return 'CakePHP';
    }
    
    /**
     * Get framework-specific code completions
     */
    getCompletions() {
        return [
            {
                label: 'TableRegistry::get',
                kind: 15, // Function
                insertText: 'TableRegistry::get(\'${1:Users}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get a table instance from the registry'
            },
            {
                label: 'Configure::read',
                kind: 15, // Function
                insertText: 'Configure::read(\'${1:App.name}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Read configuration data'
            },
            {
                label: 'ConnectionManager::get',
                kind: 15, // Function
                insertText: 'ConnectionManager::get(\'${1:default}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get a database connection'
            }
        ];
    }
}

// Export the bootstrapper class
module.exports = { CakePHPBootstrapper }; 