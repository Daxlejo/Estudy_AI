import type {
  Course,
  CourseProcessingState,
  CurrentSession,
  InternalQuiz,
  InternalQuizQuestion,
  LearningPath,
  LearningPathNode,
  ProcessingStep,
  Quiz,
  QuizReviewConcept,
  StudySession,
} from '../types/course'

export const INITIAL_PROCESSING_STEPS: ProcessingStep[] = [
  {
    key: 'EXTRACTION',
    label: 'Analizando material de estudio',
    description: 'Extrayendo texto, estructura y temas principales...',
    status: 'pending',
  },
  {
    key: 'CONCEPTS',
    label: 'Detectando conceptos clave',
    description: 'Identificando definiciones, teoremas y términos clave...',
    status: 'pending',
  },
  {
    key: 'DEPENDENCIES',
    label: 'Comprendiendo dependencias',
    description: 'Mapeando relaciones lógicas y orden de precedencia...',
    status: 'pending',
  },
  {
    key: 'GROUPING',
    label: 'Organizando sesiones de aprendizaje',
    description: 'Agrupando conceptos en sesiones didácticas paso a paso...',
    status: 'pending',
  },
  {
    key: 'LEARNING_PATH',
    label: 'Construyendo tu ruta de aprendizaje',
    description: 'Ensamblando niveles, checkpoints y miniquizzes...',
    status: 'pending',
  },
]

export const initialMockCourses: Course[] = [
  {
    id: '1',
    name: 'Bases de Datos',
    description: 'Aprende desde los fundamentos hasta consultas avanzadas.',
    status: 'IN_PROGRESS',
    progress: {
      completedSessions: 12,
      totalSessions: 17,
      progressPercent: 71,
      conceptsLearned: 38,
      totalConcepts: 54,
      currentLevel: 4,
      totalLevels: 5,
    },
    materials: [
      {
        id: 'mat-1',
        name: 'Fundamentos_Bases_Datos.pdf',
        sizeBytes: 4404019,
        formattedSize: '4.2 MB',
        type: 'pdf',
        uploadedAt: '2026-09-15T10:00:00Z',
      },
      {
        id: 'mat-2',
        name: 'Normalizacion_SQL.docx',
        sizeBytes: 1887436,
        formattedSize: '1.8 MB',
        type: 'docx',
        uploadedAt: '2026-09-18T14:30:00Z',
      },
    ],
    createdAt: '2026-09-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Arquitectura de Software',
    description: 'Comprende patrones, estilos y principios de arquitectura.',
    status: 'IN_PROGRESS',
    progress: {
      completedSessions: 5,
      totalSessions: 12,
      progressPercent: 41,
      conceptsLearned: 19,
      totalConcepts: 45,
      currentLevel: 2,
      totalLevels: 4,
    },
    materials: [
      {
        id: 'mat-3',
        name: 'Patrones_Arquitectura.pptx',
        sizeBytes: 6186598,
        formattedSize: '5.9 MB',
        type: 'pptx',
        uploadedAt: '2026-09-20T09:15:00Z',
      },
    ],
    createdAt: '2026-09-20T09:15:00Z',
  },
]

