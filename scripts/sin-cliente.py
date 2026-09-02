# -*- coding: utf-8 -*-
"""
Prueba que la app sea INSTALABLE: que no haya ni un dato de un negocio concreto
metido en el codigo.

  python3 scripts/sin-cliente.py

🔴 Por que existe: la plantilla se construye una vez y se instala muchas. Un
   nombre olvidado en un componente no rompe nada — simplemente el alumno abre
   SU panel y ve el nombre de otro. Eso no lo caza ni un test ni el typecheck.

🔴 La lista de excepciones se escribe A MANO, no se deriva. Una lista derivada
   (por ejemplo "todo lo que este en scripts/") crece sola: el dia que alguien
   ponga un nombre en un archivo nuevo dentro de una carpeta exceptuada, el
   linter da verde y nadie se entera.
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Lo que NO puede aparecer en el codigo de la app.
PROHIBIDO = [
    "Leandro", "LP The CEO", "LPTheCEO", "lpfinancialservices",
    "Sofía Lara", "Sofia Lara", "Mateo Gil", "Valentina Paz",
    "Andrea Ríos", "Andrea Rios", "Diego Torres", "Carlos Méndez", "Carlos Mendez",
]

# Los UNICOS archivos donde SI puede aparecer, y por que. Escrito uno por uno.
EXCEPCIONES = {
    # el banco de prueba: son los nombres del mockup, y por eso el verificador
    # puede comparar contra numeros externos
    "src/shared/datos/semilla.ts": "el banco de prueba del mockup",
    # la capa de desarrollo siembra ese banco para poder validar pantallas
    "src/shared/datos/demo.ts": "capa de desarrollo, nunca corre en produccion",
    # el gate compara contra los nombres del banco de prueba: es su trabajo
    "src/shared/calculo/metricas.test.ts": "compara contra el banco de prueba",
}

EXTENSIONES = (".ts", ".tsx", ".css", ".sql", ".json", ".mjs")
CARPETAS = ("src", "supabase")


def relativa(ruta):
    return os.path.relpath(ruta, RAIZ).replace(os.sep, "/")


def main():
    hallazgos = []
    for carpeta in CARPETAS:
        for base, _, archivos in os.walk(os.path.join(RAIZ, carpeta)):
            for nombre in archivos:
                if not nombre.endswith(EXTENSIONES):
                    continue
                ruta = os.path.join(base, nombre)
                rel = relativa(ruta)
                if rel in EXCEPCIONES:
                    continue
                texto = open(ruta, encoding="utf-8", errors="replace").read()
                for palabra in PROHIBIDO:
                    for m in re.finditer(re.escape(palabra), texto, re.IGNORECASE):
                        linea = texto.count("\n", 0, m.start()) + 1
                        hallazgos.append((rel, linea, palabra))

    # Y al reves: una excepcion que ya no hace falta tiene que desaparecer de la
    # lista, o el dia que ese archivo cambie de proposito la deja abierta gratis.
    sobrantes = [
        r for r in EXCEPCIONES
        if os.path.exists(os.path.join(RAIZ, r))
        and not any(
            re.search(re.escape(p), open(os.path.join(RAIZ, r), encoding="utf-8").read(), re.IGNORECASE)
            for p in PROHIBIDO
        )
    ]

    if hallazgos:
        print("\n🔴 Hay datos de un negocio concreto metidos en el codigo:\n")
        for rel, linea, palabra in hallazgos:
            print(f"   {rel}:{linea}  →  {palabra!r}")
        print(
            "\n   Todo esto tiene que salir de la tabla `configuracion` o de la base.\n"
            "   Si de verdad va ahi, agregalo a EXCEPCIONES en este script CON su motivo.\n"
        )
        sys.exit(1)

    if sobrantes:
        print("\n⚠️  Excepciones que ya no hacen falta (saquenlas de la lista):")
        for r in sobrantes:
            print(f"   {r}")
        print()

    total = sum(1 for c in CARPETAS for b, _, a in os.walk(os.path.join(RAIZ, c))
                for n in a if n.endswith(EXTENSIONES))
    print(f"\n✅ {total} archivos revisados, cero datos de un negocio concreto.")
    print(f"   Excepciones declaradas: {len(EXCEPCIONES)} ({', '.join(EXCEPCIONES)})\n")


if __name__ == "__main__":
    main()
