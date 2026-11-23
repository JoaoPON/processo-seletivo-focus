const API_BASE = window.location.port === "5500" ? "http://127.0.0.1:8000" : "";

// Referências principais e responsividade
const mainLayout = document.getElementById('main-layout');
const detailName = document.getElementById('detail-name');
const stripToggle = document.getElementById('leads-strip-toggle');
const clientListContainer = document.getElementById('client-list');
const searchInput = document.getElementById('search-input');
const filterSegment = document.getElementById('segments');
const filterStatus = document.getElementById('status');

const navButtons = document.querySelectorAll('.navbar-btn[data-tab]');
const blankScreens = document.querySelectorAll('.blank-screen');
const navPill = document.getElementById('nav-pill');

let todosLeads = [];
let todasInteracoes = [];
let todasListas = {
    nichos: [],
    cidades: [],
    membros: [],
    origem: [],
    status: [],
    acoes: [],
    prioridade_ia: [],
    status_ia: [],
    resultado: []
};
let interacoesDoLeadAtual = [];
let leadSelecionadoId = null;
let leadEditandoId = null;
let interacaoEditandoId = null;
let interacaoLeadAlvoId = null;
let modoModalInteracao = 'registrar'; // 'agendar' | 'registrar' | 'concluir' | 'editar-realizada'

// ==================== LAYOUT E RESPONSIVIDADE ====================

function checkScreenWidth() {
    if (window.outerWidth < window.screen.availWidth * 0.75) {
        mainLayout.classList.add('narrow-screen');
    } else {
        mainLayout.classList.remove('narrow-screen', 'leads-expanded');
    }
}

function moveNavPill(activeBtn) {
    if (!activeBtn || !navPill) return;
    navPill.style.width = `${activeBtn.offsetWidth}px`;
    navPill.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
}

window.addEventListener('resize', () => {
    checkScreenWidth();
    moveNavPill(document.querySelector('.navbar-btn.active'));
});

checkScreenWidth();

stripToggle?.addEventListener('click', () => {
    mainLayout.classList.toggle('leads-expanded');
});




function gerarIniciais(texto) {
    if (!texto) return "LD";
    return texto.trim().slice(0, 2).toUpperCase();
}

function obterDataHojeISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function normalizarDataISO(dataStr) {
    if (!dataStr) return "";
    const limpo = dataStr.trim();
    if (limpo.includes("/")) {
        const partes = limpo.split("/");
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
    }
    return limpo;
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    if (dataISO.includes("/")) return dataISO;
    const partes = dataISO.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataISO;
}

function preencherSelect(selectEl, opcoes, textoPadrao = null) {
    if (!selectEl) return;
    const valorAtual = selectEl.value;
    selectEl.innerHTML = "";

    if (textoPadrao !== null) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = textoPadrao;
        selectEl.appendChild(opt);
    }

    opcoes.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        selectEl.appendChild(opt);
    });

    if (valorAtual && [...selectEl.options].some(o => o.value === valorAtual)) {
        selectEl.value = valorAtual;
    }
}

// Listas

async function carregarListas() {
    try {
        const resp = await fetch(`${API_BASE}/api/listas`);
        if (!resp.ok) throw new Error('Falha ao buscar listas');
        todasListas = await resp.json();

        preencherSelect(filterSegment, todasListas.nichos || [], "Todos Nichos");
        preencherSelect(filterStatus, todasListas.status || [], "Todos Status");

        const statusOpcoes = (todasListas.status && todasListas.status.length)
            ? todasListas.status
            : ["Novo", "Em contato", "RD marcada", "Contrato", "Descartado"];
        preencherSelect(document.getElementById('detail-status-select'), statusOpcoes);

        const acoesOpcoes = (todasListas.acoes && todasListas.acoes.length)
            ? todasListas.acoes
            : ["Ligação", "WhatsApp", "Reunião", "E-mail"];
        preencherSelect(document.getElementById('interacao-acao'), acoesOpcoes);
        preencherSelect(document.getElementById('interacao-responsavel'), todasListas.membros || [], "Selecione o responsável...");
        preencherSelect(document.getElementById('interacao-resultado'), todasListas.resultado || [], "Sem resultado específico");
        preencherSelect(document.getElementById('lead-sdr'), todasListas.membros || [], "Não atribuído (Origem SITE)");

        // Filtros da aba Agendamentos
        preencherSelect(document.getElementById('cal-filter-resp'), todasListas.membros || [], "Todos Responsáveis");
        preencherSelect(document.getElementById('cal-filter-acao'), acoesOpcoes, "Todas Ações");

        const dlNichos = document.getElementById('lista-nichos-options');
        if (dlNichos) {
            dlNichos.innerHTML = (todasListas.nichos || []).map(n => `<option value="${n}">`).join('');
        }
        const dlCidades = document.getElementById('lista-cidades-options');
        if (dlCidades) {
            dlCidades.innerHTML = (todasListas.cidades || []).map(c => `<option value="${c}">`).join('');
        }
    } catch (erro) {
        console.error("Erro ao carregar listas:", erro);
    }
}

// Leitura, Filtro, Criação e Edição de Leads

function aplicarFiltrosLeads() {
    const termo = (searchInput?.value || "").toLowerCase().trim();
    const nichoFiltro = filterSegment?.value || "";
    const statusFiltro = filterStatus?.value || "";

    const filtrados = todosLeads.filter(l => {
        const bateTexto =
            (l.empresa || '').toLowerCase().includes(termo) ||
            (l.nome_completo || '').toLowerCase().includes(termo) ||
            (l.whatsapp || '').toLowerCase().includes(termo);

        const bateNicho = !nichoFiltro || (l.nicho || '') === nichoFiltro;
        const bateStatus = !statusFiltro || (l.status || '') === statusFiltro;

        return bateTexto && bateNicho && bateStatus;
    });

    renderizarListaLeads(filtrados);
}

