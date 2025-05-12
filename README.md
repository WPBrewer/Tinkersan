# Tinkersan

A PHP Tinker Tool for VS Code. Debug and test PHP code in WordPress directly in VS Code.

## Features
- Execute PHP code in framework context (Currentlyt support WordPress)
- Auto-detect framework from project structure

## Supported Frameworks
- **WordPress**: Complete integration with WordPress core and WooCommerce

## Requirements
- PHP 7.4+
- Framework specific requirements:
  - WordPress: WordPress installation

## Configuration
- `tinkersan.projectPath`: Path to the PHP project
- `tinkersan.framework`: Framework to use (WordPress)

## Usage
1. Set project path in settings (or it will use your workspace root)
2. Select framework or use auto-detection
3. Create new tinker file: `Ctrl+Shift+P` -> `Tinkersan: New PHP File`
4. Write PHP code with framework support
5. Run code: `Ctrl+Enter` or `Cmd+Enter` on Mac