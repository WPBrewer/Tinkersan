import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class WordPressDetector {
    private static outputChannel: vscode.OutputChannel | null = null;

    /**
     * Get or create output channel for logging
     */
    private static getOutputChannel(): vscode.OutputChannel {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('Tinkersan Debug');
        }
        return this.outputChannel;
    }

    /**
     * Log debug information if verbose logging is enabled
     */
    private static log(message: string, force: boolean = false): void {
        const config = vscode.workspace.getConfiguration('tinkersan');
        const verboseLogging = config.get<boolean>('verboseLogging', false);
        
        if (verboseLogging || force) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${message}`;
            
            this.getOutputChannel().appendLine(logMessage);
            console.log(`Tinkersan: ${logMessage}`);
        }
    }

    /**
     * Show debug output channel
     */
    public static showDebugOutput(): void {
        this.getOutputChannel().show();
    }

    /**
     * WordPress signature files to check
     */
    private static readonly WP_SIGNATURE_FILES = [
        'wp-config.php',
        'wp-load.php',
        'wp-settings.php'
    ];

    /**
     * WordPress signature directories to check
     */
    private static readonly WP_SIGNATURE_DIRS = [
        'wp-content',
        'wp-includes',
        'wp-admin'
    ];

    /**
     * Check if a directory is a WordPress root
     */
    public static isWordPressRoot(dirPath: string): boolean {
        try {
            // Check for at least 2 signature files
            const foundFiles = this.WP_SIGNATURE_FILES.filter(file => 
                fs.existsSync(path.join(dirPath, file))
            );
            
            // Check for at least 2 signature directories
            const foundDirs = this.WP_SIGNATURE_DIRS.filter(dir => {
                const dirFullPath = path.join(dirPath, dir);
                return fs.existsSync(dirFullPath) && fs.statSync(dirFullPath).isDirectory();
            });

            return foundFiles.length >= 2 && foundDirs.length >= 2;
        } catch (error) {
            return false;
        }
    }

    /**
     * Find WordPress root from a given path by traversing up
     */
    public static findWordPressRoot(startPath: string): string | null {
        let currentPath = startPath;
        const root = path.parse(currentPath).root;

        while (currentPath !== root) {
            if (this.isWordPressRoot(currentPath)) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
        }

        return null;
    }

    /**
     * Auto-detect WordPress root from workspace
     */
    public static autoDetectWordPressRoot(): string | null {
        this.log('=== Starting WordPress Auto-Detection ===', true);
        
        // 1. Check for .tinkersan config file first
        this.log('Step 1: Checking for .tinkersan config file...');
        const configPath = this.findTinkersanConfig();
        if (configPath) {
            this.log(`Found config file at: ${configPath}`, true);
            const wpRoot = this.readWordPressRootFromConfig(configPath);
            if (wpRoot && this.isWordPressRoot(wpRoot)) {
                this.log(`✅ WordPress root from config: ${wpRoot}`, true);
                this.log(`Config file used: ${configPath}`, true);
                return wpRoot;
            }
            
            this.log(`Config path invalid or not WordPress root: ${wpRoot}`);
            
            // If config exists but path is invalid, try to find WordPress from config location
            const configDir = path.dirname(configPath);
            this.log(`Trying to find WordPress from config directory: ${configDir}`);
            const wpRootFromConfig = this.findWordPressRoot(configDir);
            if (wpRootFromConfig) {
                this.log(`✅ WordPress root found from config location: ${wpRootFromConfig}`, true);
                this.log(`Config file used: ${configPath}`, true);
                return wpRootFromConfig;
            }
        } else {
            this.log('No .tinkersan config file found');
        }

        // 2. Check workspace folders
        this.log('Step 2: Checking workspace folders...');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                this.log(`Checking workspace folder: ${folder.uri.fsPath}`);
                
                // Check if workspace root is WordPress
                if (this.isWordPressRoot(folder.uri.fsPath)) {
                    this.log(`✅ WordPress root found at workspace root: ${folder.uri.fsPath}`, true);
                    this.log('Detection method: Workspace root', true);
                    return folder.uri.fsPath;
                }

                // Search for WordPress in common subdirectories
                this.log('Checking common subdirectories...');
                const commonPaths = [
                    'public_html',
                    'public',
                    'www',
                    'htdocs',
                    'wordpress',
                    'wp'
                ];

                for (const subPath of commonPaths) {
                    const fullPath = path.join(folder.uri.fsPath, subPath);
                    this.log(`Checking: ${fullPath}`);
                    if (fs.existsSync(fullPath) && this.isWordPressRoot(fullPath)) {
                        this.log(`✅ WordPress root found in subdirectory: ${fullPath}`, true);
                        this.log(`Detection method: Common subdirectory (${subPath})`, true);
                        return fullPath;
                    }
                }

                // Try to find WordPress root from current file location
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    const currentFilePath = path.dirname(activeEditor.document.uri.fsPath);
                    this.log(`Checking from current file location: ${currentFilePath}`);
                    const wpRoot = this.findWordPressRoot(currentFilePath);
                    if (wpRoot) {
                        this.log(`✅ WordPress root found from current file: ${wpRoot}`, true);
                        this.log('Detection method: Current file traversal', true);
                        return wpRoot;
                    }
                }

                // Try to find WordPress root from .tinkersan folder location if it exists
                const tinkersanDir = path.join(folder.uri.fsPath, '.tinkersan');
                if (fs.existsSync(tinkersanDir)) {
                    this.log(`Checking from .tinkersan directory: ${tinkersanDir}`);
                    const wpRoot = this.findWordPressRoot(tinkersanDir);
                    if (wpRoot) {
                        this.log(`✅ WordPress root found from .tinkersan folder: ${wpRoot}`, true);
                        this.log('Detection method: .tinkersan folder traversal', true);
                        return wpRoot;
                    }
                }

                // Search recursively in plugin directories for .tinkersan folders
                this.log('Searching in plugin directories...');
                const pluginDirs = [
                    'wp-content/plugins',
                    'wp-content/mu-plugins'
                ];

                for (const pluginDir of pluginDirs) {
                    const pluginPath = path.join(folder.uri.fsPath, pluginDir);
                    if (fs.existsSync(pluginPath)) {
                        this.log(`Scanning plugin directory: ${pluginPath}`);
                        const wpRootFromPlugins = this.searchTinkersanInPlugins(pluginPath);
                        if (wpRootFromPlugins) {
                            this.log(`✅ WordPress root found from plugin directory: ${wpRootFromPlugins}`, true);
                            this.log('Detection method: Plugin directory scan', true);
                            return wpRootFromPlugins;
                        }
                    }
                }
            }
        } else {
            this.log('No workspace folders found');
        }

        this.log('❌ WordPress root not found through auto-detection', true);
        return null;
    }

    /**
     * Search for .tinkersan folders in plugin directories and find WordPress root from them
     */
    private static searchTinkersanInPlugins(pluginDir: string): string | null {
        try {
            const plugins = fs.readdirSync(pluginDir);
            
            for (const plugin of plugins) {
                const pluginPath = path.join(pluginDir, plugin);
                
                // Skip if not a directory
                if (!fs.statSync(pluginPath).isDirectory()) {
                    continue;
                }
                
                // Check if this plugin has a .tinkersan folder
                const tinkersanPath = path.join(pluginPath, '.tinkersan');
                if (fs.existsSync(tinkersanPath)) {
                    // Try to find WordPress root from this location
                    const wpRoot = this.findWordPressRoot(tinkersanPath);
                    if (wpRoot) {
                        return wpRoot;
                    }
                }
            }
        } catch (error) {
            // Ignore errors when scanning plugin directories
        }
        
        return null;
    }

    /**
     * Find .tinkersan config file in workspace with context-aware priority
     */
    private static findTinkersanConfig(): string | null {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return null;
        }

        const configNames = ['.tinkersan.json', 'tinkersan.json'];
        const foundConfigs: string[] = [];
        
        // First, collect all possible config files
        for (const folder of workspaceFolders) {
            // Check in .tinkersan folder first
            const tinkersanDir = path.join(folder.uri.fsPath, '.tinkersan');
            if (fs.existsSync(tinkersanDir)) {
                for (const configName of configNames) {
                    const configPath = path.join(tinkersanDir, configName);
                    if (fs.existsSync(configPath)) {
                        foundConfigs.push(configPath);
                    }
                }
            }
            
            // Then check in workspace root (for backward compatibility)
            for (const configName of configNames) {
                const configPath = path.join(folder.uri.fsPath, configName);
                if (fs.existsSync(configPath)) {
                    foundConfigs.push(configPath);
                }
            }

            // Check in plugin directories for .tinkersan configs
            const pluginDirs = ['wp-content/plugins', 'wp-content/mu-plugins'];
            for (const pluginDir of pluginDirs) {
                const pluginPath = path.join(folder.uri.fsPath, pluginDir);
                if (fs.existsSync(pluginPath)) {
                    try {
                        const plugins = fs.readdirSync(pluginPath);
                        for (const plugin of plugins) {
                            const pluginFullPath = path.join(pluginPath, plugin);
                            if (fs.statSync(pluginFullPath).isDirectory()) {
                                const pluginTinkersanDir = path.join(pluginFullPath, '.tinkersan');
                                if (fs.existsSync(pluginTinkersanDir)) {
                                    for (const configName of configNames) {
                                        const configPath = path.join(pluginTinkersanDir, configName);
                                        if (fs.existsSync(configPath)) {
                                            foundConfigs.push(configPath);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        // Ignore errors when scanning plugin directories
                    }
                }
            }
        }

        if (foundConfigs.length === 0) {
            this.log('No config files found');
            return null;
        }

        if (foundConfigs.length === 1) {
            this.log(`Found single config file: ${foundConfigs[0]}`);
            return foundConfigs[0];
        }

        // Multiple configs found - use context-aware priority
        this.log(`Found multiple config files: ${foundConfigs.join(', ')}`);
        
        // Priority 1: Config file closest to the current active file
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const currentFilePath = activeEditor.document.uri.fsPath;
            this.log(`Current file: ${currentFilePath}`);
            
            // Find the config file that's in the same directory tree as the current file
            let closestConfig: string | null = null;
            let closestDistance = Infinity;
            
            for (const configPath of foundConfigs) {
                const configDir = path.dirname(configPath);
                
                // Check if current file is within this config's directory tree
                if (currentFilePath.startsWith(configDir)) {
                    const distance = currentFilePath.replace(configDir, '').split(path.sep).length;
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestConfig = configPath;
                    }
                }
            }
            
            if (closestConfig) {
                this.log(`Using closest config to current file: ${closestConfig}`, true);
                return closestConfig;
            }
        }

        // Priority 2: Plugin-specific configs (if we're in a plugin context)
        const pluginConfigs = foundConfigs.filter(config => 
            config.includes('wp-content/plugins/') || config.includes('wp-content/mu-plugins/')
        );
        
        if (pluginConfigs.length > 0) {
            // If current file is in a plugin, prefer that plugin's config
            if (activeEditor) {
                const currentFilePath = activeEditor.document.uri.fsPath;
                for (const pluginConfig of pluginConfigs) {
                    const pluginDir = path.dirname(path.dirname(pluginConfig)); // Go up from .tinkersan to plugin root
                    if (currentFilePath.startsWith(pluginDir)) {
                        this.log(`Using plugin-specific config: ${pluginConfig}`, true);
                        return pluginConfig;
                    }
                }
            }
            
            // Otherwise use the first plugin config found
            this.log(`Using first plugin config: ${pluginConfigs[0]}`, true);
            return pluginConfigs[0];
        }

        // Priority 3: Workspace .tinkersan folder configs
        const workspaceTinkersanConfigs = foundConfigs.filter(config => 
            config.includes('/.tinkersan/') && !config.includes('wp-content/')
        );
        
        if (workspaceTinkersanConfigs.length > 0) {
            this.log(`Using workspace .tinkersan config: ${workspaceTinkersanConfigs[0]}`, true);
            return workspaceTinkersanConfigs[0];
        }

        // Priority 4: Workspace root configs (backward compatibility)
        const rootConfigs = foundConfigs.filter(config => 
            !config.includes('/.tinkersan/') && !config.includes('wp-content/')
        );
        
        if (rootConfigs.length > 0) {
            this.log(`Using workspace root config: ${rootConfigs[0]}`, true);
            return rootConfigs[0];
        }

        // Fallback: Use the first config found
        this.log(`Using fallback config: ${foundConfigs[0]}`, true);
        return foundConfigs[0];
    }

    /**
     * Read WordPress root from config file
     */
    private static readWordPressRootFromConfig(configPath: string): string | null {
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);
            
            if (config.wordpressRoot) {
                // Handle relative paths
                if (!path.isAbsolute(config.wordpressRoot)) {
                    return path.resolve(path.dirname(configPath), config.wordpressRoot);
                }
                return config.wordpressRoot;
            }
        } catch (error) {
            console.error('Error reading tinkersan config:', error);
        }

        return null;
    }

    /**
     * Create a sample config file
     */
    public static createSampleConfig(targetPath: string): void {
        // Determine if config is being created in .tinkersan folder
        const isInTinkersanFolder = targetPath.includes('.tinkersan');
        
        // Try to auto-detect the correct WordPress root path
        let wordpressRoot = isInTinkersanFolder ? ".." : ".";
        
        if (isInTinkersanFolder) {
            // Get the directory where .tinkersan folder is located
            const tinkersanDir = path.dirname(targetPath);
            const parentDir = path.dirname(tinkersanDir);
            
            // Try to find WordPress root from this location
            const detectedWpRoot = this.findWordPressRoot(parentDir);
            if (detectedWpRoot) {
                // Calculate relative path from .tinkersan folder to WordPress root
                wordpressRoot = path.relative(tinkersanDir, detectedWpRoot);
                
                // Ensure we use forward slashes for cross-platform compatibility
                wordpressRoot = wordpressRoot.replace(/\\/g, '/');
                
                // If it's empty (same directory), use "."
                if (!wordpressRoot) {
                    wordpressRoot = ".";
                }
            }
        }
        
        const sampleConfig = {
            wordpressRoot: wordpressRoot,
            framework: "WordPress",
            customBootstrappers: [],
            settings: {
                autoDetect: true,
                showDetectionNotice: true,
                verboseLogging: false
            }
        };

        // Ensure directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
            targetPath, 
            JSON.stringify(sampleConfig, null, 4),
            'utf8'
        );
    }

    /**
     * Context-aware WordPress root detection for multiple WordPress installations
     * This method prioritizes the WordPress installation closest to the current active file
     */
    public static autoDetectWordPressRootForCurrentContext(): string | null {
        this.log('=== Starting Context-Aware WordPress Detection ===', true);
        
        const activeEditor = vscode.window.activeTextEditor;
        let currentFilePath: string | null = null;
        
        if (activeEditor) {
            currentFilePath = activeEditor.document.uri.fsPath;
            this.log(`Current active file: ${currentFilePath}`, true);
        }

        // 1. First priority: Find config file closest to current file
        if (currentFilePath) {
            this.log('Step 1: Looking for config file closest to current file...');
            const contextConfig = this.findTinkersanConfigForFile(currentFilePath);
            if (contextConfig) {
                this.log(`Found context-specific config: ${contextConfig}`, true);
                const wpRoot = this.readWordPressRootFromConfig(contextConfig);
                if (wpRoot && this.isWordPressRoot(wpRoot)) {
                    this.log(`✅ WordPress root from context config: ${wpRoot}`, true);
                    return wpRoot;
                }
            }
        }

        // 2. Second priority: Find WordPress root by traversing up from current file
        if (currentFilePath) {
            this.log('Step 2: Traversing up from current file...');
            const wpRootFromFile = this.findWordPressRoot(path.dirname(currentFilePath));
            if (wpRootFromFile) {
                this.log(`✅ WordPress root found from current file traversal: ${wpRootFromFile}`, true);
                return wpRootFromFile;
            }
        }

        // 3. Third priority: Find all WordPress installations and choose the closest one
        this.log('Step 3: Finding all WordPress installations in workspace...');
        const allWordPressRoots = this.findAllWordPressRoots();
        
        if (allWordPressRoots.length === 0) {
            this.log('❌ No WordPress installations found', true);
            return null;
        }

        if (allWordPressRoots.length === 1) {
            this.log(`✅ Single WordPress installation found: ${allWordPressRoots[0]}`, true);
            return allWordPressRoots[0];
        }

        // Multiple WordPress installations found
        this.log(`Found ${allWordPressRoots.length} WordPress installations: ${allWordPressRoots.join(', ')}`, true);

        if (currentFilePath) {
            // Find the closest WordPress root to the current file
            let closestRoot: string | null = null;
            let shortestDistance = Infinity;

            for (const wpRoot of allWordPressRoots) {
                if (currentFilePath.startsWith(wpRoot)) {
                    const distance = currentFilePath.replace(wpRoot, '').split(path.sep).length;
                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        closestRoot = wpRoot;
                    }
                }
            }

            if (closestRoot) {
                this.log(`✅ Closest WordPress root to current file: ${closestRoot}`, true);
                return closestRoot;
            }
        }

        // Fallback to the first WordPress installation found
        this.log(`Using fallback WordPress root: ${allWordPressRoots[0]}`, true);
        return allWordPressRoots[0];
    }

    /**
     * Find all WordPress installations in the workspace
     */
    public static findAllWordPressRoots(): string[] {
        const wordpressRoots: string[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders) {
            return wordpressRoots;
        }

        for (const folder of workspaceFolders) {
            // Check workspace root
            if (this.isWordPressRoot(folder.uri.fsPath)) {
                wordpressRoots.push(folder.uri.fsPath);
            }

            // Check common subdirectories
            const commonPaths = [
                'public_html',
                'public',
                'www',
                'htdocs',
                'wordpress',
                'wp'
            ];

            for (const subPath of commonPaths) {
                const fullPath = path.join(folder.uri.fsPath, subPath);
                if (fs.existsSync(fullPath) && this.isWordPressRoot(fullPath)) {
                    wordpressRoots.push(fullPath);
                }
            }

            // Recursively search for WordPress installations
            this.searchWordPressRootsRecursively(folder.uri.fsPath, wordpressRoots, 3); // Max depth of 3
        }

        // Remove duplicates
        return [...new Set(wordpressRoots)];
    }

    /**
     * Recursively search for WordPress installations
     */
    private static searchWordPressRootsRecursively(dirPath: string, foundRoots: string[], maxDepth: number): void {
        if (maxDepth <= 0) {
            return;
        }

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const fullPath = path.join(dirPath, entry.name);
                    
                    // Skip common non-WordPress directories
                    if (entry.name.startsWith('.') || 
                        entry.name === 'node_modules' || 
                        entry.name === 'vendor') {
                        continue;
                    }

                    if (this.isWordPressRoot(fullPath)) {
                        foundRoots.push(fullPath);
                    } else {
                        // Continue searching recursively
                        this.searchWordPressRootsRecursively(fullPath, foundRoots, maxDepth - 1);
                    }
                }
            }
        } catch (error) {
            // Ignore permission errors or other issues
        }
    }

    /**
     * Find .tinkersan config file closest to a specific file
     */
    private static findTinkersanConfigForFile(filePath: string): string | null {
        const configNames = ['.tinkersan.json', 'tinkersan.json'];
        let currentDir = path.dirname(filePath);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!workspaceRoot) {
            return null;
        }

        // Traverse up from the file location
        while (currentDir.startsWith(workspaceRoot)) {
            // Check for config in .tinkersan folder
            const tinkersanDir = path.join(currentDir, '.tinkersan');
            if (fs.existsSync(tinkersanDir)) {
                for (const configName of configNames) {
                    const configPath = path.join(tinkersanDir, configName);
                    if (fs.existsSync(configPath)) {
                        return configPath;
                    }
                }
            }

            // Check for config in current directory
            for (const configName of configNames) {
                const configPath = path.join(currentDir, configName);
                if (fs.existsSync(configPath)) {
                    return configPath;
                }
            }

            // Move up one directory
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break; // Reached filesystem root
            }
            currentDir = parentDir;
        }

        return null;
    }
} 