function renderizarListaLeads(lista) {
    if (!lista.length) {
        clientListContainer.innerHTML = '<p style="padding: 20px; color: var(--txt-3); font-size: 13px;">Nenhum lead encontrado.</p>';
        return;
    }

    clientListContainer.innerHTML = lista.map(lead => `
        <button class="client-item ${lead.id === leadSelecionadoId ? 'selected' : ''}" data-id="${lead.id}">
            <span class="client-avatar">${gerarIniciais(lead.empresa || lead.nome_completo)}</span>
            <span class="client-info">
                <span class="client-name">${lead.empresa || 'Sem empresa'}</span>
                <span class="client-sub">
                    <span class="client-segment">${lead.nicho || 'Geral'}</span>
                    ·
                    <span class="client-number">${lead.whatsapp || lead.nome_completo || ''}</span>
                </span>
            </span>
            <span class="client-status">${lead.status || 'Novo'}</span>
        </button>
    `).join('');
}

function preencherDetalhesLead(lead) {
    if (!lead) return;
    leadSelecionadoId = lead.id;

    detailName.textContent = lead.empresa || lead.nome_completo || 'Lead';

    const statusSelect = document.getElementById('detail-status-select');
    if (lead.status && ![...statusSelect.options].some(o => o.value === lead.status)) {
        const opt = document.createElement('option');
        opt.value = lead.status;
        opt.textContent = lead.status;
        statusSelect.appendChild(opt);
    }
    statusSelect.value = lead.status || (todasListas.status?.[0] || 'Novo');

    document.getElementById('detail-origin').textContent = lead.origem || 'SITE';
    document.getElementById('detail-contact').textContent = lead.nome_completo || '-';
    document.getElementById('detail-phone').textContent = lead.whatsapp || '-';
    document.getElementById('detail-segment').textContent = [lead.nicho, lead.cidade].filter(Boolean).join(' · ') || '-';
    document.getElementById('detail-email').textContent = lead.email || '-';
    document.getElementById('detail-solution').textContent = lead.solucao_interesse || '-';
    document.getElementById('detail-sdr').textContent = lead.responsavel_sdr || 'Origem SITE';
    document.getElementById('detail-description').textContent = lead.descricao || '-';

    // Dados da IA (Gemini)
    const statusIa = lead.status_ia || 'Pendente';
    const prioridade = lead.prioridade_ia ? ` · Prioridade ${lead.prioridade_ia}` : '';
    document.getElementById('detail-ia-badge').textContent = `IA: ${statusIa}${prioridade}`;

    document.getElementById('detail-ia-justificativa').textContent =
        lead.justificativa_ia || 'A IA está processando este lead. Clique em "Atualizar" em alguns segundos.';

    document.getElementById('detail-ia-abordagem').innerHTML =
        `<strong>Sugestão de abordagem:</strong> ${lead.sugestao_abordagem || '-'}`;

    mainLayout.classList.add('split-view');
    carregarInteracoesDoLead(lead.id);
}

