/* ============================================================
   TicketAM – Painel Admin
   Arquivo: admin/admin.js
   ============================================================ */

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('tela-login').style.display  = 'none';
    document.getElementById('tela-admin').style.display  = 'block';
    document.getElementById('admin-email').textContent   = user.email;
    carregarEventos();
  } else {
    document.getElementById('tela-login').style.display  = 'flex';
    document.getElementById('tela-admin').style.display  = 'none';
  }
});

function login() {
  const email = document.getElementById('login-email').value.trim();
  const senha  = document.getElementById('login-senha').value;
  const erro   = document.getElementById('login-erro');
  erro.textContent = '';
  auth.signInWithEmailAndPassword(email, senha)
    .catch(() => { erro.textContent = 'E-mail ou senha incorretos.'; });
}
function logout() { auth.signOut(); }

function formatarPreco(v) {
  if (v === 0) return 'Gratuito';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function tsParaInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 16);
}
function inputParaTs(str) {
  return firebase.firestore.Timestamp.fromDate(new Date(str));
}

let editandoId = null;
let opcoes     = [{ tipo: '', preco: 0, desc: '' }];

function novaOpcao() {
  opcoes.push({ tipo: '', preco: 0, desc: '' });
  renderOpcoes();
}
function removerOpcao(i) {
  opcoes.splice(i, 1);
  renderOpcoes();
}
function renderOpcoes() {
  const cont = document.getElementById('opcoes-lista');
  cont.innerHTML = opcoes.map((op, i) => `
    <div class="opcao-row">
      <input type="text"   placeholder="Tipo (ex: Pista)"   value="${op.tipo}"        oninput="opcoes[${i}].tipo=this.value" />
      <input type="number" placeholder="Preço (0 = grátis)" value="${op.preco ?? ''}" min="0" step="0.01"
             oninput="opcoes[${i}].preco=parseFloat(this.value)||0" />
      <input type="text"   placeholder="Descrição opcional" value="${op.desc}"        oninput="opcoes[${i}].desc=this.value" />
      <button class="btn-remover" onclick="removerOpcao(${i})" title="Remover">×</button>
    </div>
  `).join('');
}

function togglePublico() {
  const pub  = document.getElementById('f-publico').checked;
  const wrap = document.getElementById('vagas-wrap');
  wrap.style.opacity       = pub ? '0.4' : '1';
  wrap.style.pointerEvents = pub ? 'none' : 'auto';
  if (pub) document.getElementById('f-vagas').value = '';
}

function carregarEventos() {
  db.collection('eventos')
    .orderBy('dataInicio', 'desc')
    .onSnapshot(snap => {
      const lista = document.getElementById('lista-eventos');
      if (snap.empty) {
        lista.innerHTML = '<p style="color:var(--cinza-texto);padding:1rem">Nenhum evento cadastrado.</p>';
        return;
      }
      lista.innerHTML = '';
      snap.forEach(doc => {
        const ev  = doc.data();
        const ini = ev.dataInicio?.toDate ? ev.dataInicio.toDate() : new Date();
        const fim = ev.dataFim?.toDate    ? ev.dataFim.toDate()    : new Date();
        const now = new Date();
        const statusTxt = now < ini ? '🟡 Em breve' : now <= fim ? '🔴 Ao vivo' : '⚫ Encerrado';
        const precos    = (ev.opcoes || []).map(o => o.preco === 0 ? 'Grátis' : formatarPreco(o.preco)).join(' · ');
        const vagasTxt  = ev.publico ? 'Público (ilimitado)' : `Vagas: ${ev.vagasRestantes ?? '?'} / ${ev.totalVagas ?? '?'}`;

        const row = document.createElement('div');
        row.className = 'ev-row';
        row.innerHTML = `
          <div class="ev-row-info">
            <span style="font-size:1.5rem">${ev.emoji || '🎵'}</span>
            <div>
              <strong>${ev.nome}</strong>
              <small>${statusTxt} &nbsp;·&nbsp; ${ev.local} &nbsp;·&nbsp; ${precos}</small>
              <small>${vagasTxt}</small>
              ${ev.descricao ? `<small style="color:var(--cinza-texto);font-style:italic">"${ev.descricao.substring(0,60)}${ev.descricao.length > 60 ? '...' : ''}"</small>` : ''}
            </div>
          </div>
          <div class="ev-row-acoes">
            <button class="btn-editar"  onclick="abrirEdicao('${doc.id}')">Editar</button>
            <button class="btn-excluir" onclick="excluirEvento('${doc.id}','${ev.nome.replace(/'/g,"\\'")}')">Excluir</button>
          </div>`;
        lista.appendChild(row);
      });
    });
}

