/* ============================================================
   TicketAM – Lógica principal do site público
   Arquivo: js/app.js
   ============================================================ */

/* ── Configuração EmailJS ───────────────────────────────────── */
const EMAILJS_SERVICE_ID  = 'service_uemtw6p';
const EMAILJS_TEMPLATE_ID = 'template_3sdhkri';
const EMAILJS_PUBLIC_KEY  = 'LjlC49jmhi65r9qny';

/* ── Estado global ─────────────────────────────────────────── */
let eventoAtual  = null;
let qtds         = [];
let usuarioAtual = null;

/* ── Init EmailJS ───────────────────────────────────────────── */
emailjs.init(EMAILJS_PUBLIC_KEY);

/* ── Auth Google ────────────────────────────────────────────── */
const provider = new firebase.auth.GoogleAuthProvider();

function loginGoogle() {
  auth.signInWithPopup(provider).catch(err => {
    console.error('Erro no login:', err);
    alert('Não foi possível fazer login. Tente novamente.');
  });
}

function logout() {
  auth.signOut();
}

/* Observa mudanças de autenticação */
auth.onAuthStateChanged(user => {
  usuarioAtual = user;
  atualizarNavbar(user);
});

function atualizarNavbar(user) {
  const btnNav     = document.getElementById('btn-entrar');
  const perfilWrap = document.getElementById('perfil-wrap');

  if (!btnNav || !perfilWrap) return;

  if (user) {
    btnNav.style.display      = 'none';
    perfilWrap.style.display  = 'flex';
    document.getElementById('perfil-nome').textContent = user.displayName?.split(' ')[0] || 'Usuário';
    document.getElementById('perfil-foto').src =
      user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=1D9E75&color=fff';
  } else {
    btnNav.style.display      = 'block';
    perfilWrap.style.display  = 'none';
  }
}

