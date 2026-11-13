## v1.3.2 — Avisos de novos cadastros pendentes

- Administradores veem a quantidade de contas pendentes no menu Usuários, no topo e em uma faixa de aviso persistente.
- Verificação de novos cadastros a cada 23 segundos enquanto a plataforma estiver aberta e online.
- Novo cadastro gera alerta interno com botão para abrir diretamente a análise; notificação do navegador opcional com clique.
- Contas pendentes aparecem primeiro na tabela Usuários, com botão Analisar cadastro.
- Não há aprovação automática, envio de dados sensíveis em notificações nem migração SQL adicional.
- Alertas de novos chamados e outras funcionalidades mantidos.

## v1.3.1 — Convite automático de avaliação

- Funcionários recebem um convite para avaliar chamados resolvidos ainda sem avaliação ao entrar no sistema.
- A tela inicial mostra lembrete permanente para chamados pendentes de avaliação, sem bloquear o uso.
- Modal de avaliação com notas visuais de 1 a 5 estrelas, confirmação de resolução e comentário opcional.
- O aviso aparece uma vez por chamado por sessão; o histórico e o acesso do administrador permanecem iguais.
- Mantidos o cronômetro por chamado, as linhas clicáveis e os relatórios da versão 1.3.0.

## v1.3.0 — Controle de tempo e melhorias na navegação

- Cronômetro por atendimento com início, pausa, retomada e finalização, salvo no Supabase.
- Linha inteira do chamado clicável e acessível por teclado, preservando seleção múltipla.
- Tempo nas telas e nos relatórios PDF; avaliações visíveis nos detalhes para administradores e Gestão.
- Migração SQL independente e proteção se o banco ainda não tiver sido atualizado.

## v1.2.4

- Exclusão individual e múltipla de chamados para administradores, com confirmação EXCLUIR.
- RLS e auditoria da exclusão; cascata de mensagens, eventos e avaliações.
- Migração SQL separada para banco existente, sem exclusão automática.

## v1.2.3 — Primeiro acesso simplificado

- Após login rejeitado por credenciais, opções Criar minha conta, Recuperar senha e Tentar novamente.
- E-mail preenchido previamente no cadastro e na recuperação; senhas nunca são reaproveitadas.
- Falhas de rede mantêm tratamento próprio, sem sugerir que a conta não existe.
- Mensagens de autenticação não revelam se um e-mail está cadastrado.
- Aprovação do administrador preservada; confirmação de e-mail segue a configuração do Supabase.
- Testes do novo fluxo e atualização do cache PWA.

## v1.2.2 — Preparação Vercel

- Build estático para Vercel em `dist/`; sem dados ou chaves secretas.
- Configuração pública Supabase gerada com variáveis de ambiente.
- Atualização de cache da PWA para manter a configuração atualizada.
- Guia de implantação, configuração de URLs do Supabase e testes de segurança.

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
