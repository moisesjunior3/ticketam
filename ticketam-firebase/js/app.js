/* ============================================================
   TicketAM – Lógica principal do site público
   Arquivo: js/app.js
   Depende de: firebase-config.js
   ============================================================ */

/* ── Estado global ─────────────────────────────────────────── */
let eventoAtual = null;
let qtds        = [];

/* ── Utilitários ───────────────────────────────────────────── */
function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function agora() { return new Date(); }

function statusEvento(inicio, fim) {
  const now = agora();
  const s   = inicio?.toDate ? inicio.toDate() : new Date(inicio);
  const f   = fim?.toDate    ? fim.toDate()    : new Date(fim);
  if (now >= s && now <= f) return 'ao-vivo';
  if (now < s)              return 'em-breve';
  return 'encerrado';
}

/* ── Badge de status ───────────────────────────────────────── */
function badgeStatus(status) {
  const map = {
    'ao-vivo':  { label: '🔴 Ao vivo',  cls: 'badge-live'    },
    'em-breve': { label: '🟡 Em breve', cls: 'badge-breve'   },
    'encerrado':{ label: '⚫ Encerrado', cls: 'badge-encerrado'},
  };
  const b = map[status] || map['em-breve'];
  return `<span class="evento-status-badge ${b.cls}">${b.label}</span>`;
}

/* ── Renderiza um card de evento ───────────────────────────── */
function renderCard(id, ev) {
  const status  = statusEvento(ev.dataInicio, ev.dataFim);
  const precoMin = Math.min(...(ev.opcoes || [{ preco: 0 }]).map(o => o.preco));
  const esgotado = ev.vagasRestantes <= 0;

  return `
    <div class="evento-card ${status === 'encerrado' ? 'encerrado' : ''}"
         data-cat="${ev.categoria || 'outros'}"
         data-id="${id}"
         onclick="${esgotado || status === 'encerrado' ? '' : `abrirModal('${id}')`}"
         style="${esgotado || status === 'encerrado' ? 'cursor:not-allowed;opacity:0.55' : ''}">
      <div class="evento-imagem" style="background:${ev.corBg || 'linear-gradient(135deg,#161616,#222)'}">
        <span style="font-size:3.5rem">${ev.emoji || '🎵'}</span>
        <span class="evento-badge">${ev.categoriaLabel || ev.categoria || 'Evento'}</span>
        ${badgeStatus(status)}
        ${esgotado ? '<span class="evento-destaque-badge" style="background:#555">Esgotado</span>' : ''}
      </div>
      <div class="evento-info">
        <div class="evento-data">${formatarData(ev.dataInicio)}</div>
        <div class="evento-nome">${ev.nome}</div>
        <div class="evento-local">📍 ${ev.local}</div>
        <div class="evento-footer">
          <div class="evento-preco">
            <small>a partir de</small>
            ${formatarPreco(precoMin)}
          </div>
          ${!esgotado && status !== 'encerrado'
            ? `<button class="btn-comprar" onclick="event.stopPropagation();abrirModal('${id}')">Comprar</button>`
            : `<span style="font-size:0.8rem;color:var(--cinza-texto)">${esgotado ? 'Esgotado' : 'Encerrado'}</span>`
          }
        </div>
        <div class="vagas-bar-wrap">
          <div class="vagas-bar" style="width:${Math.max(0, Math.min(100, ((ev.vagasRestantes||0)/(ev.totalVagas||1))*100))}%"></div>
        </div>
        <div style="font-size:0.7rem;color:var(--cinza-texto);margin-top:4px">
          ${ev.vagasRestantes ?? '?'} vagas restantes
        </div>
      </div>
    </div>
  `;
}

