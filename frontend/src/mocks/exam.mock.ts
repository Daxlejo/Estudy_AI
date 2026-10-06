import type {
  FinalExam,
  FinalExamAnswer,
  FinalExamAnswerEvaluation,
  FinalExamQuestion,
  FinalExamResult,
  InternalFinalExam,
  InternalFinalExamQuestion,
} from '../types/exam'
import { getMinimumExamPassingScore } from '../types/exam'
import { memoryCourseStore, memoryLearningPathStore } from './course.mock'

// ============================================================================
// INTENTO 1: 22 Preguntas Integrales de Base de Datos y SQL
// Distribución: 10 Multiple Choice, 6 Matching, 6 Ordering
// Umbral de Aprobación: 16 de 22 (> 70%)
// ============================================================================

export const mockExamQuestionsAttempt1: InternalFinalExamQuestion[] = [
  // --- 1. Multiple Choice: Orden de evaluación lógico en SQL ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q01',
    examId: 'final-exam-db-1',
    conceptId: 'c-sql-order',
    conceptName: 'Orden Lógico de Ejecución SQL',
    prompt: '¿En qué fase de la ejecución lógica de una consulta SQL se descartan los grupos que no cumplen la condición agregada?',
    context: 'SELECT departamento, COUNT(*) FROM empleados WHERE salario > 2000 GROUP BY departamento HAVING COUNT(*) > 5 ORDER BY departamento;',
    options: [
      { id: 'opt-01-a', text: 'En la cláusula WHERE, antes de agrupar' },
      { id: 'opt-01-b', text: 'En la cláusula HAVING, tras formar los grupos' },
      { id: 'opt-01-c', text: 'En la proyección SELECT, al calcular las funciones' },
      { id: 'opt-01-d', text: 'En la cláusula ORDER BY, durante el ordenamiento final' },
    ],
    correctOptionId: 'opt-01-b',
    explanation: 'El motor SQL ejecuta WHERE antes de agrupar (filtra filas). Luego forma grupos con GROUP BY y finalmente evalúa HAVING para descartar grupos completos que no satisfagan la condición agregada.',
  },

  // --- 2. Multiple Choice: JOINs ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q02',
    examId: 'final-exam-db-1',
    conceptId: 'c-joins',
    conceptName: 'Álgebra Relacional y JOINs',
    prompt: '¿Qué resultado produce un LEFT JOIN cuando una fila de la tabla izquierda no tiene correspondencia en la tabla derecha?',
    options: [
      { id: 'opt-02-a', text: 'La fila se descarta por completo del conjunto de resultados' },
      { id: 'opt-02-b', text: 'Se incluye la fila con valores NULL en todas las columnas de la tabla derecha' },
      { id: 'opt-02-c', text: 'El motor lanza un error de violación de integridad referencial' },
      { id: 'opt-02-d', text: 'Se reemplazan automáticamente los valores inexistentes con ceros o cadenas vacías' },
    ],
    correctOptionId: 'opt-02-b',
    explanation: 'En un LEFT JOIN (o LEFT OUTER JOIN), todas las filas de la relación izquierda se preservan. Si no hay match en la tabla derecha, las columnas de dicha tabla se rellenan con NULL.',
  },

  // --- 3. Matching: Conceptos de ACID ---
  {
    type: 'MATCHING',
    id: 'fe1-q03',
    examId: 'final-exam-db-1',
    conceptId: 'c-acid',
    conceptName: 'Propiedades ACID en Transacciones',
    prompt: 'Relaciona cada propiedad ACID con su garantía operacional correspondiente:',
    leftItems: [
      { id: 'left-acid-a', text: 'Atomicidad' },
      { id: 'left-acid-c', text: 'Consistencia' },
      { id: 'left-acid-i', text: 'Aislamiento' },
      { id: 'left-acid-d', text: 'Durabilidad' },
    ],
    rightItems: [
      { id: 'right-acid-1', text: 'O todo el conjunto de operaciones se aplica o ninguna tiene efecto (All-or-Nothing)' },
      { id: 'right-acid-2', text: 'La transacción lleva la base de datos de un estado válido a otro, respetando invariantes' },
      { id: 'right-acid-3', text: 'La ejecución concurrente produce el mismo estado que una ejecución secuencial' },
      { id: 'right-acid-4', text: 'Una vez confirmada la transacción, los cambios sobreviven incluso a caídas del sistema' },
    ],
    correctPairs: {
      'left-acid-a': 'right-acid-1',
      'left-acid-c': 'right-acid-2',
      'left-acid-i': 'right-acid-3',
      'left-acid-d': 'right-acid-4',
    },
    explanation: 'Atomicidad garantiza "todo o nada"; Consistencia preserva invariantes y reglas del esquema; Aislamiento previene interferencias entre transacciones concurrentes; y Durabilidad garantiza persistencia ante fallos.',
  },

  // --- 4. Ordering: Fases de Ejecución Lógica SQL ---
  {
    type: 'ORDERING',
    id: 'fe1-q04',
    examId: 'final-exam-db-1',
    conceptId: 'c-sql-order',
    conceptName: 'Pipeline de Ejecución Lógica SQL',
    prompt: 'Ordena de PRIMERA a ÚLTIMA las etapas de evaluación lógica que sigue un motor SQL relacional:',
    orderingHint: 'Ubica en primer lugar el origen de datos y al final la paginación.',
    items: [
      { id: 'step-from', text: 'FROM & JOIN (identificación y combinación de fuentes)' },
      { id: 'step-where', text: 'WHERE (filtrado de tuplas individuales)' },
      { id: 'step-group', text: 'GROUP BY (agrupamiento de registros)' },
      { id: 'step-having', text: 'HAVING (filtrado de grupos)' },
      { id: 'step-select', text: 'SELECT (proyección de columnas y alias)' },
      { id: 'step-order', text: 'ORDER BY (ordenamiento del conjunto resultante)' },
      { id: 'step-limit', text: 'LIMIT / OFFSET (paginación)' },
    ],
    correctOrder: [
      'step-from',
      'step-where',
      'step-group',
      'step-having',
      'step-select',
      'step-order',
      'step-limit',
    ],
    explanation: 'El orden estándar de evaluación lógica es: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Por esta razón, los alias definidos en SELECT no pueden filtrarse en el WHERE.',
  },

  // --- 5. Multiple Choice: Índices B-Tree ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q05',
    examId: 'final-exam-db-1',
    conceptId: 'c-indexes',
    conceptName: 'Estructuras de Índices B-Tree',
    prompt: '¿Por qué un índice B-Tree convencional suele ser ineficaz para la condición "WHERE nombre LIKE \'%garcia\'"?',
    options: [
      { id: 'opt-05-a', text: 'Porque las estructuras B-Tree sólo soportan números enteros' },
      { id: 'opt-05-b', text: 'Porque el comodín al inicio impide navegar el árbol ordenado lexicográficamente por prefijo' },
      { id: 'opt-05-c', text: 'Porque las búsquedas de texto siempre disparan bloqueos de tabla completa' },
      { id: 'opt-05-d', text: 'Porque requiere obligatoriamente un índice compuesto con la clave primaria' },
    ],
    correctOptionId: 'opt-05-b',
    explanation: 'Los índices B-Tree mantienen los datos ordenados por prefijo. Si la consulta tiene comodín inicial (%garcia), el motor no puede podar ramas del árbol y debe recurrir a un Table Scan completo.',
  },

  // --- 6. Matching: Formas Normales ---
  {
    type: 'MATCHING',
    id: 'fe1-q06',
    examId: 'final-exam-db-1',
    conceptId: 'c-normalization',
    conceptName: 'Teoría de Normalización',
    prompt: 'Relaciona cada Forma Normal con la condición estricta que exige su cumplimiento:',
    leftItems: [
      { id: 'left-norm-1fn', text: 'Primera Forma Normal (1FN)' },
      { id: 'left-norm-2fn', text: 'Segunda Forma Normal (2FN)' },
      { id: 'left-norm-3fn', text: 'Tercera Forma Normal (3FN)' },
      { id: 'left-norm-bcnf', text: 'Forma Normal de Boyce-Codd (BCNF)' },
    ],
    rightItems: [
      { id: 'right-norm-1', text: 'Atributos atómicos (sin listas, arrays o columnas repetitivas) y clave primaria definida' },
      { id: 'right-norm-2', text: 'Estar en 1FN y que ningún atributo no clave dependa parcialmente de una clave compuesta' },
      { id: 'right-norm-3', text: 'Estar en 2FN y eliminar dependencias transitivas (ningún no clave determina a otro no clave)' },
      { id: 'right-norm-4', text: 'Para toda dependencia funcional X → Y, X debe ser una superclave' },
    ],
    correctPairs: {
      'left-norm-1fn': 'right-norm-1',
      'left-norm-2fn': 'right-norm-2',
      'left-norm-3fn': 'right-norm-3',
      'left-norm-bcnf': 'right-norm-4',
    },
    explanation: '1FN exige atomicidad; 2FN elimina dependencia parcial de claves compuestas; 3FN elimina dependencias transitivas; y BCNF exige que todo determinante funcional sea superclave.',
  },

  // --- 7. Ordering: Proceso de Normalización de una Tabla No Estructurada ---
  {
    type: 'ORDERING',
    id: 'fe1-q07',
    examId: 'final-exam-db-1',
    conceptId: 'c-normalization',
    conceptName: 'Flujo de Normalización de Esquemas',
    prompt: 'Ordena secuencialmente los pasos metodológicos para transformar una tabla desnormalizada en un esquema en 3FN:',
    items: [
      { id: 'norm-step-1', text: 'Identificar claves candidatas y eliminar atributos multivaluados para alcanzar 1FN' },
      { id: 'norm-step-2', text: 'Separar dependencias parciales de claves compuestas en nuevas tablas para alcanzar 2FN' },
      { id: 'norm-step-3', text: 'Detectar y extraer dependencias transitivas entre columnas no clave para alcanzar 3FN' },
      { id: 'norm-step-4', text: 'Establecer restricciones de clave foránea e integridad referencial entre las tablas resultantes' },
    ],
    correctOrder: [
      'norm-step-1',
      'norm-step-2',
      'norm-step-3',
      'norm-step-4',
    ],
    explanation: 'La normalización es progresiva: primero se alcanza 1FN descomponiendo valores no atómicos, luego 2FN eliminando dependencias parciales, después 3FN eliminando dependencias transitivas, y finalmente se enlazan con Foreign Keys.',
  },

  // --- 8. Multiple Choice: Cláusula GROUP BY vs WHERE ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q08',
    examId: 'final-exam-db-1',
    conceptId: 'c-aggregations',
    conceptName: 'Funciones de Agregación y Agrupamiento',
    prompt: '¿Cuál de las siguientes sentencias es INVÁLIDA según las reglas del estándar SQL ANSI?',
    options: [
      { id: 'opt-08-a', text: 'SELECT categoria, AVG(precio) FROM productos GROUP BY categoria;' },
      { id: 'opt-08-b', text: 'SELECT categoria, nombre, AVG(precio) FROM productos GROUP BY categoria;' },
      { id: 'opt-08-c', text: 'SELECT categoria, COUNT(*) FROM productos GROUP BY categoria HAVING COUNT(*) > 10;' },
      { id: 'opt-08-d', text: 'SELECT categoria, MAX(precio) FROM productos WHERE activo = 1 GROUP BY categoria;' },
    ],
    correctOptionId: 'opt-08-b',
    explanation: 'En SQL estándar, cualquier columna presente en la lista de proyección (SELECT) que no sea argumento de una función agregada DEBE aparecer obligatoriamente en la cláusula GROUP BY.',
  },

  // --- 9. Matching: Niveles de Aislamiento vs Anomalías ---
  {
    type: 'MATCHING',
    id: 'fe1-q09',
    examId: 'final-exam-db-1',
    conceptId: 'c-isolation',
    conceptName: 'Niveles de Aislamiento ANSI SQL',
    prompt: 'Empareja cada anomalía de concurrencia con el fenómeno que describe:',
    leftItems: [
      { id: 'left-anom-dirty', text: 'Lectura Sucia (Dirty Read)' },
      { id: 'left-anom-nonrepeat', text: 'Lectura No Repetible' },
      { id: 'left-anom-phantom', text: 'Lectura Fantasma (Phantom Read)' },
    ],
    rightItems: [
      { id: 'right-anom-1', text: 'Una transacción lee datos modificados por otra transacción que aún no ha hecho COMMIT' },
      { id: 'right-anom-2', text: 'Releer la misma fila dentro de la misma transacción devuelve valores diferentes porque otra confirmó un UPDATE' },
      { id: 'right-anom-3', text: 'Reejecutar una consulta de rango devuelve nuevas filas insertadas y confirmadas por otra transacción' },
    ],
    correctPairs: {
      'left-anom-dirty': 'right-anom-1',
      'left-anom-nonrepeat': 'right-anom-2',
      'left-anom-phantom': 'right-anom-3',
    },
    explanation: 'Dirty Read ocurre leyendo cambios sin confirmar; Non-repeatable Read ocurre cuando otra transacción actualiza o borra una fila leída; Phantom Read ocurre cuando otra transacción inserta tuplas en un rango ya consultado.',
  },

  // --- 10. Multiple Choice: Integridad Referencial (ON DELETE) ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q10',
    examId: 'final-exam-db-1',
    conceptId: 'c-referential',
    conceptName: 'Integridad Referencial y Foreign Keys',
    prompt: 'Si una Foreign Key está configurada con "ON DELETE SET NULL", ¿qué sucede cuando se elimina una fila de la tabla padre?',
    options: [
      { id: 'opt-10-a', text: 'Se eliminan en cascada todas las filas hijas vinculadas' },
      { id: 'opt-10-b', text: 'El motor rechaza la eliminación con un error si existen filas hijas asociadas' },
      { id: 'opt-10-c', text: 'Las filas hijas se conservan y su columna de clave foránea se actualiza a NULL' },
      { id: 'opt-10-d', text: 'Las filas hijas se reasignan automáticamente al primer registro disponible' },
    ],
    correctOptionId: 'opt-10-c',
    explanation: 'ON DELETE SET NULL preserva las filas dependientes en la tabla hija, reemplazando el valor de la clave foránea por NULL (siempre que la columna admita nulos).',
  },

  // --- 11. Ordering: Ciclo de Vida de una Transacción Segura ---
  {
    type: 'ORDERING',
    id: 'fe1-q11',
    examId: 'final-exam-db-1',
    conceptId: 'c-acid',
    conceptName: 'Protocolo de Ejecución Transaccional',
    prompt: 'Ordena la secuencia correcta de operaciones para ejecutar una transferencia bancaria transaccional con control de errores:',
    items: [
      { id: 'tx-step-1', text: 'BEGIN TRANSACTION (marcar inicio de bloque atómico)' },
      { id: 'tx-step-2', text: 'Verificar saldo y debitar monto de la cuenta de origen con bloqueo pesimista' },
      { id: 'tx-step-3', text: 'Acreditar el monto exacto en la cuenta de destino' },
      { id: 'tx-step-4', text: 'Validar que ninguna restricción de integridad ni saldo negativo fue violado' },
      { id: 'tx-step-5', text: 'COMMIT (persistir los cambios en el WAL y confirmar a los clientes)' },
    ],
    correctOrder: [
      'tx-step-1',
      'tx-step-2',
      'tx-step-3',
      'tx-step-4',
      'tx-step-5',
    ],
    explanation: 'Una transacción financiera debe iniciarse explícitamente, ejecutar los débitos y créditos secuenciales asegurando locks, verificar la consistencia global y confirmar definitivamente mediante COMMIT.',
  },

  // --- 12. Multiple Choice: Subconsultas Correlacionadas ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q12',
    examId: 'final-exam-db-1',
    conceptId: 'c-subqueries',
    conceptName: 'Subconsultas Correlacionadas vs Independientes',
    prompt: '¿Cuál es la principal característica que distingue a una subconsulta correlacionada de una subconsulta no correlacionada?',
    options: [
      { id: 'opt-12-a', text: 'Debe contener obligatoriamente una función de ventana (Window Function)' },
      { id: 'opt-12-b', text: 'Se ejecuta una sola vez para toda la consulta y guarda el resultado en caché' },
      { id: 'opt-12-c', text: 'Hace referencia a columnas de la consulta externa, evaluándose potencialmente una vez por cada fila procesada' },
      { id: 'opt-12-d', text: 'Únicamente puede ubicarse en la cláusula FROM creando una tabla derivada' },
    ],
    correctOptionId: 'opt-12-c',
    explanation: 'Una subconsulta correlacionada depende de valores de la fila externa actual. Por ende, conceptualmente se reevalúa fila por fila (a menos que el optimizador logre reescribirla como un JOIN).',
  },

  // --- 13. Matching: Tipos de JOIN y Comportamiento Matemático ---
  {
    type: 'MATCHING',
    id: 'fe1-q13',
    examId: 'final-exam-db-1',
    conceptId: 'c-joins',
    conceptName: 'Tipos de Combinación en Álgebra Relacional',
    prompt: 'Relaciona cada tipo de JOIN con la descripción de su conjunto de resultados:',
    leftItems: [
      { id: 'left-join-inner', text: 'INNER JOIN' },
      { id: 'left-join-full', text: 'FULL OUTER JOIN' },
      { id: 'left-join-cross', text: 'CROSS JOIN' },
    ],
    rightItems: [
      { id: 'right-join-1', text: 'Devuelve exclusivamente las filas que tienen correspondencia exacta en ambas tablas' },
      { id: 'right-join-2', text: 'Devuelve todas las filas de ambas tablas, rellenando con NULL donde no haya coincidencia' },
      { id: 'right-join-3', text: 'Produce el producto cartesiano completo: cada fila de la izquierda combinada con cada fila de la derecha' },
    ],
    correctPairs: {
      'left-join-inner': 'right-join-1',
      'left-join-full': 'right-join-2',
      'left-join-cross': 'right-join-3',
    },
    explanation: 'INNER JOIN es la intersección; FULL OUTER JOIN preserva ambas partes con NULLs si no hay match; CROSS JOIN es el producto cartesiano (|A| * |B| tuplas).',
  },

  // --- 14. Ordering: Pasos para Optimizar una Consulta Lenta con EXPLAIN ---
  {
    type: 'ORDERING',
    id: 'fe1-q14',
    examId: 'final-exam-db-1',
    conceptId: 'c-optimization',
    conceptName: 'Metodología de Optimización con EXPLAIN',
    prompt: 'Ordena la metodología profesional recomendada para diagnosticar y optimizar una consulta lenta en producción:',
    items: [
      { id: 'opt-step-1', text: 'Ejecutar EXPLAIN ANALYZE sobre la consulta para obtener el plan de ejecución y costos reales' },
      { id: 'opt-step-2', text: 'Identificar cuellos de botella (ej. Seq Scan sobre tablas grandes, Hash Join desbordado)' },
      { id: 'opt-step-3', text: 'Diseñar e implementar un índice adecuado (ej. B-Tree compuesto sobre columnas de filtro y JOIN)' },
      { id: 'opt-step-4', text: 'Reejecutar EXPLAIN ANALYZE para contrastar costos y verificar la transición a Index Scan' },
    ],
    correctOrder: [
      'opt-step-1',
      'opt-step-2',
      'opt-step-3',
      'opt-step-4',
    ],
    explanation: 'La optimización científica exige medir primero con EXPLAIN, detectar el operador costoso, formular la solución (índice o reescritura) y volver a medir para validar la mejora cuantitativa.',
  },

  // --- 15. Multiple Choice: Clave Primaria Natural vs Subrogada ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q15',
    examId: 'final-exam-db-1',
    conceptId: 'c-keys',
    conceptName: 'Diseño de Claves Primarias',
    prompt: '¿Cuál es una ventaja fundamental de utilizar claves primarias subrogadas (como UUID o enteros auto-incrementales) frente a claves naturales (como el DNI o email)?',
    options: [
      { id: 'opt-15-a', text: 'Eliminan la necesidad de crear claves foráneas en las tablas dependientes' },
      { id: 'opt-15-b', text: 'Inmunizan el modelo ante cambios en las reglas de negocio o modificaciones en los datos del usuario' },
      { id: 'opt-15-c', text: 'Garantizan automáticamente que la tabla alcance la 3FN sin requerir normalización' },
      { id: 'opt-15-d', text: 'Permiten almacenar valores duplicados dentro de la misma clave primaria' },
    ],
    correctOptionId: 'opt-15-b',
    explanation: 'Las claves naturales pueden cambiar en la vida real (ej. corrección de un DNI o cambio de email). Si la PK cambia, deben actualizarse todas las FKs dependientes. Las claves subrogadas son inmutables e independientes del negocio.',
  },

  // --- 16. Matching: Vistas vs Vistas Materializadas ---
  {
    type: 'MATCHING',
    id: 'fe1-q16',
    examId: 'final-exam-db-1',
    conceptId: 'c-views',
    conceptName: 'Vistas Estándar vs Vistas Materializadas',
    prompt: 'Relaciona cada mecanismo de vista con su comportamiento técnico de almacenamiento y rendimiento:',
    leftItems: [
      { id: 'left-view-standard', text: 'Vista Estándar (VIEW)' },
      { id: 'left-view-materialized', text: 'Vista Materializada' },
    ],
    rightItems: [
      { id: 'right-view-1', text: 'Consulta guardada sin datos físicos propios; reejecuta la consulta subyacente cada vez que se invoca' },
      { id: 'right-view-2', text: 'Persiste físicamente el resultado en disco; ofrece lecturas instantáneas pero requiere actualización (REFRESH)' },
    ],
    correctPairs: {
      'left-view-standard': 'right-view-1',
      'left-view-materialized': 'right-view-2',
    },
    explanation: 'Una VIEW común es sólo una definición lógica que se fusiona con la consulta del usuario; una MATERIALIZED VIEW persiste los datos en disco, mejorando drásticamente reportes analíticos a cambio de requerir refrescos periódicos.',
  },

  // --- 17. Ordering: Pipeline de Escritura y WAL (Write-Ahead Logging) ---
  {
    type: 'ORDERING',
    id: 'fe1-q17',
    examId: 'final-exam-db-1',
    conceptId: 'c-wal',
    conceptName: 'Mecanismo Write-Ahead Logging (WAL)',
    prompt: 'Ordena cómo el motor de base de datos procesa una modificación para garantizar la Durabilidad (D de ACID):',
    items: [
      { id: 'wal-step-1', text: 'La transacción genera la modificación de datos en la memoria compartida (Buffer Pool)' },
      { id: 'wal-step-2', text: 'Se escribe el registro de cambio en el log secuencial de transacciones (Write-Ahead Log)' },
      { id: 'wal-step-3', text: 'El archivo WAL se sincroniza en disco de forma síncrona (fsync) al hacer COMMIT' },
      { id: 'wal-step-4', text: 'Posteriormente, el proceso de Checkpoint vuelca las páginas sucias del Buffer Pool a los archivos de datos' },
    ],
    correctOrder: [
      'wal-step-1',
      'wal-step-2',
      'wal-step-3',
      'wal-step-4',
    ],
    explanation: 'El principio cardinal de WAL establece que NUNCA se escribe una página de datos a disco sin antes haber persistido y confirmado su entrada de log en el WAL mediante fsync.',
  },

  // --- 18. Multiple Choice: CTEs y Legibilidad SQL ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q18',
    examId: 'final-exam-db-1',
    conceptId: 'c-cte',
    conceptName: 'Expresiones de Tabla Común (WITH / CTE)',
    prompt: '¿Cuál es el beneficio de utilizar una Common Table Expression (cláusula WITH) frente a múltiples subconsultas anidadas?',
    options: [
      { id: 'opt-18-a', text: 'Crea automáticamente una tabla temporal indexada en disco que sobrevive a la sesión' },
      { id: 'opt-18-b', text: 'Deshabilita las restricciones de integridad para acelerar la inserción de registros' },
      { id: 'opt-18-c', text: 'Estructura el código de manera modular y legible, y permite recursividad para consultar grafos o jerarquías' },
      { id: 'opt-18-d', text: 'Fuerza al motor a procesar la consulta utilizando memoria swap en lugar de RAM' },
    ],
    correctOptionId: 'opt-18-c',
    explanation: 'Las CTEs (WITH nombre AS (...)) permiten escribir consultas complejas en pasos lógicos secuenciales, evitan el efecto "pirámide" de subconsultas anidadas y soportan WITH RECURSIVE para estructuras jerárquicas.',
  },

  // --- 19. Multiple Choice: Cláusula EXISTS vs IN con Subconsultas ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q19',
    examId: 'final-exam-db-1',
    conceptId: 'c-subqueries',
    conceptName: 'Optimización de EXISTS vs IN',
    prompt: 'Al verificar la existencia de registros asociados en una tabla voluminosa, ¿por qué "WHERE EXISTS (SELECT 1 ...)" suele ser preferible a "WHERE id IN (SELECT id ...)" cuando la subconsulta contiene valores NULL?',
    options: [
      { id: 'opt-19-a', text: 'Porque IN falla o produce resultados inesperados (lógica trivaluada) si la subconsulta devuelve un solo NULL' },
      { id: 'opt-19-b', text: 'Porque EXISTS almacena todas las tuplas devueltas en un array estático en memoria' },
      { id: 'opt-19-c', text: 'Porque EXISTS obliga al motor a convertir la consulta en un FULL OUTER JOIN' },
      { id: 'opt-19-d', text: 'Porque la cláusula IN no permite usar índices secundarios en ninguna circunstancia' },
    ],
    correctOptionId: 'opt-19-a',
    explanation: 'En lógica trivaluada SQL, "x NOT IN (1, 2, NULL)" evalúa a UNKNOWN para cualquier x, lo que hace que toda la consulta devuelva 0 filas. NOT EXISTS se basa en evaluación booleana pura de presencia/ausencia y es inmune a este problema.',
  },

  // --- 20. Matching: Restricciones de Integridad de Esquema ---
  {
    type: 'MATCHING',
    id: 'fe1-q20',
    examId: 'final-exam-db-1',
    conceptId: 'c-constraints',
    conceptName: 'Restricciones Declarativas en SQL DDL',
    prompt: 'Conecta cada restricción SQL con su regla de validación de datos:',
    leftItems: [
      { id: 'left-cons-check', text: 'CHECK (edad >= 18)' },
      { id: 'left-cons-unique', text: 'UNIQUE (email)' },
      { id: 'left-cons-notnull', text: 'NOT NULL' },
    ],
    rightItems: [
      { id: 'right-cons-1', text: 'Valida una expresión booleana sobre el valor de la fila antes de permitir INSERT o UPDATE' },
      { id: 'right-cons-2', text: 'Impide valores repetidos en la columna, aunque en la mayoría de motores permite múltiples NULLs' },
      { id: 'right-cons-3', text: 'Exige que cada tupla contenga obligatoriamente un valor definido para la columna' },
    ],
    correctPairs: {
      'left-cons-check': 'right-cons-1',
      'left-cons-unique': 'right-cons-2',
      'left-cons-notnull': 'right-cons-3',
    },
    explanation: 'CHECK valida condiciones personalizadas; UNIQUE garantiza no duplicados sin imponer que sea PK; y NOT NULL rechaza explícitamente el valor ausente.',
  },

  // --- 21. Ordering: Ciclo de Migración de Esquema en Producción ---
  {
    type: 'ORDERING',
    id: 'fe1-q21',
    examId: 'final-exam-db-1',
    conceptId: 'c-migrations',
    conceptName: 'Evolución de Esquemas y Migraciones Seguras',
    prompt: 'Ordena los pasos para renombrar una columna ampliamente utilizada sin causar tiempo de inactividad (Zero Downtime Migration):',
    items: [
      { id: 'mig-step-1', text: 'Agregar la nueva columna con el nuevo nombre permitiendo valores NULL' },
      { id: 'mig-step-2', text: 'Configurar un Trigger o sincronización a nivel de código para duplicar escrituras en ambas columnas' },
      { id: 'mig-step-3', text: 'Hacer backfill (copiar datos históricos) de la columna antigua a la nueva en lotes (batches)' },
      { id: 'mig-step-4', text: 'Desplegar la versión del software que sólo lee y escribe en la nueva columna' },
      { id: 'mig-step-5', text: 'Eliminar el trigger y borrar la columna antigua en una migración final de limpieza' },
    ],
    correctOrder: [
      'mig-step-1',
      'mig-step-2',
      'mig-step-3',
      'mig-step-4',
      'mig-step-5',
    ],
    explanation: 'El patrón Expand/Contract permite evolucionar esquemas en producción sin bloqueos ni caídas: primero se expande con la nueva columna, se sincroniza, se migra la lectura del código y finalmente se contrae eliminando la columna obsoleta.',
  },

  // --- 22. Multiple Choice: Transacciones Distribuidas y Teorema CAP ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe1-q22',
    examId: 'final-exam-db-1',
    conceptId: 'c-distributed',
    conceptName: 'Sistemas Distribuidos y Teorema CAP',
    prompt: 'Según el Teorema CAP, ante la ocurrencia de una partición de red (Partition Tolerance), un sistema de base de datos distribuido se ve forzado a elegir entre:',
    options: [
      { id: 'opt-22-a', text: 'Consistencia estricta (rechazar lecturas/escrituras inconsistentes) o Disponibilidad (responder siempre, aun con datos obsoletos)' },
      { id: 'opt-22-b', text: 'Almacenamiento relacional o almacenamiento en memoria volátil' },
      { id: 'opt-22-c', text: 'Compresión de datos en disco o cifrado de extremo a extremo' },
      { id: 'opt-22-d', text: 'Índices B-Tree o funciones Hash distribuidas' },
    ],
    correctOptionId: 'opt-22-a',
    explanation: 'El Teorema CAP demuestra que ante una partición de red inevitable en sistemas distribuidos, sólo es posible garantizar Consistencia (CP) o Disponibilidad (AP), pero jamás ambas de manera simultánea.',
  },
]

