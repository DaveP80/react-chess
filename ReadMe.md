### Full Stack Website for chess playing
- Supabase User management and gameplay
- React Remix front end and server side rendering
- Github and Email auth providing.
<br/>
[Live Website](https://react-chess-jh4a3z47hq-ue.a.run.app)
<br/>
[localhost](http://localhost:5173/)

## Environment configuration

This repository uses dotenv files to manage four deployment targets:

* **dev** (`.env.dev`) – local development with `NODE_ENV=development`
* **qa** (`.env.qa`) – quality‑assurance cluster (production build)
* **uat** (`.env.uat`) – user‑acceptance testing (production build)
* **production** (`.env.production`) – public production

A template `.env.example` is provided; copy it to the appropriate name and fill
in the secrets.  The plain `.env` file is ignored by git to keep secrets safe.

### Scripts

Use the helper npm scripts defined in `package.json` (requires `dotenv-cli`):

```bash
npm run start:dev          # start development server with .env.dev
npm run build:qa && npm run start:qa
npm run build:uat && npm run start:uat
npm run build:prod && npm run start:prod
``` 

You can change the tool (cross-env, env-cmd, etc.) as needed, but the
important part is loading the matching `.env.*` file before building/starting.

<!--
Author: David Paquette
-->
