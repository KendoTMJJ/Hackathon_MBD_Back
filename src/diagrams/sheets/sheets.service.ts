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

    // Obtener el siguiente orderIndex
    const maxOrder = await this.sheets
      .createQueryBuilder('s')
      .select('MAX(s.order_index)', 'maxOrder')
      .where('s.document_id = :documentId', { documentId })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    return this.sheets.save(
      this.sheets.create({
        name: dto.name,
        data: dto.data ?? { nodes: [], edges: [] },
        orderIndex: nextOrder,
        documentId,
      }),
    );
  }

  async listByDocument(documentId: string, userSub: string): Promise<Sheet[]> {
    await this.canRead(documentId, userSub);

    return this.sheets.find({
      where: { documentId, isActive: true },
      order: { orderIndex: 'ASC' },
    });
  }

  async get(sheetId: string, userSub: string): Promise<Sheet> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId },
      relations: ['document'],
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
      relations: ['document'],
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    await this.canEdit(sheet.documentId, userSub);

    // Actualizar campos
    if (dto.name !== undefined) sheet.name = dto.name;
    if (dto.data !== undefined) sheet.data = dto.data;
    if (dto.orderIndex !== undefined) sheet.orderIndex = dto.orderIndex;

    return this.sheets.save(sheet);
  }

  async delete(sheetId: string, userSub: string): Promise<void> {
    const sheet = await this.sheets.findOne({
      where: { id: sheetId },
      relations: ['document'],
    });

    if (!sheet) {
      throw new NotFoundException('Sheet not found');
    }

    await this.canEdit(sheet.documentId, userSub);

    // Verificar que no sea la única hoja
    const sheetsCount = await this.sheets.count({
      where: { documentId: sheet.documentId, isActive: true },
    });

    if (sheetsCount <= 1) {
      throw new BadRequestException('Cannot delete the last sheet');
    }

    // Soft delete
    await this.sheets.update(sheetId, { isActive: false });
  }

  async reorder(
    documentId: string,
    sheetIds: string[],
    userSub: string,
  ): Promise<void> {
    await this.canEdit(documentId, userSub);

    // Actualizar orden en transacción
    await this.ds.transaction(async (manager) => {
      const sheetRepo = manager.getRepository(Sheet);
      
      for (let i = 0; i < sheetIds.length; i++) {
        await sheetRepo.update(
          { id: sheetIds[i], documentId },
          { orderIndex: i }
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
        { userSub, roles: ['owner', 'editor', 'viewer'] }
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
        { userSub, roles: ['owner', 'editor'] }
      )
      .getOne();

    if (!document) {
      throw new ForbiddenException('No permission to edit this document');
    }
  }
}