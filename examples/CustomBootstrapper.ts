/**
 * Example custom bootstrapper for Tinkersan (TypeScript version)
 * 
 * This file demonstrates how to create a custom framework bootstrapper
 * for Tinkersan using TypeScript. You'll need to compile this file
 * to JavaScript before using it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FrameworkBootstrapper } from '../src/frameworks/FrameworkBootstrapper';

/**
 * Example bootstrapper for Symfony
 */
export class SymfonyBootstrapper implements FrameworkBootstrapper {
    public detect(basePath: string): boolean {
        // Check for Symfony-specific files/directories
        return (
            fs.existsSync(path.join(basePath, 'bin', 'console')) &&
            fs.existsSync(path.join(basePath, 'src', 'Kernel.php'))
        );
    }
    
    public getBootstrapCode(basePath: string): string {
        // Convert backslashes to forward slashes for PHP
        const cleanPath = basePath.replace(/\\/g, '/');
        const autoloadPath = path.join(cleanPath, 'vendor', 'autoload.php').replace(/\\/g, '/');
        
        return `
// Set working directory to the Symfony root
chdir('${cleanPath}');

// Check if autoload file exists
if (!file_exists('${autoloadPath}')) {
    die('Symfony autoload file not found at ${autoloadPath}');
}

// Load composer autoloader
require_once '${autoloadPath}';

// Load environment variables from .env file
if (file_exists('${path.join(cleanPath, '.env').replace(/\\/g, '/')}')) {
    \\Symfony\\Component\\Dotenv\\Dotenv::load('${path.join(cleanPath, '.env').replace(/\\/g, '/')}');
}

// Boot the kernel
$kernel = new \\App\\Kernel($_SERVER['APP_ENV'] ?? 'dev', $_SERVER['APP_DEBUG'] ?? true);
$kernel->boot();

// Get the container
$container = $kernel->getContainer();

// Setup Tinkersan variable
global $tinkersan;
$tinkersan = new \\stdClass();
$tinkersan->framework = 'Symfony';
$tinkersan->kernel = $kernel;
$tinkersan->container = $container;
$tinkersan->environment = $kernel->getEnvironment();

// Import common Symfony classes
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\HttpFoundation\\Response;
use Doctrine\\ORM\\EntityManagerInterface;

// Get the entity manager
$entityManager = $container->get('doctrine')->getManager();
$tinkersan->entityManager = $entityManager;
`;
    }
    
    public getName(): string {
        return 'Symfony';
    }
    
    public getCompletions(): any[] {
        return [
            {
                label: '$container->get',
                kind: 15, // Function
                insertText: '$container->get(\'${1:service_id}\')',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get a service from the container'
            },
            {
                label: '$entityManager->getRepository',
                kind: 15, // Function
                insertText: '$entityManager->getRepository(${1:Entity}::class)',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Get an entity repository'
            },
            {
                label: '$entityManager->persist',
                kind: 15, // Function
                insertText: '$entityManager->persist(${1:$entity});',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Persist an entity'
            },
            {
                label: '$entityManager->flush',
                kind: 15, // Function
                insertText: '$entityManager->flush();',
                insertTextRules: 4, // InsertAsSnippet
                documentation: 'Flush changes to the database'
            }
        ];
    }
} 