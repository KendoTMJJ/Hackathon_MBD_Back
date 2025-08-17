import { Injectable, NotFoundException } from "@nestjs/common"
import { Repository, DataSource } from "typeorm"
import { CreateTemplateDto } from "./dto/create-template.dto"
import { UpdateTemplateDto } from "./dto/update-template.dto"
import { DocumentsService } from "../documents/documents.service"
import { Template } from "src/entities/template/template"
import { InjectRepository } from "@nestjs/typeorm"

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template) // aquí sí
    private readonly templatesRepository: Repository<Template>,
    private readonly documentsService: DocumentsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createTemplateDto: CreateTemplateDto, createdBy: string): Promise<Template> {
    return await this.dataSource.transaction(async (manager) => {
      const template = manager.create(Template, {
        title: createTemplateDto.title,
        data: createTemplateDto.data,
        createdBy,
      })

      const savedTemplate = await manager.save(template)

      await this.documentsService.create(
        {
          title: createTemplateDto.title,
          kind: "template",
          data: createTemplateDto.data,
          projectId: createTemplateDto.projectId,
          templateId: savedTemplate.id,
        },
        createdBy,
      )

      return savedTemplate
    })
  }

  async findAll(): Promise<Template[]> {
    return await this.templatesRepository.find({
      where: { isArchived: false },
      order: { createdAt: "DESC" },
    })
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templatesRepository.findOne({
      where: { id, isArchived: false },
    })

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`)
    }

    return template
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    await this.templatesRepository.update(
      { id, version: updateTemplateDto.version },
      {
        title: updateTemplateDto.title,
        data: updateTemplateDto.data,
      },
    )

    return await this.findOne(id)
  }

  async archive(id: string): Promise<Template> {
    const template = await this.findOne(id)
    template.isArchived = true
    return await this.templatesRepository.save(template)
  }

  async remove(id: string): Promise<void> {
    await this.templatesRepository.update(id, { isArchived: true })
  }

  async findByCreator(createdBy: string): Promise<Template[]> {
    return await this.templatesRepository.find({
      where: { createdBy, isArchived: false },
      order: { createdAt: "DESC" },
    })
  }
}
