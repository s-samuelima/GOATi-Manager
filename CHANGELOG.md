# Changelog GOATi Manager

## 1.2.1 — Correção do envio de chamados e modal
- Corrigido erro `e is not defined` ao interagir com campos e botões no modal Novo chamado.
- A janela somente fecha quando o usuário clicar fora dela; cliques internos não causam notificações de erro.
- Mantida a configuração do Supabase, estrutura das tabelas e os registros já armazenados.
- Cache PWA atualizado para carregar o JavaScript corrigido.


## 1.2.0 — Central de Ajuda premium
- Logo principal redesenhada como silhueta branca de bode; mascote de óculos e polo reservado aos tutoriais.
- Central de Ajuda redesenhada: busca, filtros por categoria, guias em destaque, lista de tutoriais, ações rápidas e painel do mascote.
- Corrigido erro `Cannot read properties of undefined (reading 'filter')` com normalização de coleções locais e respostas da API.
- Navegação e pesquisa por teclado, incluindo Ctrl+K na Central de Ajuda.
- Melhoria visual nos temas claro e escuro, layout adaptado a celulares e tablets.
- Bump no cache PWA; dados existentes preservados mantendo a chave de IndexedDB.

## 1.1.0 — Base
- Renomeação GOATi, autenticação configurável, chamados, inventário, relatórios, tutoriais.
