import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FrameworkBootstrapper, FrameworkBootstrapperFactory } from './FrameworkBootstrapper';
import { WordPressBootstrapper } from './WordPressBootstrapper';
import { LaravelBootstrapper } from './LaravelBootstrapper';
import { GenericPhpBootstrapper } from './GenericPhpBootstrapper';

// Register built-in bootstrappers in order of detection priority
FrameworkBootstrapperFactory.register(new LaravelBootstrapper());
FrameworkBootstrapperFactory.register(new WordPressBootstrapper());
FrameworkBootstrapperFactory.register(new GenericPhpBootstrapper());

// Load custom bootstrappers
loadCustomBootstrappers();

// Function to load custom bootstrappers from user configuration
export function loadCustomBootstrappers() {
    try {
        const config = vscode.workspace.getConfiguration('tinkersan');
        const customBootstrapperPaths = config.get<string[]>('customBootstrappers') || [];
        
        for (const bootstrapperPath of customBootstrapperPaths) {
            try {
                if (!bootstrapperPath) continue;
                
                // Handle relative paths based on workspace folders
                let resolvedPath = bootstrapperPath;
                if (!path.isAbsolute(bootstrapperPath) && vscode.workspace.workspaceFolders) {
                    // Try to resolve relative to workspace folders
                    const workspaceFolder = vscode.workspace.workspaceFolders[0];
                    resolvedPath = path.join(workspaceFolder.uri.fsPath, bootstrapperPath);
                }
                
                // Check if the file exists
                if (!fs.existsSync(resolvedPath)) {
                    console.warn(`Custom bootstrapper not found: ${resolvedPath}`);
                    continue;
                }
                
                // Require the bootstrapper
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const customModule = require(resolvedPath);
                
                // Look for a class that implements FrameworkBootstrapper
                for (const key in customModule) {
                    const ExportedClass = customModule[key];
                    if (typeof ExportedClass === 'function') {
                        try {
                            const instance = new ExportedClass();
                            
                            // Check if it has all required methods
                            if (typeof instance.detect === 'function' &&
                                typeof instance.getBootstrapCode === 'function' &&
                                typeof instance.getName === 'function' &&
                                typeof instance.getCompletions === 'function') {
                                
                                // Register the bootstrapper
                                FrameworkBootstrapperFactory.register(instance);
                                console.log(`Registered custom bootstrapper: ${instance.getName()}`);
                            }
                        } catch (err) {
                            console.error(`Error instantiating custom bootstrapper: ${err}`);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error loading custom bootstrapper: ${bootstrapperPath}`, err);
            }
        }
    } catch (err) {
        console.error('Error loading custom bootstrappers:', err);
    }
}

export {
    FrameworkBootstrapper,
    FrameworkBootstrapperFactory,
    WordPressBootstrapper,
    LaravelBootstrapper,
    GenericPhpBootstrapper
}; 