// ============================================================================
// INTENTO 2: 22 Preguntas Totalmente Nuevas y Complementarias para el Reintento
// Énfasis reforzado en conceptos débiles y escenarios de producción
// ============================================================================

export const mockExamQuestionsAttempt2: InternalFinalExamQuestion[] = [
  // --- 1. Multiple Choice: Filtrado y Funciones en WHERE ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q01',
    examId: 'final-exam-db-1',
    conceptId: 'c-indexes',
    conceptName: 'Índices y Expresiones no SARGables',
    prompt: '¿Por qué la consulta "WHERE YEAR(fecha_creacion) = 2024" puede provocar un escaneo secuencial (Table Scan) a pesar de existir un índice en "fecha_creacion"?',
    options: [
      { id: 'opt-2-01-a', text: 'Porque el optimizador desconoce la función YEAR() en bases de datos relacionales' },
      { id: 'opt-2-01-b', text: 'Porque aplicar una función sobre la columna indexada la convierte en no sargable, impidiendo la búsqueda directa en el B-Tree' },
      { id: 'opt-2-01-c', text: 'Porque las fechas siempre se almacenan como cadenas de texto no comparables' },
      { id: 'opt-2-01-d', text: 'Porque el motor exige un índice compuesto con la clave primaria' },
    ],
    correctOptionId: 'opt-2-01-b',
    explanation: 'Una consulta es SARGable (Search Argument Able) cuando el predicado permite usar el índice directamente. Al envolver la columna en YEAR(), el motor debe evaluar la función para cada fila a menos que exista un índice basado en funciones.',
  },

  // --- 2. Multiple Choice: HAVING sin GROUP BY ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q02',
    examId: 'final-exam-db-1',
    conceptId: 'c-aggregations',
    conceptName: 'Comportamiento de HAVING sin GROUP BY',
    prompt: '¿Qué ocurre al ejecutar: "SELECT COUNT(*) FROM usuarios HAVING COUNT(*) > 0;" sin una cláusula GROUP BY explícita?',
    options: [
      { id: 'opt-2-02-a', text: 'Lanza un error de sintaxis porque HAVING exige obligatoriamente un GROUP BY' },
      { id: 'opt-2-02-b', text: 'Trata a toda la tabla como un único grupo global y evalúa la condición agregada sobre ella' },
      { id: 'opt-2-02-c', text: 'Borra la tabla porque asume que es una operación de limpieza' },
      { id: 'opt-2-02-d', text: 'Devuelve tantas filas como registros tenga la tabla original' },
    ],
    correctOptionId: 'opt-2-02-b',
    explanation: 'Si no se especifica GROUP BY, toda la relación actúa como un único grupo implícito. Si la condición del HAVING se cumple, devuelve 1 fila; si no, devuelve 0 filas.',
  },

  // --- 3. Matching: Niveles de Aislamiento y Candados ---
  {
    type: 'MATCHING',
    id: 'fe2-q03',
    examId: 'final-exam-db-1',
    conceptId: 'c-isolation',
    conceptName: 'Niveles de Aislamiento y Fenómenos Permitidos',
    prompt: 'Relaciona cada nivel de aislamiento ANSI SQL con su nivel de protección:',
    leftItems: [
      { id: 'left-iso-ru', text: 'Read Uncommitted' },
      { id: 'left-iso-rc', text: 'Read Committed' },
      { id: 'left-iso-rr', text: 'Repeatable Read' },
      { id: 'left-iso-ser', text: 'Serializable' },
    ],
    rightItems: [
      { id: 'right-iso-1', text: 'Permite Dirty Reads; no ofrece garantías de aislamiento' },
      { id: 'right-iso-2', text: 'Previene Dirty Reads pero permite Lecturas No Repetibles y Fantasmas' },
      { id: 'right-iso-3', text: 'Garantiza lecturas repetibles de filas leídas, pero en algunos motores permite Lecturas Fantasma' },
      { id: 'right-iso-4', text: 'Máximo aislamiento; previene todas las anomalías simulando ejecución secuencial estricta' },
    ],
    correctPairs: {
      'left-iso-ru': 'right-iso-1',
      'left-iso-rc': 'right-iso-2',
      'left-iso-rr': 'right-iso-3',
      'left-iso-ser': 'right-iso-4',
    },
    explanation: 'Read Uncommitted permite todo; Read Committed previene dirty reads; Repeatable Read asegura lecturas estables de tuplas leídas; Serializable previene todas las anomalías concurrentes.',
  },

  // --- 4. Ordering: Pasos para Diseñar una Base de Datos desde Cero ---
  {
    type: 'ORDERING',
    id: 'fe2-q04',
    examId: 'final-exam-db-1',
    conceptId: 'c-modeling',
    conceptName: 'Metodología de Modelado de Datos',
    prompt: 'Ordena las fases de ingeniería de datos para modelar una solución relacional completa:',
    items: [
      { id: 'model-step-1', text: 'Levantamiento de requerimientos de negocio y entidades clave' },
      { id: 'model-step-2', text: 'Creación del Modelo Entidad-Relación Conceptual (ER)' },
      { id: 'model-step-3', text: 'Traducción a Modelo Lógico Relacional aplicando normalización (3FN)' },
      { id: 'model-step-4', text: 'Implementación del Modelo Físico en el motor (DDL, tipos de datos, índices y constraints)' },
    ],
    correctOrder: [
      'model-step-1',
      'model-step-2',
      'model-step-3',
      'model-step-4',
    ],
    explanation: 'El modelado profesional va de lo abstracto a lo concreto: Requerimientos → Modelo Conceptual (ER) → Modelo Lógico Normalizado → Modelo Físico optimizado.',
  },

  // --- 5. Multiple Choice: Restricciones CHECK y Nulos ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q05',
    examId: 'final-exam-db-1',
    conceptId: 'c-constraints',
    conceptName: 'Semántica de CHECK ante valores NULL',
    prompt: 'En SQL estándar, ¿qué ocurre si se inserta un valor NULL en una columna protegida con "CHECK (precio > 0)" cuando la columna no tiene NOT NULL?',
    options: [
      { id: 'opt-2-05-a', text: 'La inserción falla porque el motor rechaza el valor inmediatamente' },
      { id: 'opt-2-05-b', text: 'La inserción tiene éxito porque la condición evalúa a UNKNOWN, y CHECK sólo rechaza cuando la condición evalúa explícitamente a FALSE' },
      { id: 'opt-2-05-c', text: 'El valor se transforma automáticamente en 0.01' },
      { id: 'opt-2-05-d', text: 'Se bloquea la tabla en modo exclusivo' },
    ],
    correctOptionId: 'opt-2-05-b',
    explanation: 'Regla crítica de SQL: una restricción CHECK se viola únicamente si la expresión evalúa a FALSE. Como "NULL > 0" evalúa a UNKNOWN, la inserción se permite. Para prohibir nulos se requiere NOT NULL.',
  },

  // --- 6. Matching: Tipos de Índices y sus Casos de Uso ---
  {
    type: 'MATCHING',
    id: 'fe2-q06',
    examId: 'final-exam-db-1',
    conceptId: 'c-indexes',
    conceptName: 'Tipos de Índices en Motores Relacionales',
    prompt: 'Relaciona cada tipo de índice con su caso de uso idóneo:',
    leftItems: [
      { id: 'left-idx-btree', text: 'B-Tree' },
      { id: 'left-idx-hash', text: 'Hash Index' },
      { id: 'left-idx-gin', text: 'GIN (Generalized Inverted Index)' },
    ],
    rightItems: [
      { id: 'right-idx-1', text: 'Consultas de rango (BETWEEN, <, >), ordenamientos (ORDER BY) y coincidencias por prefijo' },
      { id: 'right-idx-2', text: 'Búsquedas de igualdad exacta (O(1)) donde nunca se solicitan rangos ni ordenamientos' },
      { id: 'right-idx-3', text: 'Indexación de tipos compuestos como documentos JSONB, arrays o búsqueda de texto completo' },
    ],
    correctPairs: {
      'left-idx-btree': 'right-idx-1',
      'left-idx-hash': 'right-idx-2',
      'left-idx-gin': 'right-idx-3',
    },
    explanation: 'B-Tree es el índice multipropósito estándar; Hash es óptimo sólo para igualdad exacta O(1); GIN es la estructura líder para búsquedas en colecciones internas, JSONB y Full Text Search.',
  },

  // --- 7. Ordering: Pipeline de Resolución de Deadlocks ---
  {
    type: 'ORDERING',
    id: 'fe2-q07',
    examId: 'final-exam-db-1',
    conceptId: 'c-concurrency',
    conceptName: 'Detección y Manejo de Deadlocks',
    prompt: 'Ordena la secuencia que ejecuta el motor de base de datos cuando dos transacciones entran en interbloqueo mutuo (Deadlock):',
    items: [
      { id: 'dl-step-1', text: 'La transacción A retiene el recurso 1 y solicita el recurso 2 retrotraído por la transacción B' },
      { id: 'dl-step-2', text: 'La transacción B solicita el recurso 1, formando un ciclo en el grafo de espera (Wait-For Graph)' },
      { id: 'dl-step-3', text: 'El demonio detector de deadlocks del motor detecta el ciclo tras superar el tiempo de timeout' },
      { id: 'dl-step-4', text: 'El motor elige a una transacción como víctima (menor costo de rollback) y la aborta lanzando un error' },
      { id: 'dl-step-5', text: 'La transacción restante obtiene el recurso liberado y completa su operación con éxito' },
    ],
    correctOrder: [
      'dl-step-1',
      'dl-step-2',
      'dl-step-3',
      'dl-step-4',
      'dl-step-5',
    ],
    explanation: 'Un deadlock se forma por espera circular en el grafo de bloqueos; el motor lo identifica periódicamente, aborta la transacción más barata de revertir, y permite continuar a la otra.',
  },

  // --- 8. Multiple Choice: JOIN vs EXISTS en Rendimiento ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q08',
    examId: 'final-exam-db-1',
    conceptId: 'c-joins',
    conceptName: 'Semántica de Semi-JOIN y EXISTS',
    prompt: 'Cuando sólo necesitas verificar si un cliente tiene al menos una factura pero sin duplicar filas del cliente en el resultado, ¿cuál es la mejor opción estructural?',
    options: [
      { id: 'opt-2-08-a', text: 'INNER JOIN con facturas seguido de un costoso SELECT DISTINCT' },
      { id: 'opt-2-08-b', text: 'WHERE EXISTS (SELECT 1 FROM facturas WHERE facturas.cliente_id = clientes.id)' },
      { id: 'opt-2-08-c', text: 'CROSS JOIN entre clientes y facturas' },
      { id: 'opt-2-08-d', text: 'FULL OUTER JOIN sin cláusula WHERE' },
    ],
    correctOptionId: 'opt-2-08-b',
    explanation: 'WHERE EXISTS implementa un Semi-Join: el motor se detiene inmediatamente al encontrar la primera coincidencia (Short-Circuit) sin multiplicar filas del cliente, evitando el costoso DISTINCT.',
  },

  // --- 9. Matching: Anomalías de Normalización ---
  {
    type: 'MATCHING',
    id: 'fe2-q09',
    examId: 'final-exam-db-1',
    conceptId: 'c-normalization',
    conceptName: 'Anomalías en Esquemas Desnormalizados',
    prompt: 'Relaciona cada anomalía de diseño relacional con su consecuencia en la base de datos:',
    leftItems: [
      { id: 'left-anom-ins', text: 'Anomalía de Inserción' },
      { id: 'left-anom-upd', text: 'Anomalía de Modificación' },
      { id: 'left-anom-del', text: 'Anomalía de Eliminación' },
    ],
    rightItems: [
      { id: 'right-anom-res-1', text: 'Imposibilidad de registrar una entidad sin crear artificialmente otra vinculada' },
      { id: 'right-anom-res-2', text: 'Inconsistencia en los datos si un dato redundante se actualiza en algunas filas pero no en todas' },
      { id: 'right-anom-res-3', text: 'La eliminación de un registro causa la pérdida no deseada de información sobre otra entidad diferente' },
    ],
    correctPairs: {
      'left-anom-ins': 'right-anom-res-1',
      'left-anom-upd': 'right-anom-res-2',
      'left-anom-del': 'right-anom-res-3',
    },
    explanation: 'La normalización existe precisamente para erradicar las tres anomalías clásicas: inserción forzada, actualización inconsistente y borrado accidental de información colateral.',
  },

  // --- 10. Multiple Choice: Claves Primarias Compuestas ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q10',
    examId: 'final-exam-db-1',
    conceptId: 'c-keys',
    conceptName: 'Claves Primarias Compuestas en Tablas Intermedias',
    prompt: 'En una tabla intermedia que modela una relación N a M entre "estudiantes" y "cursos", ¿cuál suele ser la definición de clave primaria más eficiente?',
    options: [
      { id: 'opt-2-10-a', text: 'PRIMARY KEY (estudiante_id, curso_id)' },
      { id: 'opt-2-10-b', text: 'Un campo auto-incremental sin índices sobre las claves foráneas' },
      { id: 'opt-2-10-c', text: 'Una columna de texto con los nombres concatenados' },
      { id: 'opt-2-10-d', text: 'Dejar la tabla sin clave primaria para acelerar inserciones' },
    ],
    correctOptionId: 'opt-2-10-a',
    explanation: 'La combinación (estudiante_id, curso_id) garantiza unicidad por naturaleza, crea automáticamente el índice de búsqueda primario y ahorra el espacio en disco de un ID subrogado innecesario.',
  },

  // --- 11. Ordering: Procedimiento de Backup y Restauración Point-in-Time (PITR) ---
  {
    type: 'ORDERING',
    id: 'fe2-q11',
    examId: 'final-exam-db-1',
    conceptId: 'c-recovery',
    conceptName: 'Recuperación Point-in-Time (PITR)',
    prompt: 'Ordena los pasos técnicos para restaurar una base de datos a un instante específico antes de un incidente (PITR):',
    items: [
      { id: 'pitr-step-1', text: 'Restaurar la copia de seguridad base completa más reciente (Base Backup)' },
      { id: 'pitr-step-2', text: 'Configurar el archivo de recuperación indicando la marca de tiempo exacta del incidente' },
      { id: 'pitr-step-3', text: 'Reproducir secuencialmente los archivos del Write-Ahead Log (WAL) archivados (Replay)' },
      { id: 'pitr-step-4', text: 'Detener la reproducción al alcanzar la marca fijada y promover la base de datos a modo lectura/escritura' },
    ],
    correctOrder: [
      'pitr-step-1',
      'pitr-step-2',
      'pitr-step-3',
      'pitr-step-4',
    ],
    explanation: 'PITR combina el último backup físico con la reproducción de logs del WAL hasta justo un segundo antes de que ocurriera el error humano o la corrupción.',
  },

  // --- 12. Multiple Choice: Optimistic vs Pessimistic Locking ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q12',
    examId: 'final-exam-db-1',
    conceptId: 'c-concurrency',
    conceptName: 'Control de Concurrencia Optimista vs Pesimista',
    prompt: '¿En qué escenario de producción es más ventajoso implementar Control de Concurrencia Optimista (ej. columna "version") en lugar de Bloqueos Pesimistas (SELECT ... FOR UPDATE)?',
    options: [
      { id: 'opt-2-12-a', text: 'Sistemas con altísima tasa de colisión y conflicto sobre la misma fila' },
      { id: 'opt-2-12-b', text: 'Sistemas predominantemente de lectura con muy baja probabilidad de que dos usuarios editen el mismo registro simultáneamente' },
      { id: 'opt-2-12-c', text: 'Operaciones batch donde se modifican millones de registros secuenciales' },
      { id: 'opt-2-12-d', text: 'Sistemas sin conexión a internet' },
    ],
    correctOptionId: 'opt-2-12-b',
    explanation: 'El bloqueo optimista no retiene candados en la base de datos (evita deadlocks y overhead); simplemente verifica al guardar que la versión no haya cambiado. Es ideal en baja contención.',
  },

  // --- 13. Matching: Operaciones de Conjunto en SQL ---
  {
    type: 'MATCHING',
    id: 'fe2-q13',
    examId: 'final-exam-db-1',
    conceptId: 'c-sets',
    conceptName: 'Operadores de Conjuntos (UNION, INTERSECT, EXCEPT)',
    prompt: 'Conecta cada operador de conjuntos SQL con su efecto sobre los resultados:',
    leftItems: [
      { id: 'left-set-union', text: 'UNION' },
      { id: 'left-set-unionall', text: 'UNION ALL' },
      { id: 'left-set-except', text: 'EXCEPT (o MINUS)' },
    ],
    rightItems: [
      { id: 'right-set-1', text: 'Combina los resultados de dos consultas y elimina automáticamente las filas duplicadas' },
      { id: 'right-set-2', text: 'Concatena los resultados directamente preservando todos los duplicados (sin ordenar ni filtrar)' },
      { id: 'right-set-3', text: 'Devuelve las filas de la primera consulta que no están presentes en la segunda consulta' },
    ],
    correctPairs: {
      'left-set-union': 'right-set-1',
      'left-set-unionall': 'right-set-2',
      'left-set-except': 'right-set-3',
    },
    explanation: 'UNION elimina duplicados realizando un sort/hash costoso; UNION ALL es rápido porque sólo concatena; EXCEPT sustrae las filas del segundo conjunto.',
  },

  // --- 14. Ordering: Pasos de Creación de un Índice Concurrente ---
  {
    type: 'ORDERING',
    id: 'fe2-q14',
    examId: 'final-exam-db-1',
    conceptId: 'c-indexes',
    conceptName: 'Creación Concurrente de Índices en Producción',
    prompt: 'Ordena por qué se utiliza "CREATE INDEX CONCURRENTLY" en sistemas de alto tráfico:',
    items: [
      { id: 'idx-c-step-1', text: 'El comando se inicia sin adquirir un bloqueo exclusivo de tabla (evita denegación de servicio)' },
      { id: 'idx-c-step-2', text: 'El motor realiza una primera pasada escaneando las tuplas existentes y construyendo el árbol' },
      { id: 'idx-c-step-3', text: 'El motor espera a que concluyan las transacciones concurrentes que estaban activas' },
      { id: 'idx-c-step-4', text: 'Realiza una segunda pasada para indexar las modificaciones ocurridas durante la creación' },
      { id: 'idx-c-step-5', text: 'Marca el índice como válido y disponible para el planificador de consultas' },
    ],
    correctOrder: [
      'idx-c-step-1',
      'idx-c-step-2',
      'idx-c-step-3',
      'idx-c-step-4',
      'idx-c-step-5',
    ],
    explanation: 'CREATE INDEX bloquea escrituras; CONCURRENTLY realiza dos pasadas sin bloquear SELECT/INSERT/UPDATE/DELETE, garantizando disponibilidad total durante la creación.',
  },

  // --- 15. Multiple Choice: Sharding vs Particionamiento de Tablas ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q15',
    examId: 'final-exam-db-1',
    conceptId: 'c-distributed',
    conceptName: 'Particionamiento Horizontal vs Sharding',
    prompt: '¿Cuál es la diferencia fundamental entre el particionamiento de tablas nativo y el Sharding?',
    options: [
      { id: 'opt-2-15-a', text: 'El particionamiento divide la tabla dentro de la misma instancia de base de datos; el Sharding distribuye las particiones a través de múltiples servidores independientes' },
      { id: 'opt-2-15-b', text: 'El Sharding sólo es aplicable a bases de datos relacionales SQLite' },
      { id: 'opt-2-15-c', text: 'El particionamiento no permite consultar datos antiguos' },
      { id: 'opt-2-15-d', text: 'Son exactamente el mismo concepto sin ninguna diferencia técnica' },
    ],
    correctOptionId: 'opt-2-15-a',
    explanation: 'Particionamiento es una técnica monoinstancia que divide tablas lógicas en sub-tablas físicas (por rango, lista o hash). Sharding es escalabilidad horizontal distribuyendo los datos en nodos de red separados.',
  },

  // --- 16. Matching: Funciones de Ventana (Window Functions) ---
  {
    type: 'MATCHING',
    id: 'fe2-q16',
    examId: 'final-exam-db-1',
    conceptId: 'c-window',
    conceptName: 'Funciones de Ventana SQL',
    prompt: 'Relaciona cada función de ventana con su comportamiento:',
    leftItems: [
      { id: 'left-win-row', text: 'ROW_NUMBER()' },
      { id: 'left-win-rank', text: 'RANK()' },
      { id: 'left-win-lead', text: 'LEAD(col, 1)' },
    ],
    rightItems: [
      { id: 'right-win-1', text: 'Asigna un entero secuencial estricto y único a cada fila dentro de la partición (1, 2, 3, 4)' },
      { id: 'right-win-2', text: 'Asigna el mismo ranking ante empates, pero deja huecos en la numeración (1, 2, 2, 4)' },
      { id: 'right-win-3', text: 'Permite acceder al valor de una columna de la fila siguiente sin necesidad de hacer un self-join' },
    ],
    correctPairs: {
      'left-win-row': 'right-win-1',
      'left-win-rank': 'right-win-2',
      'left-win-lead': 'right-win-3',
    },
    explanation: 'ROW_NUMBER no repite números; RANK repite números ante empates y salta posiciones; LEAD asoma a filas futuras dentro de la ventana.',
  },

  // --- 17. Ordering: Flujo de Resolución de Inyecciones SQL ---
  {
    type: 'ORDERING',
    id: 'fe2-q17',
    examId: 'final-exam-db-1',
    conceptId: 'c-security',
    conceptName: 'Prevención de Inyecciones SQL con Prepared Statements',
    prompt: 'Ordena cómo una consulta parametrizada (Prepared Statement) neutraliza un ataque de inyección SQL:',
    items: [
      { id: 'sec-step-1', text: 'La aplicación envía la estructura fija de la consulta SQL con marcadores de posición (?) al motor' },
      { id: 'sec-step-2', text: 'El motor compila, analiza la sintaxis y crea el árbol de ejecución de la consulta' },
      { id: 'sec-step-3', text: 'La aplicación envía los parámetros del usuario por separado en un canal de datos desacoplado' },
      { id: 'sec-step-4', text: 'El motor sustituye los parámetros tratándolos estrictamente como valores literales, nunca como código ejecutable' },
    ],
    correctOrder: [
      'sec-step-1',
      'sec-step-2',
      'sec-step-3',
      'sec-step-4',
    ],
    explanation: 'Al separar la compilación sintáctica del envío de datos, cualquier cadena maliciosa (ej. "\' OR 1=1 --") se evalúa como una simple cadena de texto y no puede alterar la semántica de la consulta.',
  },

  // --- 18. Multiple Choice: Transacciones Anidadas y Savepoints ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q18',
    examId: 'final-exam-db-1',
    conceptId: 'c-acid',
    conceptName: 'Puntos de Guardado (SAVEPOINT)',
    prompt: '¿Para qué sirve la instrucción "ROLLBACK TO SAVEPOINT punto_1" dentro de una transacción activa?',
    options: [
      { id: 'opt-2-18-a', text: 'Para deshacer selectivamente los cambios posteriores a ese punto sin abortar toda la transacción externa' },
      { id: 'opt-2-18-b', text: 'Para confirmar definitivamente todas las operaciones anteriores en disco' },
      { id: 'opt-2-18-c', text: 'Para borrar físicamente el log de transacciones' },
      { id: 'opt-2-18-d', text: 'Para forzar un reinicio del motor de base de datos' },
    ],
    correctOptionId: 'opt-2-18-a',
    explanation: 'SAVEPOINT permite crear puntos intermedios de restauración. Si una operación secundaria falla, se puede hacer ROLLBACK TO SAVEPOINT y continuar con el resto de la transacción.',
  },

  // --- 19. Multiple Choice: Clave Foránea sin Índice ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q19',
    examId: 'final-exam-db-1',
    conceptId: 'c-performance',
    conceptName: 'Indexación de Claves Foráneas',
    prompt: '¿Por qué la mayoría de los administradores de bases de datos recomiendan crear un índice explícito sobre las columnas con Foreign Keys en la tabla hija?',
    options: [
      { id: 'opt-2-19-a', text: 'Porque el estándar SQL prohíbe crear tablas sin índices en las Foreign Keys' },
      { id: 'opt-2-19-b', text: 'Para acelerar los JOINs y evitar bloqueos de tabla completa en la hija cuando se elimina o actualiza la fila padre' },
      { id: 'opt-2-19-c', text: 'Porque de lo contrario no se pueden guardar números negativos' },
      { id: 'opt-2-19-d', text: 'Para forzar que la tabla pase automáticamente a 3FN' },
    ],
    correctOptionId: 'opt-2-19-b',
    explanation: 'Muchos motores relacionales no indexan automáticamente las columnas FK en las tablas hijas. Sin índice, borrar una fila padre requiere escanear toda la tabla hija o bloquearla completamente para verificar que no haya referencias huérfanas.',
  },

  // --- 20. Matching: Integridad de Dominio vs Referencial ---
  {
    type: 'MATCHING',
    id: 'fe2-q20',
    examId: 'final-exam-db-1',
    conceptId: 'c-integrity',
    conceptName: 'Tipos de Integridad en el Modelo Relacional',
    prompt: 'Relaciona cada categoría de integridad con su propósito:',
    leftItems: [
      { id: 'left-integ-ent', text: 'Integridad de Entidad' },
      { id: 'left-integ-dom', text: 'Integridad de Dominio' },
      { id: 'left-integ-ref', text: 'Integridad Referencial' },
    ],
    rightItems: [
      { id: 'right-integ-1', text: 'Garantiza que cada tupla sea identificable de manera unívoca mediante una clave primaria no nula' },
      { id: 'right-integ-2', text: 'Asegura que los valores de una columna pertenezcan al tipo de dato, rango y formato válido' },
      { id: 'right-integ-3', text: 'Asegura que los punteros y relaciones entre tablas siempre apunten a registros válidos existentes' },
    ],
    correctPairs: {
      'left-integ-ent': 'right-integ-1',
      'left-integ-dom': 'right-integ-2',
      'left-integ-ref': 'right-integ-3',
    },
    explanation: 'Integridad de Entidad = PK no nula y única; Integridad de Dominio = tipos y validaciones de valores; Integridad Referencial = coherencia de Foreign Keys.',
  },

  // --- 21. Ordering: Pipeline de Reescritura y Optimización Interna ---
  {
    type: 'ORDERING',
    id: 'fe2-q21',
    examId: 'final-exam-db-1',
    conceptId: 'c-optimizer',
    conceptName: 'Arquitectura Interna del Procesador de Consultas',
    prompt: 'Ordena cómo el motor interno procesa una consulta desde que llega en texto plano hasta que devuelve bytes:',
    items: [
      { id: 'pipe-step-1', text: 'Parser (análisis léxico y sintáctico: genera el Parse Tree)' },
      { id: 'pipe-step-2', text: 'Analyzer / Rewriter (valida catálogo, tipos de datos y expande vistas)' },
      { id: 'pipe-step-3', text: 'Optimizer / Planner (calcula costos estadísticos y selecciona el mejor plan de ejecución)' },
      { id: 'pipe-step-4', text: 'Executor (ejecuta operadores como SeqScan, IndexScan, NestedLoop y devuelve tuplas)' },
    ],
    correctOrder: [
      'pipe-step-1',
      'pipe-step-2',
      'pipe-step-3',
      'pipe-step-4',
    ],
    explanation: 'Las etapas del procesador de consultas SQL clásico son: Parser → Rewriter → Optimizer (Planner) → Executor.',
  },

  // --- 22. Multiple Choice: Índices Compuestos y Regla del Prefijo Izquierdo ---
  {
    type: 'MULTIPLE_CHOICE',
    id: 'fe2-q22',
    examId: 'final-exam-db-1',
    conceptId: 'c-indexes',
    conceptName: 'Regla del Prefijo Izquierdo (Leftmost Prefix Rule)',
    prompt: 'Dado un índice compuesto definido en "(apellido, nombre, edad)", ¿cuál de las siguientes consultas NO puede aprovechar este índice de manera eficiente?',
    options: [
      { id: 'opt-2-22-a', text: 'WHERE apellido = \'Perez\' AND nombre = \'Juan\'' },
      { id: 'opt-2-22-b', text: 'WHERE apellido = \'Perez\'' },
      { id: 'opt-2-22-c', text: 'WHERE nombre = \'Juan\' AND edad = 30' },
      { id: 'opt-2-22-d', text: 'WHERE apellido = \'Perez\' AND edad = 30' },
    ],
    correctOptionId: 'opt-2-22-c',
    explanation: 'Según la regla del prefijo izquierdo en índices compuestos, el motor sólo puede buscar por el índice si la consulta filtra al menos por la primera columna (apellido). Sin ella, el árbol no puede navegarse ordenadamente.',
  },
]

