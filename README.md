# Plataforma de diagramas colaborativos (Hackathon)

Autores: Diego Esteban Buitrago Jimenez, Santiago Corredor Contreras, Manuel Santiago Martínez Sierra, Juan Esteban Tovar Arias y Jose Julian Tobito Montoya

Este documento describe la estructura, configuración y uso del proyecto desarrollado para la hackatón. El sistema está compuesto por un backend en NestJS y un frontend en React + TypeScript + Vite para la creación de diagramas colaborativos orientados a seguridad.

## 1. URL de la página

La aplicación web se ejecuta localmente en la siguiente URL:

- Frontend (interfaz web): http://localhost:5173/
- Ejemplos de rutas internas:
  - http://localhost:5173/home (pantalla de inicio)
  - http://localhost:5173/documents (gestión de documentos)
  - http://localhost:5173/templates (gestión de plantillas)
  - http://localhost:5173/Board (editor de diagramas)
- Backend (API REST y Swagger): http://localhost:3000/api

## 2. Descripción del proyecto

La plataforma permite crear proyectos, documentos y diagramas para representar la arquitectura de red y servicios de seguridad de una organización. Los usuarios pueden trabajar con plantillas, crear nuevos diagramas en blanco, gestionar documentos y, a nivel de backend, exponer un API seguro con autenticación mediante JWT (Auth0) sobre una base de datos PostgreSQL.

Tecnologías usadas en el backend (NestJS):

- @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/websockets
- @nestjs/swagger y swagger-ui-express (documentación del API)
- @nestjs/typeorm, typeorm, typeorm-naming-strategies
- pg (driver PostgreSQL)
- @nestjs/passport, passport, passport-jwt (autenticación JWT)
- jsonwebtoken, jwks-rsa, jose
- class-validator, class-transformer
- bcrypt
- rxjs, reflect-metadata

Tecnologías usadas en el frontend:

- React
- TypeScript
- Vite (herramienta de build y desarrollo)

## 3. Estructura del proyecto

A continuación se muestra una estructura simplificada del backend en NestJS:

```text
src/
  main.ts
  app.module.ts
  auth/
    auth.module.ts
    jwt.service.ts
    jwt.strategy.ts
  config/
    conexion/
      conexion.module.ts
  diagrams/
    diagrams.module.ts
    projects/
      projects.controller.ts
      projects.service.ts
      dto/
    documents/
      documents.controller.ts
      documents.service.ts
      dto/
    sheets/
      sheets.controller.ts
      sheets.service.ts
      dto/
    templates/
      templates.controller.ts
      templates.service.ts
      dto/
    shared-link/
      shared-links.controller.ts
      shared-links.service.ts
      dto/
    collab/
      collab.gateway.ts
      collab.module.ts
      collab.service.ts
    tecnologies/
      technologies.controller.ts
      technologies.service.ts
      dto/
  entities/
    project/project.ts
    document/document.ts
    sheet/sheet.ts
    collaborator/collaborator.ts
    snapshot/snapshot.ts
    shared-link/shared-link.ts
    tecnologie/tecnology.ts
test/
  jest-e2e.json
  utils/
    mock-query-builder.ts
    mock-repo.ts
```

## 4. Explicación de las carpetas

src/  
Carpeta principal del código fuente del backend.

src/auth/  
Contiene la lógica de autenticación y la estrategia JWT integrada con Auth0.

src/config/conexion/  
Módulo que configura la conexión a la base de datos PostgreSQL mediante TypeORM (host, puerto, usuario, contraseña, etc.).

src/diagrams/  
Módulo principal del dominio de diagramas. Agrupa la lógica de proyectos, documentos, sheets, plantillas, tecnologías, enlaces compartidos y colaboración en tiempo real.

- projects/: CRUD de proyectos del usuario.
- documents/: gestión de documentos asociados a proyectos.
- sheets/: manejo de hojas (sheets) dentro de cada documento.
- templates/: administración de plantillas reutilizables.
- shared-link/: creación y gestión de enlaces compartidos.
- tecnologies/: catálogo de tecnologías relacionadas con el modelo de seguridad.
- collab/: gateway y servicios de colaboración en tiempo real mediante WebSockets.

