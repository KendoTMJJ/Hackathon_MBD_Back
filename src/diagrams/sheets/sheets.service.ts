import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Sheet } from '../../entities/sheet/sheet';
import { Document } from '../../entities/document/document';
import { Collaborator } from '../../entities/collaborator/collaborator';
import { CreateSheetDto } from './dto/create-sheet.dto';
import { UpdateSheetDto } from './dto/update-sheet.dto';

/**
 * Service for managing sheet operations including CRUD and shared link access
 */
@Injectable()
export class SheetsService {
  private sheets: Repository<Sheet>;
  private documents: Repository<Document>;
  private collaborators: Repository<Collaborator>;

  constructor(private readonly ds: DataSource) {
    this.sheets = ds.getRepository(Sheet);
    this.documents = ds.getRepository(Document);
    this.collaborators = ds.getRepository(Collaborator);
  }

  // ---------- MAIN CRUD ----------

  /**
   * Creates a new sheet in a document
   * @param documentId - The document ID where the sheet will be created
   * @param dto - Data for creating the sheet
   * @param userSub - User subject identifier for permission validation
   * @returns The created sheet
   */
  async create(
    documentId: string,
    dto: CreateSheetDto,
    userSub: string,
  ): Promise<Sheet> {
    await this.canEdit(documentId, userSub);

    const document = await this.findDocument(documentId);
    const nextOrder = await this.getNextOrder(documentId);

    const newSheet = this.sheets.create({
      name: dto.name,
      data: dto.data ?? { nodes: [], edges: [] },
      orderIndex: nextOrder,
      documentId,
    });

    return this.sheets.save(newSheet);
  }

  /**
   * Lists all sheets in a document
   * @param documentId - The document ID to list sheets from
   * @param userSub - User subject identifier for permission validation
   * @returns Array of sheets in the document
   */
  async listByDocument(documentId: string, userSub: string): Promise<Sheet[]> {
    await this.canRead(documentId, userSub);
    return this.sheets.find({
      where: { documentId, isActive: true },
      order: { orderIndex: 'ASC' },
    });
  }

  /**
   * Retrieves a specific sheet by ID
   * @param sheetId - The sheet ID to retrieve
   * @param userSub - User subject identifier for permission validation
   * @returns The requested sheet
   */
  async get(sheetId: string, userSub: string): Promise<Sheet> {
    const sheet = await this.findSheetWithRelations(sheetId);
    await this.canRead(sheet.documentId, userSub);
    return sheet;
  }

  /**
   * Updates a sheet with new data
   * @param sheetId - The sheet ID to update
   * @param dto - Data for updating the sheet
   * @param userSub - User subject identifier for permission validation
   * @returns The updated sheet
   */
  async update(
    sheetId: string,
    dto: UpdateSheetDto,
    userSub: string,
  ): Promise<Sheet> {
    const sheet = await this.findSheetWithRelations(sheetId);
    await this.canEdit(sheet.documentId, userSub);

    Object.assign(sheet, {
      name: dto.name ?? sheet.name,
      data: dto.data ?? sheet.data,
      orderIndex: dto.orderIndex ?? sheet.orderIndex,
    });

    return this.sheets.save(sheet);
  }

  /**
   * Deletes a sheet (soft delete)
   * @param sheetId - The sheet ID to delete
   * @param userSub - User subject identifier for permission validation
   */
  async delete(sheetId: string, userSub: string): Promise<void> {
    const sheet = await this.findSheetWithRelations(sheetId);
    await this.canEdit(sheet.documentId, userSub);

    const activeCount = await this.countActiveSheets(sheet.documentId);
    if (activeCount <= 1)
      throw new BadRequestException('Cannot delete the last sheet');

    await this.sheets.update(sheetId, { isActive: false });
  }

