# Tinkersan

PHP Tinker for VS Code. Debug and test PHP code in WordPress, Laravel, and any PHP application directly in VS Code.

## Features
- Execute PHP code in framework context (WordPress, Laravel, or generic PHP)
- Auto-detect framework from project structure
- Debug framework-specific functions and classes
- Framework-specific code completions
- Create and manage tinker files
- Save and load code snippets
- Detailed logging option
- **Custom bootstrappers**: Add support for your own frameworks

## Supported Frameworks
- **WordPress**: Complete integration with WordPress core and WooCommerce
- **Laravel**: Full support for Laravel, Eloquent, and Facades
- **Generic PHP**: Support for any PHP application with Composer
- **Custom Frameworks**: Create your own bootstrapper for any PHP framework

## Requirements
- PHP 7.4+
- (Optional) Composer for loading dependencies
- Framework specific requirements:
  - WordPress: WordPress installation
  - Laravel: Laravel project with artisan

## Configuration
- `tinkersan.projectPath`: Path to the PHP project
- `tinkersan.framework`: Framework to use (auto/WordPress/Laravel/PHP)
- `tinkersan.snippetsFolder`: Folder for saved snippets
- `tinkersan.showDetailLog`: Enable detailed logs
- `tinkersan.enableTableView`: Enable table view for arrays/objects
- `tinkersan.customBootstrappers`: Array of paths to custom bootstrapper files

## Usage
1. Set project path in settings (or it will use your workspace root)
2. Select framework or use auto-detection
3. Create new tinker file: `Ctrl+Shift+P` -> `Tinkersan: New PHP File`
4. Write PHP code with framework support
5. Run code: `Ctrl+Enter` or `Cmd+Enter` on Mac

## Custom Framework Bootstrappers

Tinkersan allows you to add support for your own frameworks by creating custom bootstrapper files.

### Creating a Custom Bootstrapper

1. Create a JavaScript file (e.g., `MyFrameworkBootstrapper.js`) with a class that implements:
   - `detect(basePath)`: Detect if the framework is present
   - `getBootstrapCode(basePath)`: Return PHP code to bootstrap the framework
   - `getName()`: Return the name of the framework
   - `getCompletions()`: Return code completion suggestions

2. Add the path to your settings:
   ```json
   "tinkersan.customBootstrappers": [
     "./path/to/MyFrameworkBootstrapper.js"
   ]
   ```

3. Restart VS Code or reload window

### Example Custom Bootstrapper

See the [examples folder](./examples) for sample custom bootstrappers for:
- CakePHP (JavaScript)
- Symfony (TypeScript) 