// ============================================================================
// STORES EN MEMORIA (Para Simulación de Estado y Cooldowns)
// ============================================================================

export const memoryExamAttemptStore = new Map<string, number>()
export const memoryExamCooldownStore = new Map<string, string>() // courseId -> ISO timestamp
export const memoryExamResultsStore = new Map<string, FinalExamResult>()

/**
 * Obtiene el examen final completo interno (con respuestas correctas)
 * para evaluación interna del mock/service layer.
 */
export function getInternalMockFinalExam(courseIdOrExamId: string, forcedAttempt?: number): InternalFinalExam {
  const normId = String(courseIdOrExamId).replace(/^final-exam-/, '')
  const courseId = normId.startsWith('course-') ? normId.replace(/^course-/, '') : '1'
  const currentAttempt = forcedAttempt ?? (memoryExamAttemptStore.get(courseId) || 1)

  const questions = currentAttempt === 1 ? mockExamQuestionsAttempt1 : mockExamQuestionsAttempt2
  const passingThreshold = getMinimumExamPassingScore(questions.length)

  return {
    id: `final-exam-db-${courseId}`,
    courseId,
    courseTitle: 'Bases de Datos Relacionales y SQL',
    attemptNumber: currentAttempt,
    questions,
    totalQuestions: questions.length,
    passingThreshold,
    passingScorePercent: 70,
    estimatedMinutes: 45,
  }
}

