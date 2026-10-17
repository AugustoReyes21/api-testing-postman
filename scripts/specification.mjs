const string = { type: 'string', minLength: 1 };
const id = { type: 'integer', minimum: 1 };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const item = object({ product: { type: 'string', minLength: 1, maxLength: 80, pattern: '\\S' }, quantity: { type: 'integer', minimum: 1, maximum: 100 }, unitPriceCents: { type: 'integer', minimum: 1, maximum: 1000000 } });
const status = { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] };
export const schemas = {
  LoginInput: object({ email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 8, maxLength: 128 } }),
  OrderInput: object({ items: { type: 'array', minItems: 1, maxItems: 20, items: item }, currency: { type: 'string', enum: ['GTQ', 'USD'] } }),
  StatusInput: object({ status }),
  Login: object({ accessToken: { type: 'string', minLength: 32 }, tokenType: { const: 'Bearer', type: 'string' }, expiresIn: { type: 'integer', const: 3600 }, user: object({ id, email: { type: 'string', format: 'email' } }) }),
  Order: object({ id, ownerId: id, items: { type: 'array', minItems: 1, maxItems: 20, items: item }, currency: { type: 'string', enum: ['GTQ', 'USD'] }, totalCents: { type: 'integer', minimum: 1, maximum: 2000000000 }, status, version: { type: 'integer', minimum: 1 }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } }),
  Error: object({ error: object({ code: { type: 'string', enum: ['UNAUTHORIZED', 'INVALID_CREDENTIALS', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'INVALID_JSON', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'INTERNAL_ERROR'] }, message: string, details: { type: 'array', items: { type: 'string' } }, requestId: { type: 'string', format: 'uuid' } }) }),
  Health: object({ status: { type: 'string', const: 'ok' }, storage: { type: 'string', const: 'sqlite' } }),
};
schemas.OrderList = object({ data: { type: 'array', items: schemas.Order }, pagination: object({ page: { type: 'integer', minimum: 1, maximum: 1000000 }, limit: { type: 'integer', minimum: 1, maximum: 50 }, total: { type: 'integer', minimum: 0 }, totalPages: { type: 'integer', minimum: 0 } }) });
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const json = name => ({ 'application/json': { schema: ref(name) } });
const headers = { 'X-Request-Id': { description: 'UUID de correlación; no contiene credenciales.', schema: { type: 'string', format: 'uuid' } }, 'Cache-Control': { description: 'Se evita almacenar respuestas con datos de sesión o pedidos.', schema: { type: 'string', const: 'no-store' } } };
const ok = (name, description, moreHeaders = {}) => ({ description, headers: { ...headers, ...moreHeaders }, content: json(name) });
const error = (description, unauthorized = false) => ({ ...ok('Error', description), ...(unauthorized ? { headers: { ...headers, 'WWW-Authenticate': { description: 'Desafío Bearer.', schema: { type: 'string', const: 'Bearer' } } } } : {}) });
const common = { '400': error('JSON malformado o datos inválidos.'), '401': error('Token ausente, inválido o vencido.', true), '413': error('Cuerpo mayor de 32 KB.'), '415': error('Content-Type distinto de application/json.'), '500': error('Error interno sin detalles de implementación.') };
const parameterId = { name: 'id', in: 'path', required: true, description: 'Identificador entero positivo generado por SQLite.', schema: { type: 'integer', minimum: 1, maximum: 9007199254740991 } };
const body = name => ({ required: true, content: json(name) });
export const specification = {
  openapi: '3.1.0', jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  info: { title: 'API académica de pedidos', version: '1.0.0', description: 'Práctica local con usuarios ficticios. Los importes son centavos enteros. Los pedidos solo son accesibles por su propietario. Las contraseñas no se guardan en texto plano; los tokens opacos expiran en una hora. No es un servicio de producción.' },
  servers: [{ url: 'http://127.0.0.1:3000', description: 'Servidor local de la práctica' }],
  tags: [{ name: 'Diagnóstico', description: 'Estado del servidor' }, { name: 'Autenticación', description: 'Sesiones ficticias' }, { name: 'Pedidos', description: 'Recursos de cada propietario' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': { get: { operationId: 'health', summary: 'Comprobar disponibilidad', tags: ['Diagnóstico'], security: [], responses: { '200': ok('Health', 'Servidor funcionando.'), '500': common['500'] } } },
    '/auth/login': { post: { operationId: 'login', summary: 'Autenticar usuario', description: 'Usar las credenciales ficticias generadas con npm run seed. No existe registro público de usuarios. Una sesión expira a los 3600 segundos.', tags: ['Autenticación'], security: [], requestBody: body('LoginInput'), responses: { '200': ok('Login', 'Sesión creada. No publicar el token.'), '400': common['400'], '401': error('Email o contraseña incorrectos.'), '413': common['413'], '415': common['415'], '500': common['500'] } } },
    '/orders': {
      post: { operationId: 'createOrder', summary: 'Crear pedido propio', description: 'El propietario proviene de la sesión. No se aceptan campos extra. Total = suma(quantity * unitPriceCents). Moneda obligatoria GTQ o USD. No se aceptan productos vacíos ni compuestos solo por espacios.', tags: ['Pedidos'], requestBody: body('OrderInput'), responses: { '201': ok('Order', 'Pedido persistido.', { Location: { description: 'Ruta del nuevo pedido.', schema: { type: 'string', pattern: '^/orders/[1-9][0-9]*$' } } }), ...common } },
      get: { operationId: 'listOwnOrders', summary: 'Listar solamente pedidos propios', description: 'Orden ascendente por id. page comienza en 1; limit máximo 50. Una página fuera del rango devuelve data vacío y conserva los metadatos. totalPages es 0 si no hay pedidos. Parámetros desconocidos o repetidos se rechazan con 400.', tags: ['Pedidos'], parameters: [{ name: 'page', in: 'query', description: 'Página sin ceros iniciales.', schema: { type: 'integer', minimum: 1, maximum: 1000000, default: 1 } }, { name: 'limit', in: 'query', description: 'Tamaño de página sin ceros iniciales.', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } }], responses: { '200': ok('OrderList', 'Página de pedidos del propietario.'), '400': common['400'], '401': common['401'], '500': common['500'] } },
    },
    '/orders/{id}': {
      parameters: [parameterId],
      get: { operationId: 'getOrder', summary: 'Consultar un pedido persistido', tags: ['Pedidos'], responses: { '200': ok('Order', 'Pedido propio.'), '400': common['400'], '401': common['401'], '403': error('El pedido pertenece a otro usuario.'), '404': error('Pedido inexistente.'), '500': common['500'] } },
      delete: { operationId: 'deleteOrder', summary: 'Eliminar un pedido de forma idempotente', description: '204 sin cuerpo, incluso si ya no existe. 403 si existe y pertenece a otro usuario. Repetir la operación mantiene la ausencia del recurso.', tags: ['Pedidos'], responses: { '204': { description: 'Ausencia garantizada; sin cuerpo.', headers }, '400': common['400'], '401': common['401'], '403': error('Pedido ajeno.'), '500': common['500'] } },
    },
    '/orders/{id}/status': {
      parameters: [parameterId],
      put: { operationId: 'setOrderStatus', summary: 'Asignar estado de forma idempotente', description: 'Si cambia status, incrementa version y cambia updatedAt una sola vez. Si se repite el mismo estado, no se escribe de nuevo: status, version, updatedAt y resto del recurso permanecen iguales. No es un registro de eventos ni un contador de solicitudes.', tags: ['Pedidos'], requestBody: body('StatusInput'), responses: { '200': ok('Order', 'Estado aplicado.'), ...common, '403': error('Pedido ajeno.'), '404': error('Pedido inexistente.') } },
    },
  },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Opaque', description: 'Token opaco temporal devuelto por login. La base solo almacena su hash SHA-256.' } }, schemas },
};
