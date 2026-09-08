# Rediseño PAPEL v2 — las cinco pantallas (8 de septiembre de 2026)

Jack miró la app funcionando y le pareció **pobre**. No era un bug: era el diseño.
El encargo fue jerarquía real, densidad correcta, ritmo de espaciado deliberado, y
que en pantalla ancha el espacio esté **usado con intención y no estirado**.

## El diagnóstico, para no volver a discutirlo

Lo que estaba mal en v1, en orden de daño:

1. **Nueve cajas iguales arriba del Panel**, en tres ritmos distintos (dinero 2,
   tasas 3, totales 4). Ninguna mandaba sobre las otras. Y los cuatro totales
   repetían lo que el embudo decía 20 px más abajo.
2. **Tarjetas globo**: tres KPI de 430 px con un número de 29 px adentro. 85% aire.
   A 1440 la app no ganaba información, ganaba blanco.
3. **Todo verde**: marca, pestaña activa, tarjeta de dinero, iconos, pastillas,
   barras del embudo, barras del gráfico, barras del ranking, deltas. Si todo es
   acento, no hay acento.
4. **Controles estirados**: un contador de dos dígitos ocupando 420 px de ancho
   porque la celda del grid medía eso.
5. **Borde + sombra en toda tarjeta**: todo parecía una calcomanía.

## Las tres decisiones que gobiernan v2

1. **El verde es el dinero.** Se reserva para la plata, la acción primaria y
   «estás acá». Los iconos, las pistas de barra y los contadores son neutros.
2. **Tres superficies, no una.** `--bg` es el papel, `--card` la tarjeta,
   `--hueco` lo hundido. La profundidad la dan las superficies, no un borde más.
3. **El ancho se usa, no se estira.** Tablero 1320; pantallas de trabajo 1080
   (`.hoja`); y el control mide lo que mide su dato.

## Decisiones concretas que cuestan explicar

- **Se borró la banda de cuatro totales** (Leads/Agendas/Llamadas/Cierres). No se
  perdió nada: esos cuatro números ya están en el contexto de cada tasa
  («104 agendas de 342 leads») y en el embudo. Era la misma data tres veces.
- **El revenue contratado dejó de ser tarjeta hermana** del cash. Era su
  denominador y siempre salía más grande que el titular. Ahora vive adentro de
  `.plata`: en la frase, en el medidor y en el pie.
- **El número salió de adentro de la barra del embudo.** Un número adentro obliga
  a un `min-width`, y ese mínimo le miente a la proporción (el paso de Cash mide
  4% y la barra decía 62 px).
- **La barra del ranking es una franja al pie del renglón.** Debajo del número
  parecía un subrayado; como relleno del renglón entero cortaba el nombre por la
  mitad con un borde duro.
- **Quien es setter Y closer ve su número de closer** en Equipo. El dinero es el
  titular del negocio y los dos números no entran legibles en 150 px. El detalle
  completo está en los dos rankings.
- **`.trabajo` colapsa a 1040, no a 1140.** El que se queda sin aire primero es la
  columna del formulario, no la página.

## Lo que se agregó porque el diseño lo pedía

- **El paso de fecha (‹ Hoy ›)** en el Panel. El `?f=` ya existía y funcionaba, pero
  ninguna pantalla sabía escribirlo: el panel solo podía mirar la semana en curso y
  el historial que la gente carga todos los días era inalcanzable.
- **La rampa de marca de verdad** (`shared/chasis/marca.ts`). Ajustes prometía
  «cambialo y cambia todo» y el hex no lo leía nadie.