/**
 * Obtiene el examen final sanitizado para la UI.
 * IMPORTANTE: Ninguna opción u orden contiene respuestas correctas expuestas.
 */
export function getMockFinalExam(courseIdOrExamId: string, forcedAttempt?: number): FinalExam {
  const internal = getInternalMockFinalExam(courseIdOrExamId, forcedAttempt)

  const sanitizedQuestions: FinalExamQuestion[] = internal.questions.map((q) => {
    if (q.type === 'MULTIPLE_CHOICE') {
      return {
        type: 'MULTIPLE_CHOICE',
        id: q.id,
        examId: q.examId,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
        prompt: q.prompt,
        context: q.context,
        options: q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
        })),
      }
    }

    if (q.type === 'MATCHING') {
      // Barajar visualmente la columna derecha para que no coincida fila por fila
      const shuffledRight = [...q.rightItems].sort(() => 0.5 - Math.random())
      return {
        type: 'MATCHING',
        id: q.id,
        examId: q.examId,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
        prompt: q.prompt,
        context: q.context,
        leftItems: q.leftItems.map((item) => ({ id: item.id, text: item.text })),
        rightItems: shuffledRight.map((item) => ({ id: item.id, text: item.text })),
      }
    }

    // ORDERING: Barajar los ítems para que el estudiante deba ordenarlos
    const shuffledItems = [...q.items].sort(() => 0.5 - Math.random())
    return {
      type: 'ORDERING',
      id: q.id,
      examId: q.examId,
      conceptId: q.conceptId,
      conceptName: q.conceptName,
      prompt: q.prompt,
      context: q.context,
      orderingHint: q.orderingHint,
      items: shuffledItems.map((item) => ({ id: item.id, text: item.text })),
    }
  })

  return {
    id: internal.id,
    courseId: internal.courseId,
    courseTitle: internal.courseTitle,
    attemptNumber: internal.attemptNumber,
    questions: sanitizedQuestions,
    totalQuestions: internal.totalQuestions,
    passingThreshold: internal.passingThreshold,
    passingScorePercent: internal.passingScorePercent,
    estimatedMinutes: internal.estimatedMinutes,
  }
}

