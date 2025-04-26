import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for framework bootstrappers
 */
export interface FrameworkBootstrapper {
    /**
     * Detect if this framework is present in the current project
     */
    detect(basePath: string): boolean;
    
    /**
     * Get the PHP code needed to bootstrap this framework
     */
    getBootstrapCode(basePath: string): string;
    
    /**
     * Get the name of this framework
     */
    getName(): string;
    
    /**
     * Get framework-specific auto-completions
     */
    getCompletions(): any[];
}

/**
 * Factory to get the appropriate bootstrapper
 */
export class FrameworkBootstrapperFactory {
    private static bootstrappers: FrameworkBootstrapper[] = [];
    
    /**
     * Register a bootstrapper
     */
    public static register(bootstrapper: FrameworkBootstrapper): void {
        this.bootstrappers.push(bootstrapper);
    }
    
    /**
     * Get a bootstrapper by name
     */
    public static getByName(name: string): FrameworkBootstrapper | undefined {
        return this.bootstrappers.find(b => b.getName().toLowerCase() === name.toLowerCase());
    }
    
    /**
     * Auto-detect the framework from the project
     */
    public static detect(basePath: string): FrameworkBootstrapper | undefined {
        for (const bootstrapper of this.bootstrappers) {
            if (bootstrapper.detect(basePath)) {
                return bootstrapper;
            }
        }
        return undefined;
    }
    
    /**
     * Get all registered bootstrappers
     */
    public static getAll(): FrameworkBootstrapper[] {
        return this.bootstrappers;
    }
} 