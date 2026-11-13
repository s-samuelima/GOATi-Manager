# Atualizar do GOATi Manager 1.0/1.1 para 1.2

## O que mudou
- A Central de Ajuda foi refeita, com categorias, pesquisa, tutoriais destacados, guias rápidos e o bodezinho de óculos e polo.
- O logo do sistema utiliza uma silhueta de bode; o mascote aparece somente nos guias e tutoriais.
- O erro `Cannot read properties of undefined (reading 'filter')` foi tratado para registros antigos e resultados de API ausentes.
- O cache PWA foi versionado para `goati-v1.2.0`.

## Atualização local no Windows
1. **Feche a janela preta** do Node.js da versão anterior antes de abrir o novo projeto. Evita conflito na porta 4173.
2. **Guarde uma cópia** da pasta atual e de qualquer exportação de dados importante. O modo de demonstração salva dados no navegador, não no ZIP.
3. Extraia a pasta nova `GOATi_Manager_v1_2` em seu computador.
4. Execute `INICIAR_WINDOWS.bat` ou, dentro da pasta, `npm start`.
5. Abra `http://localhost:4173` no Chrome ou Edge, no mesmo navegador em que você já utilizava o sistema.
6. Recarregue a página com `Ctrl + Shift + R` se a versão antiga ainda estiver visível; caso tenha instalado a PWA, feche e reabra depois da atualização.
7. Teste `Central de ajuda` > escolha uma categoria > abra um tutorial > use a pesquisa. Depois confirme se os módulos `Chamados` e `Inventário` continuam mostrando os seus dados.

## Atenção aos dados
Os nomes internos da base IndexedDB (`goat-ti-manager-v1`) e das chaves locais foram mantidos para reduzir riscos de perda de dados na mesma origem `localhost:4173`. Mudar a porta, domínio, perfil do navegador ou abrir o HTML diretamente pode exibir outro armazenamento. **A demonstração não é um banco corporativo e não sincroniza os dados entre computadores.**

## Desenvolvimento
- `npm test`: testes automatizados de dados e da tela de ajuda.
- `npm run build:demo`: reconstroi o HTML autônomo da demonstração depois de alterar o código ou o CSS.
- `npm start`: executa o aplicativo no servidor local.

## Produção
A integração Supabase e a publicação HTTPS ainda exigem configuração e validação de segurança antes de serem utilizadas por funcionários de uma organização.
