# Bugs visuales que ningún test atrapa

Todos éstos pasaron el typecheck, el lint, los 19 tests y el build. Se ven mirando.

## El alto en % dentro de una columna flex

`.day i { height: 60% }` donde `.day` era la columna entera —que además llevaba las
dos etiquetas— daba **todos los días casi iguales**: el flex le comía a la barra alta
lo que las etiquetas necesitaban, así que el día de $8.7k salía del mismo porte que
el de $5.2k. Un gráfico que miente sin fallar.

**Regla:** la barra vive en su propia pista (`.day-t`, `position:relative`) y va en
`position:absolute` contra ella. Ahí el porcentaje es del riel, que es lo que uno cree
que está midiendo.

## `flex: 1 1 auto` en un contenedor que envuelve

El texto no entraba al lado del icono y se iba **entero** al renglón de abajo. El
navegador decide el corte de línea ANTES de encoger: con `flex-basis:auto` el tamaño
hipotético del item es su contenido, no entra, y wrapea. Con `flex-basis: 0` entra
siempre y después encoge.

## Un grid de columnas fijas para una fila con celdas opcionales

El renglón de Equipo era `grid-template-columns` de seis pistas y la pastilla «De baja»
aparece y desaparece. Sin ella, **todo lo que venía después caía una pista antes**: la
actividad y el botón quedaban pegados en el medio y sobraba una columna vacía de 275 px
al final. Para una fila con celdas opcionales va **flex**, con anchos fijos en las
celdas de la derecha para que igual aliñen entre renglones.

## Un `var(--token)` que no existe es silencio, no un error

`login.module.css` siguió pidiendo `var(--shadow)` después de que el token pasara a
llamarse `--sombra`. La caja se quedó sin sombra y nada falló. Si se renombra un token
del mockup: grepear fuera de `globals.css`.

## `.marca span` alcanza más de lo que parece

Alcanzaba también al cuadradito de las iniciales y al span que envuelve el nombre: las
iniciales salían grises sobre el verde y el nombre del negocio heredaba el color
apagado. Un descendiente suelto en un archivo chico pinta media pantalla.

## `.entry .en small` (0,2,1) le gana a `.solo-chico` (0,1,0)

El renglón que era solo para celular se colaba en escritorio, repetido con la pastilla.
Una clase de utilidad necesita al menos el peso del selector que quiere pisar.

## `color-scheme`

Es lo que pinta lo que NO es nuestro: el calendario del `<input type=date>`, la lista
del `<select>`, el scroll. Sin declararlo, en tema oscuro el date picker se abre blanco
y el icono del calendario queda negro sobre negro.

## Un `—` en display 800 a 34 px es una barra negra

Parece un dato tachado, no un «todavía no se puede calcular». Va con `.sin`, apagado y
sin peso. La regla del divisor 0 no alcanza si el guion se pinta como si fuera un número.