src/entities/  
Define las entidades de TypeORM (Project, Document, Sheet, Collaborator, Snapshot, ShareLink, Technology, etc.).

test/  
Contiene la configuración y utilidades para pruebas end-to-end (E2E) con Jest.

## 5. Configuración y entorno

La configuración principal del proyecto se gestiona mediante variables de entorno en el archivo .env, por ejemplo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=user_node
DB_PASS=123456
DB_NAME=bd_hackathon

PORT=3000

AUTH0_DOMAIN=dev-xdof4hp3jpof7z5k.us.auth0.com
AUTH0_AUDIENCE=https://api.diagrams.local
```

El archivo src/config/conexion/conexion.module.ts lee estas variables, inicializa el DataSource de TypeORM y registra las entidades.

Opcionalmente se puede usar docker-compose para levantar la base de datos PostgreSQL y el backend en contenedores separados.

## 6. Cómo ejecutar el proyecto

1. Opción A – Ejecutar con Docker:
   - Clonar el repositorio y ubicarse en la carpeta del backend.
   - Configurar el archivo .env con los datos de la base de datos y Auth0.
   - Levantar los servicios con el comando:

```bash
docker compose up --build
```

2. Opción B – Ejecutar localmente (sin Docker):
   - Instalar dependencias con npm install.
   - Crear la base de datos PostgreSQL (por ejemplo, bd_hackathon).
   - Verificar que las variables de entorno de la BD coinciden con la configuración local.
   - Ejecutar el servidor en modo desarrollo:

```bash
npm run start:dev
```

Una vez levantado el backend, la documentación del API estará disponible en http://localhost:3000/api.

## 7. Peticiones disponibles (endpoints)

A continuación se presenta un resumen de los endpoints principales expuestos por el backend (ruta base http://localhost:3000):

| Recurso | Ruta | Método | Descripción |
| --- | --- | --- | --- |
| Proyectos | /projects | GET | Lista los proyectos del usuario autenticado. |
| Proyectos | /projects | POST | Crea un nuevo proyecto. |
| Proyectos | /projects/:id | GET | Obtiene un proyecto específico. |
| Documentos | /documents?projectId=... | GET | Lista los documentos de un proyecto. |
| Documentos | /documents | POST | Crea un documento dentro de un proyecto. |
| Documentos | /documents/:id | GET | Obtiene un documento por ID. |
| Documentos | /documents/:id | PATCH | Actualiza un documento. |
| Documentos | /documents/:id | DELETE | Elimina un documento. |
| Sheets | /documents/:id/sheets | GET | Lista las sheets de un documento. |
| Sheets | /documents/:id/sheets | POST | Crea una nueva sheet para el documento. |
| Tecnologías | /technologies | GET | Lista todas las tecnologías registradas. |
| Tecnologías | /technologies/by-name/:name | GET | Busca una tecnología por su nombre. |
| Share links | /share-links | POST | Crea un enlace compartido para un documento. |
| Share links | /share-links?documentId=... | GET | Lista enlaces compartidos de un documento. |
| Share links | /share-links/:slug | GET | Previsualiza un enlace compartido. |
| Share links | /share-links/:slug/accept | POST | Acepta/consume un enlace compartido. |
| Share links | /share-links/:id | PATCH | Revoca un enlace compartido. |

La mayoría de estas peticiones requieren autenticación vía JWT en la cabecera Authorization: Bearer <TOKEN>.

## 8. Arquitectura del proyecto

A nivel de dominio, el sistema se organiza alrededor de las entidades Project, Document, Sheet, Collaborator, Snapshot, ShareLink y Technology. Un Project agrupa varios Document; cada Document tiene múltiples Sheet, puede tener varios colaboradores y enlaces compartidos y puede almacenar Snapshots como versiones históricas.

En términos de arquitectura de software, el backend sigue el patrón típico de NestJS: módulos independientes por contexto de negocio (projects, documents, templates, technologies, etc.), controladores para las rutas HTTP, servicios para la lógica de negocio y entidades TypeORM para el acceso a datos. La comunicación en tiempo real se implementa mediante un WebSocketGateway en el namespace /collab.
