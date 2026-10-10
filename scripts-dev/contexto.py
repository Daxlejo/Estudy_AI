import json
import sys
import subprocess
from pathlib import Path

RAIZ = Path(__file__).parent.parent
INDICE = Path(__file__).parent / "indice_proyecto.json"

def actualizar_indice():
    python = Path(__file__).parent / ".venv" / "Scripts" / "python.exe"
    subprocess.run([str(python), str(Path(__file__).parent / "indexador.py")], check=True)

def leer_archivo(ruta_rel: str) -> str:
    archivo = RAIZ / ruta_rel
    if archivo.exists():
        return archivo.read_text(encoding="utf-8", errors="ignore")
    return f"[Archivo no encontrado: {ruta_rel}]"

def buscar_archivos(terminos: list) -> list:
    with open(INDICE, encoding="utf-8") as f:
        indice = json.load(f)

    resultados = []
    vistos = set()

    for archivo in indice["archivos"]:
        ruta = archivo["ruta"].lower()
        imports = " ".join(archivo.get("imports", [])).lower()
        preview = archivo.get("preview", "").lower()
        texto = ruta + imports + preview

        for termino in terminos:
            if termino.lower() in texto and archivo["ruta"] not in vistos:
                resultados.append(archivo)
                vistos.add(archivo["ruta"])
                break

    return resultados

def generar_contexto(terminos: list, max_lineas_por_archivo: int = 80):
    actualizar_indice()

    archivos = buscar_archivos(terminos)

    if not archivos:
        print("No se encontraron archivos relevantes.")
        return

    bloques = []

    for archivo in archivos:
        ruta = archivo["ruta"]
        contenido = leer_archivo(ruta)
        lineas = contenido.split("\n")

        if len(lineas) > max_lineas_por_archivo:
            contenido_recortado = "\n".join(lineas[:max_lineas_por_archivo])
            contenido_recortado += f"\n... [{len(lineas) - max_lineas_por_archivo} lineas mas]"
        else:
            contenido_recortado = contenido

        bloques.append(f"// === {ruta} ({archivo['lineas']} lineas) ===\n{contenido_recortado}")

    salida = "\n\n".join(bloques)

    archivo_salida = Path(__file__).parent / "contexto_actual.txt"
    with open(archivo_salida, "w", encoding="utf-8") as f:
        f.write(salida)

    print(f"\nContexto generado: {len(archivos)} archivos")
    print(f"Guardado en: contexto_actual.txt")
    print(f"\nArchivos incluidos:")
    for a in archivos:
        print(f"  {a['ruta']} ({a['lineas']} lineas)")

    # Guardar log de terminos usados
    log = {
        "terminos": terminos,
        "archivos": [a["ruta"] for a in archivos],
        "total": len(archivos)
    }
    log_path = Path(__file__).parent / "contexto_log.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    terminos = sys.argv[1:] if len(sys.argv) > 1 else input("Terminos (separados por espacio): ").split()
    generar_contexto(terminos)