# EasyBolão360

Bolão da Copa do Mundo: faça palpites nos jogos, dispute o ranking global e crie grupos privados com amigos.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/) (Auth com Google + Firestore)

## Estrutura

```text
app/                # Páginas (App Router)
  page.tsx          # Dashboard
  jogos/            # Lista de jogos e palpites
  grupos/           # Grupos privados (lista e detalhe)
  ranking/          # Ranking global
  perfil/           # Perfil do usuário
  admin/            # Painel administrativo (jogos e resultados)
components/
  layout-wrapper.tsx# Shell da aplicação (header, nav, gate de login)
  ui.tsx            # Componentes compartilhados (Leaderboard, Avatar, etc.)
lib/
  firebase.ts       # Inicialização do Firebase
  firestore.ts      # Camada de acesso a dados (Firestore)
  auth-context.tsx  # Contexto de autenticação
  types.ts          # Modelos tipados das coleções
  utils.ts          # Helpers (cálculo de pontos, formatação)
```

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure o Firebase em `firebase-applet-config.json` (projeto, API key e `firestoreDatabaseId`).
3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

## Pontuação

| Acerto | Pontos |
| --- | --- |
| Placar exato | 25 |
| Resultado + gols de um time | 18 |
| Apenas resultado | 10 |
| Apenas gols de um time | 4 |