/**
 * Evalúa las respuestas del examen final en el servidor/mock layer de forma determinista.
 */
export function evaluateMockFinalExam(
  examId: string,
  answers: FinalExamAnswer[]
): FinalExamResult {
  const internalExam = getInternalMockFinalExam(examId)
  const totalQuestions = internalExam.questions.length
  const evaluations: FinalExamAnswerEvaluation[] = []
  const weakConceptIdsSet = new Set<string>()
  let correctCount = 0

  const answersMap = new Map<string, FinalExamAnswer>(answers.map((a) => [a.questionId, a]))

  for (const question of internalExam.questions) {
    const studentAnswer = answersMap.get(question.id)

    if (question.type === 'MULTIPLE_CHOICE') {
      const selectedOptionId =
        studentAnswer?.type === 'MULTIPLE_CHOICE' ? studentAnswer.selectedOptionId : ''
      const isCorrect = selectedOptionId === question.correctOptionId
      const selectedOpt = question.options.find((o) => o.id === selectedOptionId)
      const correctOpt = question.options.find((o) => o.id === question.correctOptionId)

      if (isCorrect) {
        correctCount++
      } else {
        weakConceptIdsSet.add(question.conceptId)
      }

      evaluations.push({
        questionId: question.id,
        type: 'MULTIPLE_CHOICE',
        prompt: question.prompt,
        conceptId: question.conceptId,
        conceptName: question.conceptName,
        isCorrect,
        explanation: question.explanation,
        selectedOptionText: selectedOpt?.text || 'Sin respuesta seleccionada',
        correctOptionText: correctOpt?.text || '',
      })
    } else if (question.type === 'MATCHING') {
      const studentPairs =
        studentAnswer?.type === 'MATCHING' ? studentAnswer.pairs : {}

      // Verificación estricta: cada clave de correctPairs debe coincidir exactamente
      const correctKeys = Object.keys(question.correctPairs)
      const isCorrect =
        correctKeys.length > 0 &&
        correctKeys.every((key) => studentPairs[key] === question.correctPairs[key])

      if (isCorrect) {
        correctCount++
      } else {
        weakConceptIdsSet.add(question.conceptId)
      }

      const leftMap = new Map(question.leftItems.map((item) => [item.id, item.text]))
      const rightMap = new Map(question.rightItems.map((item) => [item.id, item.text]))

      const studentPairsDisplay = Object.entries(studentPairs).map(([lId, rId]) => ({
        left: leftMap.get(lId) || lId,
        right: rightMap.get(rId) || rId,
      }))

      const correctPairsDisplay = Object.entries(question.correctPairs).map(([lId, rId]) => ({
        left: leftMap.get(lId) || lId,
        right: rightMap.get(rId) || rId,
      }))

      evaluations.push({
        questionId: question.id,
        type: 'MATCHING',
        prompt: question.prompt,
        conceptId: question.conceptId,
        conceptName: question.conceptName,
        isCorrect,
        explanation: question.explanation,
        studentPairsDisplay,
        correctPairsDisplay,
      })
    } else if (question.type === 'ORDERING') {
      const studentOrder =
        studentAnswer?.type === 'ORDERING' ? studentAnswer.orderedIds : []

      // Verificación estricta: coincidencia idéntica elemento por elemento
      const isCorrect =
        studentOrder.length === question.correctOrder.length &&
        question.correctOrder.every((id, idx) => studentOrder[idx] === id)

      if (isCorrect) {
        correctCount++
      } else {
        weakConceptIdsSet.add(question.conceptId)
      }

      const itemMap = new Map(question.items.map((item) => [item.id, item.text]))
      const studentOrderDisplay = studentOrder.map((id) => itemMap.get(id) || id)
      const correctOrderDisplay = question.correctOrder.map((id) => itemMap.get(id) || id)

      evaluations.push({
        questionId: question.id,
        type: 'ORDERING',
        prompt: question.prompt,
        conceptId: question.conceptId,
        conceptName: question.conceptName,
        isCorrect,
        explanation: question.explanation,
        studentOrderDisplay,
        correctOrderDisplay,
      })
    }
  }

  const incorrectCount = totalQuestions - correctCount
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const passingThreshold = internalExam.passingThreshold
  const passed = correctCount >= passingThreshold
  const weakConceptIds = Array.from(weakConceptIdsSet)

  const result: FinalExamResult = {
    examId: internalExam.id,
    courseId: internalExam.courseId,
    attemptNumber: internalExam.attemptNumber,
    totalQuestions,
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
    scorePercent,
    passed,
    passingThreshold,
    weakConceptIds,
    evaluations,
    completedAt: new Date().toISOString(),
  }

  // Guardar resultado
  memoryExamResultsStore.set(internalExam.id, result)

  if (passed) {
    // Si aprobó: Marcar curso y nodo como completados
    const course = memoryCourseStore.find((c) => c.id === internalExam.courseId)
    if (course) {
      course.status = 'COMPLETED'
      if (course.progress) {
        course.progress.progressPercent = 100
        course.progress.completedSessions = course.progress.totalSessions
      }
    }

    const learningPath = memoryLearningPathStore.get(internalExam.courseId)
    if (learningPath) {
      const finalNode = learningPath.nodes.find((n) => n.type === 'FINAL_EXAM')
      if (finalNode) {
        finalNode.status = 'COMPLETED'
      }
    }

    // Limpiar cualquier cooldown pendiente
    memoryExamCooldownStore.delete(internalExam.courseId)
  } else {
    // Si reprobó: Activar cooldown estricto de exactamente 1 hora (3600 segundos)
    const cooldownUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    memoryExamCooldownStore.set(internalExam.courseId, cooldownUntil)
  }

  return result
}

