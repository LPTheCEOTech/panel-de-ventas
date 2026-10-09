# Uso diario del panel

> Ya seguiste el video / `docs/setup-checklist.md` y tu panel está funcionando. Este documento es lo que hace la gente del equipo cada día.

## Para el admin (tú)

### Al principio (una sola vez)

Ya lo hiciste en la etapa 4 del setup: cambiaste el nombre, el color, la moneda, la zona horaria, el logo y agregaste al equipo con «Agregar e invitar».

Cuando los vendedores acepten la invitación por correo y elijan contraseña, empiezan a ver **su propio panel filtrado** (solo lo suyo).

### Cada día

Tú **NO** cargas reportes en la app. Los cargan los vendedores. Tú sí cargas:

**Gasto diario** (menú «Gasto»):
- Cuánto gastaste hoy en publicidad / captación / lo que sea.
- Un solo gasto por día. Si gastaste en varias plataformas, súmalos (la nota queda como ayuda-memoria).
- Sin esto, el CAC (Costo de adquisición) y el Costo por asistida no se pueden calcular.

**Mirar el panel** (menú «Panel»):
- Eliges día / semana / mes arriba a la derecha.
- Ves cash cobrado, tasas, CAC, AOV, embudo, gráfico por día, y rankings de setters y closers.

### Cuando cambia algo

- **Alguien se va del equipo** → menú Equipo → tacho (la X) al lado del nombre → «Dar de baja». No se borra el historial, solo deja de aparecer en los formularios.
- **Sube alguien nuevo** → menú Equipo → card «Agregar al equipo» → completas → se le manda invitación por correo.
- **Cambiar color de marca, moneda, etc.** → menú Ajustes.
- **Quieres que alguien te ayude a llevar el equipo** → menú Equipo → toca la etiqueta de su rol (Setter / Closer) → elige **Manager**. También puedes elegir Manager al agregarlo.

---

## Para tu manager

Un manager hace **casi todo lo que haces tú**, menos lo delicado:

- **Sí puede:** ver el panel completo (rankings, gasto y CAC incluidos), cargar reportes y llamadas por cualquiera del equipo, cargar el gasto, agregar gente al equipo, cambiarle el rol o la contraseña a los vendedores.
- **No puede:** entrar a Ajustes, dar de baja a nadie, nombrar otros managers, ni tocarte a ti.

Si también vende, carga lo suyo en «Reporte Setter» o «Post Llamada» como cualquiera. Si no vende, no aparece en los rankings.

Para quitarle el manager: menú Equipo → toca «Manager» en su fila → elige Setter o Closer. Si lo das de baja, también deja de ser manager.

---

## Para tus vendedores

Cuando aceptan la invitación por correo y eligen contraseña, entran al panel. **No ven todo lo que tú ves**: solo sus propios números. No ven ajustes, ni equipo, ni gasto.

Cada uno tiene que cargar su reporte de fin de día. **Solo una vez por día** (si carga dos veces, se reemplaza el anterior, no se suma).

### Si es Setter

Al final del día:

1. Menú **«Reporte Setter»**.
2. **Fecha**: hoy (viene por default).
3. **Conversaciones iniciadas**: con cuántas personas empezaste a hablar hoy.
4. **Agendas**: cuántas llamadas quedaron agendadas.
5. **«Enviar reporte»**.

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
6. Si NO cerró pero **cobraste una cuota de una venta anterior**: marca el checkbox **«Cobro de venta anterior»** y aparece solo el Cash.
7. **Nota** (opcional): «cierra el viernes, mandar contrato».
8. **«Guardar llamada»**.

La llamada aparece abajo en la lista del día. Si te equivocaste, la borras con la X (no se pierde el historial).

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
| ¿Puedo editar una llamada vieja? | Sí en la lista del día actual. Para editar de otro día, todavía no — próxima versión. |
| ¿Puedo ver el reporte de un cerrador específico? | Tú como admin ves el ranking en el panel principal. Detalle por persona: por ahora no. |
| ¿Qué es AOV y por qué no es lo mismo que ticket promedio? | Ticket promedio = revenue ÷ cierres (lo que se firmó). AOV = cash ÷ cierres (lo que se cobró). Firmar y cobrar no son la misma cosa. |
| ¿Qué es CAC? | Costo de adquisición: gasto en publicidad del período ÷ cantidad de cierres. Sin gasto cargado, no aparece. |
| ¿Puedo compartir el link del panel con alguien externo? | No. Cada persona necesita su login. Invítalo desde Equipo. |
