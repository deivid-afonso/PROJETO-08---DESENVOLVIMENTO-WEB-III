import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk.toString()));
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function serveStaticFile(response, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('404 - Página Não Encontrada');
    }
    const ext = path.extname(file).toLowerCase();
    response.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream'
    });
    response.end(data);
  });
}

async function callback(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const method = request.method;

  // ==========================================================================
  // 1. ENDPOINTS REST: /api/fornecedores
  // ==========================================================================
  if (pathname.startsWith('/api/fornecedores')) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    const id = url.searchParams.get('id') || pathname.split('/')[3] || null;

    if (method === 'POST') {
      try {
        const data = await getRequestBody(request);
        if (!data.cnpj || !data.razao_social) {
          return response
            .writeHead(400)
            .end(JSON.stringify({ error: 'CNPJ e Razão Social são obrigatórios.' }));
        }
        const sql = `
          INSERT INTO fornecedores (cnpj, razao_social, nome_fantasia, telefone, email, cidade, uf)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(
          sql,
          [
            data.cnpj,
            data.razao_social,
            data.nome_fantasia || '',
            data.telefone || '',
            data.email || '',
            data.cidade || '',
            data.uf || ''
          ],
          function (err) {
            if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
            response
              .writeHead(201)
              .end(JSON.stringify({ id: this.lastID, message: 'Fornecedor cadastrado com sucesso!' }));
          }
        );
      } catch (err) {
        response.writeHead(400).end(JSON.stringify({ error: 'Payload inválido.' }));
      }
      return;
    }

    if (method === 'GET') {
      if (id) {
        db.get('SELECT * FROM fornecedores WHERE id = ?', [id], (err, row) => {
          if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
          response.writeHead(200).end(JSON.stringify(row || {}));
        });
      } else {
        db.all('SELECT * FROM fornecedores ORDER BY razao_social ASC', [], (err, rows) => {
          if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
          response.writeHead(200).end(JSON.stringify(rows));
        });
      }
      return;
    }

    if (method === 'PUT' && id) {
      try {
        const data = await getRequestBody(request);
        const sql = `
          UPDATE fornecedores
          SET cnpj = ?, razao_social = ?, nome_fantasia = ?, telefone = ?, email = ?, cidade = ?, uf = ?
          WHERE id = ?
        `;
        db.run(
          sql,
          [
            data.cnpj,
            data.razao_social,
            data.nome_fantasia || '',
            data.telefone || '',
            data.email || '',
            data.cidade || '',
            data.uf || '',
            id
          ],
          function (err) {
            if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
            response.writeHead(200).end(JSON.stringify({ message: 'Fornecedor atualizado com sucesso!' }));
          }
        );
      } catch (err) {
        response.writeHead(400).end(JSON.stringify({ error: 'Payload inválido.' }));
      }
      return;
    }

    if (method === 'DELETE' && id) {
      db.get('SELECT COUNT(*) AS total FROM produtos WHERE fornecedor_id = ?', [id], (err, row) => {
        if (row && row.total > 0) {
          return response.writeHead(400).end(
            JSON.stringify({
              error: 'Não é possível excluir um fornecedor que possui produtos vinculados.'
            })
          );
        }
        db.run('DELETE FROM fornecedores WHERE id = ?', [id], function (delErr) {
          if (delErr) return response.writeHead(500).end(JSON.stringify({ error: delErr.message }));
          response.writeHead(200).end(JSON.stringify({ message: 'Fornecedor removido com sucesso!' }));
        });
      });
      return;
    }
  }

  // ==========================================================================
  // 2. ENDPOINTS REST: /api/produtos
  // ==========================================================================
  if (pathname.startsWith('/api/produtos')) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    const id = url.searchParams.get('id') || pathname.split('/')[3] || null;

    if (method === 'POST') {
      try {
        const data = await getRequestBody(request);
        if (!data.nome || data.quantidade === undefined || data.preco_unitario === undefined) {
          return response
            .writeHead(400)
            .end(JSON.stringify({ error: 'Nome, quantidade e preço unitário são obrigatórios.' }));
        }
        const sql = `
          INSERT INTO produtos (nome, categoria, quantidade, preco_unitario, fornecedor_id)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.run(
          sql,
          [
            data.nome.trim(),
            data.categoria || 'Geral',
            Number(data.quantidade),
            Number(data.preco_unitario),
            data.fornecedor_id ? Number(data.fornecedor_id) : null
          ],
          function (err) {
            if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
            response
              .writeHead(201)
              .end(JSON.stringify({ id: this.lastID, message: 'Produto cadastrado com sucesso!' }));
          }
        );
      } catch (err) {
        response.writeHead(400).end(JSON.stringify({ error: 'Payload inválido.' }));
      }
      return;
    }

    if (method === 'GET') {
      if (id) {
        db.get('SELECT * FROM produtos WHERE id = ?', [id], (err, row) => {
          if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
          response.writeHead(200).end(JSON.stringify(row || {}));
        });
      } else {
        const sql = `
          SELECT p.*, f.razao_social AS fornecedor_nome, f.cnpj AS fornecedor_cnpj
          FROM produtos p
          LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
          ORDER BY p.id DESC
        `;
        db.all(sql, [], (err, rows) => {
          if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
          response.writeHead(200).end(JSON.stringify(rows));
        });
      }
      return;
    }

    if (method === 'PUT' && id) {
      try {
        const data = await getRequestBody(request);
        const sql = `
          UPDATE produtos
          SET nome = ?, categoria = ?, quantidade = ?, preco_unitario = ?, fornecedor_id = ?
          WHERE id = ?
        `;
        db.run(
          sql,
          [
            data.nome.trim(),
            data.categoria || 'Geral',
            Number(data.quantidade),
            Number(data.preco_unitario),
            data.fornecedor_id ? Number(data.fornecedor_id) : null,
            id
          ],
          function (err) {
            if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
            response.writeHead(200).end(JSON.stringify({ message: 'Produto atualizado com sucesso!' }));
          }
        );
      } catch (err) {
        response.writeHead(400).end(JSON.stringify({ error: 'Payload inválido.' }));
      }
      return;
    }

    if (method === 'DELETE' && id) {
      db.run('DELETE FROM produtos WHERE id = ?', [id], function (err) {
        if (err) return response.writeHead(500).end(JSON.stringify({ error: err.message }));
        response.writeHead(200).end(JSON.stringify({ message: 'Produto removido com sucesso!' }));
      });
      return;
    }
  }

  const file = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(publicDir)) {
    response.writeHead(403).end('Proibido');
    return;
  }

  serveStaticFile(response, file);
}

const server = http.createServer(callback);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sistema de Controle de Estoque (Projeto 08 - DWIII) iniciado em http://localhost:${PORT}/`);
});
