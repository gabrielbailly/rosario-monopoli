# Monopoli del Rosario

Juego tipo Monopoli para niños de 9 años:

- Tablero tipo Monopoli con misterios del rosario y casillas especiales.
- Modo alumno contra máquina o varios compañeros (2 a 4 jugadores).
- Sistema de usuarios: cada usuario ve solo sus partidas.
- Guardado automático para continuar partidas más tarde.
- Interfaz educativa con tarjetas centrales, sonidos y animaciones.

## Reglas implementadas

- Economía simplificada: solo dinero (€).
- Cuando un jugador cae en un misterio de otro, paga alquiler.
- Las preguntas de trivial dan recompensa en dinero si se acierta.
- Las cartas sorpresa pueden mover, dar o quitar dinero y hacer perder turno.
- La partida termina cuando todos los jugadores se quedan sin dinero.

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

- Usuario propietario de la partida
- Jugador actual y turno
- Dinero
- Misterios comprados
- Casilla de cada jugador

## Usuarios

- Acceso con nombre de usuario + PIN.
- Si el usuario no existe, se crea automáticamente.
- Cada usuario solo puede ver, continuar o eliminar sus propias partidas.
- Se puede terminar una partida manualmente con el botón `Terminar partida`.

## Duración de partida

Al crear una partida puedes elegir:

- `Corta`
- `Media`
- `Larga`

Cada duración ajusta importes (dinero inicial, recompensas y rentas) para acelerar o alargar la experiencia.

## Deploy en Vercel

1. En Vercel, conecta este repositorio.
2. Crea una base de datos Postgres (Vercel Storage > Postgres).
3. Configura la variable de entorno `DATABASE_URL` con la URL de Postgres.
4. Haz deploy.

El archivo `vercel.json` ya enruta:

- Frontend estático desde `public/`
- API servida por `server.js`

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
