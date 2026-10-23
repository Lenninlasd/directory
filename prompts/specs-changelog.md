DO NOT write any code. We are going to draft the specification for the first feature. Please read `docs/constitution.md`.

Initial idea: Display a directory listing of businesses in Alameda del Río.

Your task:
1. Ask me questions, ONE BY ONE, to clarify any ambiguities (edge ​​cases, error handling, what is excluded from the MVP). Maximum of 6 questions.
2. Based on my answers, generate `spec.md` using the following structure: context and objective, users, user stories, numbered functional requirements (FR-x) with acceptance criteria in EARS notation (in English), non-functional requirements, edge cases, out-of-scope items, completion criteria, and any open questions marked as [NEEDS CLARIFICATION].
3. Focus on the WHAT and the WHY. Do not include details regarding the tech stack, architecture, or file names—those will be addressed in the plan.

This the initial complete list:
Campo,Tipo SQL (PostgreSQL / Aurora DSQL),Tipo TypeScript,Requerido (NOT NULL),Descripción / Validación
description,TEXT,string | null,No,Reseña o descripción comercial.
logo_url,TEXT,string | null,No,URL del logo/imagen de perfil.
cover_image_url,TEXT,string | null,No,URL de la imagen de portada/local.
exact_address,VARCHAR(255),string | null,No,"Dirección detallada (ej: 'Conjunto Piamonte, Torre 3, Apto 502')."
latitude,"DECIMAL(10, 8)",number | null,No,Coordenada de latitud (ej: 10.9878).
longitude,"DECIMAL(11, 8)",number | null,No,Coordenada de longitud (ej: -74.8123).
email,VARCHAR(150),string | null,No,Correo de contacto. Formato email válido.
instagram_handle,VARCHAR(100),string | null,No,Usuario de Instagram sin @.
catalog_url,TEXT,string | null,No,Link al menú o catálogo de WhatsApp (wa.me/c/...).
opening_hours,JSONB,"Record<string, string> | null",No,"Objeto de horarios por día/rango (ej: {""mon_fri"": ""08:00-18:00""})."
has_home_delivery,BOOLEAN,boolean,Sí,true si ofrece domicilios. Default true.
payment_methods,TEXT[],string[],Sí,"Array de métodos aceptados (ej: ['Nequi', 'Cash']). Default {}."
verification_status,VARCHAR(20),'unverified' | 'claimed_by_owner' | 'verified',Sí,Estado de auditoría. Default 'unverified'.
created_at,TIMESTAMPTZ,string,Sí,Fecha de creación. Default NOW().
updated_at,TIMESTAMPTZ,string,Sí,Fecha de última actualización. Default NOW().

this is the initial to show elements to show:
Campo,Tipo SQL (PostgreSQL / Aurora DSQL),Tipo TypeScript,Requerido (NOT NULL),Descripción / Validación
id,UUID,string,Sí,Identificador único (gen_random_uuid()). Primary Key.
name,VARCHAR(150),string,Sí,Nombre comercial del negocio.
slug,VARCHAR(150),string,Sí,Identificador de URL amigable. Índice UNIQUE.
category,VARCHAR(50),string,Sí,"Categoría principal (ej: 'Food & Drinks', 'Supermarket')."
whatsapp_number,VARCHAR(20),string,Sí,Número en formato internacional (E.164: +573001234567).
is_physical_store,BOOLEAN,boolean,Sí,true si es local en CC; false si es apto/domicilio. Default false.
location_summary,VARCHAR(100),string,Sí,Ubicación corta para la tarjeta (ej: 'CC Jardín del Río').
is_active,BOOLEAN,boolean,Sí,Flag para visibilidad en el directorio. Default true.