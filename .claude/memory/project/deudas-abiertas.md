# Deudas abiertas — al 8 de septiembre de 2026

## Sin hacer, a propósito

- **Las dos pantallas de reporte siguen teniendo mucho aire abajo.** Un formulario
  de cuatro campos en una pantalla de 900 px de alto deja vacío el 55% inferior.
  Se compuso como hoja centrada para que se lea intencional, pero lo que de verdad
  lo llenaría es **contenido**: los últimos días cargados por esa persona, o lo que
  lleva en la semana. Eso pide una consulta nueva (`leerReportesDe(persona, ventana)`),
  o sea una feature, no diseño. Decisión: no se metió sin pedirlo.
- **El mockup dibuja «desde julio» debajo de cada nombre en Equipo** y la app no lo
  muestra: `Persona` no tiene fecha de alta en el esquema. Si algún día se agrega
  `creada_en`, ese renglón ya tiene lugar.

## Para mirar en el próximo pase

- El aviso de «ya cargaste este día» vive en la columna lateral. En celular queda
  abajo de todo, después del formulario — que es justo donde ya no lo mirás.
  Ver si conviene subirlo cuando aparece.
- `npm run verificar` cubre los 24 números pero **no la foto**. El gate visual sigue
  siendo a mano: 1440 y 390, claro y oscuro, y abriendo cada estado.

## Estado del deploy

El rediseño está en `main` local, con el gate y `verificar` en verde. **No se
desplegó**: los commits van firmados `LPTheCEOTech <tech@lpfinancialservices.info>`
y el push/deploy es decisión de Jack.
