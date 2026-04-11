# Monopoli del Rosario

Juego tipo Monopoli para niños de 9 años:

- 20 casillas de misterios del rosario (5 gozosos, 5 dolorosos, 5 gloriosos, 5 luminosos).
- Casillas especiales: Sorpresa, Trivial Rosario, Vuelve a SALIDA y Descanso.
- Modo alumno contra máquina o varios compañeros en la misma partida.
- Guardado automático de la partida para continuarla más tarde.
- Registro de puntuaciones finales.

## Reglas implementadas

- Si un jugador compra los 5 misterios de un grupo, desbloquea hoteles en ese color.
- Cuando cae en un misterio de otro jugador paga renta.
- Las preguntas de trivial otorgan premio si se acierta.
- Las cartas sorpresa incluyen movimiento, premios, penalizaciones y pérdida de turno.

## Tecnologías

- Backend: Node.js + Express
- Base de datos: SQLite en local y Postgres en Vercel
- Frontend: HTML/CSS/JavaScript vanilla

## Ejecutar en local

```bash
npm install
npm start
```

Abre `http://localhost:3000`.

## Tests

```bash
npm test
```

## Guardado de partida

Cada acción se guarda automáticamente:

- En local: `data/game.sqlite`
- En Vercel: Postgres usando `DATABASE_URL` o `POSTGRES_URL`

- Jugador actual y turno
- Dinero y puntos
- Misterios comprados
- Casilla de cada jugador

## Deploy en Vercel

1. En Vercel, conecta este repositorio.
2. Crea una base de datos Postgres (Vercel Storage > Postgres).
3. Configura la variable de entorno `DATABASE_URL` con la URL de Postgres.
4. Haz deploy.

El archivo `vercel.json` ya enruta:

- Frontend estático desde `public/`
- API en `/api/*` desde `api/index.js`

## GitHub y actualizaciones automáticas

- `/.github/workflows/ci.yml`: ejecuta tests automáticamente en cada push y pull request.
- `/.github/dependabot.yml`: propone actualizaciones automáticas de dependencias npm cada semana.

## Crear repositorio en GitHub (manual)

```bash
git init
git add .
git commit -m "feat: crear Monopoli del Rosario"
gh repo create rosario-monopoli --public --source=. --remote=origin --push
```

Si prefieres privado, cambia `--public` por `--private`.
