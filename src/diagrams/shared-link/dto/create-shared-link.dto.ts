export class CreateShareLinkDto {
  scope?: 'document' | 'project';
  projectId?: string | null;
  documentId?: string | null;

  // Front legacy
  permission?: 'read' | 'edit';

  // Back nativo
  minRole?: 'reader' | 'editor';

  expiresAt?: string | null;
  maxUses?: number | null;
  password?: string | null;
}
