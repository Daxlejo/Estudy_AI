import json
import sys
from pathlib import Path

INDICE = Path(__file__).parent / "indice_proyecto.json"

def buscar(termino: str):
    with open(INDICE, encoding="utf-8") as f:
        indice = json.load(f)

    termino = termino.lower()
    resultados = []

    for archivo in indice["archivos"]:
        ruta = archivo["ruta"].lower()
        imports = " ".join(archivo.get("imports", [])).lower()
        preview = archivo.get("preview", "").lower()

        if termino in ruta or termino in imports or termino in preview:
            resultados.append(archivo)

    if not resultados:
        print(f"No se encontraron archivos relacionados con '{termino}'")
        return

    print(f"\n{len(resultados)} archivo(s) relacionados con '{termino}':\n")
    for r in resultados:
        print(f"  {r['ruta']} ({r['lineas']} lineas)")
        if r.get("imports"):
            print(f"    imports: {r['imports'][0][:80]}")
        print()

if __name__ == "__main__":
    termino = sys.argv[1] if len(sys.argv) > 1 else input("Buscar: ")
    buscar(termino)