  /**
   * Reorders sheets in a document
   * @param documentId - The document ID containing the sheets
   * @param sheetIds - Array of sheet IDs in desired order
   * @param userSub - User subject identifier for permission validation
   */
  async reorder(
    documentId: string,
    sheetIds: string[],
    userSub: string,
  ): Promise<void> {
    await this.canEdit(documentId, userSub);

    await this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(Sheet);
      await Promise.all(
        sheetIds.map((id, index) =>
          repo.update({ id, documentId }, { orderIndex: index }),
        ),
      );
    });
  }

  // ---------- SHARED LINK METHODS ----------

  /**
   * Updates a sheet via shared link access
   * @param sheetId - The sheet ID to update
   * @param updateData - Data to update the sheet with
   * @param documentId - The document ID for validation
   * @returns The updated sheet
   */
  async updateViaSharedLink(
    sheetId: string,
    updateData: any,
    documentId: string,
  ) {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId, documentId },
    });
    if (!sheet) throw new NotFoundException('Sheet not found');

    await this.sheets.update(sheetId, updateData);
    return this.findSheet(sheetId);
  }

  /**
   * Creates a sheet via shared link access
   * @param documentId - The document ID where the sheet will be created
   * @param dto - Data for creating the sheet
   * @param sharedLink - The shared link object for validation
   * @returns The created sheet
   */
  async createViaSharedLink(
    documentId: string,
    dto: CreateSheetDto,
    sharedLink: any,
  ): Promise<Sheet> {
    const actualDocId = sharedLink.documentId || sharedLink.document?.id;
    if (!actualDocId)
      throw new BadRequestException('Document ID not found in shared link');
    if (documentId && actualDocId !== documentId)
      throw new ForbiddenException('Shared link does not match document');

    const document = await this.findDocument(actualDocId);
    const nextOrder = await this.getNextOrder(actualDocId);

    const newSheet = this.sheets.create({
      name: dto.name,
      data: dto.data ?? { nodes: [], edges: [] },
      orderIndex: nextOrder,
      documentId: actualDocId,
    });

    try {
      return await this.sheets.save(newSheet);
    } catch (error) {
      throw new BadRequestException(`Error creating sheet: ${error.message}`);
    }
  }

  /**
   * Deletes a sheet via shared link access
   * @param sheetId - The sheet ID to delete
   * @param sharedLink - The shared link object for validation
   */
  async deleteViaSharedLink(sheetId: string, sharedLink: any): Promise<void> {
    const sheet = await this.findSheetWithDocument(sheetId);
    if (!sheet.isActive) return;

    const docId = sharedLink.documentId || sharedLink.document?.id;
    if (!docId)
      throw new BadRequestException('Document ID not found in shared link');
    if (docId !== sheet.documentId)
      throw new ForbiddenException('Shared link does not match sheet document');
    if (sharedLink.permission !== 'edit')
      throw new ForbiddenException('Shared link does not have edit permission');

    const activeCount = await this.countActiveSheets(sheet.documentId);
    if (activeCount <= 1)
      throw new BadRequestException('Cannot delete the last active sheet');

    await this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(Sheet);
      const result = await repo.update(sheetId, {
        isActive: false,
        updatedAt: new Date(),
      });
      if (result.affected === 0)
        throw new BadRequestException('Failed to delete sheet');
    });
  }

  /**
   * Lists sheets in a document via shared link access
   * @param documentId - The document ID to list sheets from
   * @param sharedLink - The shared link object for validation
   * @returns Array of sheets in the document
   */
  async listByDocumentViaSharedLink(
    documentId: string,
    sharedLink: any,
  ): Promise<Sheet[]> {
    const docId = sharedLink.documentId || sharedLink.document?.id;
    if (!docId)
      throw new BadRequestException('Document ID not found in shared link');
    if (docId !== documentId)
      throw new ForbiddenException('Shared link does not match document');

    return this.sheets
      .createQueryBuilder('sheet')
      .where('sheet.documentId = :docId', { docId })
      .andWhere('sheet.isActive = TRUE')
      .orderBy('sheet.orderIndex', 'ASC')
      .getMany();
  }

  /**
   * Applies a patch to a sheet with version control for collaborative editing
   * @param input - Object containing patch application parameters
   * @param input.sheetId - The sheet ID to update
   * @param input.baseVersion - The client's current version for optimistic locking
   * @param input.nodes - Optional new nodes array
   * @param input.edges - Optional new edges array
   * @param input.patch - Optional patch object for partial updates
   * @param input.actor - Identifier of the user making the change
   * @returns The updated sheet state with new version
   */
  async applyPatchWithVersion(input: {
    sheetId: string;
    baseVersion: number;
    nodes?: any[];
    edges?: any[];
    patch?: any;
    actor: string;
  }) {
    const sheet = await this.sheets.findOne({ where: { id: input.sheetId } });
    if (!sheet) throw new NotFoundException('Sheet not found');

    // If client is outdated, return current state
    if ((input.baseVersion ?? 0) < (sheet.version ?? 0)) {
      const data = sheet.data ?? { nodes: [], edges: [] };
      return {
        sheetId: sheet.id,
        documentId: sheet.documentId,
        nodes: data.nodes ?? [],
        edges: data.edges ?? [],
        version: sheet.version ?? 0,
      };
    }

    const current = sheet.data ?? { nodes: [], edges: [] };

    // Support 'patch' if using json-patch; for now merge "full state"
    const next = {
      nodes: Array.isArray(input.nodes) ? input.nodes : (current.nodes ?? []),
      edges: Array.isArray(input.edges) ? input.edges : (current.edges ?? []),
    };

    const newVersion = (sheet.version ?? 0) + 1;

    await this.sheets.update(
      { id: input.sheetId },
      {
        data: next,
        version: newVersion,
        updatedAt: new Date(),
      },
    );

    return {
      sheetId: sheet.id,
      documentId: sheet.documentId,
      ...next,
      version: newVersion,
    };
  }

  // ---------- PRIVATE METHODS ----------

  /**
   * Validates if user has read permission for a document
   * @param documentId - The document ID to check
   * @param userSub - User subject identifier
   */
  private async canRead(documentId: string, userSub: string): Promise<void> {
    const document = await this.getDocumentWithPermissions(
      documentId,
      userSub,
      ['owner', 'editor', 'reader'],
    );
    if (!document)
      throw new ForbiddenException('No permission to access this document');
  }

  /**
   * Validates if user has edit permission for a document
   * @param documentId - The document ID to check
   * @param userSub - User subject identifier
   */
  private async canEdit(documentId: string, userSub: string): Promise<void> {
    const document = await this.getDocumentWithPermissions(
      documentId,
      userSub,
      ['owner', 'editor'],
    );
    if (!document)
      throw new ForbiddenException('No permission to edit this document');
  }

  /**
   * Retrieves a document with user permission validation
   * @param documentId - The document ID to retrieve
   * @param userSub - User subject identifier
   * @param roles - Array of allowed roles for access
   * @returns The document if user has permission
   */
  private getDocumentWithPermissions(
    documentId: string,
    userSub: string,
    roles: string[],
  ) {
    return this.documents
      .createQueryBuilder('d')
      .leftJoin('d.collaborators', 'c')
      .leftJoin('d.project', 'p')
      .where('d.id = :documentId', { documentId })
      .andWhere(
        '(d.created_by = :userSub OR p.owner_sub = :userSub OR (c.user_sub = :userSub AND c.role IN (:...roles)))',
        { userSub, roles },
      )
      .getOne();
  }

  /**
   * Finds a sheet by its ID
   * @param sheetId - The sheet ID to find
   * @returns The found sheet or null
   */
  private findSheet(sheetId: string) {
    return this.sheets.findOne({ where: { id: sheetId } });
  }

  /**
   * Finds a document by ID
   * @param id - The document ID to find
   * @returns The found document
   */
  private async findDocument(id: string): Promise<Document> {
    const document = await this.documents.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  /**
   * Finds a sheet with its relations by ID
   * @param id - The sheet ID to find
   * @returns The found sheet with relations
   */
  private async findSheetWithRelations(id: string): Promise<Sheet> {
    const sheet = await this.sheets.findOne({
      where: { id },
      relations: ['document', 'document.project', 'document.sheets'],
    });
    if (!sheet) throw new NotFoundException('Sheet not found');
    return sheet;
  }

  /**
   * Finds a sheet with its document relation by ID
   * @param id - The sheet ID to find
   * @returns The found sheet with document relation
   */
  private async findSheetWithDocument(id: string): Promise<Sheet> {
    const sheet = await this.sheets.findOne({
      where: { id },
      relations: ['document'],
    });
    if (!sheet) throw new NotFoundException('Sheet not found');
    return sheet;
  }

  /**
   * Gets the next order index for a new sheet
   * @param documentId - The document ID
   * @returns The next order index
   */
  private async getNextOrder(documentId: string): Promise<number> {
    const { maxOrder } = await this.sheets
      .createQueryBuilder('s')
      .select('MAX(s.order_index)', 'maxOrder')
      .where('s.document_id = :documentId', { documentId })
      .getRawOne();
    return (maxOrder ?? -1) + 1;
  }

  /**
   * Counts active sheets in a document
   * @param documentId - The document ID
   * @returns The number of active sheets
   */
  private countActiveSheets(documentId: string) {
    return this.sheets.count({ where: { documentId, isActive: true } });
  }
}
