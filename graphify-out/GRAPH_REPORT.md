# Graph Report - Estudy_AI  (2026-10-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1707 nodes · 4279 edges · 69 communities (60 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 131 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ed78d6e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- activity.parser.ts
- userSettings.ts
- auth.controller.ts
- @nestjs/common
- materials.service.ts
- frontend/package.json
- backend/package.json
- course.service.ts
- ai-course-plan.dto.ts
- useTranslation
- FinalExamRepository
- steps
- electron-builder.yml
- CurrentUser
- generation-pipeline.service.ts
- PrismaCourseRepository
- Session
- CourseRepository
- desktop/package.json
- CourseCard.tsx
- types/course.ts
- UpdateCourseDto
- auditor.py
- exam.ts
- exam.service.ts
- MapperError
- dependencies
- PrismaFinalExamRepository
- CurrentUserPayload
- quiz.repository.ts
- FinalExamAttempt
- CurrentSessionCard.tsx
- @tabler/icons-react
- compilerOptions
- compilerOptions
- CourseService
- package.json
- SessionsController
- generate-icons.js
- i18n/index.ts
- CourseCreationForm.tsx
- compilerOptions
- desktop/src/main.ts
- FinalExam/index.tsx
- Quiz/index.tsx
- QuizzesService
- stage-backend.js
- compilerOptions
- ExamsController
- scripts
- courses.service.ts
- exams.service.ts
- AppController
- MarkdownRenderer
- generate.js
- CodeBlock.tsx
- ai.service.ts
- jest
- FinalExamAttemptAnswerMapper
- AiService
- submit-exam-attempt.dto.ts
- submit-attempt.dto.ts
- scripts
- FinalExamResult.tsx
- nest-cli.json
- normalizeSessionItem
- tsconfig.build.json
- frontend/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `useTranslation()` - 77 edges
2. `@tabler/icons-react` - 59 edges
3. `@nestjs/common` - 51 edges
4. `react` - 47 edges
5. `CourseRepository` - 39 edges
6. `CourseService` - 37 edges
7. `react-router-dom` - 34 edges
8. `CurrentUserPayload` - 30 edges
9. `CurrentUser` - 29 edges
10. `FinalExamRepository` - 28 edges

## Surprising Connections (you probably didn't know these)
- `@types/node@^20.19.43` --declares--> `@types/node`  [EXTRACTED]
  desktop/package.json → backend/package.json
- `typescript@^5.9.3` --declares--> `typescript`  [EXTRACTED]
  desktop/package.json → backend/package.json
- `@types/node@^24.13.3` --declares--> `@types/node`  [EXTRACTED]
  frontend/package.json → backend/package.json
- `typescript@~6.0.2` --declares--> `typescript`  [EXTRACTED]
  frontend/package.json → backend/package.json
- `ProcessingStepItem()` --calls--> `useTranslation()`  [EXTRACTED]
  frontend/src/components/courses/ProcessingStepItem.tsx → frontend/src/i18n/i18nContext.ts

## Import Cycles
- None detected.

## Communities (69 total, 9 thin omitted)

### Community 0 - "activity.parser.ts"
Cohesion: 0.05
Nodes (93): ActivityContainer(), ActivityContainerProps, MAX_PRACTICE_ATTEMPTS, ClassifyActivityView(), ClassifyActivityViewProps, DetectErrorActivityView(), DetectErrorActivityViewProps, FillInBlankActivityView() (+85 more)

### Community 1 - "userSettings.ts"
Cohesion: 0.05
Nodes (75): ConceptDetailDialog(), ConceptDetailDialogProps, SessionConceptsBlock(), SessionConceptsBlockProps, englishContextValue, formatConceptSequence(), getNextConceptIndex(), getPrevConceptIndex() (+67 more)

### Community 2 - "auth.controller.ts"
Cohesion: 0.07
Nodes (14): class-transformer@^0.5.1, PrismaUserRepository, User, UserResponse, UserRepository, AuthController, AuthService, Public() (+6 more)

### Community 3 - "@nestjs/common"
Cohesion: 0.08
Nodes (21): configureApp(), AppModule, FRONTEND_DIST_DIR, DatabaseModule, ensureSqliteDirectory(), maskHome(), PRISMA_SCHEMA_DIR, resolveSqlitePath() (+13 more)

