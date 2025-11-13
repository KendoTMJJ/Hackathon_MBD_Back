export function createMockQueryBuilder(overrides?: {
  getManyResult?: any[];
  getOneResult?: any | undefined;
  executeResult?: any;
}) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(overrides?.getManyResult ?? []),
    getOne: jest.fn().mockResolvedValue(overrides?.getOneResult ?? undefined),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest
      .fn()
      .mockResolvedValue(overrides?.executeResult ?? { raw: [] }),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  };
  return qb;
}
