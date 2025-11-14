/**
 * Jest mocks for TypeORM entity classes.
 * These mocks replace the actual entity definitions during unit testing,
 * preventing TypeORM decorators and metadata initialization from running.
 * This avoids the need for an active database connection or entity metadata
 * during isolated unit tests and ensures tests remain fast and lightweight.
 */

jest.mock('src/entities/tecnologie/tecnology', () => ({
  /**
   * Mock Technology entity used in tests.
   * The class is intentionally empty, as unit tests typically
   * validate service logic, not ORM behavior.
   */
  Technology: class {},
}));

jest.mock('src/entities/template/template', () => ({
  /**
   * Mock Template entity to bypass TypeORM decorators.
   */
  Template: class {},
}));

jest.mock('src/entities/project/project', () => ({
  /**
   * Mock Project entity to avoid initializing schema metadata.
   */
  Project: class {},
}));

jest.mock('src/entities/document/document', () => ({
  /**
   * Mock Document entity used in tests where entity shape is irrelevant.
   */
  Document: class {},
}));

jest.mock('src/entities/sheet/sheet', () => ({
  /**
   * Mock Sheet entity to ensure isolated service/controller tests
   * run without TypeORM requiring full entity definitions.
   */
  Sheet: class {},
}));
