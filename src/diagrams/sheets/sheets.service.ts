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

  async create(
    documentId: string,
    dto: CreateSheetDto,
    userSub: string,
  ): Promise<Sheet> {
    await this.canEdit(documentId, userSub);
    const document = await this.documents.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const maxOrder = await this.sheets
      .createQueryBuilder('s')
      .select('MAX(s.order_index)', 'maxOrder')
      .where('s.document_id = :documentId', { documentId })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const newSheet = this.sheets.create({
      name: dto.name,
      data: dto.data ?? { nodes: [], edges: [] },
      orderIndex: nextOrder,
      documentId: documentId, 
    });

    return this.sheets.save(newSheet);
  }

  async listByDocument(documentId: string, userSub: string): Promise<Sheet[]> {
    await this.canRead(documentId, userSub);

    const activeSheets = await this.sheets.find({
      where: { documentId, isActive: true },
      order: { orderIndex: 'ASC' },
    });

    return activeSheets;
  }

  async get(sheetId: string, userSub: string): Promise<Sheet> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId },
      relations: ['document', 'document.project', 'document.sheets'],
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    await this.canRead(sheet.documentId, userSub);
    return sheet;
  }

  async update(
    sheetId: string,
    dto: UpdateSheetDto,
    userSub: string,
  ): Promise<Sheet> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId },
      relations: ['document', 'document.project', 'document.sheets'],
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    await this.canEdit(sheet.documentId, userSub);

    if (dto.name !== undefined) sheet.name = dto.name;
    if (dto.data !== undefined) sheet.data = dto.data;
    if (dto.orderIndex !== undefined) sheet.orderIndex = dto.orderIndex;

    return this.sheets.save(sheet);
  }

  async delete(sheetId: string, userSub: string): Promise<void> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId },
      relations: ['document', 'document.project', 'document.sheets'],
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    await this.canEdit(sheet.documentId, userSub);

    const sheetsCount = await this.sheets.count({
      where: { documentId: sheet.documentId, isActive: true },
    });

    if (sheetsCount <= 1) {
      throw new BadRequestException('Cannot delete the last sheet');
    }

    await this.sheets.update({ id: sheetId }, { isActive: false });
  }

  async reorder(
    documentId: string,
    sheetIds: string[],
    userSub: string,
  ): Promise<void> {
    await this.canEdit(documentId, userSub);

    await this.ds.transaction(async (manager) => {
      const sheetRepo = manager.getRepository(Sheet);

      for (let i = 0; i < sheetIds.length; i++) {
        await sheetRepo.update(
          { id: sheetIds[i], documentId },
          { orderIndex: i },
        );
      }
    });
  }

  // ---------- Permisos ----------
  private async canRead(documentId: string, userSub: string): Promise<void> {
    const document = await this.documents
      .createQueryBuilder('d')
      .leftJoin('d.collaborators', 'c')
      .leftJoin('d.project', 'p')
      .where('d.id = :documentId', { documentId })
      .andWhere(
        '(d.created_by = :userSub OR p.owner_sub = :userSub OR (c.user_sub = :userSub AND c.role IN (:...roles)))',
        { userSub, roles: ['owner', 'editor', 'viewer'] },
      )
      .getOne();

    if (!document) {
      throw new ForbiddenException('No permission to access this document');
    }
  }

  private async canEdit(documentId: string, userSub: string): Promise<void> {
    const document = await this.documents
      .createQueryBuilder('d')
      .leftJoin('d.collaborators', 'c')
      .leftJoin('d.project', 'p')
      .where('d.id = :documentId', { documentId })
      .andWhere(
        '(d.created_by = :userSub OR p.owner_sub = :userSub OR (c.user_sub = :userSub AND c.role IN (:...roles)))',
        { userSub, roles: ['owner', 'editor'] },
      )
      .getOne();

    if (!document) {
      throw new ForbiddenException('No permission to edit this document');
    }
  }

  async updateViaSharedLink(
    sheetId: string,
    updateData: any,
    documentId: string,
  ): Promise<Sheet> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId, documentId },
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    await this.sheets.update(sheetId, updateData);

    const updatedSheet = await this.sheets.findOne({
      where: { id: sheetId },
    });

    if (!updatedSheet) {
      throw new NotFoundException('Sheet not found after update');
    }

    return updatedSheet;
  }

  async createViaSharedLink(
    documentId: string,
    dto: CreateSheetDto,
    sharedLink: any,
  ): Promise<Sheet> {
    const actualDocumentId = sharedLink.documentId || sharedLink.document?.id;

    if (!actualDocumentId) {
      throw new BadRequestException('Document ID not found in shared link');
    }

    const finalDocumentId = actualDocumentId;

    if (documentId && finalDocumentId !== documentId) {
      throw new ForbiddenException('Shared link does not match document');
    }

    const document = await this.documents.findOne({
      where: { id: finalDocumentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const maxOrder = await this.sheets
      .createQueryBuilder('s')
      .select('MAX(s.order_index)', 'maxOrder')
      .where('s.document_id = :documentId', { documentId: finalDocumentId })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const newSheet = this.sheets.create({
      name: dto.name,
      data: dto.data ?? { nodes: [], edges: [] },
      orderIndex: nextOrder,
      documentId: finalDocumentId, 
    });

    try {
      const savedSheet = await this.sheets.save(newSheet);
      return savedSheet;
    } catch (error) {
      throw new BadRequestException(`Error creating sheet: ${error.message}`);
    }
  }

  async deleteViaSharedLink(sheetId: string, sharedLink: any): Promise<void> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId }, 
      relations: ['document'],
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    if (!sheet.isActive) {
      return;
    }

    const actualDocumentId = sharedLink.documentId || sharedLink.document?.id;

    if (!actualDocumentId) {
      throw new BadRequestException('Document ID not found in shared link');
    }

    if (actualDocumentId !== sheet.documentId) {
      throw new ForbiddenException('Shared link does not match sheet document');
    }

    if (sharedLink.permission !== 'edit') {
      throw new ForbiddenException('Shared link does not have edit permission');
    }

    const activeSheetCount = await this.sheets.count({
      where: { documentId: sheet.documentId, isActive: true },
    });

    if (activeSheetCount <= 1) {
      throw new BadRequestException('Cannot delete the last active sheet');
    }

    try {
      await this.ds.transaction(async (manager) => {
        const sheetRepo = manager.getRepository(Sheet);

        const updateResult = await sheetRepo.update(sheetId, {
          isActive: false,
          updatedAt: new Date(),
        });

        if (updateResult.affected === 0) {
          throw new BadRequestException('Failed to delete sheet');
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async listByDocumentViaSharedLink(
    documentId: string,
    sharedLink: any,
  ): Promise<Sheet[]> {
    const actualDocumentId = sharedLink.documentId || sharedLink.document?.id;

    if (!actualDocumentId) {
      throw new BadRequestException('Document ID not found in shared link');
    }

    if (actualDocumentId !== documentId) {
      throw new ForbiddenException('Shared link does not match document');
    }

    const activeSheetsQueryBuilder = await this.sheets
      .createQueryBuilder('sheet')
      .where('sheet.documentId = :documentId', { documentId: actualDocumentId })
      .andWhere('sheet.isActive = :isActive', { isActive: true })
      .orderBy('sheet.orderIndex', 'ASC')
      .getMany();

    return activeSheetsQueryBuilder;
  }
}