async function salvarStatusLead(leadIdAlvo, novoStatus) {
    if (!leadIdAlvo || !novoStatus) return;
    const resp = await fetch(`${API_BASE}/api/leads/${leadIdAlvo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
    });
    if (!resp.ok) throw new Error('Falha ao atualizar status');

    const idx = todosLeads.findIndex(l => l.id === leadIdAlvo);
    if (idx !== -1) {
        todosLeads[idx].status = novoStatus;
        aplicarFiltrosLeads();
    }

    if (leadIdAlvo === leadSelecionadoId) {
        const statusSelect = document.getElementById('detail-status-select');
        if (statusSelect) {
            if (![...statusSelect.options].some(o => o.value === novoStatus)) {
                const opt = document.createElement('option');
                opt.value = novoStatus;
                opt.textContent = novoStatus;
                statusSelect.appendChild(opt);
            }
            statusSelect.value = novoStatus;
        }
    }
}

document.getElementById('detail-status-select')?.addEventListener('change', async (e) => {
    try {
        await salvarStatusLead(leadSelecionadoId, e.target.value);
    } catch (erro) {
        alert('Não foi possível atualizar o status na planilha.');
        console.error(erro);
    }
});

async function carregarLeads() {
    try {
        const resp = await fetch(`${API_BASE}/api/leads`);
        if (!resp.ok) throw new Error('Falha ao buscar leads');
        todosLeads = await resp.json();
        aplicarFiltrosLeads();

        if (leadSelecionadoId) {
            const atualizado = todosLeads.find(l => l.id === leadSelecionadoId);
            if (atualizado) preencherDetalhesLead(atualizado);
        }
    } catch (erro) {
        console.error(erro);
        clientListContainer.innerHTML = '<p style="padding: 20px; color: #dc2626; font-size: 13px;">Erro ao conectar com o servidor.</p>';
    }
}

clientListContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.client-item');
    if (!item) return;

    document.querySelector('.client-item.selected')?.classList.remove('selected');
    item.classList.add('selected');

    const lead = todosLeads.find(l => l.id === item.dataset.id);
    preencherDetalhesLead(lead);
});

searchInput?.addEventListener('input', aplicarFiltrosLeads);
filterSegment?.addEventListener('change', aplicarFiltrosLeads);
filterStatus?.addEventListener('change', aplicarFiltrosLeads);

document.getElementById('refresh-leads-btn1')?.addEventListener('click', carregarLeads);
document.getElementById('refresh-leads-btn2')?.addEventListener('click', carregarLeads);

// Modal de Novo / Editar Lead
const newLeadBtn = document.getElementById('new-lead-btn');
const editLeadBtn = document.getElementById('edit-lead-btn');
const newLeadModal = document.getElementById('new-lead-modal');
const closeNewLeadBtn = document.getElementById('close-new-lead-btn');
const newLeadForm = document.getElementById('new-lead-form');

newLeadBtn?.addEventListener('click', () => {
    leadEditandoId = null;
    document.getElementById('lead-modal-title').textContent = 'Novo Lead';
    document.getElementById('submit-new-lead-btn').textContent = 'Salvar Lead';
    newLeadForm.reset();
    newLeadModal.classList.add('active');
});

editLeadBtn?.addEventListener('click', () => {
    if (!leadSelecionadoId) return;
    const lead = todosLeads.find(l => l.id === leadSelecionadoId);
    if (!lead) return;

    leadEditandoId = lead.id;
    document.getElementById('lead-modal-title').textContent = 'Editar Lead';
    document.getElementById('submit-new-lead-btn').textContent = 'Salvar Alterações';

    document.getElementById('lead-empresa').value = lead.empresa || '';
    document.getElementById('lead-nome').value = lead.nome_completo || '';
    document.getElementById('lead-whatsapp').value = lead.whatsapp || '';
    document.getElementById('lead-email').value = lead.email || '';
    document.getElementById('lead-nicho').value = lead.nicho || '';
    document.getElementById('lead-cidade').value = lead.cidade || '';
    document.getElementById('lead-solucao').value = lead.solucao_interesse || '';
    document.getElementById('lead-descricao').value = lead.descricao || '';

    const sdrSelect = document.getElementById('lead-sdr');
    if (lead.responsavel_sdr && ![...sdrSelect.options].some(o => o.value === lead.responsavel_sdr)) {
        const opt = document.createElement('option');
        opt.value = lead.responsavel_sdr;
        opt.textContent = lead.responsavel_sdr;
        sdrSelect.appendChild(opt);
    }
    sdrSelect.value = lead.responsavel_sdr || '';

    newLeadModal.classList.add('active');
});

closeNewLeadBtn?.addEventListener('click', () => newLeadModal.classList.remove('active'));
newLeadModal?.addEventListener('click', (e) => {
    if (e.target === newLeadModal) newLeadModal.classList.remove('active');
});

newLeadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-new-lead-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    const sdrSelecionado = document.getElementById('lead-sdr').value;
    const payload = {
        empresa: document.getElementById('lead-empresa').value,
        nome_completo: document.getElementById('lead-nome').value,
        whatsapp: document.getElementById('lead-whatsapp').value,
        email: document.getElementById('lead-email').value,
        nicho: document.getElementById('lead-nicho').value,
        cidade: document.getElementById('lead-cidade').value,
        solucao_interesse: document.getElementById('lead-solucao').value,
        descricao: document.getElementById('lead-descricao').value,
    };

    try {
        if (leadEditandoId) {
            const resp = await fetch(`${API_BASE}/api/leads/${leadEditandoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, responsavel_sdr: sdrSelecionado })
            });
            if (!resp.ok) throw new Error('Erro ao editar lead');
        } else {
            const resp = await fetch(`${API_BASE}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error('Erro ao cadastrar lead');
            const resultado = await resp.json();
            leadSelecionadoId = resultado.id;

            if (sdrSelecionado) {
                await fetch(`${API_BASE}/api/leads/${resultado.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ responsavel_sdr: sdrSelecionado })
                });
            }
        }

        newLeadForm.reset();
        newLeadModal.classList.remove('active');
        await carregarLeads();
    } catch (erro) {
        alert('Não foi possível salvar o lead. Verifique o terminal do servidor.');
        console.error(erro);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = leadEditandoId ? 'Salvar Alterações' : 'Salvar Lead';
    }
});

// Interações de Leads

async function carregarInteracoesDoLead(leadId) {
    const box = document.getElementById('lead-history-list');
    if (!box) return;
    box.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Carregando histórico...</p>';

    try {
        const resp = await fetch(`${API_BASE}/api/leads/${leadId}/interacoes`);
        if (!resp.ok) throw new Error('Falha ao buscar interações');
        interacoesDoLeadAtual = await resp.json();
        renderizarHistoricoLead(interacoesDoLeadAtual);
    } catch (erro) {
        console.error(erro);
        box.innerHTML = '<p style="color: #dc2626; font-size: 13px;">Erro ao carregar interações.</p>';
    }
}

function classificarInteracao(item, hojeISO) {
    const realizada = Boolean((item.data_realizada || '').trim());
    if (realizada) return { tipo: 'realizada', ordem: 2 };

    const dataAg = normalizarDataISO(item.data_agendada);
    if (dataAg && dataAg < hojeISO) return { tipo: 'atrasada', ordem: 0 };

    return { tipo: 'agendada', ordem: 1 };
}

