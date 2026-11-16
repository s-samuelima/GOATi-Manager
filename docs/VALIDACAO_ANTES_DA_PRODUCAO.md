# Lista de verificação — homologação do GOATi Manager

- [ ] Aplicação hospedada sob HTTPS em domínio próprio, independente de outros projetos
- [ ] Supabase próprio com projeto de produção e backups configurados
- [ ] `schema.sql` aplicado sem falhas e políticas RLS revisadas
- [ ] Cadastro, confirmação de e-mail, aprovação e bloqueio testados
- [ ] Recuperação de senha testada até entrar com senha nova
- [ ] Funcionário não consegue ler chamados de terceiros nem escrever inventário
- [ ] Perfil de gestão lê relatórios, mas não altera patrimônios ou chamados
- [ ] Admin recebe novo chamado enquanto app está aberto (somente com permissão)
- [ ] Chamado criado offline enviado apenas uma vez quando conexão retorna
- [ ] Dados pendentes de contas diferentes não se misturam no mesmo computador
- [ ] Importação CSV das abas Equipamentos, Celulares e Cabos validada
- [ ] Histórico de movimentação atualiza localização e responsável
- [ ] PDFs de chamados diários/semanais/mensais com período correto
- [ ] PDFs do inventário, movimentações e manutenções validados
- [ ] Avaliação de resolução negativa reabre chamado no banco
- [ ] Teste de interface no Chrome e Edge, Windows 10 e Windows 11
- [ ] Plano de suporte, comunicação de incidentes e retenção de dados definidos
- [ ] Licenças de serviços, autenticação e SMTP revisadas
- [ ] Testes de desempenho com volume de atendimentos aproximado ao da organização
- [ ] App publicado somente depois da autorização formal da empresa

## ITAM / Patrimonio GL (v1.4.0)
- [ ] Aplicar a migracao incremental em homologacao (com backup anterior) e comparar totais / FKs
- [ ] Testar dois cadastros simultaneos e ausencia de duplicidade de GL
- [ ] Testar que baixa nao remove registro nem reutiliza GL
- [ ] Conferir RLS para TI autorizado, TI sem direito, gestao, funcionario, pendente e bloqueado
- [ ] Escanear QR no celular com login e confirmar redirecionamento ao patrimonio
- [ ] Escanear QR com usuario sem permissao e validar bloqueio na API
- [ ] Imprimir PDF em 100% em tres tamanhos, testar leitura do QR
- [ ] Importar CSV com dados invalidos e confirmar atomicidade
- [ ] Associar chamado a equipamento e conferir historico visivel por perfil
- [ ] Conferir registros legados e tags antigas apos migracao
