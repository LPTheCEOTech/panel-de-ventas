# El circuito para cambiar un estilo, y las trampas de cada paso

```
tocar MOCKUP-APROBADO.html  →  python3 scripts/gemelas.py  →  npm run portar-css
```

Nunca al revés, y nunca salteando el del medio.

## `scripts/gemelas.py` (nuevo en v2)

Escribe las reglas `body[data-view="mobile"] …` desde las `@media (max-width:N)`
reales. Existe porque `portar-css.py` **falla** si falta una gemela, y escribir 50
reglas duplicadas a mano es exactamente el trabajo que una máquina hace sin
equivocarse.

Tres cosas que hay que saber:

1. **Solo copia `max-width`.** Una `min-width` no tiene gemela posible: el marco de
   celular de la demo mide 412 px *dentro* de una ventana ancha, así que una regla
   que dependa de que la pantalla sea grande se aplicaría igual. Por eso el mockup
   no usa `min-width` en ningún lado. Si necesitás una, invertí la lógica.
2. **Sin espacio después de la coma** en un selector múltiple dentro de una `@media`.
   `portar-css.py` compara la gemela contra su regla de verdad uniendo las partes
   con `","` pelado; un `, ` de más y las dos cadenas dejan de ser iguales, y la
   gemela buena figura como huérfana.
3. **El comentario que va pegado arriba de una regla no viaja a la gemela.** Si
   viaja, queda en el medio (`body[...] /* … */ .entry`) y el selector deja de
   parecerse al de su regla. Ya está resuelto adentro del script; no lo saques.

## `portar-css.py`

No lo esquives cuando grita. Su error dice exactamente qué regla quedó sin gemela.
Portar de largo dejaría el teléfono con el layout de escritorio, y el gate por foto
puede no cubrir ese breakpoint exacto.

## Ver el mockup

Playwright bloquea `file:`. Levantar `python3 -m http.server 8899` en la raíz y
abrir `http://127.0.0.1:8899/MOCKUP-APROBADO.html`. El estado va por URL, que es lo
que hace repetible el gate de fotos:

```
?s=panel|setter|closer|equipo|ajustes  &t=light|dark  &v=pc|mobile  &e=datos|vacio
```