/**
 * Obtiene el estado de cooldown para el curso
 */
export function getMockFinalExamCooldown(courseId: string): {
  inCooldown: boolean
  remainingSeconds: number
  cooldownUntil?: string
} {
  const cooldownStr = memoryExamCooldownStore.get(courseId)
  if (!cooldownStr) {
    return { inCooldown: false, remainingSeconds: 0 }
  }

  const cooldownTime = new Date(cooldownStr).getTime()
  const now = Date.now()
  const diffMs = cooldownTime - now

  if (diffMs <= 0) {
    // Cooldown expirado
    memoryExamCooldownStore.delete(courseId)
    return { inCooldown: false, remainingSeconds: 0 }
  }

  return {
    inCooldown: true,
    remainingSeconds: Math.ceil(diffMs / 1000),
    cooldownUntil: cooldownStr,
  }
}

/**
 * Inicia el reintento del examen final tras el cooldown.
 * Avanza el intento y genera/activa el set de preguntas del Intento 2.
 */
export function startMockFinalExamRetry(courseId: string): FinalExam {
  const cooldown = getMockFinalExamCooldown(courseId)
  if (cooldown.inCooldown) {
    throw new Error(
      `El examen final está en periodo de enfriamiento. Faltan ${Math.ceil(
        cooldown.remainingSeconds / 60
      )} minutos.`
    )
  }

  // Avanzar intento
  const currentAttempt = memoryExamAttemptStore.get(courseId) || 1
  const newAttempt = currentAttempt + 1
  memoryExamAttemptStore.set(courseId, newAttempt)

  // Retornar el nuevo examen (Attempt 2)
  return getMockFinalExam(courseId, newAttempt)
}

/**
 * Helper para entorno de desarrollo/pruebas:
 * Permite simular que el cooldown de 1 hora ya expiró inmediatamente.
 */
export function clearMockFinalExamCooldownDev(courseId: string): void {
  memoryExamCooldownStore.delete(courseId)
}
