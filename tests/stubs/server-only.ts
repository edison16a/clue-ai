/**
 * Test stub for the `server-only` package.
 *
 * The real package is a build-time guard: it throws on import unless the
 * bundler resolved it under Next's `react-server` condition, which is how a
 * server module accidentally imported into client code becomes a build error
 * rather than a leaked secret.
 *
 * Vitest does not run under that condition, so importing a server module in a
 * test hits the throwing build. Stubbing it keeps the guard active in the real
 * build (where it matters) while letting the tests exercise the same
 * modules Next ships.
 */
export {};
