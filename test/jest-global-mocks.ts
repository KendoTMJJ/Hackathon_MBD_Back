jest.mock('src/entities/tecnologie/tecnology', () => ({
  Technology: class {},
}));

jest.mock('src/entities/template/template', () => ({
  Template: class {},
}));

jest.mock('src/entities/project/project', () => ({
  Project: class {},
}));

jest.mock('src/entities/document/document', () => ({
  Document: class {},
}));

jest.mock('src/entities/sheet/sheet', () => ({
  Sheet: class {},
}));