/* ── Utilitários ────────────────────────────────────────────── */
function formatarPreco(valor) {
  if (valor === 0 || valor === null || valor === undefined) return 'Gratuito';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function statusEvento(inicio, fim) {
  const now = new Date();
  const s   = inicio?.toDate ? inicio.toDate() : new Date(inicio);
  const f   = fim?.toDate    ? fim.toDate()    : new Date(fim);
  if (now >= s && now <= f) return 'ao-vivo';
  if (now < s)              return 'em-breve';
  return 'encerrado';
}

function badgeStatus(status) {
  const map = {
    'ao-vivo':   { label: '🔴 Ao vivo',  cls: 'badge-live'     },
    'em-breve':  { label: '🟡 Em breve', cls: 'badge-breve'    },
    'encerrado': { label: '⚫ Encerrado', cls: 'badge-encerrado'},
  };
  const b = map[status] || map['em-breve'];
  return `<span class="evento-status-badge ${b.cls}">${b.label}</span>`;
}

/* ── Renderiza card ─────────────────────────────────────────── */
function renderCard(id, ev) {
  const status       = statusEvento(ev.dataInicio, ev.dataFim);
  const opcoes       = ev.opcoes || [];
  const precos       = opcoes.map(o => o.preco);
  const precoMin     = precos.length ? Math.min(...precos) : 0;
  const gratuito     = precos.every(p => p === 0);
  const publico      = ev.publico === true;
  const vagasRest    = publico ? Infinity : (ev.vagasRestantes ?? 0);
  const totalVagas   = publico ? Infinity : (ev.totalVagas ?? 1);
  const esgotado     = !publico && vagasRest <= 0;
  const pct          = publico ? 100 : Math.max(0, Math.min(100, (vagasRest / totalVagas) * 100));
  const vagasTxt     = publico
    ? 'Evento público — entrada livre'
    : `${vagasRest} vaga${vagasRest !== 1 ? 's' : ''} restante${vagasRest !== 1 ? 's' : ''}`;
  const precoLabel   = gratuito ? 'Gratuito' : formatarPreco(precoMin);
  const precoSmall   = gratuito ? '' : '<small>a partir de</small>';
  const bloqueado    = esgotado || status === 'encerrado';

  return `
    <div class="evento-card ${status === 'encerrado' ? 'encerrado' : ''}"
         data-cat="${ev.categoria || 'outros'}" data-id="${id}"
         onclick="${bloqueado ? '' : `abrirModal('${id}')`}"
         style="${bloqueado ? 'cursor:not-allowed;opacity:0.55' : ''}">
      <div class="evento-imagem" style="background:${ev.corBg || 'linear-gradient(135deg,#161616,#222)'}">
        <span style="font-size:3.5rem">${ev.emoji || '🎵'}</span>
        <span class="evento-badge">${ev.categoriaLabel || ev.categoria || 'Evento'}</span>
        ${badgeStatus(status)}
        ${gratuito  ? '<span class="evento-destaque-badge" style="background:var(--verde)">Gratuito</span>' : ''}
        ${esgotado  ? '<span class="evento-destaque-badge" style="background:#555">Esgotado</span>'         : ''}
      </div>
      <div class="evento-info">
        <div class="evento-data">${formatarData(ev.dataInicio)}</div>
        <div class="evento-nome">${ev.nome}</div>
        <div class="evento-local">📍 ${ev.local}</div>
        <div class="evento-footer">
          <div class="evento-preco">${precoSmall}${precoLabel}</div>
          ${!bloqueado
            ? `<button class="btn-comprar" onclick="event.stopPropagation();abrirModal('${id}')">
                ${gratuito ? 'Reservar' : 'Comprar'}</button>`
            : `<span style="font-size:0.8rem;color:var(--cinza-texto)">${esgotado ? 'Esgotado' : 'Encerrado'}</span>`
          }
        </div>
        <div class="vagas-bar-wrap">
          <div class="vagas-bar" style="width:${pct}%"></div>
        </div>
        <div style="font-size:0.7rem;color:var(--cinza-texto);margin-top:4px">${vagasTxt}</div>
      </div>
    </div>`;
}

/* ── Listener em tempo real ─────────────────────────────────── */
function iniciarListenerEventos() {
  const grid     = document.getElementById('eventos-grid');
  const contador = document.getElementById('contador-eventos');
  const loading  = document.getElementById('loading-eventos');

  db.collection('eventos')
    .orderBy('dataInicio', 'asc')
    .onSnapshot(snapshot => {
      loading && (loading.style.display = 'none');
      const docs = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      if (contador) contador.textContent = docs.length + '+';

      if (docs.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--cinza-texto)">
            <div style="font-size:3rem;margin-bottom:1rem">📭</div>
            <p>Nenhum evento cadastrado ainda.</p>
          </div>`;
        return;
      }
      grid.innerHTML = docs.map(ev => renderCard(ev.id, ev)).join('');

      const filtroAtivo = document.querySelector('.filtro-btn.ativo');
      if (filtroAtivo) {
        const cat = filtroAtivo.dataset.cat;
        if (cat && cat !== 'todos') aplicarFiltro(cat);
      }
    }, err => {
      console.error('Erro Firestore:', err);
      grid.innerHTML = `<div style="grid-column:1/-1;color:var(--cinza-texto);padding:2rem">
        ⚠️ Erro ao carregar eventos.</div>`;
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

    document.getElementById('modal-emoji').textContent = ev.emoji || '🎵';
    document.getElementById('modal-nome').textContent  = ev.nome;
    document.getElementById('modal-local').textContent = '📍 ' + ev.local;
    document.getElementById('modal-data').textContent  = formatarData(ev.dataInicio);
    document.getElementById('modal-class').textContent = ev.classificacao || 'Livre';

    /* Aviso de e-mail se logado */
    const avisoEmail = document.getElementById('modal-aviso-email');
    if (avisoEmail) {
      avisoEmail.style.display = usuarioAtual ? 'flex' : 'none';
      if (usuarioAtual) {
        avisoEmail.querySelector('span').textContent =
          `Confirmação será enviada para ${usuarioAtual.email}`;
      }
    }

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
    const precoFmt = op.preco === 0 ? 'Gratuito' : formatarPreco(op.preco);
    cont.innerHTML += `
      <div class="ingresso-tipo" id="tipo-${i}">
        <div class="ingresso-info">
          <label>${op.tipo}</label>
          <small>${op.desc || ''}</small>
        </div>
        <div style="display:flex;align-items:center;gap:1rem">
          <span class="ingresso-preco-tag">${precoFmt}</span>
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
  document.getElementById('modal-total').textContent =
    total === 0 ? 'Gratuito' : formatarPreco(total);
}

function fecharModal(e) {
  if (e.target === document.getElementById('overlay')) fecharModalBtn();
}
function fecharModalBtn() {
  document.getElementById('overlay').classList.remove('aberto');
  document.body.style.overflow = '';
}

/* ── Finalizar compra + EmailJS ─────────────────────────────── */
function finalizarCompra() {
  if (!eventoAtual) return;
  const total    = (eventoAtual.opcoes || []).reduce((acc, op, i) => acc + op.preco * qtds[i], 0);
  const qtdTotal = qtds.reduce((a, b) => a + b, 0);
  if (qtdTotal === 0) { alert('Selecione ao menos 1 ingresso.'); return; }

  /* Decrementa vagas se necessário */
  if (!eventoAtual.publico && eventoAtual.vagasRestantes !== null) {
    db.collection('eventos').doc(eventoAtual.id).update({
      vagasRestantes: firebase.firestore.FieldValue.increment(-qtdTotal)
    });
  }

  fecharModalBtn();

  /* Monta resumo dos ingressos */
  const resumoIngressos = eventoAtual.opcoes
    .map((op, i) => qtds[i] > 0
      ? `${qtds[i]}x ${op.tipo} (${op.preco === 0 ? 'Gratuito' : formatarPreco(op.preco)})`
      : null)
    .filter(Boolean)
    .join(', ');

  /* Envia e-mail se usuário estiver logado */
  if (usuarioAtual?.email) {
    const templateParams = {
      usuario_nome: usuarioAtual.displayName || 'Cliente',
      usuario_email: usuarioAtual.email,
      evento_nome:  eventoAtual.nome,
      evento_local: eventoAtual.local,
      evento_data:  formatarData(eventoAtual.dataInicio),
      ingressos:    resumoIngressos,
      total:        total === 0 ? 'Gratuito' : formatarPreco(total),
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then(() => console.log('E-mail enviado!'))
      .catch(err => console.error('Erro ao enviar e-mail:', err));
  }

  const msg = total === 0
    ? `✅ Reserva confirmada!\n${usuarioAtual ? 'Confirmação enviada para ' + usuarioAtual.email : 'Faça login para receber confirmação por e-mail.'}`
    : `✅ Compra iniciada!\n${usuarioAtual ? 'Confirmação enviada para ' + usuarioAtual.email : 'Faça login para receber confirmação por e-mail.'}`;
  setTimeout(() => alert(msg), 200);
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', iniciarListenerEventos);
