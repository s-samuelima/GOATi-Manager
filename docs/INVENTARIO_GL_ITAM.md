# GOATi Manager v1.4.0 — Inventário patrimonial com QR Code

## Aplicação segura da migração

1. Faça backup do projeto Supabase, incluindo tabelas `assets`, `tickets`, `asset_movements`, `asset_maintenance` e permissões.
2. Em uma cópia de homologação, abra SQL Editor e execute **somente** `supabase/migrations/20261116_inventory_gl_itam.sql`.
3. Confira quantidades de registros e FKs, incluindo `tickets.asset_id`, antes e depois.
4. Confirme tags GL únicas, registros antigos em `assets.legacy_tag` e a sequência `public.gl_asset_tag_seq`.
5. Valide a matriz de permissões com contas diferentes e sessão bloqueada.
6. Após aprovação da homologação, execute a mesma migração no projeto de produção. A Vercel não executa automaticamente scripts SQL.
7. Atualize o site com Ctrl+Shift+R e teste impressão em papel comum com escala 100% antes de utilizar etiquetas adesivas.

**Atenção:** a migração converte tags `GOAT-TI-...` anteriores para novas tags GL. Os identificadores anteriores ficam no banco, mas etiquetas antigas impressas deixam de ser o identificador principal. Planeje a conferência e reetiquetagem dos equipamentos existentes.

## Funcionamento

- Cadastro de patrimônio novo: campo de tag não é digitado; o trigger PostgreSQL gera `GL-000001`, `GL-000002` etc. O UUID interno permanece estável.
- Formulário patrimonial: setor, colaborador, localização, aquisição, garantia, conservação, série, status e conferência física.
- Ficha: mostra QR, responsáveis, histórico e chamados visíveis associados.
- QR: codifica somente `https://go-ati-manager.vercel.app/?patrimonio=GL-NNNNNN` (domínio baseado na implantação atual, não fixo no código). Se a pessoa estiver deslogada, será apresentada a tela de login e o destino será mantido. Após autenticação, a consulta só abre se tiver permissão RLS.
- Etiquetas: PDF A4 individual ou em lote; tamanhos 50×30, 60×30 e 70×40 mm. Imprimir em 100% (sem ajuste à página). A reimpressão não cria novo registro.
- Importação: suporta CSV com prévia, duplicidade de números de série e erros por linha. Linhas com múltiplas unidades são expandidas em etiquetas individuais. Se alguma linha é inválida, a importação completa é bloqueada. Até 500 unidades por importação, com inserção em uma transação por lote.
- Vínculo com chamado: somente administradores podem vincular qualquer chamado visível; um funcionário com permissão TI pode vincular apenas chamados próprios por RPC protegida. Gestão só consulta os vínculos já visíveis.
- Baixa patrimonial: mude o status para Baixado. A tag nunca é reaproveitada. Não se permite excluir a linha da tabela assets.

## Segurança e limitações conhecidas

- Perfis existentes: `admin`, `gestao` e `funcionario`. A permissão TI é o atributo `can_manage_inventory`, definido pelo administrador; **não** é concedida automaticamente pelo setor selecionado no cadastro.
- RLS obriga status `ativo`; o QR não oferece acesso sem autenticação nem contém IMEI/serial/nome do colaborador.
- Com a aplicação offline, o inventário online fica oculto, evitando reutilização de dados corporativos protegidos em sessões sem verificação de status.
- Lotes antigos com quantidade superior a um permanecem como um registro patrimonial até conferência. Para etiquetar cada unidade, deve-se planejar a divisão do lote sem perder rastreabilidade.
- O histórico de patrimônio começa com os novos eventos registrados depois da migração; os registros anteriores de movimentação/manutenção são mantidos nas tabelas originais.
- A versão ainda exige testes de integração Supabase com contas reais, concorrência, leitura de QR em celular, impressão e sincronização de chamadas antes de ser considerada homologada para produção.

## Matriz mínima de homologação

| Cenário | Resultado esperado |
|---|---|
| 2 cadastros simultâneos | GL diferentes, sem colisão |
| Nova etiqueta após baixa | Novo GL sem reciclar código |
| Funcionário sem direito de inventário | REST e interface negados |
| Setor TI sem direito concedido | REST e interface negados |
| TI autorizado | Ver/editar equipamentos, sem acessar chamados de terceiros |
| Gestão | Visualizar sem gravar |
| Usuário pendente/bloqueado | Inventário negado, inclusive token antigo |
| QR deslogado e login | Abre ficha depois da autenticação |
| QR sem permissão | Acesso negado, sem informações privadas |
| Impressão PDF | Escaneamento válido e medidas corretas em 100% |
| Reimpressão | Mesmo número e URL |
| Importação inválida | Erros por linha, zero cadastros parciais |
| Importação válida | Todos os GL gerados em única transação |
| Movimentação | Preserva responsável anterior e registra evento |
| Associação de chamado | Usa asset_id sem expor chamados não autorizados |
| Regressão | Login, chamados, avaliações, PDFs e notificações mantidos |
