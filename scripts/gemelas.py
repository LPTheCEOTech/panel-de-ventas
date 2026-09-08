# -*- coding: utf-8 -*-
"""
Escribe las GEMELAS de celular de la demo, dentro del propio mockup.

  python3 scripts/gemelas.py

El mockup se abre de un doble clic y trae un conmutador Escritorio/Celular que
NO cambia el tamano de la ventana: dibuja un marco de 412 px. Por eso cada
regla responsive tiene que existir dos veces —una como `@media` de verdad y
otra como `body[data-view="mobile"] …`— y por eso `scripts/portar-css.py` falla
cuando falta una: portar de largo dejaria el telefono con el layout de
escritorio, y el gate por foto podria no cubrir ese breakpoint.

Escribir esa segunda copia a mano es exactamente el trabajo que una maquina
hace sin equivocarse. Este script la genera desde las `@media` reales.

  · Solo copia las `@media (max-width:N)` con N >= ANCHO_DEMO. Una `min-width`
    no tiene gemela posible (el marco es chico dentro de una ventana grande),
    asi que el mockup no las usa.
  · Respeta el orden del documento: la cascada de las gemelas queda igual que
    la de las reglas de verdad.
  · Reescribe SOLO el bloque que hay entre la marca y `</style>`.
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RAIZ, "MOCKUP-APROBADO.html")

ANCHO_DEMO = 412  # el ancho del marco falso de la demo
PREFIJO = 'body[data-view="mobile"]'
MARCA = "/* --- gemelas de la demo: lo GENERA scripts/gemelas.py, no se escribe a mano --- */"


def morir(m):
    print(f"\n🔴 {m}\n", file=sys.stderr)
    sys.exit(1)


def partir_en_reglas(css):
    """Corta CSS plano en trozos de primer nivel. Mismo criterio que portar-css."""
    trozos, buf, prof = [], "", 0
    for ch in css:
        buf += ch
        if ch == "{":
            prof += 1
        elif ch == "}":
            prof -= 1
            if prof == 0:
                trozos.append(buf.strip())
                buf = ""
            elif prof < 0:
                morir("Llaves desbalanceadas en el CSS del mockup.")
    if buf.strip():
        morir(f"Quedo CSS sin cerrar: {buf.strip()[:80]!r}")
    return trozos


def prefijar(selector):
    """El prefijo va en CADA parte del selector.

    🔴 Sin espacio despues de la coma: `portar-css.py` compara la gemela contra
    su regla de verdad uniendo las partes con "," pelado. Un `, ` de mas y las
    dos cadenas dejan de ser iguales, y la gemela buena figura como huerfana.
    """
    return ",".join(f"{PREFIJO} {p.strip()}" for p in selector.split(","))


def main():
    html = open(SRC, encoding="utf-8").read()
    m = re.search(r"<style>(.*?)</style>", html, re.S)
    if not m:
        morir("El mockup no tiene bloque <style>.")
    css = m.group(1)
    if MARCA not in css:
        morir(f"No encuentro la marca en el <style>:\n   {MARCA}")

    antes = css.split(MARCA)[0]
    gemelas = []
    for trozo in partir_en_reglas(antes):
        cab = re.match(r"^\s*(?:/\*.*?\*/\s*)*@media\s*\(max-width:\s*(\d+)px\)", trozo, re.S)
        if not cab:
            continue
        if int(cab.group(1)) < ANCHO_DEMO:
            continue
        interior = trozo[trozo.index("{") + 1 : trozo.rindex("}")]
        for regla in partir_en_reglas(interior):
            sel = regla[: regla.index("{")].strip()
            cuerpo = regla[regla.index("{") :].strip()
            gemelas.append(f"{prefijar(sel)}{cuerpo}")

    if not gemelas:
        morir("No encontre ninguna @media max-width para copiar. ¿Se movieron?")

    nuevo = f"{MARCA}\n" + "\n".join(gemelas) + "\n"
    salida = html.replace(css, antes + nuevo)
    open(SRC, "w", encoding="utf-8").write(salida)
    print(f"✅ {len(gemelas)} gemelas escritas en MOCKUP-APROBADO.html")


if __name__ == "__main__":
    main()