function abrirFormulario() {
  editandoId = null;
  opcoes     = [{ tipo: '', preco: 0, desc: '' }];
  document.getElementById('form-titulo').textContent = 'Novo evento';
  document.getElementById('form-evento').reset();
  document.getElementById('f-publico').checked = false;
  document.getElementById('f-descricao').value  = '';
  togglePublico();
  renderOpcoes();
  document.getElementById('modal-form').style.display = 'flex';
}

function abrirEdicao(id) {
  db.collection('eventos').doc(id).get().then(doc => {
    if (!doc.exists) return;
    const ev = doc.data();
    editandoId = id;
    opcoes     = JSON.parse(JSON.stringify(ev.opcoes || []));

    document.getElementById('form-titulo').textContent   = 'Editar evento';
    document.getElementById('f-nome').value              = ev.nome           || '';
    document.getElementById('f-local').value             = ev.local          || '';
    document.getElementById('f-emoji').value             = ev.emoji          || '';
    document.getElementById('f-cor').value               = ev.corBg          || '';
    document.getElementById('f-categoria').value         = ev.categoria      || 'shows';
    document.getElementById('f-catLabel').value          = ev.categoriaLabel || '';
    document.getElementById('f-class').value             = ev.classificacao  || 'Livre';
    document.getElementById('f-vagas').value             = ev.totalVagas     || '';
    document.getElementById('f-inicio').value            = tsParaInput(ev.dataInicio);
    document.getElementById('f-fim').value               = tsParaInput(ev.dataFim);
    document.getElementById('f-publico').checked         = ev.publico        || false;
    document.getElementById('f-descricao').value         = ev.descricao      || '';
    togglePublico();
    renderOpcoes();
    document.getElementById('modal-form').style.display = 'flex';
  });
}

function fecharFormulario() {
  document.getElementById('modal-form').style.display = 'none';
}

function salvarEvento() {
  const nome      = document.getElementById('f-nome').value.trim();
  const local     = document.getElementById('f-local').value.trim();
  const emoji     = document.getElementById('f-emoji').value.trim()   || '🎵';
  const corBg     = document.getElementById('f-cor').value.trim()     || 'linear-gradient(135deg,#1a1a2e,#16213e)';
  const categoria = document.getElementById('f-categoria').value;
  const catLabel  = document.getElementById('f-catLabel').value.trim() || categoria;
  const classif   = document.getElementById('f-class').value.trim()   || 'Livre';
  const publico   = document.getElementById('f-publico').checked;
  const vagasVal  = parseInt(document.getElementById('f-vagas').value);
  const vagas     = publico ? null : (isNaN(vagasVal) ? 100 : vagasVal);
  const inicio    = document.getElementById('f-inicio').value;
  const fim       = document.getElementById('f-fim').value;
  const descricao = document.getElementById('f-descricao').value.trim();
  const msgEl     = document.getElementById('form-msg');

  if (!nome || !local || !inicio || !fim) {
    msgEl.textContent = '⚠️ Preencha nome, local, início e fim.'; return;
  }
  if (opcoes.length === 0 || opcoes.some(o => !o.tipo)) {
    msgEl.textContent = '⚠️ Adicione ao menos 1 tipo de ingresso com nome.'; return;
  }
  if (opcoes.some(o => o.preco < 0)) {
    msgEl.textContent = '⚠️ O preço não pode ser negativo.'; return;
  }

  msgEl.textContent = 'Salvando…';

  const dados = {
    nome, local, emoji, corBg, categoria,
    categoriaLabel: catLabel,
    classificacao:  classif,
    descricao:      descricao,
    publico:        publico,
    totalVagas:     vagas,
    /* Limpa coordenadas antigas se o local mudou */
    lat: firebase.firestore.FieldValue.delete(),
    lng: firebase.firestore.FieldValue.delete(),
    dataInicio:   inputParaTs(inicio),
    dataFim:      inputParaTs(fim),
    opcoes: opcoes.map(o => ({ tipo: o.tipo, preco: Number(o.preco) || 0, desc: o.desc || '' })),
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (editandoId) {
    db.collection('eventos').doc(editandoId).update(dados)
      .then(() => { msgEl.textContent = '✅ Evento atualizado!'; setTimeout(fecharFormulario, 1200); })
      .catch(e  => { msgEl.textContent = '❌ Erro: ' + e.message; });
  } else {
    dados.vagasRestantes = vagas;
    dados.criadoEm       = firebase.firestore.FieldValue.serverTimestamp();
    delete dados.lat; delete dados.lng;
    db.collection('eventos').add(dados)
      .then(() => { msgEl.textContent = '✅ Evento criado!'; setTimeout(fecharFormulario, 1200); })
      .catch(e  => { msgEl.textContent = '❌ Erro: ' + e.message; });
  }
}

function excluirEvento(id, nome) {
  if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
  db.collection('eventos').doc(id).delete()
    .catch(e => alert('Erro ao excluir: ' + e.message));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-senha')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  renderOpcoes();
});
