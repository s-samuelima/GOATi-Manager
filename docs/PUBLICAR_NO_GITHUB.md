# Publicar o GOATi Manager no GitHub

## Criar repositório

1. Abra https://github.com/new e crie um repositório chamado `GOATi-Manager` na **sua conta pessoal**.
2. Escolha `Private` enquanto revisar código e RLS; torne `Public` quando desejar apresentar no portfólio.
3. Não marque as opções de criar README, `.gitignore` ou licença, pois estes arquivos já estão no projeto (uma licença não foi escolhida).
4. Abra um PowerShell **dentro da pasta `GOATi-Manager`** extraída e execute:

```powershell
npm test
git init -b main
git add .
git status --short
git check-ignore config.js
git commit -m "feat: publicar GOATi Manager v1.2.1"
git remote add origin https://github.com/SEU-USUARIO/GOATi-Manager.git
git push -u origin main
```

Substitua `SEU-USUARIO` pelo seu usuário GitHub.

Se você usar a pasta atual que já tem `.git`, **não rode `git init`**; confira `git remote -v` primeiro.

## Segurança

- `config.js`, `.env*`, arquivos de senhas e bancos locais não devem ser publicados.
- Este pacote GitHub-ready **não contém o `config.js` configurado**. O modelo `config.example.js` usa apenas valores ilustrativos.
- Nunca faça commit de chaves secretas, `service_role`, senhas, dados de colaboradores ou exportações reais.
- `git status --short` permite revisar o conteúdo antes do commit.
- URL/chave publishable do Supabase não substituem políticas RLS bem testadas.
- Abrir o repositório no GitHub **não hospeda** a aplicação; publicação web é outra etapa.
- Veja https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github.
