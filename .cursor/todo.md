# Description

Tinkersan is a VS Code extension to help you test PHP code in different frameworks and applications. It is inspired by Tinkerwell and WP Console.

Tinkerwell: https://tinkerwell.app/
WP Console: https://wordpress.org/plugins/wp-console/

# Current Features

- [x] User could create a PHP file in the .tinkersan folder and run it
- [x] Support for WordPress framework
- [x] Auto-detection of framework from project structure
- [x] Direct PHP execution without PsySH dependency
- [x] Automatic expression evaluation with smart output formatting
- [x] Auto-detection of WordPress root directory
- [x] Config file support (.tinkersan.json) for custom paths
- [x] Command to create config file template
- [x] Plugin folder support - auto-detect WordPress root from plugin directories
- [x] Verbose logging and debug output for configuration and detection process
- [x] Context-aware config file priority system for multiple configs
- [x] WordPress native plugin loading - relies on WordPress's built-in plugin system
- [x] Debug helper function for troubleshooting class loading issues
- [x] **Multiple WordPress installations support** - Context-aware detection and bootstrapping

# Multiple WordPress Installations Support

Tinkersan now supports workspaces with multiple WordPress installations. The extension intelligently detects and bootstraps the correct WordPress instance based on:

## Detection Priority (Context-Aware)

1. **Config file closest to current active file** - Finds `.tinkersan.json` by traversing up from the current file
2. **WordPress root by traversing up from current file** - Searches for WordPress signatures in parent directories
3. **All WordPress installations analysis** - Finds all WordPress roots and selects the closest one to the current file
4. **Fallback to first found installation** - Uses the first WordPress installation found in the workspace

## How It Works

- **Context-aware execution**: Each time you run code, Tinkersan detects the WordPress installation closest to your current file
- **Multiple config support**: You can have different `.tinkersan.json` configs for different WordPress installations
- **Plugin-specific configs**: Configs in plugin directories take priority when editing plugin files
- **Automatic detection**: No manual configuration needed - works out of the box with multiple WordPress sites

## Testing and Debugging

### Debug Commands

1. **`Tinkersan: Debug Multiple WordPress Detection`** - Shows all detected WordPress installations and which one is selected for the current context
2. **`Tinkersan: Show Debug Log`** - Shows detailed detection logs
3. Enable **verbose logging** in settings for detailed detection process logs

### Testing Steps

1. **Copy the test file**: Copy `examples/test-multiple-wp.php` to each WordPress installation's `.tinkersan` folder
2. **Test each installation**:
   - Open the test file in the first WordPress installation
   - Run the code (Ctrl+Enter / Cmd+Enter)
   - Note the WordPress root, site URL, and database name
   - Open the test file in the second WordPress installation
   - Run the code again
   - Compare the output - they should show different WordPress installations

### Expected Behavior

When working correctly, you should see:
- Different WordPress root paths
- Different site URLs
- Different database names
- Different active plugins (if the installations have different plugins)

### Troubleshooting

If you're getting the same WordPress installation for different files:

1. **Enable verbose logging**: Set `tinkersan.verboseLogging` to `true` in settings
2. **Run the debug command**: Use `Tinkersan: Debug Multiple WordPress Detection`
3. **Check the debug output**: Look for detection logs in the "Tinkersan Debug" output channel
4. **Verify WordPress signatures**: Make sure each WordPress installation has the required files:
   - `wp-config.php`
   - `wp-load.php`
   - `wp-settings.php`
   - `wp-content/` directory
   - `wp-includes/` directory
   - `wp-admin/` directory

### Common Issues

1. **WordPress not detected**: Check if the directory has all required WordPress signature files
2. **Wrong WordPress selected**: The detection prioritizes the WordPress installation closest to your current file
3. **Same URL for different installations**: This indicates the same WordPress installation is being used - check the detection logs

## Example Workspace Structure

```
workspace/
├── site1/
│   ├── wp-config.php
│   ├── wp-content/plugins/my-plugin/
│   │   └── .tinkersan/
│   │       └── .tinkersan.json  # Config for site1
│   └── .tinkersan/
│       └── test-site1.php
├── site2/
│   ├── wp-config.php
│   ├── wp-content/
│   └── .tinkersan/
│       ├── .tinkersan.json      # Config for site2
│       └── test-site2.php
└── .tinkersan/
    └── .tinkersan.json          # Global config (fallback)
```

When editing files in `site1/`, Tinkersan will automatically use the WordPress installation in `site1/`. When editing files in `site2/`, it will use the WordPress installation in `site2/`.

## Configuration

Each WordPress installation can have its own `.tinkersan.json` config:

```json
{
    "wordpressRoot": ".",
    "framework": "WordPress",
    "settings": {
        "verboseLogging": true
    }
}
```

The `wordpressRoot` path is relative to the `.tinkersan` folder containing the config file.