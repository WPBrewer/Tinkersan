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

// Setup global $tinkersan variable for session data
global $tinkersan;
$tinkersan = new stdClass();
$tinkersan->framework = 'WordPress';
$tinkersan->version = $wp_version;
$tinkersan->is_multisite = is_multisite();
$tinkersan->user = wp_get_current_user();
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
            }
        ];
    }
} 