<?php

// Enable Tinkersan debug mode to see detailed information
define('TINKERSAN_DEBUG', true);

echo "=== Testing Enhanced Debug Information ===\n";
echo "This test will show detailed debug information about:\n";
echo "- Which WordPress installation is being used\n";
echo "- Which config file was used (if any)\n";
echo "- Site URLs and database information\n";
echo "- WordPress version and bootstrap status\n\n";

echo "=== Basic WordPress Information ===\n";
echo "Current user ID: " . get_current_user_id() . "\n";
echo "Site name: " . get_bloginfo('name') . "\n";
echo "Admin email: " . get_bloginfo('admin_email') . "\n";
echo "WordPress URL: " . get_bloginfo('wpurl') . "\n";
echo "Site URL: " . site_url() . "\n";
echo "Home URL: " . home_url() . "\n";

if (function_exists('is_multisite') && is_multisite()) {
    echo "Multisite: Yes\n";
    echo "Current blog ID: " . get_current_blog_id() . "\n";
} else {
    echo "Multisite: No\n";
}

echo "\n=== Active Plugins (first 5) ===\n";
$active_plugins = get_option('active_plugins', []);
$plugin_count = count($active_plugins);
echo "Total active plugins: {$plugin_count}\n";

if ($plugin_count > 0) {
    $plugins_to_show = array_slice($active_plugins, 0, 5);
    foreach ($plugins_to_show as $plugin) {
        echo "- {$plugin}\n";
    }
    if ($plugin_count > 5) {
        echo "... and " . ($plugin_count - 5) . " more\n";
    }
} else {
    echo "No active plugins found\n";
}

echo "\n=== Database Information ===\n";
global $wpdb;
echo "Database host: " . DB_HOST . "\n";
echo "Database name: " . DB_NAME . "\n";
echo "Table prefix: " . $wpdb->prefix . "\n";

echo "\n=== Test Complete ===\n";
echo "The debug information above should help you verify which WordPress installation is being used.\n";

// The debug information will be automatically displayed when TINKERSAN_DEBUG is true 