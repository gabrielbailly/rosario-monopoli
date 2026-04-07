# Monopoli del Rosario

Juego tipo Monopoli para ninos de 9 anos:

- 20 casillas de misterios del rosario (5 gozosos, 5 dolorosos, 5 gloriosos, 5 luminosos).
- Casillas especiales: Sorpresa, Trivial Rosario, Vuelve a SALIDA y Descanso.
- Modo alumno contra maquina o varios companeros en la misma partida.
- Guardado automatico de la partida en SQLite para continuarla mas tarde.
- Registro de puntuaciones finales.

## Reglas implementadas

- Si un jugador compra los 5 misterios de un grupo, desbloquea hoteles en ese color.
- Cuando cae en un misterio de otro jugador paga renta.
- Las preguntas de trivial otorgan premio si se acierta.
- Las cartas sorpresa incluyen movimiento, premios, penalizaciones y perdida de turno.

## Tecnologias

- Backend: Node.js + Express
- Base de datos: SQLite
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

Cada accion se guarda automaticamente en `data/game.sqlite`:

- Jugador actual y turno
- Dinero y puntos
- Misterios comprados
- Casilla de cada jugador

## GitHub y actualizaciones automaticas

- `/.github/workflows/ci.yml`: ejecuta tests automaticamente en cada push y pull request.
- `/.github/dependabot.yml`: propone actualizaciones automaticas de dependencias npm cada semana.

## Crear repositorio en GitHub (manual)

```bash
git init
git add .
git commit -m "feat: crear Monopoli del Rosario"
gh repo create rosario-monopoli --public --source=. --remote=origin --push
```

Si prefieres privado, cambia `--public` por `--private`.
