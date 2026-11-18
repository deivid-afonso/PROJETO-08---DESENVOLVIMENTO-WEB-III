# PROJETO 08 – DESENVOLVIMENTO WEB III (SISTEMA DE CONTROLE DE ESTOQUE – CRUD + API)

Aplicação Web desenvolvida em **Node.js, NPM, HTML, CSS e JavaScript (sem frameworks)** com persistência em **SQLite** e integração com a **BrasilAPI (Consulta de CNPJ)** (FATEC Diadema — DSM 3º Semestre, Prof. Vinicius Heltai Pacheco).

---

## 🎯 Funcionalidades

- **CRUD Completo de Fornecedores (`/api/fornecedores`)**:
  - Auto-preenchimento de Razão Social, Nome Fantasia, Telefone, E-mail e Município/UF a partir do CNPJ via **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`).
  - Proteção de integridade: impede exclusão de fornecedor com produtos vinculados.
- **CRUD Completo de Produtos (`/api/produtos`)**:
  - Vínculo com fornecedor (`fornecedor_id`), quantidade em estoque e preço unitário.
  - **Monitoramento de Estoque**: destaque visual automático para itens com estoque baixo (`< 5` unidades) e cálculo em tempo real do **Valor Total em Estoque**.

---

## 🚀 Como Executar

```bash
npm start
# Acesse http://localhost:3000 no navegador
```
