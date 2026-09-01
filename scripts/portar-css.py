# -*- coding: utf-8 -*-
"""
Porta el CSS del mockup aprobado a globals.css SIN reinterpretarlo.

  python3 scripts/portar-css.py

Lo unico que se saca es el andamiaje de la demo:
  - la barra negra de arriba (.demo-bar y lo suyo, .demo-note)
  - el marco falso (.ghl, .ghl-frame) y el conmutador de pantallas (.sc, .sc.on)
  - TODA regla `body[data-view="mobile"] ...` — es la simulacion de celular de la
    demo. Cada una tiene que tener su GEMELA dentro de un @media real; si alguna
    no la tiene, el script FALLA en vez de portar de menos en silencio.

Todo lo demas se copia caracter por caracter. Si hay que cambiar un estilo, se
cambia en el mockup y se vuelve a correr esto. Asi el mockup sigue siendo el spec.

🔴 Por que falla ruidoso: si el mockup cambia y aparece una regla de celular sin
   gemela, portar en silencio dejaria la app con el layout de escritorio en el
   telefono — y el gate por foto podria no cubrir ese breakpoint exacto.
"""
import os
import re
import sys

# Rutas relativas al propio script: el build no puede depender de una Mac.
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RAIZ, "MOCKUP-APROBADO.html")
DST = os.path.join(RAIZ, "src", "app", "globals.css")

# Selectores que son SOLO de la demo y no existen en la app.
FUERA = re.compile(
    r'^\s*(\.demo-bar|\.demo-note|\.ghl\b|\.ghl-frame|\.sc\b|\.sc\.on)'
)
PREFIJO_DEMO = 'body[data-view="mobile"]'

# Un comentario pegado ARRIBA de una regla viaja dentro del mismo trozo (asi se
# conserva en el CSS portado). Para CLASIFICAR hay que mirar la regla, no el
# comentario: sin esto, un `@media` con un banner encima no se reconocia como
# @media y su bloque entero quedaba fuera del indice de gemelas.
COMENTARIO_INICIAL = re.compile(r'^\s*(?:/\*.*?\*/\s*)+', re.S)


def sin_comentario(t):
    return COMENTARIO_INICIAL.sub('', t)

CABECERA = """/* ============================================================
   Panel de Ventas · LP The CEO
   PAPEL v1 — PORTADO LITERAL de MOCKUP-APROBADO.html.

   🔴 Este archivo NO se edita a mano. Sale de scripts/portar-css.py,
   que copia el <style> del mockup y solo saca el andamiaje de la demo.
   Si hay que cambiar un estilo, se cambia en el mockup y se vuelve a
   correr el script — asi el mockup sigue siendo el spec literal.

   Las fuentes: en el mockup vienen de Google Fonts para que se abra de
   un doble clic; en la app se sirven locales desde /public/fonts, que
   es lo unico que cambia entre los dos archivos.
   ============================================================ */

@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:200 800;font-display:swap;
  src:url('/fonts/plus-jakarta-sans.woff2') format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;
  src:url('/fonts/inter.woff2') format('woff2')}

"""


def morir(mensaje):
    print(f"\n🔴 {mensaje}\n", file=sys.stderr)
    sys.exit(1)


def leer_style(html):
    m = re.search(r"<style>(.*?)</style>", html, re.S)
    if not m:
        morir("El mockup no tiene un bloque <style>. ¿Se movio el archivo?")
    return m.group(1)


def partir_en_reglas(css):
    """Corta el CSS en trozos de primer nivel: reglas sueltas y bloques @media
    enteros. No es un parser de CSS completo — alcanza porque el mockup es CSS
    plano, sin anidamiento nativo. Si algun dia lo tiene, esto grita."""
    trozos, buffer, profundidad = [], "", 0
    for ch in css:
        buffer += ch
        if ch == "{":
            profundidad += 1
        elif ch == "}":
            profundidad -= 1
            if profundidad == 0:
                trozos.append(buffer.strip())
                buffer = ""
            elif profundidad < 0:
                morir("Llaves desbalanceadas en el CSS del mockup.")
    if buffer.strip():
        morir(f"Quedo CSS sin cerrar al final: {buffer.strip()[:80]!r}")
    return trozos


def normalizar(txt):
    """Para comparar una regla de la demo contra su gemela de @media sin que un
    espacio de mas las haga distintas."""
    return re.sub(r"\s+", " ", txt).replace("; }", "}").strip()


def cuerpo_de(regla):
    regla = sin_comentario(regla)
    return normalizar(regla[regla.index("{"):])


def selector_de(regla):
    regla = sin_comentario(regla)
    return normalizar(regla[: regla.index("{")])


def sin_prefijo_demo(selector):
    """Saca `body[data-view="mobile"]` de CADA parte del selector.

    Un selector con coma lleva el prefijo repetido en cada parte
    (`body[...] .calc,body[...] .calc.c2`); sacarlo solo del principio dejaria
    la segunda parte con el prefijo puesto y la gemela no cerraria nunca.
    """
    partes = [p.strip() for p in selector.split(",")]
    return normalizar(
        ",".join(p[len(PREFIJO_DEMO):].strip() if p.startswith(PREFIJO_DEMO) else p
                 for p in partes)
    )


def main():
    if not os.path.exists(SRC):
        morir(f"No encuentro el mockup en {SRC}")
    css = leer_style(open(SRC, encoding="utf-8").read())
    trozos = partir_en_reglas(css)

    # 1. Todo lo que vive dentro de un @media real: selector+cuerpo normalizados.
    #    Es contra esto que se contrasta cada regla de la demo.
    en_media = set()
    for t in trozos:
        if sin_comentario(t).startswith("@media"):
            interior = t[t.index("{") + 1 : t.rindex("}")]
            for r in partir_en_reglas(interior):
                en_media.add((selector_de(r), cuerpo_de(r)))

    salida, huerfanas, sacadas = [], [], 0
    for t in trozos:
        limpio = sin_comentario(t)
        if limpio.startswith(PREFIJO_DEMO):
            sacadas += 1
            sel = sin_prefijo_demo(selector_de(t))
            # una regla de la demo sobre un selector que TAMPOCO existe en la app
            # (el marco falso) no necesita gemela: se va con el andamiaje
            if FUERA.match(sel):
                continue
            if (sel, cuerpo_de(t)) not in en_media:
                huerfanas.append(t)
            continue
        if FUERA.match(limpio):
            sacadas += 1
            continue
        salida.append(t)

    if huerfanas:
        print("\n🔴 Hay reglas de celular de la demo SIN gemela dentro de un @media real.")
        print("   Portarlas de largo dejaria el telefono con el layout de escritorio.")
        print("   Arreglalo EN EL MOCKUP (escribi la @media que falta) y volve a correr.\n")
        for h in huerfanas:
            print("   ·", normalizar(h)[:150])
        print()
        sys.exit(1)

    # El banner del propio mockup habla de la simulacion de celular
    # (`body[data-view="mobile"]`), que en el archivo portado ya no existe.
    # Dejarlo seria documentar algo que no esta. Lo reemplaza CABECERA.
    if salida:
        salida[0] = sin_comentario(salida[0])

    open(DST, "w", encoding="utf-8").write(CABECERA + "\n\n".join(salida) + "\n")
    print(f"✅ {DST}")
    print(f"   {len(salida)} reglas portadas · {sacadas} de andamiaje sacadas · 0 huerfanas")


if __name__ == "__main__":
    main()