function renderizarHistoricoLead(lista) {
    const box = document.getElementById('lead-history-list');
    if (!lista.length) {
        box.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Nenhuma interação registrada para este lead ainda.</p>';
        return;
    }

    const hojeISO = obterDataHojeISO();

    // Ordena: 0 = Atrasadas, 1 = Agendadas, 2 = Realizadas
    const ordenada = [...lista].sort((a, b) => {
        const infoA = classificarInteracao(a, hojeISO);
        const infoB = classificarInteracao(b, hojeISO);

        if (infoA.ordem !== infoB.ordem) {
            return infoA.ordem - infoB.ordem;
        }

        if (infoA.ordem < 2) {
            const chaveA = `${normalizarDataISO(a.data_agendada) || '9999-99-99'} ${a.hora_agendada || '99:99'}`;
            const chaveB = `${normalizarDataISO(b.data_agendada) || '9999-99-99'} ${b.hora_agendada || '99:99'}`;
            return chaveA.localeCompare(chaveB);
        } else {
            const chaveA = `${normalizarDataISO(a.data_realizada) || ''} ${a.hora_realizada || ''}`;
            const chaveB = `${normalizarDataISO(b.data_realizada) || ''} ${b.hora_realizada || ''}`;
            return chaveB.localeCompare(chaveA);
        }
    });

    box.innerHTML = ordenada.map(item => {
        const { tipo } = classificarInteracao(item, hojeISO);

        let badge = '';
        if (tipo === 'realizada') {
            badge = `<span class="badge-done">Realizada${item.resultado ? ` · ${item.resultado}` : ''}</span>`;
        } else if (tipo === 'atrasada') {
            badge = `<span class="badge-overdue">Atrasada</span>`;
        } else {
            badge = `<span class="badge-pending">Agendada</span>`;
        }

        const infoAgendamento = item.data_agendada
            ? `Agendado: ${formatarDataBR(item.data_agendada)} ${item.hora_agendada || ''}`
            : '';
        const infoRealizacao = item.data_realizada
            ? `Realizado: ${formatarDataBR(item.data_realizada)} ${item.hora_realizada || ''}`
            : '';
        const linhaTempo = [infoAgendamento, infoRealizacao, item.responsavel ? `Resp.: ${item.responsavel}` : '']
            .filter(Boolean)
            .join(' · ');

        const botoesAcao = tipo === 'realizada'
            ? `<button class="list" style="padding: 4px 10px; font-size: 12px;" onclick="abrirModalInteracao('editar', '${item.id}')">Editar</button>`
            : `
                <div style="display: flex; gap: 6px; flex-shrink: 0;">
                    <button class="list" style="padding: 4px 10px; font-size: 12px;" onclick="abrirModalInteracao('editar', '${item.id}')">Editar</button>
                    <button class="new" style="padding: 4px 10px; font-size: 12px;" onclick="abrirModalInteracao('concluir', '${item.id}')">Concluir</button>
                </div>
            `;

        return `
            <div class="interaction-item">
                <div class="interaction-main">
                    <div class="interaction-title">
                        <span>${item.acao || 'Interação'}${item.pauta ? ` — ${item.pauta}` : ''}</span>
                        ${badge}
                    </div>
                    <div class="interaction-meta">${linhaTempo || 'Sem data informada'}</div>
                    ${item.observacoes ? `<div class="interaction-obs">${item.observacoes}</div>` : ''}
                </div>
                ${botoesAcao}
            </div>
        `;
    }).join('');
}

const scheduleBtn = document.getElementById('schedule-btn');
const logCallBtn = document.getElementById('log-call-btn');
const callModal = document.getElementById('call-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const interactionForm = document.getElementById('interaction-form');
const groupAgendamento = document.getElementById('group-agendamento');
const groupRealizacao = document.getElementById('group-realizacao');

function configurarCamposModalInteracao(modo) {
    modoModalInteracao = modo;
    const inputDataAg = document.getElementById('interacao-data-agendada');
    const inputDataReal = document.getElementById('interacao-data-realizada');

    if (modo === 'agendar') {
        groupAgendamento.style.display = 'grid';
        groupRealizacao.style.display = 'none';
        inputDataAg.required = true;
        inputDataReal.required = false;
    } else {
        groupAgendamento.style.display = 'none';
        groupRealizacao.style.display = 'flex';
        inputDataAg.required = false;
        inputDataReal.required = true;
    }
}

window.abrirModalInteracao = function(modo, interacaoId = null) {
    interacaoEditandoId = interacaoId;
    interactionForm.reset();

    const agora = new Date();
    const hojeISO = obterDataHojeISO();
    const horaAtual = agora.toTimeString().slice(0, 5);

    if (!interacaoId) {
        if (!leadSelecionadoId) {
            alert('Selecione um lead primeiro.');
            return;
        }
        interacaoLeadAlvoId = leadSelecionadoId;
        const leadAtual = todosLeads.find(l => l.id === leadSelecionadoId);

        configurarCamposModalInteracao(modo);
        document.getElementById('interaction-modal-title').textContent =
            modo === 'agendar' ? 'Agendar Interação' : 'Registrar Interação';

        if (leadAtual?.responsavel_sdr) {
            document.getElementById('interacao-responsavel').value = leadAtual.responsavel_sdr;
        }
        if (modo === 'registrar') {
            document.getElementById('interacao-data-realizada').value = hojeISO;
            document.getElementById('interacao-hora-realizada').value = horaAtual;
        }
    } else {
        const item = interacoesDoLeadAtual.find(i => i.id === interacaoId)
            || todasInteracoes.find(i => i.id === interacaoId);
        if (!item) return;

        interacaoLeadAlvoId = item.id_lead || leadSelecionadoId;

        document.getElementById('interacao-acao').value = item.acao || '';
        document.getElementById('interacao-responsavel').value = item.responsavel || '';
        document.getElementById('interacao-pauta').value = item.pauta || '';
        document.getElementById('interacao-observacoes').value = item.observacoes || '';

        const jaRealizada = Boolean((item.data_realizada || '').trim());

        if (modo === 'concluir' || jaRealizada) {
            configurarCamposModalInteracao(modo === 'concluir' ? 'concluir' : 'editar-realizada');
            document.getElementById('interaction-modal-title').textContent =
                modo === 'concluir' ? 'Concluir Agendamento' : 'Editar Interação';

            document.getElementById('interacao-data-realizada').value = normalizarDataISO(item.data_realizada) || hojeISO;
            document.getElementById('interacao-hora-realizada').value = item.hora_realizada || horaAtual;
            document.getElementById('interacao-resultado').value = item.resultado || '';
        } else {
            configurarCamposModalInteracao('agendar');
            document.getElementById('interaction-modal-title').textContent = 'Editar Agendamento';
            document.getElementById('interacao-data-agendada').value = normalizarDataISO(item.data_agendada) || '';
            document.getElementById('interacao-hora-agendada').value = item.hora_agendada || '';
        }
    }

    callModal.classList.add('active');
};

scheduleBtn?.addEventListener('click', () => window.abrirModalInteracao('agendar'));
logCallBtn?.addEventListener('click', () => window.abrirModalInteracao('registrar'));
closeModalBtn?.addEventListener('click', () => callModal.classList.remove('active'));
callModal?.addEventListener('click', (e) => {
    if (e.target === callModal) callModal.classList.remove('active');
});

interactionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-interaction-btn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const dados = {
        acao: document.getElementById('interacao-acao').value,
        responsavel: document.getElementById('interacao-responsavel').value,
        pauta: document.getElementById('interacao-pauta').value,
        observacoes: document.getElementById('interacao-observacoes').value,
    };

    if (modoModalInteracao === 'agendar') {
        dados.data_agendada = document.getElementById('interacao-data-agendada').value;
        dados.hora_agendada = document.getElementById('interacao-hora-agendada').value;
    } else {
        dados.data_realizada = document.getElementById('interacao-data-realizada').value;
        dados.hora_realizada = document.getElementById('interacao-hora-realizada').value;
        dados.resultado = document.getElementById('interacao-resultado').value;
    }

    try {
        let resp;
        if (interacaoEditandoId) {
            resp = await fetch(`${API_BASE}/api/interacoes/${interacaoEditandoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        } else {
            resp = await fetch(`${API_BASE}/api/interacoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lead: interacaoLeadAlvoId, ...dados })
            });
        }

        if (!resp.ok) throw new Error('Erro ao salvar interação');

        // Automaticação do status do lead
        if (dados.data_realizada && interacaoLeadAlvoId && todasListas.status && todasListas.status.length >= 2) {
            const leadAtual = todosLeads.find(l => l.id === interacaoLeadAlvoId);
            const primeiroStatus = todasListas.status[0];
            const segundoStatus = todasListas.status[1];
            if (leadAtual && (!leadAtual.status || leadAtual.status === primeiroStatus)) {
                await salvarStatusLead(interacaoLeadAlvoId, segundoStatus);
            }
        }

        callModal.classList.remove('active');

        if (leadSelecionadoId) {
            await carregarInteracoesDoLead(leadSelecionadoId);
        }
        if (document.getElementById('screen-calendar')?.classList.contains('active')) {
            await carregarAgendamentos();
        }
        if (document.getElementById('screen-adm')?.classList.contains('active')) {
            await carregarGerencia();
        }
    } catch (erro) {
        alert('Não foi possível salvar a interação.');
        console.error(erro);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
});



