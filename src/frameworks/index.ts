import { FrameworkBootstrapper, FrameworkBootstrapperFactory } from './FrameworkBootstrapper';
import { WordPressBootstrapper } from './WordPressBootstrapper';
import { LaravelBootstrapper } from './LaravelBootstrapper';
import { GenericPhpBootstrapper } from './GenericPhpBootstrapper';

// Register bootstrappers in order of detection priority
FrameworkBootstrapperFactory.register(new LaravelBootstrapper());
FrameworkBootstrapperFactory.register(new WordPressBootstrapper());
FrameworkBootstrapperFactory.register(new GenericPhpBootstrapper());

export {
    FrameworkBootstrapper,
    FrameworkBootstrapperFactory,
    WordPressBootstrapper,
    LaravelBootstrapper,
    GenericPhpBootstrapper
}; 