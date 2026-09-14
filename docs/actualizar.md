# Traer mejoras desde la plantilla de Leandro

Cuando Leandro suba una mejora (nueva feature, arreglo de bug, ajuste de diseño), tu copia **NO se actualiza sola**. Tenés que traer los cambios vos.

Hay dos formas de hacerlo. Elegí una según qué te sale más cómodo.

---

## Opción A · Todo desde el navegador (sin terminal, recomendado)

**Cuándo usarla**: cuando no querés instalar nada en tu computadora.

1. Andá al repo de Leandro: `https://github.com/LPTheCEOTech/panel-de-ventas`.
2. Botón **«Sync fork»** arriba a la derecha (solo aparece si tu repo está atrás).
   - Si NO aparece: tu repo no tiene «upstream». Andá al tuyo, botón verde **«Sync fork» → «Update branch»**. Si tampoco aparece, es porque tu repo se creó con «Use this template» (no es fork). En ese caso: usá la **Opción B** más abajo.
3. Vercel detecta el push a `main` de tu repo y despliega la nueva versión en 1-2 minutos.
4. Si la actualización trae una **nueva migración** en `supabase/migraciones/00X_...sql`, tenés que correrla en el SQL Editor de Supabase:
   - Abrí el archivo nuevo desde GitHub en tu repo (carpeta `supabase/migraciones/`).
   - «Copy raw file».
   - Supabase → SQL Editor → New query → pegás → Run.

> 💡 **Cómo enterarte de que hay una migración nueva**: mirá el commit de Leandro. Si dice «migración» o el archivo tiene un número nuevo en `supabase/migraciones/`, hay que correrla.

---

## Opción B · Desde tu computadora (requiere Node.js + git)

**Cuándo usarla**: cuando ya usás Node.js o sabés lo que estás haciendo.

Una sola vez, para conectar tu repo con el de Leandro:

```bash
git clone https://github.com/TU_USUARIO/panel-de-ventas.git
cd panel-de-ventas
git remote add plantilla https://github.com/LPTheCEOTech/panel-de-ventas.git
```

Cada vez que quieras traer los updates:

```bash
git fetch plantilla
git merge plantilla/main
git push origin main
```

Si hay migraciones nuevas: correlas en el SQL Editor de Supabase igual que en la Opción A.

---

## ¿Y si el update rompe algo?

Casi nunca pasa (Leandro no publica cosas rotas), pero por las dudas:

- El **último commit tuyo** siempre queda en tu repo. Podés hacer «Revert» del merge desde GitHub → Commits → el problemático → botón «Revert».
- Vercel guarda **todos los deployments anteriores**. Si algo se rompe, andá a Vercel → tu proyecto → Deployments → deployment anterior → tres puntitos → **«Promote to Production»**. Volvés a la versión que andaba en un click.

---

## ¿Cómo sé cuándo hay updates?

Opciones:

- **Seguir el repo de Leandro**: botón «Watch» arriba a la derecha → «Custom» → «Releases». Te llega mail cuando publica una versión.
- **Preguntarle a Leandro**: si te avisa por WhatsApp / correo cuando publica algo, más simple.
