<?php
/**
 * Test file for debugging multiple WordPress installations
 * 
 * This file helps test if Tinkersan is correctly detecting and switching
 * between different WordPress installations based on the current file context.
 * 
 * Instructions:
 * 1. Copy this file to different WordPress installations in your workspace
 * 2. Open each copy in VS Code
 * 3. Run the code using Ctrl+Enter (or Cmd+Enter on Mac)
 * 4. Compare the output to see if different WordPress installations are being used
 */

echo "=== WordPress Installation Test ===\n";
echo "WordPress root: " . ABSPATH . "\n";
echo "Site URL: " . get_option('siteurl') . "\n";
echo "Home URL: " . get_option('home') . "\n";
echo "WordPress version: " . get_bloginfo('version') . "\n";
echo "Active theme: " . get_option('stylesheet') . "\n";

// Show some database info to confirm we're using different databases
echo "\nDatabase info:\n";
echo "Database name: " . DB_NAME . "\n";
echo "Database host: " . DB_HOST . "\n";

// Show active plugins count
$active_plugins = get_option('active_plugins', []);
echo "Active plugins count: " . count($active_plugins) . "\n";

// Show first few active plugins
if (!empty($active_plugins)) {
    echo "First 3 active plugins:\n";
    foreach (array_slice($active_plugins, 0, 3) as $plugin) {
        echo "  - " . $plugin . "\n";
    }
}

echo "===================================\n"; 