# Jogo da Velha Multiplayer

Aplicação React de Jogo da Velha multiplayer desenvolvida com Supabase (Auth, Database e Realtime).

## Funcionalidades

- ✅ Autenticação de usuários (cadastro e login)
- ✅ Lobby com estatísticas do jogador
- ✅ Sistema de matchmaking (criar ou buscar partida)
- ✅ Jogo multiplayer em tempo real usando Supabase Realtime
- ✅ Detecção automática de vitória e empate
- ✅ Registro de estatísticas (vitórias, empates, derrotas)
- ✅ Interface responsiva e mobile-friendly

## Tecnologias

- React 18+ com TypeScript
- Vite (build tool)
- Supabase (Auth + Database + Realtime)
- React Router DOM (roteamento)

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (https://supabase.com)
- Projeto Supabase criado

## Configuração

1. Clone o repositório:
```bash
git clone <repository-url>
cd jogo-da-velha-multiplayer
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env`
   - Preencha com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

4. Configure o banco de dados no Supabase:
   - As migrations já foram aplicadas automaticamente via MCP
   - Verifique se as tabelas `user_profiles`, `matches` e `moves` foram criadas
   - Verifique se o Realtime está habilitado nas tabelas `matches` e `moves`

## Executando

### Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para produção
```bash
npm run build
```

### Preview da build
```bash
npm run preview
```

## Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis
│   └── GameBoard.tsx # Componente do tabuleiro
├── lib/             # Configurações e utilitários
│   └── supabase.ts  # Cliente Supabase
├── pages/           # Páginas da aplicação
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   ├── LobbyPage.tsx
│   ├── WaitingRoom.tsx
│   ├── GamePage.tsx
│   └── ResultPage.tsx
├── types/           # Definições de tipos TypeScript
│   └── index.ts
├── App.tsx          # Componente principal e rotas
└── main.tsx         # Entry point
```

## Como Jogar

1. **Cadastro/Login**: Crie uma conta ou faça login
2. **Lobby**: Visualize suas estatísticas e escolha:
   - **Criar Partida**: Cria uma nova partida e aguarda um oponente
   - **Buscar Partida**: Busca uma partida disponível ou cria uma nova
3. **Aguardando**: Aguarde um segundo jogador entrar na partida
4. **Jogar**: Faça suas jogadas alternadamente com o oponente
5. **Resultado**: Veja o resultado da partida e suas estatísticas atualizadas

## Banco de Dados

O projeto utiliza as seguintes tabelas:

- **user_profiles**: Perfis de usuários com estatísticas
- **matches**: Partidas em andamento ou finalizadas
- **moves**: Histórico de movimentos de cada partida

Todas as tabelas possuem Row Level Security (RLS) configurado para segurança.

## Desenvolvido por

Projeto desenvolvido como parte do curso de Software em Nuvem da Unifor.