/* ── Listener em tempo real ─────────────────────────────────
   onSnapshot dispara imediatamente e a cada mudança no Firestore
   sem precisar recarregar a página.
──────────────────────────────────────────────────────────── */
function iniciarListenerEventos() {
  const grid    = document.getElementById('eventos-grid');
  const contador = document.getElementById('contador-eventos');
  const loading  = document.getElementById('loading-eventos');

  db.collection('eventos')
    .orderBy('dataInicio', 'asc')
    .onSnapshot(snapshot => {
      loading && (loading.style.display = 'none');

      const docs = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

      /* Atualiza contador no hero */
      if (contador) contador.textContent = docs.length + '+';

      /* Renderiza cards */
      if (docs.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--cinza-texto)">
            <div style="font-size:3rem;margin-bottom:1rem">📭</div>
            <p>Nenhum evento cadastrado ainda.</p>
          </div>`;
        return;
      }

      grid.innerHTML = docs.map(ev => renderCard(ev.id, ev)).join('');

      /* Reaplica filtro ativo */
      const filtroAtivo = document.querySelector('.filtro-btn.ativo');
      if (filtroAtivo) {
        const cat = filtroAtivo.dataset.cat;
        if (cat !== 'todos') aplicarFiltro(cat);
      }

    }, err => {
      console.error('Erro Firestore:', err);
      grid.innerHTML = `<div style="grid-column:1/-1;color:var(--cinza-texto);padding:2rem">
        ⚠️ Erro ao carregar eventos. Verifique sua configuração do Firebase.</div>`;
    });
}

/* ── Filtro ─────────────────────────────────────────────────── */
function filtrar(btn, cat) {
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  btn.dataset.cat = cat;
  aplicarFiltro(cat);
}

function aplicarFiltro(cat) {
  document.querySelectorAll('.evento-card').forEach(card => {
    card.style.display = (cat === 'todos' || card.dataset.cat === cat) ? 'block' : 'none';
  });
}

/* ── Modal de compra ────────────────────────────────────────── */
function abrirModal(id) {
  db.collection('eventos').doc(id).get().then(doc => {
    if (!doc.exists) return;
    const ev = { id: doc.id, ...doc.data() };
    eventoAtual = ev;
    qtds = (ev.opcoes || []).map(() => 0);

    document.getElementById('modal-emoji').textContent  = ev.emoji || '🎵';
    document.getElementById('modal-nome').textContent   = ev.nome;
    document.getElementById('modal-local').textContent  = '📍 ' + ev.local;
    document.getElementById('modal-data').textContent   = formatarData(ev.dataInicio);
    document.getElementById('modal-class').textContent  = ev.classificacao || 'Livre';

    renderOpcoesModal(ev);
    atualizarTotal();

    document.getElementById('overlay').classList.add('aberto');
    document.body.style.overflow = 'hidden';
  });
}

function renderOpcoesModal(ev) {
  const cont = document.getElementById('modal-opcoes');
  cont.innerHTML = '';
  (ev.opcoes || []).forEach((op, i) => {
    cont.innerHTML += `
      <div class="ingresso-tipo" id="tipo-${i}">
        <div class="ingresso-info">
          <label>${op.tipo}</label>
          <small>${op.desc || ''}</small>
        </div>
        <div style="display:flex;align-items:center;gap:1rem">
          <span class="ingresso-preco-tag">${formatarPreco(op.preco)}</span>
          <div class="ingresso-contador">
            <button class="contador-btn" onclick="mudarQtd(${i},-1)">−</button>
            <span class="contador-num" id="qtd-${i}">0</span>
            <button class="contador-btn" onclick="mudarQtd(${i},1)">+</button>
          </div>
        </div>
      </div>`;
  });
}

function mudarQtd(i, delta) {
  if (!eventoAtual) return;
  qtds[i] = Math.max(0, qtds[i] + delta);
  document.getElementById('qtd-' + i).textContent = qtds[i];
  document.getElementById('tipo-' + i).classList.toggle('selecionado', qtds[i] > 0);
  atualizarTotal();
}

function atualizarTotal() {
  if (!eventoAtual) return;
  const total = (eventoAtual.opcoes || []).reduce((acc, op, i) => acc + op.preco * qtds[i], 0);
  document.getElementById('modal-total').textContent = formatarPreco(total);
}

function fecharModal(e) {
  if (e.target === document.getElementById('overlay')) fecharModalBtn();
}
function fecharModalBtn() {
  document.getElementById('overlay').classList.remove('aberto');
  document.body.style.overflow = '';
}

function finalizarCompra() {
  if (!eventoAtual) return;
  const total = (eventoAtual.opcoes || []).reduce((acc, op, i) => acc + op.preco * qtds[i], 0);
  if (total === 0) { alert('Selecione ao menos 1 ingresso.'); return; }

  /* Em produção: chamar API de pagamento (Stripe, Mercado Pago, etc.) */
  /* Aqui: diminui vagas no Firestore como demonstração */
  const qtdTotal = qtds.reduce((a, b) => a + b, 0);
  db.collection('eventos').doc(eventoAtual.id).update({
    vagasRestantes: firebase.firestore.FieldValue.increment(-qtdTotal)
  }).then(() => {
    fecharModalBtn();
    setTimeout(() => alert(`✅ Compra de ${formatarPreco(total)} iniciada!\nEm produção você seria redirecionado ao checkout.`), 200);
  });
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', iniciarListenerEventos);
