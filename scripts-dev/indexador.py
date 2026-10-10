import json
from pathlib import Path


RAIZ = Path(__file__).parent.parent

CARPETAS_A_INDEXAR = [
    "backend/src",
    "backend/prisma",
    "frontend/src",
]

EXTENSIONES = {".ts", ".tsx", ".prisma", ".json"}

ARCHIVOS_ESPECIFICOS = [
    "backend/package.json",
    "frontend/package.json",
    "backend/tsconfig.json",
    "frontend/tsconfig.json",
]

IGNORAR_CARPETAS = {
    "node_modules", "dist", ".venv", "__pycache__",
    ".next", "coverage", ".git", "migrations"
}

def extraer_imports(contenido: str, extension: str) -> list:
    imports = []
    for linea in contenido.split("\n"):
        linea = linea.strip()
        if extension in {".ts", ".tsx"}:
            if linea.startswith("import ") and " from " in linea:
                imports.append(linea)
        elif extension == ".prisma":
            if linea.startswith("model ") or linea.startswith("relation"):
                imports.append(linea)
    return imports[:10]

def indexar_proyecto():
    indice = {
        "archivos": [],
        "resumen": {
            "total_archivos": 0,
            "por_tipo": {},
            "carpetas_backend": [],
            "carpetas_frontend": [],
        }
    }

    for carpeta_rel in CARPETAS_A_INDEXAR:
        carpeta = RAIZ / carpeta_rel
        if not carpeta.exists():
            print(f"[!] No existe: {carpeta_rel}")
            continue

        for archivo in carpeta.rglob("*"):
            if archivo.is_file():
                if any(parte in IGNORAR_CARPETAS for parte in archivo.parts):
                    continue
                if archivo.suffix not in EXTENSIONES:
                    continue
                if archivo.name in {"package-lock.json", "yarn.lock"}:
                    continue

                try:
                    contenido = archivo.read_text(encoding="utf-8", errors="ignore")
                    lineas = contenido.split("\n")
                    ruta_rel = str(archivo.relative_to(RAIZ)).replace("\\", "/")

                    entrada = {
                        "ruta": ruta_rel,
                        "tipo": archivo.suffix,
                        "lineas": len(lineas),
                        "imports": extraer_imports(contenido, archivo.suffix),
                        "preview": "\n".join(lineas[:5]).strip(),
                    }

                    if archivo.suffix == ".prisma":
                        entrada["contenido_completo"] = contenido

                    indice["archivos"].append(entrada)

                    ext = archivo.suffix
                    indice["resumen"]["por_tipo"][ext] = indice["resumen"]["por_tipo"].get(ext, 0) + 1
                    indice["resumen"]["total_archivos"] += 1

                    if "backend" in ruta_rel:
                        indice["resumen"]["carpetas_backend"].append(ruta_rel)
                    else:
                        indice["resumen"]["carpetas_frontend"].append(ruta_rel)

                except Exception as e:
                    print(f"[!] Error leyendo {archivo}: {e}")

    for archivo_rel in ARCHIVOS_ESPECIFICOS:
        archivo = RAIZ / archivo_rel
        if archivo.exists():
            try:
                contenido = json.loads(archivo.read_text(encoding="utf-8"))
                indice["archivos"].append({
                    "ruta": archivo_rel,
                    "tipo": ".json",
                    "nombre": archivo.name,
                    "dependencias": list(contenido.get("dependencies", {}).keys()),
                    "dev_dependencias": list(contenido.get("devDependencies", {}).keys()),
                })
            except Exception as e:
                print(f"[!] Error leyendo {archivo_rel}: {e}")

    salida = RAIZ / "scripts-dev" / "indice_proyecto.json"
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=2)

    print(f"\nIndice generado: {salida}")
    print(f"Total archivos indexados: {indice['resumen']['total_archivos']}")
    print(f"Por tipo: {indice['resumen']['por_tipo']}")

if __name__ == "__main__":
    indexar_proyecto()