// Agendamentos

async function carregarAgendamentos() {
    const container = document.getElementById('calendar-sections');
    if (container) {
        container.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Atualizando agenda...</p>';
    }

    try {
        if (!todosLeads.length) {
            await carregarLeads();
        }
        const resp = await fetch(`${API_BASE}/api/interacoes`);
        if (!resp.ok) throw new Error('Falha ao buscar interações');
        todasInteracoes = await resp.json();
        renderizarAgendamentos();
    } catch (erro) {
        console.error(erro);
        if (container) {
            container.innerHTML = '<p style="color: #dc2626; font-size: 13px;">Erro ao carregar agendamentos.</p>';
        }
    }
}

function renderizarAgendamentos() {
    const container = document.getElementById('calendar-sections');
    if (!container) return;

    const hojeISO = obterDataHojeISO();
    const leadsMap = Object.fromEntries(todosLeads.map(l => [l.id, l]));

    const agendados = todasInteracoes
        .filter(item => Boolean((item.data_agendada || '').trim()))
        .map(item => {
            const lead = leadsMap[item.id_lead] || {};
            const dataAgISO = normalizarDataISO(item.data_agendada);
            const realizada = Boolean((item.data_realizada || '').trim());

            let situacao = 'proximo';
            if (realizada) {
                situacao = 'realizado';
            } else if (dataAgISO < hojeISO) {
                situacao = 'atrasado';
            } else if (dataAgISO === hojeISO) {
                situacao = 'hoje';
            }

            return {
                ...item,
                dataAgISO,
                situacao,
                empresa: lead.empresa || 'Lead não encontrado',
                contato: lead.nome_completo || '',
                whatsapp: lead.whatsapp || '',
            };
        });

    document.getElementById('kpi-atrasados').textContent = agendados.filter(a => a.situacao === 'atrasado').length;
    document.getElementById('kpi-hoje').textContent = agendados.filter(a => a.situacao === 'hoje').length;
    document.getElementById('kpi-proximos').textContent = agendados.filter(a => a.situacao === 'proximo').length;

    const termo = (document.getElementById('cal-search')?.value || '').toLowerCase().trim();
    const respFiltro = document.getElementById('cal-filter-resp')?.value || '';
    const acaoFiltro = document.getElementById('cal-filter-acao')?.value || '';
    const situacaoFiltro = document.getElementById('cal-filter-situacao')?.value ?? 'pendentes';

    const filtrados = agendados.filter(a => {
        const bateTexto =
            a.empresa.toLowerCase().includes(termo) ||
            a.contato.toLowerCase().includes(termo) ||
            (a.pauta || '').toLowerCase().includes(termo);

        const bateResp = !respFiltro || (a.responsavel || '') === respFiltro;
        const bateAcao = !acaoFiltro || (a.acao || '') === acaoFiltro;

        let bateSituacao = true;
        if (situacaoFiltro === 'pendentes') {
            bateSituacao = a.situacao !== 'realizado';
        } else if (situacaoFiltro) {
            bateSituacao = a.situacao === situacaoFiltro;
        }

        return bateTexto && bateResp && bateAcao && bateSituacao;
    });

    if (!filtrados.length) {
        container.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Nenhum agendamento encontrado para os filtros selecionados.</p>';
        return;
    }

    const grupos = [
        { chave: 'atrasado', titulo: 'Atrasados', ordemAsc: true },
        { chave: 'hoje', titulo: 'Para Hoje', ordemAsc: true },
        { chave: 'proximo', titulo: 'Próximos Compromissos', ordemAsc: true },
        { chave: 'realizado', titulo: 'Realizados', ordemAsc: false },
    ];

    container.innerHTML = grupos.map(grupo => {
        const itensGrupo = filtrados
            .filter(a => a.situacao === grupo.chave)
            .sort((a, b) => {
                const chaveA = `${a.dataAgISO} ${a.hora_agendada || '99:99'}`;
                const chaveB = `${b.dataAgISO} ${b.hora_agendada || '99:99'}`;
                return grupo.ordemAsc ? chaveA.localeCompare(chaveB) : chaveB.localeCompare(chaveA);
            });

        if (!itensGrupo.length) return '';

        const cardsHTML = itensGrupo.map(item => {
            let badge = '';
            if (item.situacao === 'atrasado') {
                badge = `<span class="badge-overdue">Atrasado</span>`;
            } else if (item.situacao === 'hoje') {
                badge = `<span class="badge-pending">Hoje</span>`;
            } else if (item.situacao === 'proximo') {
                badge = `<span class="badge-pending" style="background-color: #e0e7ff; color: #3730a3;">Agendado</span>`;
            } else {
                badge = `<span class="badge-done">Realizado${item.resultado ? ` · ${item.resultado}` : ''}</span>`;
            }

            const botoes = item.situacao === 'realizado'
                ? `
                    <button class="list" style="padding: 6px 12px; font-size: 12px;" onclick="irParaLead('${item.id_lead}')">Ver Lead</button>
                    <button class="list" style="padding: 6px 12px; font-size: 12px;" onclick="abrirModalInteracao('editar', '${item.id}')">Editar</button>
                  `
                : `
                    <button class="list" style="padding: 6px 12px; font-size: 12px;" onclick="irParaLead('${item.id_lead}')">Ver Lead</button>
                    <button class="list" style="padding: 6px 12px; font-size: 12px;" onclick="abrirModalInteracao('editar', '${item.id}')">Editar</button>
                    <button class="new" style="padding: 6px 12px; font-size: 12px;" onclick="abrirModalInteracao('concluir', '${item.id}')">Concluir</button>
                  `;

            return `
                <div class="schedule-card">
                    <div class="schedule-datetime">
                        <span class="schedule-date">${formatarDataBR(item.data_agendada)}</span>
                        <span class="schedule-time">${item.hora_agendada || 'Sem hora'}</span>
                    </div>
                    <div class="schedule-info">
                        <div class="schedule-company">
                            <span>${item.empresa}</span>
                            ${badge}
                        </div>
                        <div class="schedule-task">
                            <strong>${item.acao || 'Compromisso'}</strong>${item.pauta ? ` — ${item.pauta}` : ''}
                        </div>
                        <div class="schedule-meta">
                            ${[
                                item.contato ? `Contato: ${item.contato}` : '',
                                item.whatsapp ? `WhatsApp: ${item.whatsapp}` : '',
                                item.responsavel ? `Resp.: ${item.responsavel}` : ''
                            ].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                    <div class="schedule-actions">
                        ${botoes}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="schedule-group">
                <div class="schedule-group-header">
                    <span>${grupo.titulo}</span>
                    <span class="schedule-count">${itensGrupo.length}</span>
                </div>
                ${cardsHTML}
            </div>
        `;
    }).join('');
}

window.irParaLead = function(leadId) {
    const lead = todosLeads.find(l => l.id === leadId);
    if (!lead) {
        alert('Lead não encontrado na lista.');
        return;
    }

    const btnLeads = document.querySelector('.navbar-btn[data-tab="leads"]');
    if (btnLeads) {
        document.querySelector('.navbar-btn.active')?.classList.remove('active');
        btnLeads.classList.add('active');
        moveNavPill(btnLeads);
    }

    blankScreens.forEach(screen => screen.classList.remove('active'));
    mainLayout.classList.remove('hidden');

    leadSelecionadoId = lead.id;
    aplicarFiltrosLeads();
    preencherDetalhesLead(lead);
};

document.getElementById('refresh-calendar-btn')?.addEventListener('click', carregarAgendamentos);
document.getElementById('cal-search')?.addEventListener('input', renderizarAgendamentos);
document.getElementById('cal-filter-resp')?.addEventListener('change', renderizarAgendamentos);
document.getElementById('cal-filter-acao')?.addEventListener('change', renderizarAgendamentos);
document.getElementById('cal-filter-situacao')?.addEventListener('change', renderizarAgendamentos);



// Gerência

async function carregarGerencia() {
    const btn = document.getElementById('refresh-adm-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Atualizando...';
    }

    try {
        const [, respLeads, respInteracoes] = await Promise.all([
            carregarListas(),
            fetch(`${API_BASE}/api/leads`),
            fetch(`${API_BASE}/api/interacoes`)
        ]);

        if (!respLeads.ok || !respInteracoes.ok) {
            throw new Error('Falha ao carregar dados gerenciais');
        }

        todosLeads = await respLeads.json();
        todasInteracoes = await respInteracoes.json();
        aplicarFiltrosLeads();
        renderizarGerencia();
    } catch (erro) {
        console.error(erro);
        alert('Não foi possível atualizar os dados do painel.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Atualizar Painel';
        }
    }
}

function obterChaveSemana(dataStr) {
    const iso = normalizarDataISO(dataStr);
    if (!iso || iso.length < 10) return null;
    const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;

    // Ajusta para segunda-feira daquela semana
    const diaSemana = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diaSemana);

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return {
        chave: `${d.getFullYear()}-${mm}-${dd}`,
        label: `${dd}/${mm}`
    };
}

function renderizarBarraEmpilhada(containerId, itens, total) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!itens.length || total === 0) {
        el.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Sem dados registrados.</p>';
        return;
    }

    const pct = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);

    el.innerHTML = `
        <div class="adm-stk">
            ${itens.map(it => `<i style="width: ${total > 0 ? (it.qtd / total) * 100 : 0}%; background-color: ${it.cor};" title="${it.label}: ${it.qtd}"></i>`).join('')}
        </div>
        <div class="adm-lg">
            ${itens.map(it => `
                <span>
                    <u style="background-color: ${it.cor};"></u>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${it.label}</span>
                    <b>${it.qtd} (${pct(it.qtd)}%)</b>
                </span>
            `).join('')}
        </div>
    `;
}

