# EstudyAI

[![Build Status](https://github.com/Daxlejo/Estudy_AI/actions/workflows/release.yml/badge.svg)](https://github.com/Daxlejo/Estudy_AI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-v1.0.0-green.svg)](https://github.com/Daxlejo/Estudy_AI/releases)

**[English](#english) | [Español](#español)**

---

## English

EstudyAI is an AI-powered desktop and web learning platform that transforms raw study materials (PDF, DOCX, PPTX, Markdown, TXT) into structured, adaptive learning paths. It automatically extracts key concepts, organizes study sessions with guided practice and applied challenges, and evaluates mastery through interactive quizzes and final exams.

### Screenshots

<!-- Add screenshots here -->

---

### For End Users & Professors

#### Download & Install

Download the latest release for your operating system from [GitHub Releases](https://github.com/Daxlejo/Estudy_AI/releases):

- **Windows:** Download `EstudyAI-Setup.exe` from GitHub Releases and run the installer.
- **macOS:** Download `EstudyAI.dmg`, drag `EstudyAI.app` to Applications, and run the following command in Terminal before opening to bypass Gatekeeper (the app does not carry an Apple Developer signature):
  ```bash
  xattr -cr EstudyAI.app
  ```
- **Linux:** Download `EstudyAI.AppImage`, make it executable, and launch it:
  ```bash
  chmod +x EstudyAI.AppImage && ./EstudyAI.AppImage
  ```

#### First Launch Note

The packaged application includes a built-in OpenAI API key for evaluation and demo purposes — no manual configuration is required.

#### Known Limitations

- **Initial startup:** The first launch may take 10–20 seconds while the local backend and SQLite database initialize and apply migrations. Subsequent launches start significantly faster.

---

### For Developers

#### Prerequisites

- **Node.js:** 20+
- **npm:** 10+
- **Python:** 3.12+ (for Graphify knowledge-graph tooling)

#### Clone & Install

```bash
git clone <repo-url>
cd estudy-ai
npm ci
```

#### Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in your `OPENAI_API_KEY`:

```bash
cp backend/.env.example backend/.env
```

#### Run in Development

```bash
npm --prefix backend exec prisma migrate dev
npm --prefix backend exec prisma generate
npm --prefix backend run start:dev   # terminal 1
npm --prefix frontend run dev        # terminal 2
```

#### Run Tests

```bash
npm --prefix frontend test
npm --prefix backend test
```

#### Build Desktop App

```bash
npm --prefix desktop run build
```

#### Project Structure

```text
estudy-ai/
├── backend/          # NestJS REST API, AI generation pipeline, material extractors, and domain services
│   └── prisma/       # Prisma schema (schema.prisma) and SQLite migrations
├── frontend/         # React 19 + Vite SPA (courses, study sessions, quizzes, final exams)
└── desktop/          # Electron main process, preload scripts, and packaging configuration
```

#### Tech Stack

- **Backend:** NestJS, Prisma, SQLite, OpenAI API, TypeScript
- **Frontend:** React, Vite, Tailwind CSS, TypeScript
- **Desktop:** Electron, electron-builder

#### Contributing

- Follow **Conventional Commits** (`feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Make small, **atomic commits** where each commit represents a single logical change.
- **No direct push to `main`** — open a pull request from a feature or fix branch and ensure all frontend and backend tests pass before merging.

---

## Español

EstudyAI es una plataforma de aprendizaje de escritorio y web impulsada por inteligencia artificial que transforma materiales de estudio (PDF, DOCX, PPTX, Markdown, TXT) en rutas de aprendizaje estructuradas y adaptativas. Extrae automáticamente conceptos clave, organiza sesiones de estudio con práctica guiada y desafíos aplicados, y evalúa el dominio mediante cuestionarios interactivos y exámenes finales.

### Capturas de Pantalla

<!-- Add screenshots here -->

---

### Para Usuarios Finales y Profesores

#### Descarga e Instalación

Descargue la versión más reciente para su sistema operativo desde [GitHub Releases](https://github.com/Daxlejo/Estudy_AI/releases):

- **Windows:** Descargue `EstudyAI-Setup.exe` desde GitHub Releases y ejecute el instalador.
- **macOS:** Descargue `EstudyAI.dmg`, arrastre `EstudyAI.app` a Aplicaciones y ejecute el siguiente comando en la Terminal antes de abrirla para omitir Gatekeeper (la aplicación no cuenta con firma de Apple Developer):
  ```bash
  xattr -cr EstudyAI.app
  ```
- **Linux:** Descargue `EstudyAI.AppImage`, otorgue permisos de ejecución e inícielo:
  ```bash
  chmod +x EstudyAI.AppImage && ./EstudyAI.AppImage
  ```

#### Nota sobre el Primer Inicio

La aplicación empaquetada incluye una clave de API de OpenAI integrada con fines de demostración y evaluación; no requiere configuración manual.

#### Limitaciones Conocidas

- **Inicio inicial:** El primer inicio puede tardar entre 10 y 20 segundos mientras el backend local y la base de datos SQLite se inicializan y aplican las migraciones. Los inicios posteriores son significativamente más rápidos.

---

### Para Desarrolladores

#### Requisitos Previos

- **Node.js:** 20+
- **npm:** 10+
- **Python:** 3.12+ (para las herramientas de grafo de conocimiento Graphify)

#### Clonar e Instalar

```bash
git clone <repo-url>
cd estudy-ai
npm ci
```

#### Configuración del Entorno

Copie `backend/.env.example` a `backend/.env` y complete su `OPENAI_API_KEY`:

```bash
cp backend/.env.example backend/.env
```

#### Ejecutar en Desarrollo

```bash
npm --prefix backend exec prisma migrate dev
npm --prefix backend exec prisma generate
npm --prefix backend run start:dev   # terminal 1
npm --prefix frontend run dev        # terminal 2
```

#### Ejecutar Pruebas

```bash
npm --prefix frontend test
npm --prefix backend test
```

#### Compilar Aplicación de Escritorio

```bash
npm --prefix desktop run build
```

#### Estructura del Proyecto

```text
estudy-ai/
├── backend/          # API REST en NestJS, pipeline de generación con IA, extractores de material y servicios de dominio
│   └── prisma/       # Esquema de Prisma (schema.prisma) y migraciones de SQLite
├── frontend/         # SPA en React 19 + Vite (cursos, sesiones de estudio, cuestionarios, exámenes finales)
└── desktop/          # Proceso principal de Electron, scripts preload y configuración de empaquetado
```

#### Stack Tecnológico

- **Backend:** NestJS, Prisma, SQLite, OpenAI API, TypeScript
- **Frontend:** React, Vite, Tailwind CSS, TypeScript
- **Escritorio:** Electron, electron-builder
