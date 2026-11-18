function mostrarMsg(el, texto, ok = true) {
  el.style.display = 'block';
  el.style.background = ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
  el.textContent = texto;
}

// Integração BrasilAPI CNPJ (https://brasilapi.com.br/api/cnpj/v1/{cnpj})
document.getElementById('cnpj').addEventListener('blur', async (e) => {
  const cnpj = e.target.value.replace(/\D/g, '');
  if (cnpj.length !== 14) return;
  const msgEl = document.getElementById('msgFornecedor');
  mostrarMsg(msgEl, 'Consultando CNPJ na BrasilAPI...', true);

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) throw new Error('CNPJ não encontrado na BrasilAPI.');
    const d = await res.json();
    document.getElementById('razao_social').value = d.razao_social || '';
    document.getElementById('nome_fantasia').value = d.nome_fantasia || d.razao_social || '';
    document.getElementById('telefone').value = d.ddd_telefone_1 || '';
    document.getElementById('email').value = d.email || '';
    document.getElementById('cidade_uf').value = `${d.municipio || ''}/${d.uf || ''}`;
    mostrarMsg(msgEl, `Dados do CNPJ ${cnpj} preenchidos automaticamente via BrasilAPI!`, true);
  } catch (err) {
    mostrarMsg(msgEl, 'Não foi possível auto-preencher via BrasilAPI. Preencha manualmente.', false);
  }
});

async function carregarFornecedores() {
  const res = await fetch('/api/fornecedores');
  const fornecedores = await res.json();
  const tbody = document.getElementById('tabelaFornecedores');
  const select = document.getElementById('fornecedorProduto');

  tbody.innerHTML = fornecedores
    .map(
      (f) => `
    <tr>
      <td>#${f.id}</td>
      <td>${f.cnpj}</td>
      <td><strong>${f.razao_social}</strong></td>
      <td>${f.nome_fantasia || '-'}</td>
      <td>${f.cidade || ''}/${f.uf || ''}</td>
      <td>
        <button class="btn btn-del" onclick="excluirFornecedor(${f.id})">Excluir</button>
      </td>
    </tr>
  `
    )
    .join('');

  select.innerHTML =
    '<option value="">-- Selecione um Fornecedor --</option>' +
    fornecedores.map((f) => `<option value="${f.id}">${f.razao_social} (${f.cnpj})</option>`).join('');
}

document.getElementById('formFornecedor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const [cidade = '', uf = ''] = document.getElementById('cidade_uf').value.split('/');
  const payload = {
    cnpj: document.getElementById('cnpj').value.trim(),
    razao_social: document.getElementById('razao_social').value.trim(),
    nome_fantasia: document.getElementById('nome_fantasia').value.trim(),
    telefone: document.getElementById('telefone').value.trim(),
    email: document.getElementById('email').value.trim(),
    cidade: cidade.trim(),
    uf: uf.trim()
  };

  const res = await fetch('/api/fornecedores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  mostrarMsg(document.getElementById('msgFornecedor'), data.message || data.error, res.ok);
  if (res.ok) {
    e.target.reset();
    carregarFornecedores();
  }
});

window.excluirFornecedor = async function (id) {
  if (!confirm('Confirma a exclusão deste fornecedor?')) return;
  const res = await fetch(`/api/fornecedores?id=${id}`, { method: 'DELETE' });
  const data = await res.json();
  mostrarMsg(document.getElementById('msgFornecedor'), data.message || data.error, res.ok);
  carregarFornecedores();
};

async function carregarProdutos() {
  const res = await fetch('/api/produtos');
  const produtos = await res.json();
  const tbody = document.getElementById('tabelaProdutos');

  let valorTotal = 0;
  let estoqueBaixoCount = 0;

  tbody.innerHTML = produtos
    .map((p) => {
      const subtotal = Number(p.quantidade) * Number(p.preco_unitario);
      valorTotal += subtotal;
      const isBaixo = Number(p.quantidade) < 5;
      if (isBaixo) estoqueBaixoCount++;

      return `
      <tr class="${isBaixo ? 'low-stock' : ''}">
        <td>#${p.id}</td>
        <td><strong>${p.nome}</strong></td>
        <td>${p.categoria || '-'}</td>
        <td>${p.fornecedor_nome || 'Sem vínculo'}</td>
        <td><strong>${p.quantidade}</strong></td>
        <td>R$ ${Number(p.preco_unitario).toFixed(2)}</td>
        <td>R$ ${subtotal.toFixed(2)}</td>
        <td>
          ${
            isBaixo
              ? '<span class="badge-low">ESTOQUE BAIXO (&lt; 5)</span>'
              : '<span class="badge-ok">NORMAL</span>'
          }
        </td>
        <td>
          <button class="btn btn-edit" onclick="editarProduto(${p.id})">Editar</button>
          <button class="btn btn-del" onclick="excluirProduto(${p.id})">Excluir</button>
        </td>
      </tr>
    `;
    })
    .join('');

  document.getElementById('statTotalProdutos').textContent = produtos.length;
  document.getElementById('statEstoqueBaixo').textContent = estoqueBaixoCount;
  document.getElementById('statValorTotal').textContent = `R$ ${valorTotal.toFixed(2)}`;
}

document.getElementById('formProduto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('produtoId').value;
  const payload = {
    nome: document.getElementById('nomeProduto').value.trim(),
    categoria: document.getElementById('categoriaProduto').value.trim(),
    quantidade: Number(document.getElementById('quantidadeProduto').value),
    preco_unitario: Number(document.getElementById('precoProduto').value),
    fornecedor_id: document.getElementById('fornecedorProduto').value || null
  };

  const url = id ? `/api/produtos?id=${id}` : '/api/produtos';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  mostrarMsg(document.getElementById('msgProduto'), data.message || data.error, res.ok);
  if (res.ok) {
    e.target.reset();
    document.getElementById('produtoId').value = '';
    carregarProdutos();
  }
});

window.editarProduto = async function (id) {
  const res = await fetch(`/api/produtos?id=${id}`);
  const p = await res.json();
  document.getElementById('produtoId').value = p.id;
  document.getElementById('nomeProduto').value = p.nome;
  document.getElementById('categoriaProduto').value = p.categoria || '';
  document.getElementById('quantidadeProduto').value = p.quantidade;
  document.getElementById('precoProduto').value = p.preco_unitario;
  document.getElementById('fornecedorProduto').value = p.fornecedor_id || '';
};

window.excluirProduto = async function (id) {
  if (!confirm('Deseja realmente excluir este produto do estoque?')) return;
  await fetch(`/api/produtos?id=${id}`, { method: 'DELETE' });
  carregarProdutos();
};

carregarFornecedores();
carregarProdutos();
