# Documentação Técnica - Jogo da Velha Multiplayer

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Regras do Jogo](#regras-do-jogo)
5. [Funcionalidades](#funcionalidades)
6. [Fluxo de Dados](#fluxo-de-dados)
7. [Banco de Dados](#banco-de-dados)
8. [Autenticação e Segurança](#autenticação-e-segurança)
9. [Realtime e Sincronização](#realtime-e-sincronização)
10. [Componentes Principais](#componentes-principais)
11. [Estados e Ciclo de Vida](#estados-e-ciclo-de-vida)
12. [Tratamento de Erros](#tratamento-de-erros)
13. [Deploy e Produção](#deploy-e-produção)

---

## 🎯 Visão Geral

Jogo da Velha Multiplayer é uma aplicação web desenvolvida em React com TypeScript que permite dois jogadores competirem em tempo real através de uma interface responsiva. A aplicação utiliza Supabase como backend completo, fornecendo autenticação, banco de dados PostgreSQL e sincronização em tempo real.

### Tecnologias Principais

- **Frontend**: React 18+ com TypeScript
- **Build Tool**: Vite
- **Roteamento**: React Router DOM v6
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Deploy**: Vercel

---

## 🏗️ Arquitetura

### Arquitetura Geral

```
┌─────────────────┐
│   React App     │
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│    Supabase     │
│  ┌───────────┐  │
│  │   Auth    │  │
│  ├───────────┤  │
│  │ PostgreSQL│  │
│  ├───────────┤  │
│  │  Realtime │  │
│  └───────────┘  │
└─────────────────┘
```

### Fluxo de Comunicação

1. **Autenticação**: Cliente → Supabase Auth → JWT Token
2. **Dados**: Cliente → Supabase REST API → PostgreSQL
3. **Tempo Real**: Cliente ↔ Supabase Realtime ↔ PostgreSQL (via WebSocket)

---

## 📁 Estrutura do Projeto

```
jogo-da-velha-multiplayer/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── GameBoard.tsx     # Tabuleiro do jogo (3x3)
│   │   └── GameBoard.css     # Estilos do tabuleiro
│   │
│   ├── pages/                # Páginas da aplicação
│   │   ├── LoginPage.tsx     # Tela de login
│   │   ├── SignUpPage.tsx    # Tela de cadastro
│   │   ├── LobbyPage.tsx     # Lobby com estatísticas
│   │   ├── WaitingRoom.tsx   # Sala de espera
│   │   ├── GamePage.tsx       # Tela do jogo
│   │   ├── ResultPage.tsx    # Tela de resultado
│   │   ├── Auth.css          # Estilos de autenticação
│   │   ├── LobbyPage.css     # Estilos do lobby
│   │   ├── WaitingRoom.css   # Estilos da sala de espera
│   │   ├── GamePage.css      # Estilos do jogo
│   │   └── ResultPage.css    # Estilos do resultado
│   │
│   ├── lib/                  # Bibliotecas e configurações
│   │   └── supabase.ts       # Cliente Supabase configurado
│   │
│   ├── types/                 # Definições TypeScript
│   │   └── index.ts          # Interfaces: User, Match, Move
│   │
│   ├── App.tsx               # Componente principal e rotas
│   ├── main.tsx              # Entry point da aplicação
│   ├── index.css             # Estilos globais
│   └── vite-env.d.ts        # Tipos do Vite (env vars)
│
├── public/                    # Arquivos estáticos
├── index.html                # HTML principal
├── package.json              # Dependências e scripts
├── tsconfig.json             # Configuração TypeScript
├── vite.config.ts            # Configuração Vite
└── .env                      # Variáveis de ambiente (não versionado)
```

---

## 🎮 Regras do Jogo

### Regras Básicas do Jogo da Velha

1. **Tabuleiro**: Grade 3x3 (9 células)
2. **Jogadores**: 2 jogadores (X e O)
3. **Turnos**: Alternados entre os jogadores
4. **Objetivo**: Formar uma linha (horizontal, vertical ou diagonal) com 3 símbolos iguais
5. **Empate**: Quando todas as células são preenchidas sem vencedor

### Regras de Vitória

Uma vitória ocorre quando um jogador consegue alinhar 3 símbolos em:
- **Linha horizontal**: [0,1,2], [3,4,5], [6,7,8]
- **Linha vertical**: [0,3,6], [1,4,7], [2,5,8]
- **Diagonal**: [0,4,8], [2,4,6]

### Regras de Empate

O jogo termina em empate quando:
- Todas as 9 células estão preenchidas
- Nenhum jogador conseguiu formar uma linha vencedora

### Regras de Abandono

- Um jogador pode sair da partida a qualquer momento
- Ao sair, o oponente é declarado vencedor automaticamente
- Estatísticas são atualizadas: derrota para quem saiu, vitória para o oponente

---

## ⚙️ Funcionalidades

### 1. Autenticação

#### Cadastro
- Email e senha obrigatórios
- Nome opcional
- Validação de email
- Senha mínima (configurada no Supabase)

#### Login
- Autenticação via email e senha
- Sessão persistente (localStorage)
- Redirecionamento automático se já autenticado

#### Logout
- Limpeza de sessão
- Redirecionamento para login

### 2. Lobby

#### Estatísticas do Jogador
- Vitórias (wins)
- Empates (draws)
- Derrotas (losses)

#### Opções de Partida

**Partida Pública (Aleatória)**
- Busca uma partida pública disponível
- Se não encontrar, cria uma nova partida pública
- Qualquer jogador pode entrar

**Partida Privada (Por Código)**
- Cria uma partida com código único (6 caracteres alfanuméricos)
- Outro jogador precisa inserir o código para entrar
- Código é exibido para compartilhamento

### 3. Sistema de Matchmaking

#### Busca de Partida Pública
1. Busca partidas com `status = 'waiting'`
2. Filtra por `is_private = false`
3. Filtra por `player2_id IS NULL`
4. Exclui partidas criadas pelo próprio jogador
5. Se encontrar, entra na partida
6. Se não encontrar, cria nova partida

#### Criação de Partida Privada
1. Gera código único de 6 caracteres
2. Verifica se o código já existe no banco
3. Se existir, gera novo código
4. Cria partida com `is_private = true` e `code = 'XXXXXX'`

#### Entrada por Código
1. Jogador insere código de 6 caracteres
2. Busca partida com código correspondente
3. Verifica se partida está disponível (`status = 'waiting'` e `player2_id IS NULL`)
4. Se disponível, atualiza `player2_id` e muda status para `'in_progress'`

### 4. Sala de Espera

- Exibe código da partida (se privada)
- Aguarda segundo jogador entrar
- Atualização em tempo real via Supabase Realtime
- Redirecionamento automático quando segundo jogador entra
- Opção de cancelar partida

### 5. Jogo

#### Funcionalidades
- Tabuleiro interativo 3x3
- Indicação de turno atual
- Validação de jogadas (célula vazia, turno correto)
- Detecção automática de vitória/empate
- Atualização em tempo real do tabuleiro
- Sincronização de turnos entre jogadores
- Opção de sair da partida

#### Lógica de Jogada
1. Valida se é o turno do jogador
2. Valida se célula está vazia
3. Atualiza tabuleiro localmente (otimista)
4. Salva no banco de dados
5. Registra movimento na tabela `moves`
6. Verifica vitória/empate
7. Se partida terminou, atualiza estatísticas
8. Notifica oponente via Realtime

### 6. Resultado

- Exibe resultado (Vitória, Derrota ou Empate)
- Mostra tabuleiro final
- Opções: Jogar Novamente ou Voltar ao Lobby
- Estatísticas já atualizadas automaticamente

### 7. Estatísticas

#### Atualização Automática
- **Vitória**: +1 win para vencedor, +1 loss para perdedor
- **Empate**: +1 draw para ambos
- **Abandono**: +1 win para oponente, +1 loss para quem saiu

#### Proteção contra Duplicação
- Flag `statsUpdatedRef` previne atualizações duplicadas
- Atualização ocorre apenas uma vez por partida
- Fallback via polling se Realtime falhar

---

## 🔄 Fluxo de Dados

### Fluxo de Autenticação

```
1. Usuário → LoginPage → Supabase Auth
2. Supabase Auth → JWT Token
3. JWT Token → localStorage
4. App.tsx verifica sessão → Redireciona para /lobby
```

### Fluxo de Criação de Partida

```
1. LobbyPage → handleCreateMatch()
2. Supabase → INSERT na tabela matches
3. Status: 'waiting', player1_id: currentUserId
4. Redireciona para /waiting/:matchId
5. WaitingRoom → subscribeToMatch()
6. Aguarda player2_id ser preenchido
7. Quando player2 entra → status: 'in_progress'
8. Redireciona para /game/:matchId
```

### Fluxo de Jogada

```
1. GamePage → handleCellClick(index)
2. Validação local (turno, célula vazia)
3. Atualização otimista do estado local
4. Supabase → UPDATE matches (board_state, current_turn)
5. Supabase → INSERT moves (histórico)
6. Verifica vitória/empate
7. Se terminou → UPDATE matches (status: 'finished', winner_id)
8. updateStats() → UPDATE user_profiles (ambos jogadores)
9. Realtime notifica oponente
10. Ambos redirecionam para /result/:matchId
```

### Fluxo de Sincronização em Tempo Real

```
1. GamePage monta → subscribeToMatch()
2. Cria canal Realtime: 'match:{matchId}'
3. Escuta eventos UPDATE na tabela matches
4. Quando recebe update:
   - Atualiza estado local (board_state, current_turn)
   - Se status mudou para 'finished' → atualiza estatísticas
   - Redireciona para resultado se necessário
5. Fallback: Polling a cada 5 segundos se Realtime falhar
```

---

## 🗄️ Banco de Dados

### Schema do Banco

#### Tabela: `user_profiles`

Armazena perfis e estatísticas dos usuários.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos:**
- `id`: UUID do usuário (FK para auth.users)
- `email`: Email do usuário
- `name`: Nome do usuário (opcional)
- `wins`: Número de vitórias
- `draws`: Número de empates
- `losses`: Número de derrotas

#### Tabela: `matches`

Armazena partidas do jogo.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES user_profiles(id),
  player2_id UUID REFERENCES user_profiles(id),
  current_turn TEXT CHECK (current_turn IN ('player1', 'player2')),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'in_progress', 'finished')),
  board_state JSONB NOT NULL DEFAULT '[]',
  winner_id UUID REFERENCES user_profiles(id),
  is_private BOOLEAN DEFAULT false,
  code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos:**
- `id`: UUID único da partida
- `player1_id`: ID do primeiro jogador (criador)
- `player2_id`: ID do segundo jogador (null até entrar)
- `current_turn`: Turno atual ('player1' ou 'player2')
- `status`: Estado da partida ('waiting', 'in_progress', 'finished')
- `board_state`: Array JSON com estado do tabuleiro [null, 'X', 'O', ...]
- `winner_id`: ID do vencedor (null se empate)
- `is_private`: Se partida é privada (requer código)
- `code`: Código único para partidas privadas (6 caracteres)

**Estados da Partida:**
- `waiting`: Aguardando segundo jogador
- `in_progress`: Partida em andamento
- `finished`: Partida finalizada

#### Tabela: `moves`

Armazena histórico de movimentos.

```sql
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES user_profiles(id),
  position INTEGER NOT NULL CHECK (position >= 0 AND position <= 8),
  move_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Campos:**
- `id`: UUID único do movimento
- `match_id`: ID da partida
- `player_id`: ID do jogador que fez o movimento
- `position`: Posição no tabuleiro (0-8)
- `move_number`: Número sequencial do movimento (1, 2, 3...)

### Relacionamentos

```
user_profiles (1) ──< (N) matches (player1_id)
user_profiles (1) ──< (N) matches (player2_id)
user_profiles (1) ──< (N) matches (winner_id)
matches (1) ──< (N) moves
```

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado:

- **user_profiles**: Usuários podem SELECT todos, UPDATE apenas próprio perfil
- **matches**: Usuários autenticados podem SELECT, INSERT, UPDATE, DELETE todas as partidas
- **moves**: Usuários autenticados podem SELECT, INSERT, UPDATE, DELETE todos os movimentos

---

## 🔐 Autenticação e Segurança

### Autenticação via Supabase Auth

- **Método**: Email e senha
- **Sessão**: JWT token armazenado no localStorage
- **Validação**: Verificação de sessão em cada rota protegida
- **Logout**: Limpeza de token e redirecionamento

### Proteção de Rotas

```typescript
// App.tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};
```

### Variáveis de Ambiente

- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave anônima (pública, segura para cliente)

**Nota**: A chave anônima é segura para expor no cliente porque:
- Funciona junto com RLS (Row Level Security)
- Não permite acesso direto aos dados sem autenticação
- É a prática recomendada pelo Supabase

---

## 🔄 Realtime e Sincronização

### Supabase Realtime

A aplicação utiliza Supabase Realtime para sincronização em tempo real entre jogadores.

#### Configuração

```typescript
const channel = supabase
  .channel(`match:${matchId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'matches',
    filter: `id=eq.${matchId}`
  }, (payload) => {
    // Processa atualização
  })
  .subscribe();
```

#### Eventos Monitorados

1. **UPDATE em matches**: Quando partida é atualizada
   - Mudança de turno
   - Nova jogada no tabuleiro
   - Partida finalizada
   - Segundo jogador entrando

#### Fallback de Polling

Se Realtime falhar ou estiver lento:
- Polling a cada 5 segundos
- Verifica se houve atualização via Realtime nos últimos 4 segundos
- Se não houve, faz requisição manual

#### Otimização de UI

- **Atualização Otimista**: UI atualiza imediatamente antes da confirmação do servidor
- **Prevenção de Duplicação**: Flag `statsUpdatedRef` previne atualizações duplicadas de estatísticas
- **Verificação de Montagem**: Verifica se componente ainda está montado antes de atualizar estado

---

## 🧩 Componentes Principais

### GameBoard

Componente reutilizável do tabuleiro 3x3.

**Props:**
- `board`: Array de 9 elementos (string | null)
- `onCellClick`: Função callback ao clicar em célula
- `disabled`: Se tabuleiro está desabilitado

**Funcionalidades:**
- Renderiza grade 3x3
- Exibe símbolos X e O
- Indica células vazias
- Desabilita cliques quando necessário

### LoginPage / SignUpPage

Páginas de autenticação.

**Funcionalidades:**
- Validação de formulário
- Integração com Supabase Auth
- Tratamento de erros
- Redirecionamento após sucesso

### LobbyPage

Página principal após login.

**Funcionalidades:**
- Exibe estatísticas do jogador
- Criação de partida pública
- Criação de partida privada
- Busca de partida aleatória
- Entrada por código

### WaitingRoom

Sala de espera para partida.

**Funcionalidades:**
- Exibe código da partida (se privada)
- Aguarda segundo jogador
- Atualização em tempo real
- Opção de cancelar

### GamePage

Página principal do jogo.

**Funcionalidades:**
- Renderiza tabuleiro
- Gerencia turnos
- Processa jogadas
- Detecta vitória/empate
- Atualiza estatísticas
- Sincronização em tempo real
- Opção de sair da partida

**Estados:**
- `match`: Estado atual da partida
- `currentUserId`: ID do jogador atual
- `makingMove`: Flag de processamento
- `statsUpdatedRef`: Flag de estatísticas atualizadas

### ResultPage

Página de resultado da partida.

**Funcionalidades:**
- Exibe resultado (vitória/derrota/empate)
- Mostra tabuleiro final
- Opções de navegação

---

## 🔄 Estados e Ciclo de Vida

### Estados da Partida

1. **waiting**: Partida criada, aguardando segundo jogador
2. **in_progress**: Dois jogadores, partida em andamento
3. **finished**: Partida finalizada (vitória, empate ou abandono)

### Ciclo de Vida de uma Partida

```
1. Criação (waiting)
   ↓
2. Segundo jogador entra (in_progress)
   ↓
3. Jogadas alternadas
   ↓
4. Vitória/Empate/Abandono (finished)
   ↓
5. Atualização de estatísticas
   ↓
6. Redirecionamento para resultado
```

### Estados do Componente GamePage

```typescript
const [match, setMatch] = useState<Match | null>(null);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [loading, setLoading] = useState(true);
const [makingMove, setMakingMove] = useState(false);
const statsUpdatedRef = useRef<boolean>(false);
```

**Ciclo de Vida:**
1. **Mount**: Carrega partida, configura Realtime
2. **Update**: Processa jogadas, atualiza estado
3. **Unmount**: Limpa subscriptions, cancela polling

---

## ⚠️ Tratamento de Erros

### Erros de Autenticação

- Sessão expirada → Redireciona para login
- Credenciais inválidas → Exibe mensagem de erro
- Usuário não encontrado → Exibe mensagem de erro

### Erros de Partida

- Partida não encontrada → Redireciona para lobby
- Partida já finalizada → Redireciona para resultado
- Erro ao fazer jogada → Reverte atualização otimista

### Erros de Realtime

- Falha na conexão → Fallback para polling
- Timeout → Polling manual
- Erro de sincronização → Recarrega estado do banco

### Erros de Estatísticas

- Falha ao atualizar → Reset de flag, permite nova tentativa
- Duplicação detectada → Flag previne atualização duplicada
- Erro de permissão → Log de erro, não bloqueia jogo

---

## 🚀 Deploy e Produção

### Deploy na Vercel

A aplicação está configurada para deploy na Vercel.

#### Configuração Automática

- **Framework**: Vite (detectado automaticamente)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18+

#### Variáveis de Ambiente

Configure no Dashboard da Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### URLs de Produção

- **🎮 Jogo Publicado**: [https://jogo-da-velha-multiplayer-jxwyqews6-igors-projects-93173a7d.vercel.app](https://jogo-da-velha-multiplayer-jxwyqews6-igors-projects-93173a7d.vercel.app)
- **💻 Codespace**: [https://supreme-goldfish-ppg79qrgrq6h94p.github.dev/](https://supreme-goldfish-ppg79qrgrq6h94p.github.dev/)
- **📦 Repositório**: [https://github.com/IgorAraujoV/jogo-da-velha-multiplayer](https://github.com/IgorAraujoV/jogo-da-velha-multiplayer)

### Build Local

```bash
npm run build
```

Gera arquivos otimizados em `dist/`:
- HTML minificado
- CSS otimizado
- JavaScript bundle otimizado e minificado

### Otimizações de Produção

- Code splitting automático (Vite)
- Tree shaking
- Minificação
- Gzip compression (Vercel)

---

## 📝 Notas de Desenvolvimento

### Decisões de Design

1. **Atualização Otimista**: Melhora UX, atualiza UI imediatamente
2. **Polling como Fallback**: Garante sincronização mesmo se Realtime falhar
3. **Flag de Estatísticas**: Previne atualizações duplicadas
4. **Código de Partida**: 6 caracteres alfanuméricos para partidas privadas
5. **RLS Simplificado**: Políticas amplas para facilitar desenvolvimento

### Melhorias Futuras

- [ ] Sistema de ranking/elo
- [ ] Histórico de partidas
- [ ] Chat entre jogadores
- [ ] Tempo limite por jogada
- [ ] Modo torneio
- [ ] Estatísticas avançadas
- [ ] Notificações push
- [ ] Modo offline com sincronização

---

## 📚 Referências

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação React](https://react.dev)
- [Documentação Vite](https://vitejs.dev)
- [Documentação Vercel](https://vercel.com/docs)

---

**Desenvolvido como parte do curso de Software em Nuvem da Unifor**




