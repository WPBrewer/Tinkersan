import * as fs from 'fs';
import * as path from 'path';
import { FrameworkBootstrapper } from './FrameworkBootstrapper';
import { WordPressDetector } from '../utils/WordPressDetector';

export class WordPressBootstrapper implements FrameworkBootstrapper {
    public detect(basePath: string): boolean {
        // Use the more robust WordPressDetector
        return WordPressDetector.isWordPressRoot(basePath);
    }
    
    public getBootstrapCode(basePath: string): string {
        // Find wp-load.php file
        const wpLoadPath = path.join(basePath, 'wp-load.php');
        
        // Return PHP code to bootstrap WordPress
        return `
// Bootstrap WordPress
if (!file_exists('${wpLoadPath}')) {
    die('WordPress wp-load.php not found at ${wpLoadPath}. Check your path configuration.');
}

// Turn off any output buffering
while (ob_get_level()) {
    ob_end_clean();
}

// Require WordPress core
require_once '${wpLoadPath}';

// IMPORTANT: Ensure WordPress is fully loaded
// This is crucial for plugin classes to be available
if (!did_action('init')) {
    // If init hasn't run yet, we need to trigger WordPress loading
    if (function_exists('wp')) {
        wp();
    }
}

// Make sure all plugins are loaded and initialized
if (!did_action('plugins_loaded')) {
    do_action('plugins_loaded');
}

// Trigger init if it hasn't been triggered
if (!did_action('init')) {
    do_action('init');
}

// Now all plugin classes should be available through their own autoloaders

// Define a class to access private/protected properties (advanced usage)
class Tinkersan_Property_Accessor {
    public static function get_private_property($obj, $prop) {
        $reflection = new ReflectionClass($obj);
        $property = $reflection->getProperty($prop);
        $property->setAccessible(true);
        return $property->getValue($obj);
    }
    
    public static function set_private_property($obj, $prop, $value) {
        $reflection = new ReflectionClass($obj);
        $property = $reflection->getProperty($prop);
        $property->setAccessible(true);
        $property->setValue($obj, $value);
        return $obj;
    }
}

// Helper function to debug class loading
function tinkersan_debug_class($class_name) {
    echo "\\nDebugging class: {$class_name}\\n";
    echo "Class exists: " . (class_exists($class_name) ? 'Yes' : 'No') . "\\n";
    
    if (!class_exists($class_name)) {
        // Check if it's a namespaced class
        $parts = explode('\\\\', $class_name);
        if (count($parts) > 1) {
            $namespace = $parts[0];
            echo "Namespace: {$namespace}\\n";
            
            // Check active plugins
            $active_plugins = get_option('active_plugins', []);
            echo "Active plugins:\\n";
            foreach ($active_plugins as $plugin) {
                if (stripos($plugin, strtolower($namespace)) !== false) {
                    echo "  - {$plugin} (matches namespace)\\n";
                    $plugin_file = WP_PLUGIN_DIR . '/' . $plugin;
                    if (file_exists($plugin_file)) {
                        echo "    File exists: Yes\\n";
                        // Check if plugin has composer autoload
                        $plugin_dir = dirname($plugin_file);
                        $autoload_file = $plugin_dir . '/vendor/autoload.php';
                        if (file_exists($autoload_file)) {
                            echo "    Composer autoload: Yes\\n";
                            require_once $autoload_file;
                        } else {
                            echo "    Composer autoload: No\\n";
                        }
                    }
                }
            }
        }
        
        // Re-check after attempting to load
        echo "\\nClass exists after debug: " . (class_exists($class_name) ? 'Yes' : 'No') . "\\n";
    }
    
    // Show all loaded classes from the namespace
    if (!class_exists($class_name)) {
        $parts = explode('\\\\', $class_name);
        if (count($parts) > 1) {
            $namespace = $parts[0];
            $all_classes = get_declared_classes();
            $namespace_classes = array_filter($all_classes, function($c) use ($namespace) {
                return strpos($c, $namespace . '\\\\') === 0;
            });
            
            if (!empty($namespace_classes)) {
                echo "\\nAvailable classes in {$namespace} namespace:\\n";
                foreach (array_slice($namespace_classes, 0, 10) as $class) {
                    echo "  - {$class}\\n";
                }
            }
        }
    }
}

// Helper function to load a class
function tinkersan_load_class($class_name) {
    // If class already exists, return true
    if (class_exists($class_name)) {
        return true;
    }
    
    // Try to extract namespace and find matching plugin
    $parts = explode('\\\\', $class_name);
    if (count($parts) > 1) {
        $namespace = $parts[0];
        
        // Get active plugins
        $active_plugins = get_option('active_plugins', []);
        
        foreach ($active_plugins as $plugin) {
            // Check if plugin might contain this namespace
            if (stripos($plugin, strtolower($namespace)) !== false || 
                stripos($namespace, basename(dirname($plugin))) !== false) {
                
                $plugin_dir = WP_PLUGIN_DIR . '/' . dirname($plugin);
                
                // Try to load composer autoloader
                $autoload_file = $plugin_dir . '/vendor/autoload.php';
                if (file_exists($autoload_file)) {
                    require_once $autoload_file;
                    if (class_exists($class_name)) {
                        return true;
                    }
                }
                
                // Try to load the main plugin file
                $plugin_file = WP_PLUGIN_DIR . '/' . $plugin;
                if (file_exists($plugin_file)) {
                    require_once $plugin_file;
                    if (class_exists($class_name)) {
                        return true;
                    }
                }
            }
        }
        
        // Try a more aggressive search in all plugin directories
        $plugin_dirs = glob(WP_PLUGIN_DIR . '/*', GLOB_ONLYDIR);
        foreach ($plugin_dirs as $plugin_dir) {
            // Skip if already checked
            if (stripos($plugin_dir, strtolower($namespace)) === false) {
                continue;
            }
            
            $autoload_file = $plugin_dir . '/vendor/autoload.php';
            if (file_exists($autoload_file)) {
                require_once $autoload_file;
                if (class_exists($class_name)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Setup global $tinkersan variable for session data
global $tinkersan;
$tinkersan = new stdClass();
$tinkersan->framework = 'WordPress';
$tinkersan->version = $wp_version;
$tinkersan->is_multisite = is_multisite();
$tinkersan->user = wp_get_current_user();
$tinkersan->debug_class = 'tinkersan_debug_class';

// Show WordPress initialization status
if (defined('TINKERSAN_DEBUG') && TINKERSAN_DEBUG) {
    echo "WordPress Bootstrap Status:\\n";
    echo "- wp-load.php loaded: Yes\\n";
    echo "- plugins_loaded action: " . (did_action('plugins_loaded') ? 'Yes' : 'No') . "\\n";
    echo "- init action: " . (did_action('init') ? 'Yes' : 'No') . "\\n";
    echo "- Active plugins: " . count(get_option('active_plugins', [])) . "\\n\\n";
}
`;
    }
    
