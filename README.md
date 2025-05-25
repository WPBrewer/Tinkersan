# Tinkersan

A PHP Tinker Tool for VS Code. Debug and test PHP code in WordPress directly in VS Code.

## Features
- Execute PHP code in framework context (Currently support WordPress)
- Auto-detect framework from project structure
- Automatic expression evaluation - see results without explicit echo/print
- Full object inspection using var_dump for detailed property viewing
- Auto-detection of WordPress installation
- Config file support for custom paths

## Supported Frameworks
- **WordPress**: Complete integration with WordPress core and WooCommerce

## Requirements
- PHP 7.4+
- Framework specific requirements:
  - WordPress: WordPress installation

## Configuration

### Auto-Detection
Tinkersan will automatically detect WordPress installations in:
- Workspace root
- Common subdirectories (public_html, public, www, htdocs, etc.)
- Parent directories of the current file
- From `.tinkersan` folders in plugin directories

### Settings
- `tinkersan.projectPath`: Path to the PHP project (auto-detected if not set)
- `tinkersan.framework`: Framework to use (WordPress)
- `tinkersan.verboseLogging`: Enable detailed logging of detection process

### Debug and Logging
Enable verbose logging to see detailed information about:
- WordPress root detection process
- Config file locations and contents
- Detection methods used
- Paths checked during auto-detection

**Enable via settings:**
```json
{
    "tinkersan.verboseLogging": true
}
```

**Or via config file:**
```json
{
    "wordpressRoot": "../../../..",
    "framework": "WordPress",
    "settings": {
        "verboseLogging": true
    }
}
```

**Commands:**
- `Tinkersan: Show Debug Log` - View detection logs and current configuration

### Config File
Create a `.tinkersan.json` file in your `.tinkersan` folder:
```json
{
    "wordpressRoot": "..",
    "framework": "WordPress",
    "customBootstrappers": [],
    "settings": {
        "autoDetect": true,
        "showDetectionNotice": true
    }
}
```

The `wordpressRoot` path is relative to the `.tinkersan` folder, so `".."` points to the parent directory (workspace root).

Use the command `Tinkersan: Create Config File` to generate a sample config.

### Multiple Config Files Priority
When multiple `.tinkersan.json` files exist, Tinkersan uses this priority order:

1. **Context-aware**: Config closest to the currently active file
2. **Plugin-specific**: Config in the same plugin as the active file
3. **Workspace .tinkersan**: Config in workspace `.tinkersan` folder
4. **Workspace root**: Config in workspace root (backward compatibility)

**Example scenario:**
```
workspace/
├── .tinkersan/.tinkersan.json          # Priority 3
├── .tinkersan.json                     # Priority 4
└── wp-content/plugins/my-plugin/
    └── .tinkersan/.tinkersan.json      # Priority 1 & 2 (if editing plugin files)
```

When editing files in `my-plugin`, it will use the plugin's config. When editing other files, it will use the workspace config.

## Usage
1. Set project path in settings (or let it auto-detect)
2. Select framework or use auto-detection
3. Create new tinker file: `Ctrl+Shift+P` -> `Tinkersan: New PHP File`
4. Write PHP code with framework support
5. Run code: `Ctrl+Enter` or `Cmd+Enter` on Mac

## Expression Evaluation
The last expression in your code is automatically evaluated and displayed:
```php
$user = get_user(1);
$user->display_name
// Output: => "John Doe"
```

## Class Loading and Namespaces
Tinkersan automatically handles WordPress plugin class loading:

### How WordPress Plugin Loading Works
When WordPress is bootstrapped through `wp-load.php`, it automatically:
1. Loads all active plugins from `wp-content/plugins/`
2. Executes each plugin's main file
3. Triggers the `plugins_loaded` action
4. Initializes plugin autoloaders (including Composer)

**This means:** If a plugin is active in WordPress, its classes should be automatically available without any manual loading.

### Why Classes Might Not Be Found
If you're getting "Class not found" errors:

1. **Plugin Not Active**: Check if the plugin is activated in WordPress
2. **Namespace Issues**: Ensure you're using the correct namespace
3. **Autoloader Not Configured**: The plugin might not have proper autoloading set up

### Debugging Class Loading
Use the debug helper to investigate class loading issues:
```php
// Debug why a class isn't loading
tinkersan_debug_class('WPBrewer\\IPCheck\\IPCheckService');
```

This will show:
- Whether the class exists
- Active plugins that might contain the class
- Available classes in the namespace
- Composer autoloader status

### Example Usage
```php
// If the plugin is active, just use the class directly
use WPBrewer\IPCheck\IPCheckService;
$service = IPCheckService::get_instance();

// Or without use statement
$service = new WPBrewer\IPCheck\IPCheckService();
```

### Manual Loading (Rarely Needed)
In rare cases where a plugin's autoloader isn't working:
```php
// Check if plugin has a Composer autoloader
$autoload = WP_PLUGIN_DIR . '/plugin-name/vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload;
}
```

### Plugin Development
You can use Tinkersan directly in your plugin development:

1. Create a `.tinkersan` folder in your plugin directory:
   ```
   wp-content/plugins/your-plugin/
   ├── .tinkersan/
   │   ├── .tinkersan.json
   │   └── test-functions.php
   ├── your-plugin.php
   └── includes/
   ```

2. The config file will automatically detect the correct WordPress root:
   ```json
   {
       "wordpressRoot": "../../../..",
       "framework": "WordPress"
   }
   ```

3. Test your plugin functions directly:
   ```php
   // .tinkersan/test-functions.php
   $product = wc_get_product(123);
   $product->get_name()
   ```

### Enhanced Dependency Loading
When a class uses other classes (dependencies), Tinkersan automatically handles this:

**Automatic Dependency Loading:**
- **Plugin-wide loading**: When a namespaced class is requested, all files from that plugin are loaded
- **Recursive loading**: Searches through `src/`, `includes/`, `lib/`, and `classes/` directories
- **Wildcard plugin detection**: Finds plugins with patterns like `wpbr-namespace-*`
- **Main plugin file loading**: Includes the main plugin file to trigger initialization

**Manual Dependency Loading:**
If automatic loading doesn't work, use these helper functions:

```php
// Load a specific class and its dependencies
tinkersan_load_class('WPBrewer\\IPCheck\\IPCheckService');

// Preload all files from a plugin namespace
tinkersan_preload_plugin('wpbrewer'); // Loads all WPBrewer plugin files

// Check if class exists after loading
if (class_exists('WPBrewer\\IPCheck\\IPCheckService')) {
    $service = new WPBrewer\IPCheck\IPCheckService();
}
```

**Dependency Error Handling:**
When a class dependency is missing, Tinkersan provides:
- Detailed error messages with suggestions
- Automatic loading attempts
- Similar class name suggestions
- Manual loading instructions

**Example with Dependencies:**
```php
// This will automatically load all dependencies
use WPBrewer\IPCheck\IPCheckService;

// If the above fails, manually preload the plugin
tinkersan_preload_plugin('wpbrewer');
$service = IPCheckService::get_instance();
```