// Rutas de aprendizaje mock predefinidas
const databaseLearningPathNodes: LearningPathNode[] = [
  {
    id: 'session-db-1',
    number: 1,
    title: 'Introducción a los Sistemas de Bases de Datos',
    description: 'Evolución del almacenamiento, arquitectura ANSI/SPARC y abstracción de datos.',
    concepts: ['Modelo conceptual', 'Niveles de abstracción', 'SGBD vs Archivos'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 20,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-2',
    number: 2,
    title: 'Fundamentos del Modelo Relacional',
    description: 'Estructuras de datos relacionales, tuplas, relaciones y dominios de atributos.',
    concepts: ['Tablas', 'Tuplas', 'Atributos', 'Dominios'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 25,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-3',
    number: 3,
    title: 'Claves e Integridad Referencial',
    description: 'Reglas de integridad relacional, claves primarias, foráneas y restricciones.',
    concepts: ['Primary Key', 'Foreign Key', 'Integridad de entidad', 'Restricciones'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 20,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-4',
    number: 4,
    title: 'Lenguaje SQL: Definición de Esquemas (DDL)',
    description: 'Creación de tablas, alteración de esquemas y tipos de datos en bases de datos.',
    concepts: ['CREATE TABLE', 'ALTER TABLE', 'DROP', 'Constraints'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-5',
    number: 5,
    title: 'Consultas Básicas y Filtrado en SQL',
    description: 'Selección de columnas, operadores de comparación, filtros lógicos y ordenamiento.',
    concepts: ['SELECT', 'WHERE', 'AND / OR', 'ORDER BY', 'LIMIT'],
    status: 'CURRENT',
    type: 'SESSION',
    durationMinutes: 25,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-6',
    number: 6,
    title: 'Consultas Multitabla: Relaciones y JOINs',
    description: 'Combinación lógica de tablas mediante productos cartesianos y uniones relacionales.',
    concepts: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 35,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-7',
    number: 7,
    title: 'Funciones de Agregación y Agrupamiento',
    description: 'Cálculo de métricas cuantitativas, agrupación de registros y filtros agregados.',
    concepts: ['COUNT / SUM / AVG', 'GROUP BY', 'HAVING'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-8',
    number: 8,
    title: 'Subconsultas y Consultas Correlacionadas',
    description: 'Uso de consultas anidadas en cláusulas WHERE y FROM para análisis jerárquico.',
    concepts: ['Subqueries', 'IN / NOT IN', 'EXISTS', 'Correlated Queries'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 35,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-9',
    number: 9,
    title: 'Normalización y Formas Normales (1FN - 3FN)',
    description: 'Detección de anomalías de modificación y aplicación de dependencias funcionales.',
    concepts: ['Anomalías de inserción', '1FN', '2FN', '3FN / BCNF'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 40,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-10',
    number: 10,
    title: 'Transacciones y Propiedades ACID',
    description: 'Control de concurrencia, atomicidad, consistencia, aislamiento y durabilidad.',
    concepts: ['BEGIN TRANSACTION', 'COMMIT', 'ROLLBACK', 'Niveles de aislamiento'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-db-11',
    number: 11,
    title: 'Índices y Optimización de Consultas',
    description: 'Estructuras de almacenamiento B-Tree, análisis con EXPLAIN y planes de ejecución.',
    concepts: ['B-Tree Index', 'Table Scan', 'EXPLAIN ANALYZE', 'Rendimiento'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 35,
    hasMiniQuiz: true,
  },
  {
    id: 'exam-db-12',
    number: 12,
    title: 'Examen Final de Bases de Datos',
    description: 'Evaluación integral de todo el curso: diseño relacional, SQL avanzado y normalización.',
    concepts: ['Evaluación integral', 'Certificación de competencia'],
    status: 'LOCKED',
    type: 'FINAL_EXAM',
    durationMinutes: 45,
    hasMiniQuiz: false,
  },
]

const architectureLearningPathNodes: LearningPathNode[] = [
  {
    id: 'session-arch-1',
    number: 1,
    title: 'Fundamentos de Arquitectura de Software',
    description: 'Definiciones clave, rol del arquitecto y ciclo de vida de diseño.',
    concepts: ['Arquitectura vs Diseño', 'Vistas y modelos 4+1', 'Stakeholders'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 20,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-2',
    number: 2,
    title: 'Atributos de Calidad y Requerimientos No Funcionales',
    description: 'Rendimiento, escalabilidad, mantenibilidad, disponibilidad y seguridad.',
    concepts: ['Escenarios de calidad', 'Trade-offs', 'Métricas de disponibilidad'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 25,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-3',
    number: 3,
    title: 'Principios SOLID y Diseño Modular',
    description: 'Cohesión, acoplamiento y aplicación práctica de principios de arquitectura.',
    concepts: ['Single Responsibility', 'Open/Closed', 'Dependency Inversion'],
    status: 'COMPLETED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-4',
    number: 4,
    title: 'Patrones Arquitectónicos: MVC, MVP y MVVM',
    description: 'Separación de responsabilidades de interfaz, lógica de negocio y presentación.',
    concepts: ['Modelo-Vista-Controlador', 'Flujo unidireccional', 'Separación de capas'],
    status: 'CURRENT',
    type: 'SESSION',
    durationMinutes: 25,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-5',
    number: 5,
    title: 'Clean Architecture y Arquitectura Hexagonal',
    description: 'Puertos y adaptadores, inversión de dependencias y aislamiento de dominio.',
    concepts: ['Regla de dependencia', 'Entidades y Casos de uso', 'Puertos y Adaptadores'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 35,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-6',
    number: 6,
    title: 'Arquitectura Orientada a Eventos (EDA)',
    description: 'Productores, consumidores, brokers y desacoplamiento temporal de sistemas.',
    concepts: ['Event-Driven', 'Pub/Sub', 'Event Sourcing', 'CQRS'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-7',
    number: 7,
    title: 'Patrones de Integración y Mensajería',
    description: 'Colas de mensajes, protocolos asíncronos y consistencia eventual.',
    concepts: ['Message Broker', 'Dead Letter Queue', 'Idempotencia'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 35,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-8',
    number: 8,
    title: 'Microservicios y Separación de Dominios',
    description: 'Bounded contexts de DDD, descomposición modular y comunicación inter-servicio.',
    concepts: ['Domain-Driven Design', 'API Gateway', 'Service Discovery'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 40,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-9',
    number: 9,
    title: 'Estrategias de Resiliencia y Tolerancia a Fallos',
    description: 'Técnicas defensivas para sistemas distribuidos de alta concurrencia.',
    concepts: ['Circuit Breaker', 'Retry con Backoff', 'Bulkhead', 'Rate Limiting'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-10',
    number: 10,
    title: 'Monitoreo, Observabilidad y Tracing Distribuido',
    description: 'Telemetría moderna, métricas, correlación de logs y rastreo distribuido.',
    concepts: ['Logs estructurados', 'OpenTelemetry', 'Distributed Tracing'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 30,
    hasMiniQuiz: true,
  },
  {
    id: 'session-arch-11',
    number: 11,
    title: 'Repaso Arquitectónico y Casos de Estudio',
    description: 'Análisis de arquitecturas reales de alta escala y revisión de trade-offs.',
    concepts: ['Casos reales', 'Revisión de arquitectura', 'Preparación final'],
    status: 'LOCKED',
    type: 'SESSION',
    durationMinutes: 35,
    hasMiniQuiz: true,
  },
  {
    id: 'exam-arch-12',
    number: 12,
    title: 'Examen Final de Arquitectura de Software',
    description: 'Evaluación integral: toma de decisiones arquitectónicas y diseño de sistemas escalables.',
    concepts: ['Evaluación integral', 'Certificación de competencia'],
    status: 'LOCKED',
    type: 'FINAL_EXAM',
    durationMinutes: 50,
    hasMiniQuiz: false,
  },
]

export function buildLearningPathFromNodes(courseId: string, courseName: string, nodes: LearningPathNode[]): LearningPath {
  const completedCount = nodes.filter((n) => n.status === 'COMPLETED').length
  const totalCount = nodes.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const currentNode = nodes.find((n) => n.status === 'CURRENT')

  return {
    courseId,
    courseName,
    nodes,
    completedCount,
    totalCount,
    progressPercent,
    currentSessionId: currentNode?.id,
  }
}

/** Generador dinámico para cualquier curso nuevo creado por el usuario */
export function generateMockLearningPath(course: Course): LearningPath {
  const titles = [
    `Introducción a ${course.name}`,
    'Conceptos Fundamentales y Definiciones',
    'Principios Esenciales y Reglas Clave',
    'Primeras Aplicaciones Prácticas',
    'Relaciones y Estructuras Intermedias',
    'Casos de Uso y Patrones Comunes',
    'Resolución de Problemas Aplicados',
    'Técnicas Avanzadas y Métodos Complejos',
    'Optimización y Análisis Crítico',
    'Integración y Enfoques Holísticos',
    'Repaso General y Consolidación',
    `Examen Final de ${course.name}`,
  ]

  const nodes: LearningPathNode[] = titles.map((title, idx) => {
    const isExam = idx === titles.length - 1
    const number = idx + 1
    // Por defecto en un curso recién procesado, la primera sesión es CURRENT y el resto LOCKED
    const status: LearningPathNode['status'] = idx === 0 ? 'CURRENT' : 'LOCKED'

    return {
      id: isExam ? `exam-${course.id}-${number}` : `session-${course.id}-${number}`,
      number,
      title,
      description: isExam
        ? `Evaluación global de todos los temas tratados en ${course.name}.`
        : `Exploración estructurada de los contenidos y habilidades correspondientes a la etapa ${number}.`,
      concepts: isExam
        ? ['Evaluación integral', 'Certificación']
        : [`Concepto Clave ${number}A`, `Concepto Clave ${number}B`, `Tópico Aplicado ${number}`],
      status,
      type: isExam ? 'FINAL_EXAM' : 'SESSION',
      durationMinutes: isExam ? 45 : 25,
      hasMiniQuiz: !isExam,
    }
  })

  return buildLearningPathFromNodes(course.id, course.name, nodes)
}

export const initialMockCurrentSession: CurrentSession = {
  courseId: '1',
  courseTitle: 'Bases de Datos',
  sessionId: 'session-db-5',
  sessionNumber: 5,
  title: 'Consultas Básicas y Filtrado en SQL',
  completedSessions: 4,
  totalSessions: 12,
  progressPercent: 33,
  durationMinutes: 25,
  concepts: 5,
  streakDays: 5,
}

// Almacén en memoria durante la sesión del frontend
export const memoryCourseStore: Course[] = [...initialMockCourses]

export const memoryCurrentSession: CurrentSession = { ...initialMockCurrentSession }

export const memoryProcessingStore: Map<string, CourseProcessingState> = new Map()

export const memoryLearningPathStore: Map<string, LearningPath> = new Map([
  ['1', buildLearningPathFromNodes('1', 'Bases de Datos', databaseLearningPathNodes)],
  ['2', buildLearningPathFromNodes('2', 'Arquitectura de Software', architectureLearningPathNodes)],
])

export const mockStudySessionDatabase5: StudySession = {
  id: 'session-db-5',
  courseId: '1',
  courseTitle: 'Bases de Datos',
  sessionNumber: 5,
  totalSessions: 12,
  title: 'Consultas Básicas y Filtrado en SQL',
  learningObjective:
    'Dominar la proyección selectiva de columnas con SELECT y el filtrado condicional preciso de filas mediante la cláusula WHERE y operadores lógicos.',
  durationMinutes: 25,
  xpReward: 35,
  introduction: {
    title: '¿Cómo recuperamos datos específicos en una base de datos?',
    content:
      'En un sistema real con millones de registros, casi nunca necesitamos ver toda la información de golpe. La cláusula SELECT nos permite proyectar únicamente las columnas necesarias, mientras que WHERE actúa como un filtro lógico que evalúa cada fila, devolviendo solo aquellas que satisfacen condiciones booleanas precisas.',
    keyTakeaway:
      'Una consulta SELECT con WHERE no altera los datos persistidos en el disco; genera un conjunto de resultados virtual en memoria optimizado para el usuario o la aplicación.',
    codeSnippet: `SELECT nombre, promedio, semestre\nFROM estudiantes\nWHERE promedio >= 4.0 AND semestre = 5\nORDER BY promedio DESC;`,
  },
  concepts: [
    {
      id: 'c-select',
      name: 'SELECT (Proyección)',
      summary: 'Define exactamente qué atributos deben formar parte de la respuesta.',
      detail:
        'Indica las columnas específicas a consultar. Es una buena práctica evitar el uso indiscriminado de SELECT * en producción para reducir el tráfico de red y el uso de memoria RAM.',
      example: 'SELECT id, nombre, email FROM usuarios;',
    },
    {
      id: 'c-where',
      name: 'WHERE (Filtro Condicional)',
      summary: 'Evalúa una expresión booleana por cada fila de la tabla.',
      detail:
        'Acepta comparadores estándar (=, !=, <, >, <=, >=). Solo las filas cuyo resultado sea TRUE se incorporan al resultado final. Las filas con FALSE o NULL son descartadas.',
      example: "WHERE estado = 'activo' AND saldo > 0;",
    },
    {
      id: 'c-logic',
      name: 'Operadores Lógicos (AND, OR, NOT)',
      summary: 'Permite formular criterios de búsqueda compuestos.',
      detail:
        'AND exige que ambas condiciones sean verdaderas simultáneamente. OR requiere que al menos una lo sea. NOT invierte el valor lógico. Se aconseja utilizar paréntesis para forzar el orden de precedencia.',
      example: "WHERE (rol = 'docente' OR rol = 'tutor') AND NOT bloqueado;",
    },
    {
      id: 'c-order-limit',
      name: 'ORDER BY & LIMIT',
      summary: 'Ordenamiento jerárquico y paginación de los registros filtrados.',
      detail:
        'ORDER BY organiza las filas resultantes de manera ascendente (ASC) o descendente (DESC). LIMIT fija el número máximo de tuplas entregadas, esencial para paginaciones eficientes.',
      example: 'ORDER BY calificacion DESC LIMIT 5;',
    },
  ],
  guidedPractice: {
    id: 'practice-db-5',
    prompt:
      'Imagina que tienes una tabla llamada "clientes". ¿Cuál de las siguientes consultas selecciona únicamente el nombre y correo de los clientes que residen en "Cali"?',
    context: 'Tabla: clientes(id, nombre, correo, ciudad, telefono, fecha_registro)',
    options: [
      {
        id: 'opt-p1',
        text: "SELECT * FROM clientes WHERE ciudad = 'Cali';",
        isCorrect: false,
        feedback:
          'Incorrecto: Esta consulta utiliza el comodín (*), lo que proyecta todas las columnas de la tabla en vez de solo el nombre y correo solicitados.',
      },
      {
        id: 'opt-p2',
        text: "SELECT nombre, correo FROM clientes WHERE ciudad = 'Cali';",
        isCorrect: true,
        feedback:
          '¡Correcto! Proyecta explícitamente los campos requeridos (nombre, correo) y aplica el filtro exacto sobre la columna ciudad en la cláusula WHERE.',
      },
      {
        id: 'opt-p3',
        text: "FILTER clientes BY ciudad == 'Cali' SELECT nombre, correo;",
        isCorrect: false,
        feedback:
          'Incorrecto: "FILTER BY" no es sintaxis válida de SQL relacional estándar. En SQL el filtrado de filas se realiza siempre mediante la cláusula WHERE.',
      },
      {
        id: 'opt-p4',
        text: "SELECT nombre, correo WHERE clientes.ciudad = 'Cali';",
        isCorrect: false,
        feedback:
          'Incorrecto: Se omitió la cláusula FROM clientes. El motor SQL no sabrá de qué tabla provienen las columnas especificadas.',
      },
    ],
  },
  challenge: {
    id: 'challenge-db-5',
    prompt:
      'Una plataforma de streaming necesita listar el título y la fecha de estreno de películas lanzadas después del año 2020 con una calificación mayor a 8.5, ordenadas desde la más reciente. ¿Cuál consulta implementa correctamente esta regla?',
    context: 'Tabla: peliculas(id, titulo, estreno, calificacion, genero)',
    options: [
      {
        id: 'opt-c1',
        text: 'SELECT titulo, estreno FROM peliculas WHERE estreno > 2020 OR calificacion > 8.5 ORDER BY estreno ASC;',
        isCorrect: false,
        feedback:
          'Incorrecto: El operador OR incluiría películas con calificación baja solo por ser posteriores a 2020, y ORDER BY ASC ordenaría de la más antigua a la más reciente.',
      },
      {
        id: 'opt-c2',
        text: 'SELECT titulo, estreno FROM peliculas WHERE estreno > 2020 AND calificacion > 8.5 ORDER BY estreno DESC;',
        isCorrect: true,
        feedback:
          '¡Excelente deducción! El operador AND exige el cumplimiento estricto de ambos requisitos, y ORDER BY estreno DESC garantiza que aparezcan primero las producciones más recientes.',
      },
      {
        id: 'opt-c3',
        text: 'SELECT titulo, estreno FROM peliculas HAVING estreno > 2020 AND calificacion > 8.5;',
        isCorrect: false,
        feedback:
          'Incorrecto: La cláusula HAVING se reserva para filtros sobre grupos calculados con GROUP BY. Para filtrar filas individuales debe emplearse WHERE.',
      },
      {
        id: 'opt-c4',
        text: 'SELECT titulo, estreno FROM peliculas WHERE estreno >= 2020 AND calificacion = 8.5;',
        isCorrect: false,
        feedback:
          'Incorrecto: El operador >= incluiría el año 2020 (el requerimiento pedía después de 2020), y la igualdad (=) excluiría calificaciones excelentes de 8.6 en adelante.',
      },
    ],
  },
  quizId: 'quiz-session-db-5',
}

export const mockStudySessionDatabase1: StudySession = {
  id: 'session-db-1',
  courseId: '1',
  courseTitle: 'Bases de Datos',
  sessionNumber: 1,
  totalSessions: 12,
  title: 'Introducción a los Sistemas de Bases de Datos',
  learningObjective:
    'Comprender la definición de base de datos relacional, las limitaciones de los archivos planos y la función de tablas, filas y claves primarias.',
  durationMinutes: 20,
  xpReward: 30,
  introduction: {
    title: '¿Qué es una base de datos?',
    content:
      'Una base de datos es un conjunto organizado de datos estructurados que pertenecen a un mismo contexto y se almacenan sistemáticamente para su posterior uso. A diferencia de un archivo de texto o una hoja de cálculo aislada, los Sistemas Gestores de Bases de Datos (SGBD) garantizan integridad, disponibilidad y accesos concurrentes sin corrupción de datos.',
    keyTakeaway:
      'El modelo relacional organiza la información en tablas interconectadas, asegurando que cada dato se registre sin duplicidades innecesarias y sea fácilmente consultable.',
  },
  concepts: [
    {
      id: 'c-db',
      name: 'Base de Datos (Database)',
      summary: 'El repositorio central organizado',
      detail:
        'Conjunto lógico de esquemas, tablas, vistas e índices que modelan un dominio de negocio completo (por ejemplo, el sistema de una universidad o tienda en línea).',
      example: 'BD "universidad_central"',
    },
    {
      id: 'c-table',
      name: 'Tabla (Table / Relación)',
      summary: 'Estructura bidimensional de datos',
      detail:
        'Entidad compuesta por columnas (atributos con tipos de datos definidos) y filas (instancias de la entidad). Cada tabla modela un concepto único.',
      example: 'Tabla "estudiantes", Tabla "cursos"',
    },
    {
      id: 'c-record',
      name: 'Registro o Fila (Tuple)',
      summary: 'Instancia individual de una entidad',
      detail:
        'Cada fila representa un elemento específico dentro de la tabla y contiene un valor concreto para cada una de las columnas configuradas.',
      example: 'Fila: [ID: 1042, Nombre: "Ana Gómez", Semestre: 3]',
    },
    {
      id: 'c-pk',
      name: 'Clave Primaria (Primary Key)',
      summary: 'Identificador único e irrepetible',
      detail:
        'Atributo o conjunto de atributos cuyo valor identifica de forma única e inequívoca a cada registro. Nunca puede contener valores duplicados ni nulos (NULL).',
      example: 'codigo_estudiante, identificacion_fiscal, uuid',
    },
  ],
  guidedPractice: {
    id: 'practice-db-1',
    prompt:
      'En el sistema de información de una biblioteca universitaria, ¿cuál de los siguientes elementos representa con exactitud una TABLA relacional?',
    context: 'Dominio: Gestión bibliotecaria institucional',
    options: [
      {
        id: 'opt-p1-1',
        text: 'El código de barras "LIB-84920" asignado a un libro particular.',
        isCorrect: false,
        feedback:
          'Incorrecto: Un código específico representa el dato de una clave primaria dentro de un registro, no la estructura contenedora.',
      },
      {
        id: 'opt-p1-2',
        text: 'La estructura general "Libros" con columnas como ISBN, título, autor y unidades disponibles.',
        isCorrect: true,
        feedback:
          '¡Correcto! Una tabla modela la entidad completa ("Libros") con su conjunto de columnas para almacenar múltiples registros de forma consistente.',
      },
      {
        id: 'opt-p1-3',
        text: 'El libro físico "Cien años de soledad" ubicado en el estante 4.',
        isCorrect: false,
        feedback:
          'Incorrecto: Un libro individual corresponde a una fila (registro) de la tabla, no a la tabla en sí.',
      },
      {
        id: 'opt-p1-4',
        text: 'El software PostgreSQL ejecutándose en el servidor de la biblioteca.',
        isCorrect: false,
        feedback:
          'Incorrecto: PostgreSQL es el SGBD (motor de base de datos), el software que administra las tablas y bases de datos.',
      },
    ],
  },
  challenge: {
    id: 'challenge-db-1',
    prompt:
      'Una universidad necesita registrar información de sus estudiantes. ¿Cuál diseño representa mejor esta necesidad garantizando unicidad y evitando inconsistencias?',
    context: 'Requisito: Garantizar identificación confiable de cada estudiante',
    options: [
      {
        id: 'opt-c1-1',
        text: 'Una tabla "Estudiantes" con clave primaria sobre el campo "nombre_completo".',
        isCorrect: false,
        feedback:
          'Incorrecto: Dos estudiantes pueden compartir el mismo nombre (homónimos), lo que violaría de inmediato la restricción de clave primaria única.',
      },
      {
        id: 'opt-c1-2',
        text: 'Una tabla "Estudiantes" con clave primaria única "codigo_estudiante" o documento de identidad oficial.',
        isCorrect: true,
        feedback:
          '¡Excelente! Un código institucional o número de documento garantiza unicidad para cada persona matriculada, protegiendo la integridad referencial.',
      },
      {
        id: 'opt-c1-3',
        text: 'Archivos de texto plano (.txt) guardados independientemente en las computadoras de cada docente.',
        isCorrect: false,
        feedback:
          'Incorrecto: Esto generaría duplicidad de datos, falta de concurrencia y desincronización inmediata entre profesores.',
      },
      {
        id: 'opt-c1-4',
        text: 'Una sola columna con todos los datos del estudiante concatenados en una cadena separada por comas.',
        isCorrect: false,
        feedback:
          'Incorrecto: Viola la primera forma normal (1FN) y la atomicidad de los atributos, impidiendo búsquedas estructuradas y ordenamiento eficiente.',
      },
    ],
  },
  quizId: 'quiz-session-db-1',
}

/**
 * Obtiene la sesión de estudio correspondiente al identificador recibido.
 * Resuelve sesiones específicas o sintetiza dinámicamente el contenido pedagógico.
 */
export function getMockStudySession(sessionId: string): StudySession | null {
  const normalizedId = String(sessionId)

  if (normalizedId === 'session-db-5' || normalizedId === '13' || normalizedId === '5') {
    return { ...mockStudySessionDatabase5 }
  }

  if (normalizedId === 'session-db-1' || normalizedId === '1') {
    return { ...mockStudySessionDatabase1 }
  }

  // Buscar en las rutas de aprendizaje en memoria
  for (const [courseId, path] of memoryLearningPathStore.entries()) {
    const node = path.nodes.find((n) => String(n.id) === normalizedId || String(n.number) === normalizedId)
    if (node) {
      return {
        id: node.id,
        courseId,
        courseTitle: path.courseName,
        sessionNumber: node.number,
        totalSessions: path.totalCount,
        title: node.title,
        learningObjective: `Dominar los fundamentos, relaciones prácticas y aplicaciones clave correspondientes a "${node.title}".`,
        durationMinutes: node.durationMinutes || 25,
        xpReward: 30,
        introduction: {
          title: `Introducción a ${node.title}`,
          content:
            node.description ||
            `En esta sesión abordaremos las bases conceptuales y aplicaciones prácticas de ${node.title} para tu formación integral en ${path.courseName}.`,
          keyTakeaway:
            'Comprender la base teórica antes de practicar garantiza una retención significativa y facilita resolver desafíos de mayor complejidad.',
        },
        concepts: node.concepts.map((concept, idx) => ({
          id: `c-gen-${idx}`,
          name: concept,
          summary: `Principio conceptual fundamental sobre ${concept}`,
          detail: `Este concepto permite estructurar y razonar sobre los problemas de estudio vinculados a ${node.title}.`,
          example: `Ejemplo aplicado de ${concept}`,
        })),
        guidedPractice: {
          id: `practice-${node.id}`,
          prompt: `¿Cuál de las siguientes afirmaciones describe de manera más precisa el propósito de "${node.title}"?`,
          context: `Contexto pedagógico: ${path.courseName} - Sesión ${node.number}`,
          options: [
            {
              id: 'opt-g1',
              text: `Establecer los lineamientos y reglas de aplicación directa de ${node.concepts[0] || node.title}.`,
              isCorrect: true,
              feedback:
                '¡Correcto! Esta afirmación resume con precisión el objetivo formativo y la utilidad práctica de la sesión.',
            },
            {
              id: 'opt-g2',
              text: 'Omitir las dependencias previas y saltar a conclusiones sin validar la base conceptual.',
              isCorrect: false,
              feedback:
                'Incorrecto: El método EstudyAI exige construir sobre los cimientos previos antes de abordar problemas complejos.',
            },
            {
              id: 'opt-g3',
              text: 'Memorizar definiciones aisladas sin analizar su función en el sistema global.',
              isCorrect: false,
              feedback:
                'Incorrecto: El aprendizaje real consiste en conectar conceptos con su aplicación práctica, no en memorización ciega.',
            },
          ],
        },
        challenge: {
          id: `challenge-${node.id}`,
          prompt: `Al aplicar los conceptos de "${node.title}" en un escenario real, ¿cuál es la mejor práctica recomendada?`,
          context: 'Toma de decisiones técnicas y metodológicas',
          options: [
            {
              id: 'opt-ch1',
              text: 'Validar las restricciones y analizar los requerimientos antes de tomar una decisión estructural.',
              isCorrect: true,
              feedback:
                '¡Excelente! Analizar el contexto y verificar los supuestos previene errores costosos en etapas avanzadas.',
            },
            {
              id: 'opt-ch2',
              text: 'Implementar la primera alternativa disponible sin considerar trade-offs ni mantenibilidad.',
              isCorrect: false,
              feedback:
                'Incorrecto: Toda decisión en ingeniería requiere sopesar compensaciones (trade-offs) entre rendimiento y claridad.',
            },
            {
              id: 'opt-ch3',
              text: 'Delegar todo el razonamiento en herramientas automáticas sin supervisión conceptual.',
              isCorrect: false,
              feedback:
                'Incorrecto: Las herramientas aceleran el trabajo, pero el criterio y la comprensión profunda residen en el estudiante.',
            },
          ],
        },
        quizId: `quiz-${node.id}`,
      }
    }
  }

  return null
}

/**
 * Regla de aprobación determinista pedagógica:
 * 6 preguntas -> mínimo 4 correctas
 * 7 preguntas -> mínimo 4 correctas
 * 8 preguntas -> mínimo 5 correctas
 */
export function getMinimumCorrectAnswers(totalQuestions: number): number {
  if (totalQuestions <= 6) return 4
  if (totalQuestions === 7) return 4
  if (totalQuestions === 8) return 5
  return Math.ceil(totalQuestions * 0.6)
}

export const mockQuizReviewConcepts: Record<string, QuizReviewConcept> = {
  'c-select': {
    id: 'c-select',
    name: 'SELECT y Proyección de Columnas',
    summary: 'Especifica de forma estricta qué campos deben extraerse de la tabla.',
    detail:
      'Evita transferir columnas innecesarias en memoria y red. Usar "SELECT *" sistemáticamente anula el aprovechamiento de índices de cobertura y sobrecarga la serialización de datos.',
    example: 'SELECT id, nombre, email FROM usuarios;',
  },
  'c-where': {
    id: 'c-where',
    name: 'WHERE y Filtrado Condicional',
    summary: 'Evalúa expresiones booleanas sobre cada fila individual antes de cualquier agregación.',
    detail:
      'En SQL relacional, los valores nulos (NULL) representan ausencia de valor; por tanto, no se evalúan con el operador de igualdad (=), sino con "IS NULL" o "IS NOT NULL".',
    example: 'WHERE ciudad = "Cali" AND telefono IS NOT NULL;',
  },
  'c-logic': {
    id: 'c-logic',
    name: 'Operadores Lógicos y Precedencia (AND / OR / NOT)',
    summary: 'El operador AND tiene mayor precedencia que OR en la evaluación lógica estándar.',
    detail:
      'Siempre que combines AND y OR en una consulta, utiliza paréntesis para agrupar las condiciones y garantizar la semántica de negocio prevista.',
    example: 'WHERE (ciudad = "Bogotá" OR ciudad = "Medellín") AND activo = 1;',
  },
  'c-order-limit': {
    id: 'c-order-limit',
    name: 'ORDER BY y Paginación (LIMIT / OFFSET)',
    summary: 'Ordenamiento ascendente (ASC) o descendente (DESC) y extracción de subconjuntos de filas.',
    detail:
      'LIMIT restringe la cantidad de tuplas devueltas y OFFSET salta un número específico de registros iniciales para implementar paginaciones de datos eficientes.',
    example: 'ORDER BY calificacion DESC LIMIT 10 OFFSET 20;',
  },
  'c-having': {
    id: 'c-having',
    name: 'HAVING vs WHERE en Filtrado Agregado',
    summary: 'WHERE filtra filas individuales antes de agrupar; HAVING filtra los grupos resultantes tras un GROUP BY.',
    detail:
      'No es posible usar funciones de agregación (COUNT, SUM, AVG) dentro de WHERE; para evaluar condiciones sobre cálculos agrupados debe utilizarse siempre HAVING.',
    example: 'GROUP BY ciudad HAVING COUNT(id) > 5;',
  },
  'c-groupby': {
    id: 'c-groupby',
    name: 'GROUP BY y Regla de Proyección',
    summary: 'Agrupa filas con valores idénticos en columnas determinadas en filas de resumen.',
    detail:
      'Toda columna presente en el SELECT que no esté envuelta dentro de una función de agregación debe figurar obligatoriamente en la cláusula GROUP BY.',
    example: 'SELECT departamento, COUNT(*) FROM empleados GROUP BY departamento;',
  },
  'c-query-execution': {
    id: 'c-query-execution',
    name: 'Flujo Lógico de Ejecución SQL',
    summary: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.',
    detail:
      'Los alias creados en el SELECT no pueden usarse en WHERE porque el filtrado de filas ocurre antes de la fase de proyección de columnas.',
    example: 'El motor evalúa primero la fuente (FROM) y los filtros (WHERE) antes de calcular alias en SELECT.',
  },
}

// Preguntas del Intento 1 (7 preguntas realistas para la sesión de SQL)
export const mockQuizQuestionsAttempt1: InternalQuizQuestion[] = [
  {
    id: 'q1-1-select-star',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-select',
    conceptName: 'SELECT y Proyección',
    prompt: '¿Por qué se desaconseja el uso sistemático de "SELECT *" en consultas de producción?',
    options: [
      {
        id: 'opt-q1-1',
        text: 'Porque no permite filtrar registros con la cláusula WHERE.',
        isCorrect: false,
      },
      {
        id: 'opt-q1-2',
        text: 'Porque transfiere columnas innecesarias, incrementando el uso de ancho de banda y memoria.',
        isCorrect: true,
      },
      {
        id: 'opt-q1-3',
        text: 'Porque solo funciona si la tabla contiene menos de 1000 registros.',
        isCorrect: false,
      },
      {
        id: 'opt-q1-4',
        text: 'Porque invalida permanentemente los índices creados en la tabla.',
        isCorrect: false,
      },
    ],
    explanation:
      'SELECT * transfiere todos los atributos de la tabla, desperdiciando ancho de banda de red, saturando la memoria del servidor de aplicaciones e impidiendo el uso de índices de cobertura.',
  },
  {
    id: 'q1-2-where-null',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-where',
    conceptName: 'WHERE y Filtrado',
    prompt:
      'Dada una tabla con una columna "telefono" que admite valores nulos, ¿cuál expresión filtra correctamente las filas que NO tienen teléfono registrado?',
    options: [
      {
        id: 'opt-q2-1',
        text: 'WHERE telefono = NULL',
        isCorrect: false,
      },
      {
        id: 'opt-q2-2',
        text: 'WHERE telefono IS NULL',
        isCorrect: true,
      },
      {
        id: 'opt-q2-3',
        text: 'WHERE telefono == ""',
        isCorrect: false,
      },
      {
        id: 'opt-q2-4',
        text: 'WHERE telefono.empty()',
        isCorrect: false,
      },
    ],
    explanation:
      'En SQL relacional, NULL representa la ausencia de valor (lógica trivaluada); por tanto, no puede compararse con el operador de igualdad (=), sino que requiere "IS NULL".',
  },
  {
    id: 'q1-3-logic-precedence',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-logic',
    conceptName: 'Operadores Lógicos',
    prompt:
      '¿Qué ocurre al ejecutar: "WHERE ciudad = \'Cali\' OR ciudad = \'Medellín\' AND saldo > 500" sin paréntesis?',
    options: [
      {
        id: 'opt-q3-1',
        text: 'El motor produce un error de sintaxis obligando a colocar paréntesis.',
        isCorrect: false,
      },
      {
        id: 'opt-q3-2',
        text: 'AND tiene mayor precedencia que OR, evaluándose primero: (ciudad = \'Medellín\' AND saldo > 500).',
        isCorrect: true,
      },
      {
        id: 'opt-q3-3',
        text: 'OR tiene mayor precedencia que AND, evaluándose de izquierda a derecha.',
        isCorrect: false,
      },
      {
        id: 'opt-q3-4',
        text: 'Ambos operadores tienen la misma prioridad y se ejecutan estrictamente de derecha a izquierda.',
        isCorrect: false,
      },
    ],
    explanation:
      'En SQL estándar, el operador AND tiene mayor precedencia que OR. Sin paréntesis, la condición selecciona todos los de Cali sin importar su saldo, o los de Medellín con saldo > 500.',
  },
  {
    id: 'q1-4-order-limit',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-order-limit',
    conceptName: 'ORDER BY y Paginación',
    prompt:
      'Si se ejecuta "SELECT nombre, puntaje FROM examen ORDER BY puntaje DESC LIMIT 3", ¿cuál es el resultado exacto?',
    options: [
      {
        id: 'opt-q4-1',
        text: 'Los 3 estudiantes con los puntajes más bajos del curso.',
        isCorrect: false,
      },
      {
        id: 'opt-q4-2',
        text: 'Los 3 estudiantes con los puntajes más altos del curso.',
        isCorrect: true,
      },
      {
        id: 'opt-q4-3',
        text: 'Los estudiantes que obtuvieron una nota igual a 3 puntos.',
        isCorrect: false,
      },
      {
        id: 'opt-q4-4',
        text: 'Una muestra aleatoria de 3 registros ordenados alfabéticamente.',
        isCorrect: false,
      },
    ],
    explanation:
      'ORDER BY puntaje DESC ordena los registros de mayor a menor según su calificación, y LIMIT 3 restringe la salida a los primeros 3 resultados, obteniendo los mejores puntajes.',
  },
  {
    id: 'q1-5-where-vs-having',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-having',
    conceptName: 'Filtro de Filas vs Agregaciones',
    prompt: '¿Cuál es la diferencia fundamental entre las cláusulas WHERE y HAVING en SQL?',
    options: [
      {
        id: 'opt-q5-1',
        text: 'WHERE solo opera con columnas numéricas y HAVING con cadenas de texto.',
        isCorrect: false,
      },
      {
        id: 'opt-q5-2',
        text: 'WHERE filtra filas individuales antes de agrupar; HAVING filtra grupos resultantes de agregaciones.',
        isCorrect: true,
      },
      {
        id: 'opt-q5-3',
        text: 'HAVING es obligatorio en todas las consultas y WHERE es opcional.',
        isCorrect: false,
      },
      {
        id: 'opt-q5-4',
        text: 'No existe diferencia; son sinónimos intercambiables en todos los motores relacionales.',
        isCorrect: false,
      },
    ],
    explanation:
      'WHERE evalúa las condiciones tupla a tupla antes de que ocurra cualquier agrupamiento o cálculo de agregados. HAVING se aplica a los grupos ya consolidados tras el GROUP BY.',
  },
  {
    id: 'q1-6-group-by-rule',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-groupby',
    conceptName: 'Agrupamiento de Datos',
    prompt:
      'Al usar GROUP BY, ¿qué regla deben cumplir las columnas proyectadas en el SELECT que no están dentro de una función agregada (como COUNT o SUM)?',
    options: [
      {
        id: 'opt-q6-1',
        text: 'Deben ser obligatoriamente de tipo entero.',
        isCorrect: false,
      },
      {
        id: 'opt-q6-2',
        text: 'Deben estar forzosamente incluidas en la lista del GROUP BY.',
        isCorrect: true,
      },
      {
        id: 'opt-q6-3',
        text: 'Deben tener un valor por defecto no nulo.',
        isCorrect: false,
      },
      {
        id: 'opt-q6-4',
        text: 'No pueden pertenecer a claves foráneas.',
        isCorrect: false,
      },
    ],
    explanation:
      'El estándar SQL requiere que cualquier columna proyectada en SELECT que no sea un cálculo agregado forme parte de la cláusula GROUP BY para garantizar un valor unívoco por cada grupo.',
  },
  {
    id: 'q1-7-query-execution-order',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-query-execution',
    conceptName: 'Flujo Lógico de Ejecución',
    prompt: 'En el procesamiento lógico de una consulta SQL, ¿en qué orden procesa el motor las cláusulas?',
    options: [
      {
        id: 'opt-q7-1',
        text: 'SELECT → FROM → WHERE → GROUP BY → ORDER BY',
        isCorrect: false,
      },
      {
        id: 'opt-q7-2',
        text: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT',
        isCorrect: true,
      },
      {
        id: 'opt-q7-3',
        text: 'ORDER BY → LIMIT → FROM → WHERE → SELECT',
        isCorrect: false,
      },
      {
        id: 'opt-q7-4',
        text: 'WHERE → FROM → SELECT → ORDER BY → GROUP BY',
        isCorrect: false,
      },
    ],
    explanation:
      'El motor primero identifica la fuente de datos (FROM), filtra las filas individuales (WHERE), agrupa (GROUP BY), filtra los grupos (HAVING), proyecta las columnas (SELECT), ordena (ORDER BY) y finalmente pagina (LIMIT).',
  },
]

// Preguntas del Intento 2 (Preguntas adaptativas completamente distintas cubriendo los mismos conceptos clave)
export const mockQuizQuestionsAttempt2: InternalQuizQuestion[] = [
  {
    id: 'q2-1-select-alias',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-select',
    conceptName: 'SELECT y Proyección',
    prompt:
      'Un desarrollador escribe: "SELECT id, nombre AS alias_nombre FROM empleados". ¿Qué efecto tiene la palabra clave "AS"?',
    options: [
      {
        id: 'opt-q2-1-1',
        text: 'Crea una nueva columna permanente en el disco duro de la base de datos.',
        isCorrect: false,
      },
      {
        id: 'opt-q2-1-2',
        text: 'Renombra temporalmente la columna en el resultado para la visualización o código consumidor.',
        isCorrect: true,
      },
      {
        id: 'opt-q2-1-3',
        text: 'Filtra las filas donde el nombre coincida con el alias especificado.',
        isCorrect: false,
      },
      {
        id: 'opt-q2-1-4',
        text: 'Ordena los empleados alfabéticamente por su nombre.',
        isCorrect: false,
      },
    ],
    explanation:
      'La cláusula AS asigna un alias provisional a la columna o expresión proyectada, facilitando su referencia en la capa de consumo sin alterar el esquema físico.',
  },
  {
    id: 'q2-2-where-between',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-where',
    conceptName: 'WHERE y Filtrado',
    prompt:
      'Una consulta necesita filtrar todos los productos cuyo precio esté entre 50 y 200 (ambos inclusive). ¿Cuál cláusula WHERE expresa esto con mayor claridad?',
    options: [
      {
        id: 'opt-q2-2-1',
        text: 'WHERE precio BETWEEN 50 AND 200',
        isCorrect: true,
      },
      {
        id: 'opt-q2-2-2',
        text: 'WHERE precio < 50 AND precio > 200',
        isCorrect: false,
      },
      {
        id: 'opt-q2-2-3',
        text: 'WHERE precio IN (50, 200)',
        isCorrect: false,
      },
      {
        id: 'opt-q2-2-4',
        text: 'WHERE precio != 50 OR precio != 200',
        isCorrect: false,
      },
    ],
    explanation:
      'BETWEEN 50 AND 200 incluye de manera inclusiva el rango [50, 200]. La expresión "precio < 50 AND precio > 200" es una contradicción lógica imposible para un único valor.',
  },
  {
    id: 'q2-3-logic-parens',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-logic',
    conceptName: 'Operadores Lógicos',
    prompt:
      'Para encontrar usuarios de "Bogotá" o "Medellín" que obligatoriamente tengan su cuenta "activa", ¿cuál es la estructura correcta?',
    options: [
      {
        id: 'opt-q2-3-1',
        text: 'WHERE ciudad = \'Bogotá\' OR ciudad = \'Medellín\' AND estado = \'activa\'',
        isCorrect: false,
      },
      {
        id: 'opt-q2-3-2',
        text: 'WHERE (ciudad = \'Bogotá\' OR ciudad = \'Medellín\') AND estado = \'activa\'',
        isCorrect: true,
      },
      {
        id: 'opt-q2-3-3',
        text: 'WHERE ciudad = \'Bogotá\' AND ciudad = \'Medellín\' OR estado = \'activa\'',
        isCorrect: false,
      },
      {
        id: 'opt-q2-3-4',
        text: 'WHERE NOT (ciudad = \'Bogotá\' OR ciudad = \'Medellín\') AND estado = \'activa\'',
        isCorrect: false,
      },
    ],
    explanation:
      'El uso de paréntesis agrupa la disyunción (ciudad = \'Bogotá\' OR ciudad = \'Medellín\') y asegura que el filtro de cuenta activa (AND estado = \'activa\') sea obligatorio en ambos casos.',
  },
  {
    id: 'q2-4-order-offset',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-order-limit',
    conceptName: 'ORDER BY y Paginación',
    prompt:
      'En una paginación web donde cada página muestra 10 productos, ¿cómo se solicitan los productos de la segunda página (del 11 al 20)?',
    options: [
      {
        id: 'opt-q2-4-1',
        text: 'LIMIT 10 OFFSET 10',
        isCorrect: true,
      },
      {
        id: 'opt-q2-4-2',
        text: 'LIMIT 20 OFFSET 2',
        isCorrect: false,
      },
      {
        id: 'opt-q2-4-3',
        text: 'OFFSET 10 LIMIT 20',
        isCorrect: false,
      },
      {
        id: 'opt-q2-4-4',
        text: 'PAGE 2 SIZE 10',
        isCorrect: false,
      },
    ],
    explanation:
      'OFFSET 10 salta los primeros 10 registros (página 1) y LIMIT 10 extrae los siguientes 10 registros (página 2).',
  },
  {
    id: 'q2-5-having-rule',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-having',
    conceptName: 'Filtro de Filas vs Agregaciones',
    prompt:
      'Se requiere obtener las ciudades que tienen más de 5 clientes registrados. ¿Por qué es un error sintáctico escribir: "WHERE COUNT(id) > 5"?',
    options: [
      {
        id: 'opt-q2-5-1',
        text: 'Porque COUNT() no puede evaluar identificadores primarios.',
        isCorrect: false,
      },
      {
        id: 'opt-q2-5-2',
        text: 'Porque WHERE se evalúa antes de agrupar y no puede operar sobre agregaciones; debe usarse HAVING COUNT(id) > 5.',
        isCorrect: true,
      },
      {
        id: 'opt-q2-5-3',
        text: 'Porque la función COUNT solo puede usarse con el operador menor que (<).',
        isCorrect: false,
      },
      {
        id: 'opt-q2-5-4',
        text: 'Porque el número 5 debe ir entre comillas simples (\'5\').',
        isCorrect: false,
      },
    ],
    explanation:
      'Las funciones de agregación consolidan múltiples filas. WHERE actúa sobre filas individuales antes de la consolidación, por lo que los filtros sobre agregados corresponden a HAVING.',
  },
  {
    id: 'q2-6-groupby-avg',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-groupby',
    conceptName: 'Agrupamiento de Datos',
    prompt: 'Deseas conocer el promedio de ventas por cada categoría de producto. ¿Cuál es la estructura canónica?',
    options: [
      {
        id: 'opt-q2-6-1',
        text: 'SELECT categoria, AVG(monto) FROM ventas GROUP BY categoria;',
        isCorrect: true,
      },
      {
        id: 'opt-q2-6-2',
        text: 'SELECT categoria, AVG(monto) FROM ventas WHERE categoria = AVG(monto);',
        isCorrect: false,
      },
      {
        id: 'opt-q2-6-3',
        text: 'SELECT AVG(monto) FROM ventas ORDER BY categoria;',
        isCorrect: false,
      },
      {
        id: 'opt-q2-6-4',
        text: 'GROUP BY categoria SELECT AVG(monto) FROM ventas;',
        isCorrect: false,
      },
    ],
    explanation:
      'GROUP BY categoria reúne las ventas de cada categoría y AVG(monto) calcula el promedio aritmético de cada grupo consolidado.',
  },
  {
    id: 'q2-7-alias-in-where',
    quizId: 'quiz-session-db-5',
    conceptId: 'c-query-execution',
    conceptName: 'Flujo Lógico de Ejecución',
    prompt:
      '¿Por qué un alias de columna creado en el SELECT (ej. "SELECT precio * 1.19 AS precio_iva") NO puede usarse directamente en la cláusula WHERE de la misma consulta?',
    options: [
      {
        id: 'opt-q2-7-1',
        text: 'Porque los nombres con guion bajo no son válidos en SQL.',
        isCorrect: false,
      },
      {
        id: 'opt-q2-7-2',
        text: 'Porque la cláusula WHERE se procesa lógicamente antes que el SELECT, por lo que el alias aún no existe en esa fase.',
        isCorrect: true,
      },
      {
        id: 'opt-q2-7-3',
        text: 'Porque los alias solo son válidos para tablas y no para columnas.',
        isCorrect: false,
      },
      {
        id: 'opt-q2-7-4',
        text: 'Porque los cálculos con multiplicación solo se permiten dentro de GROUP BY.',
        isCorrect: false,
      },
    ],
    explanation:
      'Debido al orden de ejecución lógica de SQL (FROM → WHERE → SELECT), el motor filtra las filas (WHERE) antes de calcular y asignar los alias en el SELECT.',
  },
]

// Almacén en memoria del número de intento actual por quiz ID
export const memoryQuizAttemptStore: Map<string, number> = new Map([
  ['quiz-session-db-5', 1],
])

/** Generador dinámico para cualquier otro quiz ID no preconfigurado */
export function generateInternalMockQuiz(quizId: string, attemptNumber: number = 1): InternalQuiz {
  const normalizedId = String(quizId).replace(/^quiz-/, '')
  const session = getMockStudySession(normalizedId) || getMockStudySession('session-db-5')!
  const questionsCount = 7
  const passingThreshold = getMinimumCorrectAnswers(questionsCount)

  const concepts = session.concepts.length > 0 ? session.concepts : [
    { id: 'c-1', name: 'Concepto Fundamental A', summary: 'Base', detail: 'Detalle' },
    { id: 'c-2', name: 'Concepto Fundamental B', summary: 'Base', detail: 'Detalle' },
    { id: 'c-3', name: 'Regla de Aplicación C', summary: 'Base', detail: 'Detalle' },
  ]

  const questions: InternalQuizQuestion[] = Array.from({ length: questionsCount }, (_, idx) => {
    const concept = concepts[idx % concepts.length]
    const isRetry = attemptNumber > 1

    return {
      id: `gen-q-${quizId}-att${attemptNumber}-${idx + 1}`,
      quizId,
      conceptId: concept.id,
      conceptName: concept.name,
      prompt: isRetry
        ? `[Intento ${attemptNumber}] En un caso aplicado de "${session.title}", ¿cuál es la mejor práctica para aplicar "${concept.name}"?`
        : `Respecto a "${session.title}", ¿cuál de las siguientes opciones describe correctamente la función de "${concept.name}"?`,
      options: [
        {
          id: `opt-${idx}-1`,
          text: `Aplica de manera consistente las reglas y restricciones asociadas a ${concept.name}.`,
          isCorrect: true,
        },
        {
          id: `opt-${idx}-2`,
          text: `Omite la validación de dependencias para acelerar el procesamiento sin garantías.`,
          isCorrect: false,
        },
        {
          id: `opt-${idx}-3`,
          text: `Aplica exclusivamente valores nulos sin respetar el esquema de datos.`,
          isCorrect: false,
        },
        {
          id: `opt-${idx}-4`,
          text: `Reemplaza toda la lógica relacional por archivos de texto plano sin atomicidad.`,
          isCorrect: false,
        },
      ],
      explanation: `La opción correcta respeta los fundamentos de ${concept.name} garantizando consistencia, integridad y rendimiento en ${session.title}.`,
    }
  })

  return {
    id: quizId,
    sessionId: session.id,
    courseId: session.courseId,
    courseTitle: session.courseTitle,
    sessionTitle: session.title,
    sessionNumber: session.sessionNumber,
    totalSessions: session.totalSessions,
    attemptNumber,
    questions,
    passingThreshold,
    xpReward: session.xpReward,
  }
}

/**
 * Obtiene el objeto InternalQuiz (con respuestas correctas) para evaluación en el mock/service layer
 */
export function getInternalMockQuiz(quizId: string, forcedAttempt?: number): InternalQuiz | null {
  const normalizedId = String(quizId)
  const currentAttempt = forcedAttempt ?? (memoryQuizAttemptStore.get(normalizedId) || 1)
  memoryQuizAttemptStore.set(normalizedId, currentAttempt)

  if (normalizedId === 'quiz-session-db-5' || normalizedId === 'quiz-5' || normalizedId === '5') {
    const questions = currentAttempt === 1 ? mockQuizQuestionsAttempt1 : mockQuizQuestionsAttempt2
    return {
      id: 'quiz-session-db-5',
      sessionId: 'session-db-5',
      courseId: '1',
      courseTitle: 'Bases de Datos',
      sessionTitle: 'Consultas Básicas y Filtrado en SQL',
      sessionNumber: 5,
      totalSessions: 12,
      attemptNumber: currentAttempt,
      questions,
      passingThreshold: getMinimumCorrectAnswers(questions.length),
      xpReward: 35,
    }
  }

  // Si existe en las sesiones conocidas o generadas
  return generateInternalMockQuiz(quizId, currentAttempt)
}

/**
 * Obtiene el objeto Quiz frontend-facing para un ID dado.
 * Garantiza que ninguna opción exponga isCorrect al cliente.
 */
export function getMockQuiz(quizId: string, forcedAttempt?: number): Quiz | null {
  const internal = getInternalMockQuiz(quizId, forcedAttempt)
  if (!internal) return null

  return {
    ...internal,
    questions: internal.questions.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      conceptId: q.conceptId,
      conceptName: q.conceptName,
      prompt: q.prompt,
      context: q.context,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
      })),
      explanation: q.explanation,
    })),
  }
}

/**
 * Al aprobar un quiz, marca la sesión como COMPLETED en la ruta de aprendizaje
 * y desbloquea la siguiente sesión (cambiando su estado de LOCKED a CURRENT).
 */
export function unlockNextSessionAfterQuiz(sessionId: string): { nextSessionId?: string; courseId: string } | null {
  const normSessionId = String(sessionId)

  for (const [courseId, path] of memoryLearningPathStore.entries()) {
    const nodeIndex = path.nodes.findIndex((n) => n.id === normSessionId)
    if (nodeIndex !== -1) {
      // 1. Marcar sesión actual como completada
      path.nodes[nodeIndex].status = 'COMPLETED'

      // 2. Desbloquear la siguiente sesión si existe y estaba bloqueada
      let nextSessionId: string | undefined
      if (nodeIndex + 1 < path.nodes.length) {
        const nextNode = path.nodes[nodeIndex + 1]
        if (nextNode.status === 'LOCKED') {
          nextNode.status = 'CURRENT'
        }
        nextSessionId = nextNode.id
      }

      // 3. Recalcular métricas de la ruta
      const completedCount = path.nodes.filter((n) => n.status === 'COMPLETED').length
      const totalCount = path.nodes.length
      const progressPercent = Math.round((completedCount / totalCount) * 100)
      const currentNode = path.nodes.find((n) => n.status === 'CURRENT')

      path.completedCount = completedCount
      path.progressPercent = progressPercent
      path.currentSessionId = currentNode?.id

      // 4. Actualizar el curso en memoryCourseStore
      const course = memoryCourseStore.find((c) => String(c.id) === String(courseId))
      if (course) {
        course.progress.completedSessions = completedCount
        course.progress.progressPercent = progressPercent
      }

      // 5. Actualizar memoryCurrentSession si correspondía a esta sesión
      if (currentNode && String(memoryCurrentSession.sessionId) === normSessionId) {
        memoryCurrentSession.sessionId = currentNode.id
        memoryCurrentSession.sessionNumber = currentNode.number
        memoryCurrentSession.title = currentNode.title
        memoryCurrentSession.completedSessions = completedCount
        memoryCurrentSession.progressPercent = progressPercent
      }

      return { nextSessionId, courseId }
    }
  }

  return null
}