    public getName(): string {
        return 'WordPress';
    }
    
    public getCompletions(): any[] {
        return [
            {
                label: 'get_post',
                kind: 15, // Function
                insertText: 'get_post(${1:$post_id})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get post data given a post ID or post object'
            },
            {
                label: 'wp_get_current_user',
                kind: 15, // Function
                insertText: 'wp_get_current_user()',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get the current user object'
            },
            {
                label: 'WP_Query',
                kind: 7, // Class
                insertText: 'new WP_Query(${1:$args})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'WordPress Query class'
            },
            {
                label: 'wc_get_product',
                kind: 15, // Function
                insertText: 'wc_get_product(${1:$product_id})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get a WooCommerce product'
            },
            {
                label: 'wc_get_order',
                kind: 15, // Function
                insertText: 'wc_get_order(${1:$order_id})',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get a WooCommerce order'
            },
            {
                label: 'tinkersan_debug_class',
                kind: 15, // Function
                insertText: 'tinkersan_debug_class(\'${1:ClassName}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Debug why a class is not loading - shows active plugins, namespaces, and autoloader status'
            },
            {
                label: 'tinkersan_load_class',
                kind: 15, // Function
                insertText: 'tinkersan_load_class(\'${1:ClassName}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Attempt to load a class by finding and requiring its plugin autoloader'
            },
            {
                label: 'class_exists',
                kind: 15, // Function
                insertText: 'class_exists(\'${1:ClassName}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Check if a class exists'
            },
            {
                label: 'get_declared_classes',
                kind: 15, // Function
                insertText: 'get_declared_classes()',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get all declared classes'
            },
            {
                label: 'did_action',
                kind: 15, // Function
                insertText: 'did_action(\'${1:action_name}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Check if an action has been fired'
            },
            {
                label: 'get_option',
                kind: 15, // Function
                insertText: 'get_option(\'${1:option_name}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get a WordPress option value'
            }
        ];
    }
} 