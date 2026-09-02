# Panel de Ventas

Un panel de métricas de ventas donde **toda la data se carga a mano**, con dos
formularios de fin de día: uno para setters y otro para closers. El panel
calcula solo las tasas, el embudo, el dinero y los rankings.

No hay integraciones. No hay nada que conectar. Dos formularios y listo.

## Qué mide

| | De dónde sale |
|---|---|
| **Tasa de agenda** | agendas ÷ conversaciones iniciadas |
| **Tasa de asistencia** | asistieron ÷ llamadas en agenda |
| **Tasa de cierre** | cierres ÷ asistieron |
| **% de cobro** | cash collected ÷ revenue contratado |
| **Ticket promedio** | revenue ÷ cierres |
| Embudo, rankings, cash por día | lo mismo, agrupado |

**Nada de esto se guarda: todo se calcula al leer.** Si un día un número no
cuadra, el problema está en un insumo y se ve cuál.

## Instalarlo

Está explicado paso a paso, sin dar por sabido nada, en
**[docs/guia-instalacion.md](docs/guia-instalacion.md)**.

El resumen: creás tu GitHub, tu Vercel y tu Supabase, pegás tres variables, y
corrés un comando.

```bash
npm install
cp .env.local.example .env.local   # y pegás tus tres valores
npm run instalar
npm run dev
```

## Los comandos

| | |
|---|---|
| `npm run dev` | levanta la app en http://localhost:3110 |
| `npm run instalar` | crea las tablas, la configuración y tu usuario |
| `npm run usuario -- listar` | quién puede entrar |
| `npm run build` | compila para producción |
| `npm test` | los tests del cálculo y de la sesión |
| `npm run verificar` | compara la base contra los números de oro |
| `npm run semilla -- cargar` / `-- limpiar` | datos de prueba, y sacarlos |
| `npm run portar-css` | vuelve a portar el CSS desde el mockup |
| `npm run sin-cliente` | comprueba que no haya datos de un negocio en el código |

## Cómo está armado

```
src/shared/calculo/   las fórmulas. Funciones puras, con tests.
src/shared/datos/     la capa de datos. Las pantallas no hablan con Supabase.
src/shared/chasis/    la barra de arriba, los iconos, el tema.
src/features/         una carpeta por pantalla.
src/app/              las rutas.
supabase/migraciones/ el esquema.
MOCKUP-APROBADO.html  el diseño. Es el spec, no una referencia.
```

**El CSS no se edita a mano.** `src/app/globals.css` lo genera
`scripts/portar-css.py` desde `MOCKUP-APROBADO.html`. Para cambiar un estilo se
cambia el mockup y se vuelve a correr el script.

## Dos cosas que conviene saber antes de tocarlo

**Cada persona tiene un solo reporte por día.** Lo garantiza una restricción de
la base (`unique (fecha, persona_id)`), no el formulario. Si alguien manda su
día dos veces, se reemplaza; no se suma. Sin eso el panel inflaría los números
sin que nada fallara.

**Un divisor 0 muestra `—`, nunca `0%`.** Una instalación nueva no tiene datos,
y `0%` de cierre sería mentira: no es que cerraste nada de nada, es que todavía
no hay de qué calcular.
