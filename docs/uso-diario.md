# Uso diario del panel

> Ya seguiste el video / `docs/setup-checklist.md` y tu panel está funcionando. Este documento es lo que hace la gente del equipo cada día.

## Para el admin (tú)

### Al principio (una sola vez)

Ya lo hiciste en la etapa 4 del setup: cambiaste el nombre, el color, la moneda, la zona horaria, el logo y agregaste al equipo desde **Equipo → «Agregar al equipo»**.

Cuando tus vendedores entran con el correo y la contraseña que les pasaste, ven **su propio panel filtrado** (solo lo suyo).

### Cada día

Tú **NO** cargas reportes en la app. Los cargan los vendedores. Tú sí cargas:

**Gasto en publicidad** (menú «Gasto en publicidad»):
- Cuánto gastaste hoy en anuncios.
- Un solo gasto por día. Si gastaste en varias plataformas, súmalos (la nota queda como ayuda-memoria).
- Sin esto, el CAC (Costo de adquisición) y el Costo por asistida no se pueden calcular.
- **Debajo del formulario ves los gastos cargados**, con el total. Abre en el mes actual; con el botón de período de esa lista (el mismo del Panel) eliges otros días. Si te equivocaste en uno, **tócalo**: sube al formulario, lo corriges y tocas **«Reemplazar»**.

**Mirar el panel** (menú «Panel»):
- Eliges el período con el botón de fechas, arriba a la derecha (Hoy, Ayer, Este mes, Mes pasado, Todo, o el rango que quieras).
- Ves cash cobrado, tasas, CAC, AOV, embudo, gráfico por día, y rankings de setters y closers.
- **Ver a una sola persona**: al lado del botón de fechas está **«Todo el equipo»**. Tócalo y elige a alguien: el panel muestra solo lo suyo, como lo vería esa persona (sin gasto ni rankings, porque eso es de todo el negocio). Para volver, elige «Todo el equipo».
- **Día por día**: abajo de todo hay una fila por día con agendas, llamadas, asistieron, cierres y cash. **Toca un día** para ver cada llamada: quién la hizo, con qué lead y cuánto entró. Respeta el período y la persona que elegiste arriba.

### Cuando cambia algo

- **Alguien se va del equipo** → menú Equipo → tacho (la X) al lado del nombre → «Dar de baja». No se borra el historial, solo deja de aparecer en los formularios.
- **Sube alguien nuevo** → menú Equipo → card «Agregar al equipo» → completas nombre, rol, correo y contraseña → **«Crear acceso»** → tocas **«Copiar mensaje para mandarle»** y se lo pasas por WhatsApp. El panel no manda correos.
- **Cambiar color de marca, moneda, etc.** → menú Ajustes.
- **Quieres que alguien te ayude a llevar el equipo** → menú Equipo → toca la etiqueta de su rol (Setter / Closer) → elige **Manager**. También puedes elegir Manager al agregarlo.
- **Saber quién dejó de cargar** → menú Equipo: debajo de cada nombre dice **«Último reporte: hoy / ayer / hace N días»**. Si **tocas el nombre**, vas al panel de esa persona.

### Si cargas por tu equipo

En **Post Llamada** y en **Reporte Setter**, el campo de la persona **arranca vacío**: elige siempre a quién le estás cargando antes de guardar. Así nada queda a tu nombre por error.

Debajo de cada formulario está **lo que ya se cargó**, con sus propios filtros arriba a la derecha: **«Todo el equipo»** (para ver a una sola persona) y el **período** (el mismo botón del Panel). Abren en **Esta semana**.

- En **Post Llamada**, la lista **«Llamadas cargadas»** dice **de quién es cada llamada** y se parte por día: cuántas hubo y cuánto entró cada día.
- En **Reporte Setter**, la lista **«Reportes cargados»** muestra qué mandó cada setter cada día. Si uno está mal, **tócalo**: sube al formulario para corregirlo.

Y en Post Llamada, si escribes un lead que ya tiene llamada ese día, te avisa para que no la cargues dos veces.

---

## Para tu manager

Un manager hace **casi todo lo que haces tú**, menos lo delicado:

- **Sí puede:** ver el panel completo (rankings, gasto y CAC incluidos), cargar reportes y llamadas por cualquiera del equipo, cargar el gasto, agregar gente al equipo, cambiarle el rol o la contraseña a los vendedores.
- **No puede:** entrar a Ajustes, dar de baja a nadie, nombrar otros managers, ni tocarte a ti.

Si también vende, carga lo suyo en «Reporte Setter» o «Post Llamada» como cualquiera. Si no vende, no aparece en los rankings.

Para quitarle el manager: menú Equipo → toca «Manager» en su fila → elige Setter o Closer. Si lo das de baja, también deja de ser manager.

---

## Para tus vendedores

Entran con el correo y la contraseña que les pasaste. **No ven todo lo que tú ves**: solo sus propios números. No ven ajustes, ni equipo, ni gasto.

Cada uno tiene que cargar su reporte de fin de día. **Solo una vez por día** (si carga dos veces, se reemplaza el anterior, no se suma).

### Si es Setter

Al final del día:

1. Menú **«Reporte Setter»**.
2. **Fecha**: hoy (viene por default).
3. **Conversaciones iniciadas**: con cuántas personas empezaste a hablar hoy.
4. **Agendas**: cuántas llamadas quedaron agendadas.
5. **«Enviar reporte»**. Aparece abajo, en «Reportes cargados».

### Si es Closer

Al terminar **CADA** llamada:

1. Menú **«Post Llamada»**.
2. **Fecha**: hoy.
3. **Nombre del lead**: con quién fue la llamada.
4. **Switches**:
   - **Asistió**: prendido si vino, apagado si no.
   - **Reagendada**: prendido si quedó para otro día.
   - **Cerró**: prendido si firmó en esta llamada.
5. **Dinero** (solo si Cerró está prendido):
   - **Revenue contratado**: lo que firmó en total (aunque lo pague en cuotas).
   - **Cash collected**: lo que realmente entró hoy.
6. **Nota** (opcional): «cierra el viernes, mandar contrato».
7. **«Guardar llamada»**.

La llamada aparece abajo, en «Llamadas cargadas». Si te equivocaste, la borras con la X (no se pierde el historial). Para ver las de otros días, cambia el período de esa lista.

### Si hace las dos cosas (Setter y closer)

Ve las dos pestañas y usa las dos.

---

## Cosas para saber

- **Un divisor 0 muestra `—`, nunca `0%`**. Un mes sin cierres no significa 0% de cierre; significa que todavía no hay de qué calcular.
- **Nadie carga la misma fecha dos veces sin querer**. La restricción vive en la base de datos: un segundo intento con la misma fecha reemplaza el anterior en vez de duplicar.
- **Los rankings no aparecen para los vendedores** — es data de negocio, no del vendedor. Tú como admin sí los ves, y tu manager también.

## Preguntas frecuentes

| Pregunta | Respuesta |
|---|---|
| ¿Puedo corregir una llamada vieja? | En Post Llamada, en «Llamadas cargadas», elige el período de ese día: aparece la llamada. Bórrala con la X y vuelve a cargarla bien (con la **Fecha** del formulario en ese día). |
| ¿Puedo ver el reporte de un closer específico? | Sí. En el Panel toca **«Todo el equipo»** y elige a la persona, o toca su nombre en **Equipo**. Abajo, en **Día por día**, ves cada día y cada llamada. |
| ¿Dónde veo los gastos que ya cargué? | En **Gasto en publicidad**, debajo del formulario: el mes completo con su total. |
| ¿Qué es AOV y por qué no es lo mismo que ticket promedio? | Ticket promedio = revenue ÷ cierres (lo que se firmó). AOV = cash ÷ cierres (lo que se cobró). Firmar y cobrar no son la misma cosa. |
| ¿Qué es CAC? | Costo de adquisición: gasto en publicidad del período ÷ cantidad de cierres. Sin gasto cargado, no aparece. |
| ¿Puedo compartir el link del panel con alguien externo? | No. Cada persona necesita su login. Créale su acceso desde Equipo. |
