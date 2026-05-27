/* ============================================================
   TicketAM – Mapa de eventos com Leaflet + OpenStreetMap
   Arquivo: js/mapa.js
   ============================================================ */

let mapaLeaflet  = null;
let marcadores   = {};   /* id do evento → marker */

/* Cores por categoria */
const coresCat = {
  shows:    '#1D9E75',
  teatro:   '#7F77DD',
  festival: '#EF9F27',
  esporte:  '#378ADD',
  humor:    '#D85A30',
  outros:   '#888888',
};

/* ── Inicializa o mapa centrado em Manaus ───────────────────── */
function iniciarMapa() {
  if (mapaLeaflet) return;

  mapaLeaflet = L.map('mapa-leaflet', {
    center: [-3.1019, -60.0250], /* Centro de Manaus */
    zoom: 13,
    zoomControl: true,
  });

  /* Tile escuro compatível com o tema do site */
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapaLeaflet);
}

/* ── Cria ícone colorido por categoria ──────────────────────── */
function criarIcone(categoria, emoji) {
  const cor = coresCat[categoria] || coresCat.outros;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <ellipse cx="18" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.3)"/>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
            fill="${cor}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="18" y="23" text-anchor="middle" font-size="14">${emoji || '🎵'}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    iconSize:   [36, 44],
    iconAnchor: [18, 44],
    popupAnchor:[0, -44],
    className: '',
  });
}

/* ── Geocodifica endereço via Nominatim (OpenStreetMap) ─────── */
async function geocodificar(endereco) {
  const query  = encodeURIComponent(endereco + ', Manaus, Amazonas, Brasil');
  const url    = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const res  = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR' }
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn('Erro ao geocodificar:', endereco, e);
  }
  return null;
}

/* ── Formata data para o popup ──────────────────────────────── */
function formatarDataMapa(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

/* ── Monta HTML do popup do marcador ────────────────────────── */
function popupHTML(ev) {
  const cor      = coresCat[ev.categoria] || coresCat.outros;
  const opcoes   = ev.opcoes || [];
  const precoMin = opcoes.length ? Math.min(...opcoes.map(o => o.preco)) : 0;
  const precoTxt = precoMin === 0 ? 'Gratuito' : `A partir de R$ ${precoMin.toFixed(2).replace('.', ',')}`;

  return `
    <div style="font-family:'DM Sans',sans-serif;min-width:220px;padding:4px">
      <div style="font-size:1.5rem;margin-bottom:6px">${ev.emoji || '🎵'}</div>
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;color:#111">${ev.nome}</div>
      <div style="font-size:0.78rem;color:#555;margin-bottom:2px">📍 ${ev.local}</div>
      <div style="font-size:0.78rem;color:#555;margin-bottom:8px">🗓 ${formatarDataMapa(ev.dataInicio)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:0.8rem;font-weight:600;color:${cor}">${precoTxt}</span>
        <span style="font-size:0.7rem;background:${cor}22;color:${cor};padding:2px 8px;border-radius:100px;font-weight:500">
          ${ev.categoriaLabel || ev.categoria || 'Evento'}
        </span>
      </div>
    </div>`;
}

/* ── Atualiza legenda lateral ───────────────────────────────── */
function atualizarLegenda(eventos) {
  const legenda = document.getElementById('mapa-legenda');
  if (!legenda) return;

  if (eventos.length === 0) {
    legenda.innerHTML = '<p style="color:#888;font-size:0.8rem;padding:1rem">Nenhum evento ativo no mapa.</p>';
    return;
  }

  legenda.innerHTML = eventos.map(ev => {
    const cor = coresCat[ev.categoria] || coresCat.outros;
    return `
      <div class="legenda-item" onclick="focarEvento('${ev.id}')">
        <span style="font-size:1.2rem">${ev.emoji || '🎵'}</span>
        <div>
          <div style="font-size:0.82rem;font-weight:600;color:#f5f2ec">${ev.nome}</div>
          <div style="font-size:0.72rem;color:#888">${ev.local}</div>
        </div>
        <span style="font-size:0.65rem;background:${cor}22;color:${cor};padding:2px 6px;border-radius:100px;white-space:nowrap;flex-shrink:0">
          ${ev.categoriaLabel || ev.categoria || ''}
        </span>
      </div>`;
  }).join('');
}

/* ── Foca no evento ao clicar na legenda ────────────────────── */
function focarEvento(id) {
  const marker = marcadores[id];
  if (!marker) return;
  mapaLeaflet.setView(marker.getLatLng(), 16, { animate: true });
  marker.openPopup();
}

/* ── Cache de coordenadas para não geocodificar sempre ──────── */
const cacheCoords = {};

/* ── Listener principal do mapa ─────────────────────────────── */
function iniciarListenerMapa() {
  iniciarMapa();

  db.collection('eventos')
    .orderBy('dataInicio', 'asc')
    .onSnapshot(async snapshot => {
      const docs = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

      /* Remove marcadores de eventos que foram deletados */
      const idsAtuais = new Set(docs.map(d => d.id));
      Object.keys(marcadores).forEach(id => {
        if (!idsAtuais.has(id)) {
          mapaLeaflet.removeLayer(marcadores[id]);
          delete marcadores[id];
        }
      });

      /* Filtra só eventos não encerrados */
      const agora = new Date();
      const ativos = docs.filter(ev => {
        const fim = ev.dataFim?.toDate ? ev.dataFim.toDate() : new Date(ev.dataFim);
        return fim >= agora;
      });

      atualizarLegenda(ativos);

      /* Adiciona/atualiza marcadores */
      for (const ev of ativos) {
        let coords = null;

        /* Usa coordenadas salvas no Firestore se existirem */
        if (ev.lat && ev.lng) {
          coords = { lat: ev.lat, lng: ev.lng };
        } else if (cacheCoords[ev.id]) {
          coords = cacheCoords[ev.id];
        } else {
          /* Geocodifica e salva no Firestore para não repetir */
          coords = await geocodificar(ev.local);
          if (coords) {
            cacheCoords[ev.id] = coords;
            /* Salva no documento para próximas visitas */
            db.collection('eventos').doc(ev.id).update({
              lat: coords.lat,
              lng: coords.lng
            }).catch(() => {});
          }
        }

        if (!coords) continue;

        if (marcadores[ev.id]) {
          /* Atualiza popup se já existe */
          marcadores[ev.id].setPopupContent(popupHTML(ev));
        } else {
          /* Cria novo marcador */
          const marker = L.marker([coords.lat, coords.lng], {
            icon: criarIcone(ev.categoria, ev.emoji)
          })
          .addTo(mapaLeaflet)
          .bindPopup(popupHTML(ev), {
            maxWidth: 280,
            className: 'ticketam-popup'
          });

          marcadores[ev.id] = marker;
        }
      }
    });
}

/* ── Inicia quando o DOM estiver pronto ─────────────────────── */
document.addEventListener('DOMContentLoaded', iniciarListenerMapa);
