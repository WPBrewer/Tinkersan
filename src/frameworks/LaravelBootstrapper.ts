import * as fs from 'fs';
import * as path from 'path';
import { FrameworkBootstrapper } from './FrameworkBootstrapper';

export class LaravelBootstrapper implements FrameworkBootstrapper {
    public detect(basePath: string): boolean {
        // Check for key Laravel indicators
        return (
            fs.existsSync(path.join(basePath, 'artisan')) &&
            (fs.existsSync(path.join(basePath, 'bootstrap/app.php')) ||
             fs.existsSync(path.join(basePath, 'bootstrap', 'app.php')))
        );
    }
    
    public getBootstrapCode(basePath: string): string {
        // Find app.php file
        const appPath = path.join(basePath, 'bootstrap', 'app.php').replace(/\\/g, '/');
        const artisanPath = path.join(basePath, 'artisan').replace(/\\/g, '/');
        
        // Return PHP code to bootstrap Laravel
        return `
// Set working directory to the Laravel root
chdir('${basePath.replace(/\\/g, '/')}');

// Bootstrap Laravel
if (!file_exists('${appPath}')) {
    die('Laravel bootstrap/app.php not found at ${appPath}. Check your path configuration.');
}

// Define base path constant if not already defined
if (!defined('LARAVEL_START')) {
    define('LARAVEL_START', microtime(true));
}

// Load composer autoloader
if (file_exists(__DIR__.'/vendor/autoload.php')) {
    require __DIR__.'/vendor/autoload.php';
} elseif (file_exists('${path.join(basePath, 'vendor', 'autoload.php').replace(/\\/g, '/')}')) {
    require '${path.join(basePath, 'vendor', 'autoload.php').replace(/\\/g, '/')}';
} else {
    die('Composer autoloader not found. Run composer install in your Laravel project.');
}

// Create the application
$app = require_once '${appPath}';

// Bootstrap the kernel
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

// Setup global $tinkersan variable for session data
global $tinkersan;
$tinkersan = new stdClass();
$tinkersan->framework = 'Laravel';
$tinkersan->app = $app;
$tinkersan->version = \\Illuminate\\Foundation\\Application::VERSION;
$tinkersan->environment = $app->environment();

// Import common Laravel facades
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Auth;
use Illuminate\\Support\\Facades\\Cache;
use Illuminate\\Support\\Facades\\Log;
use Illuminate\\Support\\Facades\\Route;
use Illuminate\\Support\\Facades\\Schema;
`;
    }
    
    public getName(): string {
        return 'Laravel';
    }
    
    public getCompletions(): any[] {
        return [
            {
                label: 'app',
                kind: 15, // Function
                insertText: 'app(${1:$abstract})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get the application instance or a service container instance'
            },
            {
                label: 'Auth::user',
                kind: 15, // Function
                insertText: 'Auth::user()',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get the currently authenticated user'
            },
            {
                label: 'DB::table',
                kind: 15, // Function
                insertText: 'DB::table(\'${1:table_name}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Create a query builder for a database table'
            },
            {
                label: 'Model::find',
                kind: 15, // Function
                insertText: '${1:Model}::find(${2:$id})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Find a model by its primary key'
            },
            {
                label: 'Route::list',
                kind: 15, // Function
                insertText: 'Route::getRoutes()',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get all registered routes'
            },
            {
                label: 'Schema::getColumnListing',
                kind: 15, // Function
                insertText: 'Schema::getColumnListing(\'${1:table_name}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get the column listing for a given table'
            }
        ];
    }
} 