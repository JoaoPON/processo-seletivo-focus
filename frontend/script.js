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

stripToggle.addEventListener('click', () => {
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

function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    if (dataISO.includes("/")) return dataISO;
    const partes = dataISO.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataISO;
}

function preencherSelect(selectEl, opcoes, textoPadrao = null, manterOpcaoNovo = false) {
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

    if (manterOpcaoNovo) {
        const optNovo = document.createElement("option");
        optNovo.value = "novo";
        optNovo.textContent = "+ Criar novo...";
        selectEl.appendChild(optNovo);
    }

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

        preencherSelect(filterSegment, todasListas.nichos || [], "Todos Nichos", true);
        preencherSelect(filterStatus, todasListas.status || [], "Todos Status", true);

        const statusOpcoes = (todasListas.status && todasListas.status.length)
            ? todasListas.status
            : ["Novo", "Em contato", "Reunião marcada", "Proposta enviada", "Fechado", "Perdido"];
        preencherSelect(document.getElementById('detail-status-select'), statusOpcoes);

        const acoesOpcoes = (todasListas.acoes && todasListas.acoes.length)
            ? todasListas.acoes
            : ["Ligação", "WhatsApp", "Reunião", "E-mail"];
        preencherSelect(document.getElementById('interacao-acao'), acoesOpcoes);
        preencherSelect(document.getElementById('interacao-responsavel'), todasListas.membros || [], "Selecione o responsável...");
        preencherSelect(document.getElementById('interacao-resultado'), todasListas.resultado || [], "Sem resultado específico");
        preencherSelect(document.getElementById('lead-sdr'), todasListas.membros || [], "Não atribuído");

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
    const nichoFiltro = filterSegment?.value && filterSegment.value !== "novo" ? filterSegment.value : "";
    const statusFiltro = filterStatus?.value && filterStatus.value !== "novo" ? filterStatus.value : "";

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
    statusSelect.value = lead.status || 'Novo';

    document.getElementById('detail-origin').textContent = lead.origem || 'SITE';
    document.getElementById('detail-contact').textContent = lead.nome_completo || '-';
    document.getElementById('detail-phone').textContent = lead.whatsapp || '-';
    document.getElementById('detail-segment').textContent = [lead.nicho, lead.cidade].filter(Boolean).join(' · ') || '-';
    document.getElementById('detail-email').textContent = lead.email || '-';
    document.getElementById('detail-solution').textContent = lead.solucao_interesse || '-';
    document.getElementById('detail-sdr').textContent = lead.responsavel_sdr || 'Não atribuído';
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

async function salvarStatusLead(novoStatus) {
    if (!leadSelecionadoId) return;
    const resp = await fetch(`${API_BASE}/api/leads/${leadSelecionadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
    });
    if (!resp.ok) throw new Error('Falha ao atualizar status');

    const idx = todosLeads.findIndex(l => l.id === leadSelecionadoId);
    if (idx !== -1) {
        todosLeads[idx].status = novoStatus;
        aplicarFiltrosLeads();
    }

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

document.getElementById('detail-status-select')?.addEventListener('change', async (e) => {
    try {
        await salvarStatusLead(e.target.value);
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
filterSegment?.addEventListener('change', () => {
    if (filterSegment.value === 'novo') {
        openCategoryModal(filterSegment, 'Criar Novo Nicho');
    } else {
        aplicarFiltrosLeads();
    }
});
filterStatus?.addEventListener('change', () => {
    if (filterStatus.value === 'novo') {
        openCategoryModal(filterStatus, 'Criar Novo Status');
    } else {
        aplicarFiltrosLeads();
    }
});

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

// Interacoes do Lead

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

    const dataAg = (item.data_agendada || '').trim();
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
            const chaveA = `${a.data_agendada || '9999-99-99'} ${a.hora_agendada || '99:99'}`;
            const chaveB = `${b.data_agendada || '9999-99-99'} ${b.hora_agendada || '99:99'}`;
            return chaveA.localeCompare(chaveB);
        } else {
            const chaveA = `${a.data_realizada || ''} ${a.hora_realizada || ''}`;
            const chaveB = `${b.data_realizada || ''} ${b.hora_realizada || ''}`;
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
    if (!leadSelecionadoId) {
        alert('Selecione um lead primeiro.');
        return;
    }

    interacaoEditandoId = interacaoId;
    interactionForm.reset();

    const agora = new Date();
    const hojeISO = obterDataHojeISO();
    const horaAtual = agora.toTimeString().slice(0, 5);
    const leadAtual = todosLeads.find(l => l.id === leadSelecionadoId);

    if (!interacaoId) {
        // Criação: 'agendar' ou 'registrar'
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
        // Edição ou Conclusão de registro existente
        const item = interacoesDoLeadAtual.find(i => i.id === interacaoId);
        if (!item) return;

        document.getElementById('interacao-acao').value = item.acao || '';
        document.getElementById('interacao-responsavel').value = item.responsavel || '';
        document.getElementById('interacao-pauta').value = item.pauta || '';
        document.getElementById('interacao-observacoes').value = item.observacoes || '';

        const jaRealizada = Boolean((item.data_realizada || '').trim());

        if (modo === 'concluir' || jaRealizada) {
            configurarCamposModalInteracao(modo === 'concluir' ? 'concluir' : 'editar-realizada');
            document.getElementById('interaction-modal-title').textContent =
                modo === 'concluir' ? 'Concluir Agendamento' : 'Editar Interação';

            document.getElementById('interacao-data-realizada').value = item.data_realizada || hojeISO;
            document.getElementById('interacao-hora-realizada').value = item.hora_realizada || horaAtual;
            document.getElementById('interacao-resultado').value = item.resultado || '';
        } else {
            // Editando um item que ainda está agendado
            configurarCamposModalInteracao('agendar');
            document.getElementById('interaction-modal-title').textContent = 'Editar Agendamento';
            document.getElementById('interacao-data-agendada').value = item.data_agendada || '';
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
                body: JSON.stringify({ id_lead: leadSelecionadoId, ...dados })
            });
        }

        if (!resp.ok) throw new Error('Erro ao salvar interação');

        // Automatização do status
        if (dados.data_realizada) {
            const leadAtual = todosLeads.find(l => l.id === leadSelecionadoId);
            if (leadAtual && (!leadAtual.status || leadAtual.status === 'Novo')) {
                await salvarStatusLead('Em contato');
            }
        }

        callModal.classList.remove('active');
        await carregarInteracoesDoLead(leadSelecionadoId);
    } catch (erro) {
        alert('Não foi possível salvar a interação.');
        console.error(erro);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
});

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
        } else {
            document.getElementById(`screen-${target}`)?.classList.add('active');
        }
    });
});

// Popup de novo nicho e status
const categoryModal = document.getElementById('category-modal');
const categoryModalTitle = document.getElementById('category-modal-title');
const categoryNameInput = document.getElementById('category-name-input');
const categoryColorInput = document.getElementById('category-color-input');
const colorHexLabel = document.getElementById('color-hex-label');
const closeCategoryBtn = document.getElementById('close-category-btn');
const saveCategoryBtn = document.getElementById('save-category-btn');

let activeSelect = null;

function openCategoryModal(selectElement, title) {
    activeSelect = selectElement;
    categoryModalTitle.textContent = title;
    categoryNameInput.value = '';
    categoryColorInput.value = '#dcfce7';
    colorHexLabel.textContent = '#dcfce7';

    categoryModal.classList.add('active');
    setTimeout(() => categoryNameInput.focus(), 100);
}

function closeCategoryModal() {
    categoryModal.classList.remove('active');
    if (activeSelect && activeSelect.value === 'novo') {
        activeSelect.value = '';
    }
    activeSelect = null;
}

categoryColorInput?.addEventListener('input', (e) => {
    colorHexLabel.textContent = e.target.value;
});

closeCategoryBtn?.addEventListener('click', closeCategoryModal);
categoryModal?.addEventListener('click', (e) => {
    if (e.target === categoryModal) closeCategoryModal();
});

saveCategoryBtn?.addEventListener('click', () => {
    const name = categoryNameInput.value.trim();
    if (!name) {
        categoryNameInput.focus();
        return;
    }

    if (activeSelect) {
        const newOption = document.createElement('option');
        newOption.value = name;
        newOption.textContent = name;
        newOption.dataset.color = categoryColorInput.value;

        activeSelect.insertBefore(newOption, activeSelect.querySelector('option[value="novo"]'));
        activeSelect.value = name;
        aplicarFiltrosLeads();
    }

    categoryModal.classList.remove('active');
    activeSelect = null;
});

// Inicialização

Promise.all([carregarListas(), carregarLeads()]);