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