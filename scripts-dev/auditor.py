import os
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.8-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0
)

class EstadoAuditoria(TypedDict):
    modulo_path: str
    codigo_fuente: str
    paso_pipeline: int
    hallazgos: List[str]
    parche_sugerido: str
    intentos: int

NOMBRES_PASOS = {
    1: "Extraccion",
    2: "Conceptos",
    3: "Dependencias",
    4: "Agrupacion",
    5: "Ruta",
    6: "Contenido bajo demanda"
}

def nodo_analisis_estatico(state: EstadoAuditoria):
    print(f"\n[1/3] Preparando fragmento: {state['modulo_path']}")
    codigo = state["codigo_fuente"]
    lineas = codigo.split("\n")
    lineas_limpias = [
        l for l in lineas
        if l.strip() and not l.strip().startswith("//") and not l.strip().startswith("*")
    ]
    codigo_limpio = "\n".join(lineas_limpias)
    return {
        "codigo_fuente": codigo_limpio,
        "intentos": state["intentos"] + 1
    }

def nodo_auditar_pipeline(state: EstadoAuditoria):
    paso = state["paso_pipeline"]
    
    if paso is not None:
        nombre_paso = NOMBRES_PASOS.get(paso, f"Paso {paso}")
        print(f"[2/3] Auditando paso {paso} - {nombre_paso}...")
        prompt = (
            "Eres un auditor de codigo TypeScript especializado en NestJS y Prisma.\n"
            f"Analiza UNICAMENTE este fragmento del paso '{nombre_paso}' de un pipeline de procesamiento de material educativo.\n\n"
            "El pipeline completo tiene 6 pasos: Extraccion -> Conceptos -> Dependencias -> Agrupacion -> Ruta -> Contenido.\n"
            f"Este es el paso {paso}: {nombre_paso}.\n\n"
            f"CODIGO A AUDITAR:\n{state['codigo_fuente']}\n\n"
            "Reporta SOLO problemas reales y concretos. Se breve y directo.\n"
            "Si no hay problemas, responde exactamente: SIN_HALLAZGOS\n"
            "Si hay problemas, listalos numerados en maximo 3 lineas cada uno."
        )
    else:
        print("[2/3] Auditando codigo (general)...")
        prompt = (
            "Eres un auditor de codigo TypeScript especializado en NestJS y Prisma.\n"
            "Analiza UNICAMENTE este fragmento de codigo.\n\n"
            f"CODIGO A AUDITAR:\n{state['codigo_fuente']}\n\n"
            "Reporta SOLO problemas reales y concretos (bugs, violaciones graves de NestJS/Prisma, fallos de tipado estricto).\n"
            "Ignora problemas de estilo (como comillas, imports sin usar, formateo) o sugerencias subjetivas. Se breve y directo.\n"
            "Si no hay problemas graves, responde exactamente: SIN_HALLAZGOS\n"
            "Si hay problemas, listalos numerados en maximo 3 lineas cada uno."
        )

    respuesta = llm.invoke(prompt)
    contenido = respuesta.content if isinstance(respuesta.content, str) else respuesta.content[0].get("text", "")
    contenido = contenido.strip()

    if contenido == "SIN_HALLAZGOS" or not contenido:
        return {"hallazgos": []}

    hallazgos = [h.strip() for h in contenido.split("\n") if h.strip()]
    return {"hallazgos": hallazgos}

def nodo_generar_parche(state: EstadoAuditoria):
    print("[3/3] Generando parche...")
    hallazgos_texto = "\n".join(state["hallazgos"])

    prompt = (
        "Tienes este codigo TypeScript con los siguientes problemas detectados:\n\n"
        f"CODIGO:\n{state['codigo_fuente']}\n\n"
        f"PROBLEMAS:\n{hallazgos_texto}\n\n"
        "Genera UNICAMENTE el bloque de codigo corregido, sin explicaciones largas.\n"
        "Despues del codigo agrega una linea que diga: CAMBIOS: y lista en maximo 2 lineas que cambiaste."
    )

    respuesta = llm.invoke(prompt)
    contenido_parche = respuesta.content if isinstance(respuesta.content, str) else respuesta.content[0].get("text", "")
    return {"parche_sugerido": contenido_parche.strip()}

def decidir_siguiente(state: EstadoAuditoria):
    if not state["hallazgos"]:
        return "fin"
    return "corregir"

workflow = StateGraph(EstadoAuditoria)

workflow.add_node("estatico", nodo_analisis_estatico)
workflow.add_node("auditor", nodo_auditar_pipeline)
workflow.add_node("parches", nodo_generar_parche)

workflow.set_entry_point("estatico")
workflow.add_edge("estatico", "auditor")
workflow.add_conditional_edges(
    "auditor",
    decidir_siguiente,
    {
        "corregir": "parches",
        "fin": END
    }
)
workflow.add_edge("parches", END)

app = workflow.compile()

if __name__ == "__main__":
    import argparse
    import os
    
    parser = argparse.ArgumentParser(description="Auditor de codigo")
    parser.add_argument("path", help="Ruta relativa a la raiz del proyecto")
    parser.add_argument("--step", type=int, default=None, help="Paso del pipeline")
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(project_root, args.path)

    with open(file_path, "r", encoding="utf-8") as f:
        codigo = f.read()

    estado_inicial = {
        "modulo_path": args.path,
        "codigo_fuente": codigo,
        "paso_pipeline": args.step,
        "hallazgos": [],
        "parche_sugerido": "",
        "intentos": 0
    }

    resultado = app.invoke(estado_inicial)

    print("\n" + "="*50)
    print("RESULTADO DE LA AUDITORIA")
    print("="*50)

    if resultado["hallazgos"]:
        print("\nHALLAZGOS:")
        for h in resultado["hallazgos"]:
            print(f"  {h}")
        print(f"\nPARCHE SUGERIDO:\n{resultado['parche_sugerido']}")
    else:
        print("\n OK - No se encontraron problemas en este fragmento.")