function renderizarGerencia() {
    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
    const norm = (txt) => (txt || '').trim().toLowerCase();

    const realizadas = todasInteracoes.filter(i => Boolean((i.data_realizada || '').trim()));

    const ehContatoEfetivo = (i) => {
        const res = norm(i.resultado);
        return res === 'atendeu' || res === 'rd marcada';
    };

    const efetivasCount = realizadas.filter(ehContatoEfetivo).length;

    const leadsTrabalhadosSet = new Set(realizadas.map(i => i.id_lead).filter(Boolean));
    const totalLeads = todosLeads.length;
    const trabalhadosCount = todosLeads.filter(l => leadsTrabalhadosSet.has(l.id)).length;
    const semContatoCount = Math.max(0, totalLeads - trabalhadosCount);

    const reunioesMarcadasCount = todosLeads.filter(l => norm(l.status) === 'rd marcada').length;

    const sdrsAtivos = new Set([
        ...(todasListas.membros || []),
        ...todosLeads.map(l => (l.responsavel_sdr || '').trim()).filter(Boolean),
        ...realizadas.map(i => (i.responsavel || '').trim()).filter(Boolean)
    ]);

    // 4 KPIs
    document.getElementById('adm-kpi-leads').textContent = totalLeads;
    document.getElementById('adm-kpi-trabalhados').textContent = `${trabalhadosCount} já trabalhados`;

    document.getElementById('adm-kpi-interacoes').textContent = realizadas.length;
    document.getElementById('adm-kpi-efetivo').textContent = `${pct(efetivasCount, realizadas.length)}% com contato efetivo`;

    document.getElementById('adm-kpi-reunioes').textContent = reunioesMarcadasCount;
    document.getElementById('adm-kpi-conversao').textContent = `${pct(reunioesMarcadasCount, trabalhadosCount)}% dos leads convertidos`;

    document.getElementById('adm-kpi-sem-contato').textContent = semContatoCount;

    // Gráfico
    const mapaSemanas = {};
    realizadas.forEach(i => {
        const sem = obterChaveSemana(i.data_realizada);
        if (!sem) return;
        if (!mapaSemanas[sem.chave]) {
            mapaSemanas[sem.chave] = { label: sem.label, total: 0, rds: 0 };
        }
        mapaSemanas[sem.chave].total += 1;
        if (norm(i.resultado) === 'rd marcada') {
            mapaSemanas[sem.chave].rds += 1;
        }
    });

    const semanasOrdenadas = Object.entries(mapaSemanas)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8);

    const chartSemanalEl = document.getElementById('adm-chart-semanal');
    if (!semanasOrdenadas.length) {
        chartSemanalEl.innerHTML = '<p style="color: var(--txt-3); font-size: 13px; margin: auto;">Nenhuma interação realizada registrada ainda.</p>';
    } else {
        const maxVal = Math.max(1, ...semanasOrdenadas.map(([, v]) => v.total));
        chartSemanalEl.innerHTML = semanasOrdenadas.map(([, s]) => `
            <div>
                <div class="bs">
                    <i style="height: ${(s.total / maxVal) * 84}%; background-color: var(--navbar);"><s>${s.total}</s></i>
                    <i style="height: ${(s.rds / maxVal) * 84}%; background-color: var(--btn);"><s>${s.rds || ''}</s></i>
                </div>
                <small>${s.label}</small>
            </div>
        `).join('');
    }

    // Desempenho da equipe
    const tbodyEquipe = document.getElementById('adm-tbody-equipe');
    const equipeLista = [...sdrsAtivos].map(membro => {
        const leadsCadastrados = todosLeads.filter(l => (l.responsavel_sdr || '').trim() === membro).length;
        const interMembro = realizadas.filter(i => (i.responsavel || '').trim() === membro);
        const rdsMembro = interMembro.filter(i => norm(i.resultado) === 'rd marcada').length;
        const efetivasMembro = interMembro.filter(ehContatoEfetivo).length;
        const taxaEfetiva = pct(efetivasMembro, interMembro.length);

        return {
            nome: membro,
            leads: leadsCadastrados,
            interacoes: interMembro.length,
            rds: rdsMembro,
            taxaEfetiva
        };
    }).sort((a, b) => b.interacoes - a.interacoes || b.leads - a.leads);

    tbodyEquipe.innerHTML = equipeLista.length
        ? equipeLista.map(m => `
            <tr>
                <td><b>${m.nome}</b></td>
                <td class="n">${m.leads}</td>
                <td class="n">${m.interacoes}</td>
                <td class="n">${m.rds}</td>
                <td>
                    <div class="adm-mb">
                        <div><i style="width: ${m.taxaEfetiva}%;"></i></div>
                        <span>${m.taxaEfetiva}%</span>
                    </div>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" style="color: var(--txt-3); font-size: 13px;">Nenhum membro cadastrado na aba Listas.</td></tr>';

    // Distribuição por Status
    const paletaCores = ['#94a3b8', '#17717f', '#2e8b57', '#d4a336', '#dc2626', '#6366f1', '#0ea5e9', '#ec4899'];
    const ordemStatus = [...(todasListas.status || [])];
    todosLeads.forEach(l => {
        const st = (l.status || '').trim();
        if (st && !ordemStatus.includes(st)) ordemStatus.push(st);
    });

    const dadosStatus = ordemStatus.map((st, idx) => ({
        label: st,
        qtd: todosLeads.filter(l => (l.status || '').trim() === st).length,
        cor: paletaCores[idx % paletaCores.length]
    })).filter(it => it.qtd > 0);

    renderizarBarraEmpilhada('adm-status-panel', dadosStatus, totalLeads);

    // Origem dos Leads & Resultados
    const contagemOrigem = {};
    todosLeads.forEach(l => {
        const orig = (l.origem || '').trim().toUpperCase() || (!(l.responsavel_sdr || '').trim() ? 'SITE' : 'MANUAL');
        contagemOrigem[orig] = (contagemOrigem[orig] || 0) + 1;
    });

    const origensOrdenadas = Object.entries(contagemOrigem).sort((a, b) => b[1] - a[1]);
    const maxOrigem = Math.max(1, ...origensOrdenadas.map(([, v]) => v));
    const origemEl = document.getElementById('adm-origem-bars');

    origemEl.innerHTML = origensOrdenadas.length
        ? origensOrdenadas.map(([orig, qtd]) => `
            <div class="adm-bar">
                <span>${orig}</span>
                <div class="adm-track"><i style="width: ${(qtd / maxOrigem) * 100}%;"></i></div>
                <b>${qtd} (${pct(qtd, totalLeads)}%)</b>
            </div>
        `).join('')
        : '<p style="color: var(--txt-3); font-size: 13px;">Sem leads cadastrados.</p>';

    const ordemResultados = [...(todasListas.resultado || [])];
    realizadas.forEach(i => {
        const res = (i.resultado || '').trim();
        if (res && !ordemResultados.includes(res)) ordemResultados.push(res);
    });

    const corResultado = (res, idx) => {
        const r = norm(res);
        if (r === 'rd marcada') return '#2e8b57';
        if (r === 'atendeu') return '#17717f';
        if (r === 'não atendeu' || r === 'nao atendeu') return '#d4a336';
        if (r === 'sem interesse' || r === 'descartado') return '#dc2626';
        return paletaCores[(idx + 2) % paletaCores.length];
    };

    const dadosResultados = ordemResultados.map((res, idx) => ({
        label: res,
        qtd: realizadas.filter(i => (i.resultado || '').trim() === res).length,
        cor: corResultado(res, idx)
    })).filter(it => it.qtd > 0);

    const semResCount = realizadas.filter(i => !(i.resultado || '').trim()).length;
    if (semResCount > 0) {
        dadosResultados.push({ label: 'Sem resultado', qtd: semResCount, cor: '#94a3b8' });
    }

    renderizarBarraEmpilhada('adm-resultado-panel', dadosResultados, realizadas.length);

    // Leads por Nicho
    const nichosSet = new Set(todasListas.nichos || []);
    todosLeads.forEach(l => { if ((l.nicho || '').trim()) nichosSet.add(l.nicho.trim()); });

    const listaNichos = [...nichosSet].map(nicho => {
        const doNicho = todosLeads.filter(l => (l.nicho || '').trim() === nicho);
        const rdsNicho = doNicho.filter(l => norm(l.status) === 'rd marcada').length;
        return {
            nicho,
            total: doNicho.length,
            rds: rdsNicho,
            conv: pct(rdsNicho, doNicho.length)
        };
    }).filter(n => n.total > 0).sort((a, b) => b.total - a.total);

    const semNicho = todosLeads.filter(l => !(l.nicho || '').trim());
    if (semNicho.length > 0) {
        const rdsSem = semNicho.filter(l => norm(l.status) === 'rd marcada').length;
        listaNichos.push({
            nicho: 'Sem nicho',
            total: semNicho.length,
            rds: rdsSem,
            conv: pct(rdsSem, semNicho.length)
        });
    }

    const tbodyNichos = document.getElementById('adm-tbody-nichos');
    tbodyNichos.innerHTML = listaNichos.length
        ? listaNichos.map(n => `
            <tr>
                <td><b>${n.nicho}</b></td>
                <td class="n">${n.total}</td>
                <td class="n">${n.rds}</td>
                <td>
                    <div class="adm-mb">
                        <div><i style="width: ${n.conv}%;"></i></div>
                        <span>${n.conv}%</span>
                    </div>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" style="color: var(--txt-3); font-size: 13px;">Nenhum nicho registrado.</td></tr>';
}

document.getElementById('refresh-adm-btn')?.addEventListener('click', carregarGerencia);

// Barra de Navegação

const initialActiveBtn = document.querySelector('.navbar-btn.active');
if (initialActiveBtn) {
    navPill.style.transition = 'none';
    moveNavPill(initialActiveBtn);
    setTimeout(() => navPill.style.transition = '', 50);
}

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.navbar-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        moveNavPill(btn);

        const target = btn.dataset.tab;
        mainLayout.classList.add('hidden');
        blankScreens.forEach(screen => screen.classList.remove('active'));

        if (target === 'leads') {
            mainLayout.classList.remove('hidden');
        } else if (target === 'calendar') {
            document.getElementById('screen-calendar')?.classList.add('active');
            carregarAgendamentos();
        } else if (target === 'adm') {
            document.getElementById('screen-adm')?.classList.add('active');
            carregarGerencia();
        }
    });
});

// Inicialização

Promise.all([carregarListas(), carregarLeads()]);