### Community 4 - "materials.service.ts"
Cohesion: 0.07
Nodes (16): ExtractedMaterial, MaterialResponseDto, MaterialStorageError, MaterialStorageService, MaterialsController, DEFAULT_MAX_MATERIAL_BYTES, getMaxMaterialBytes(), MaterialsService (+8 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.06
Nodes (47): eslint@^8.0.0, eslint, dependencies, react@^19.2.8, react-dom@^19.2.8, react-markdown@^10.1.0, react-router-dom@^7.18.4, remark-gfm@^4.0.1 (+39 more)

### Community 6 - "backend/package.json"
Cohesion: 0.06
Nodes (47): author, description, devDependencies, eslint-config-prettier@^9.0.0, eslint-plugin-prettier@^5.0.0, jest@^29.5.0, @nestjs/cli@^10.0.0, @nestjs/schematics@^10.0.0 (+39 more)

### Community 7 - "course.service.ts"
Cohesion: 0.09
Nodes (36): LearningPathHeaderProps, QuizResultViewProps, QuizTopBarProps, areActivitiesSubstantivelyDuplicate(), BackendConcept, BackendCourse, BackendExamStatus, BackendQuizResponse (+28 more)

### Community 8 - "ai-course-plan.dto.ts"
Cohesion: 0.04
Nodes (44): AiActivity, AiClassifyActivity, aiClassifyActivitySchema, aiClassifyItemSchema, AiConceptsResponse, AiDetectErrorActivity, aiDetectErrorActivitySchema, aiExtractedConceptSchema (+36 more)

### Community 9 - "useTranslation"
Cohesion: 0.14
Nodes (29): App(), ProtectedRoute(), ProtectedRouteProps, AppLayout(), coverflowStates, TopBar(), QuizTopBar(), SettingsDialog() (+21 more)

### Community 10 - "FinalExamRepository"
Cohesion: 0.13
Nodes (8): FinalExamRepository, QuizRepository, SessionRepository, ExamAvailabilityService, QuizAttemptFeedbackItem, SanitizedQuizOption, SanitizedQuizQuestion, @nestjs/testing

### Community 11 - "steps"
Cohesion: 0.05
Nodes (36): runs-on, steps, strategy, CSC_IDENTITY_AUTO_DISCOVERY, GH_TOKEN, GITHUB_TOKEN, artifact, glob (+28 more)

### Community 12 - "electron-builder.yml"
Cohesion: 0.06
Nodes (35): appId, copyright, directories, buildResources, output, electronVersion, extraResources, filter (+27 more)

### Community 13 - "CurrentUser"
Cohesion: 0.12
Nodes (6): CurrentUser, CoursesController, CourseProgressResult, GenerationStatusResponseDto, QuizzesController, GetQuizResponse

### Community 14 - "generation-pipeline.service.ts"
Cohesion: 0.11
Nodes (12): GenerationJobStatus, aiConceptsResponseSchema, AiExtractedConcept, aiFinalExamResponseSchema, AiSession, aiSessionPlanResponseSchema, aiSessionQuizResponseSchema, CHUNK_SIZE (+4 more)

### Community 15 - "PrismaCourseRepository"
Cohesion: 0.09
Nodes (4): PrismaService, PrismaCourseRepository, GenerationJob, Material

### Community 16 - "Session"
Cohesion: 0.11
Nodes (6): PrismaSessionRepository, ActivityAttempt, Concept, Session, SubmitQuizAttemptResult, SessionsService

### Community 17 - "CourseRepository"
Cohesion: 0.15
Nodes (3): Course, CourseRepository, CoursesService

### Community 18 - "desktop/package.json"
Cohesion: 0.08
Nodes (27): ts-node@^10.9.1, @types/node@^20.3.1, typescript@^5.1.3, ts-node, @types/node, typescript, author, description (+19 more)

### Community 19 - "CourseCard.tsx"
Cohesion: 0.17
Nodes (21): CourseBannerPickerModal(), CourseBannerPickerModalProps, CourseBannerSelectorGrid(), CourseBannerSelectorGridProps, COURSE_BANNER_KEYS, COURSE_BANNERS, CourseBannerDefinition, getCourseBannerByKey() (+13 more)

### Community 20 - "types/course.ts"
Cohesion: 0.12
Nodes (23): ProcessingStepItem(), ProcessingStepItemProps, FinalExamNode(), FinalExamNodeProps, LearningPathConnector(), LearningPathConnectorProps, LearningPathNode(), LearningPathNodeProps (+15 more)

### Community 21 - "UpdateCourseDto"
Cohesion: 0.07
Nodes (8): class-validator@^0.15.1, COURSE_BANNER_KEYS, CreateCourseDto, GenerateCourseDto, COURSE_DESCRIPTION_MAX_LENGTH, COURSE_NAME_MAX_LENGTH, UpdateCourseDto, class-validator

### Community 22 - "auditor.py"
Cohesion: 0.13
Nodes (12): decidir_siguiente(), EstadoAuditoria, nodo_analisis_estatico(), nodo_auditar_pipeline(), nodo_generar_parche(), buscar(), actualizar_indice(), buscar_archivos() (+4 more)

### Community 23 - "exam.ts"
Cohesion: 0.11
Nodes (22): MatchingQuestionProps, MultipleChoiceQuestionProps, OPTION_LETTERS, OrderingQuestionProps, BaseExamQuestion, ExamOption, FinalExamAttemptRecord, FinalExamState (+14 more)

### Community 24 - "exam.service.ts"
Cohesion: 0.11
Nodes (16): FinalExamTopBarProps, apiClient, ApiError, BackendExamAttemptResult, BackendExamEvalPayload, BackendExamFeedbackPayload, ExamService, ExamSubmissionContext (+8 more)

### Community 25 - "MapperError"
Cohesion: 0.13
Nodes (11): zod@^4.6.5, MapperError, matchingPayloadSchema, multipleChoicePayloadSchema, orderingPayloadSchema, QuizAttemptAnswerMapper, examOptionSchema, quizOptionsPayloadSchema (+3 more)

### Community 26 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, bcryptjs@^3.0.3, dotenv@^16.6.1, mammoth@^1.13.0, @nestjs/common@^10.0.0, @nestjs/core@^10.0.0, @nestjs/jwt@^10.2.0, @nestjs/platform-express@^10.0.0 (+15 more)

### Community 27 - "PrismaFinalExamRepository"
Cohesion: 0.15
Nodes (6): FinalExamQuestionMapper, PrismaFinalExamRepository, FinalExam, FinalExamQuestion, FinalExamQuestionPayload, ExamAvailabilityResult

### Community 28 - "CurrentUserPayload"
Cohesion: 0.25
Nodes (4): DatabaseError, CurrentUserPayload, IS_PUBLIC_KEY, JwtAuthGuard

### Community 29 - "quiz.repository.ts"
Cohesion: 0.17
Nodes (5): PrismaQuizRepository, Quiz, QuizAttempt, QuizAttemptAnswer, QuizQuestion

### Community 30 - "FinalExamAttempt"
Cohesion: 0.17
Nodes (4): FinalExamAttempt, FinalExamAttemptAnswer, ExamsService, shuffleArray()

### Community 31 - "CurrentSessionCard.tsx"
Cohesion: 0.17
Nodes (16): buildPreviewNodes(), CurrentSessionCard(), CurrentSessionCardProps, connectorClass(), finalExamNodeStyles, labelStyles, nodeStyles, PathNode (+8 more)

### Community 32 - "@tabler/icons-react"
Cohesion: 0.20
Nodes (14): FinalExamCooldownProps, SessionIntroBlock(), SessionIntroBlockProps, SessionPracticeBlock(), SessionPracticeBlockProps, SessionQuizTransitionBlock(), SessionQuizTransitionBlockProps, StudySessionTopBar() (+6 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+10 more)

### Community 35 - "CourseService"
Cohesion: 0.15
Nodes (5): ProcessingProgressProps, ProcessingSuccessProps, CourseService, CourseProcessingState, CreateCourseDto

### Community 36 - "package.json"
Cohesion: 0.11
Nodes (18): author, description, devDependencies, concurrently@^9.2.1, keywords, license, name, private (+10 more)

### Community 38 - "generate-icons.js"
Cohesion: 0.12
Nodes (14): body, chunk(), crc32(), CRC_TABLE, fs, icnsHead, icoEntry, icoHeader (+6 more)

### Community 39 - "i18n/index.ts"
Cohesion: 0.22
Nodes (11): BUILDER_STEPS, BuilderProgress(), BuilderProgressProps, BuilderStep, getStepIndex(), ProcessingError(), ProcessingErrorProps, ProcessingProgress() (+3 more)

### Community 40 - "CourseCreationForm.tsx"
Cohesion: 0.22
Nodes (13): CourseCreationForm(), FileUploadArea(), FileUploadAreaProps, SUPPORTED_EXTENSIONS, getFileIcon(), MaterialItem(), MaterialItemProps, SelectedFile (+5 more)

### Community 41 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 42 - "desktop/src/main.ts"
Cohesion: 0.16
Nodes (10): backendEntry, backendRoot, DEMO_API_KEY, findFreePort(), frontendDist, getOrCreateJwtSecret(), probeHealth(), startBackend() (+2 more)

### Community 43 - "FinalExam/index.tsx"
Cohesion: 0.25
Nodes (11): FinalExamProgress(), FinalExamProgressProps, FinalExamQuestionCard(), FinalExamQuestionCardProps, FinalExamTopBar(), MatchingQuestion(), MultipleChoiceQuestion(), OrderingQuestion() (+3 more)

### Community 44 - "Quiz/index.tsx"
Cohesion: 0.21
Nodes (11): QuizQuestionCard(), QuizQuestionCardProps, QuizResultView(), WeakConceptReview(), WeakConceptReviewProps, showAppToast(), Quiz(), getActiveUserId() (+3 more)

### Community 46 - "stage-backend.js"
Cohesion: 0.14
Nodes (12): backendDir, backendDist, backendPkg, dependencies, { execFileSync }, fs, installedVersion(), path (+4 more)

### Community 47 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+6 more)

### Community 49 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 50 - "courses.service.ts"
Cohesion: 0.22
Nodes (10): CourseBannerKey, CourseStatus, getRandomCourseBannerKey(), FinalExamProgressItem, SessionProgressItem, GenerationJobResponseDto, GenerationMetricsDto, GenerationStepDto (+2 more)

### Community 51 - "exams.service.ts"
Cohesion: 0.24
Nodes (11): FinalExamQuestionType, MatchingPayload, MultipleChoicePayload, OrderingPayload, ExamStatus, ExamAttemptFeedbackItem, SanitizedExamQuestion, SanitizedExamResponse (+3 more)

### Community 53 - "MarkdownRenderer"
Cohesion: 0.38
Nodes (9): MarkdownRenderer(), MarkdownRendererProps, nodeToText(), assert(), decode(), runMarkdownRendererRegressionTests(), textOf(), normalizeMarkdownContent() (+1 more)

### Community 54 - "generate.js"
Cohesion: 0.18
Nodes (9): adm-zip@^0.6.1, AdmZip, docxZip, fixturesDir, fs, offset1, path, pptxZip (+1 more)

### Community 55 - "CodeBlock.tsx"
Cohesion: 0.25
Nodes (9): CodeBlock(), CodeBlockProps, CopyState, copyToClipboard(), BUILTIN_REGEX, findCommentStart(), highlightLine(), KEYWORD_REGEX (+1 more)

### Community 56 - "ai.service.ts"
Cohesion: 0.25
Nodes (7): openai@^7.32.0, AiServiceConfig, DEFAULT_AI_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, { _mockCreate: mockCreate }, openai

### Community 57 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 59 - "AiService"
Cohesion: 0.25
Nodes (3): AiService, aiActivitySchema, aiFinalExamQuestionSchema

### Community 62 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dist, dist:dir, icons, stage, start, typecheck

### Community 63 - "FinalExamResult.tsx"
Cohesion: 0.32
Nodes (5): FinalExamCooldown(), FilterMode, FinalExamResult(), FinalExamResultProps, FinalExamResult

### Community 64 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 65 - "normalizeSessionItem"
Cohesion: 0.50
Nodes (4): aiSessionConceptNamesSchema, extractConceptNameStrings(), normalizeSessionItem(), normalizeSessionPlan()

### Community 66 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 567 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `auth.controller.ts`, `materials.service.ts`, `backend/package.json`, `FinalExamRepository`, `generation-pipeline.service.ts`, `PrismaCourseRepository`, `courses.service.ts`, `exams.service.ts`, `AppController`, `ai.service.ts`, `dependencies`, `PrismaFinalExamRepository`, `CurrentUserPayload`, `quiz.repository.ts`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `activity.parser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050103153551429414 - nodes in this community are weakly interconnected._
- **Why does `@tabler/icons-react` connect `@tabler/icons-react` to `activity.parser.ts`, `userSettings.ts`, `frontend/package.json`, `i18n/index.ts`, `CourseCreationForm.tsx`, `useTranslation`, `course.service.ts`, `FinalExam/index.tsx`, `Quiz/index.tsx`, `CourseCard.tsx`, `types/course.ts`, `CodeBlock.tsx`, `exam.ts`, `FinalExamResult.tsx`, `CurrentSessionCard.tsx`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Should `userSettings.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050505050505050504 - nodes in this community are weakly interconnected._
- **Why does `react` connect `useTranslation` to `activity.parser.ts`, `@tabler/icons-react`, `userSettings.ts`, `frontend/package.json`, `i18n/index.ts`, `CourseCreationForm.tsx`, `course.service.ts`, `FinalExam/index.tsx`, `Quiz/index.tsx`, `CourseCard.tsx`, `types/course.ts`, `CodeBlock.tsx`, `MarkdownRenderer`, `exam.ts`, `FinalExamResult.tsx`, `CurrentSessionCard.tsx`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Should `auth.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07086197778952935 - nodes in this community are weakly interconnected._