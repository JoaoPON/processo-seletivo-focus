import {
    state,
    ehGestor,
    gerarIniciais,
    obterDataHojeISO,
    normalizarDataISO,
    formatarDataBR,
    fetchAuth
} from './state.js';

const mainLayout = document.getElementById('main-layout');
const detailName = document.getElementById('detail-name');
const stripToggle = document.getElementById('leads-strip-toggle');
const clientListContainer = document.getElementById('client-list');
const searchInput = document.getElementById('search-input');
const filterSegment = document.getElementById('segments');
const filterStatus = document.getElementById('status');

let interacoesDoLeadAtual = [];
let leadEditandoId = null;
let interacaoEditandoId = null;
let interacaoLeadAlvoId = null;
let modoModalInteracao = 'registrar';
let aoAtualizarAgendaCallback = null;

export function registrarCallbackAgenda(fn) {
    aoAtualizarAgendaCallback = fn;
}

stripToggle?.addEventListener('click', () => {
    mainLayout.classList.toggle('leads-expanded');
});

export function aplicarFiltrosLeads() {
    const termo = (searchInput?.value || "").toLowerCase().trim();
    const nichoFiltro = filterSegment?.value || "";
    const statusFiltro = filterStatus?.value || "";

    const filtrados = state.todosLeads.filter(l => {
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
    if (!clientListContainer) return;
    if (!lista.length) {
        clientListContainer.innerHTML = '<p style="padding: 20px; color: var(--txt-3); font-size: 13px;">Nenhum lead encontrado.</p>';
        return;
    }

    clientListContainer.innerHTML = lista.map(lead => `
        <button class="client-item ${lead.id === state.leadSelecionadoId ? 'selected' : ''}" data-id="${lead.id}">
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

export function preencherDetalhesLead(lead) {
    if (!lead) return;
    state.leadSelecionadoId = lead.id;

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
    if (!leadIdAlvo) return;
    const resp = await fetchAuth(`/api/leads/${leadIdAlvo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
    });
    if (!resp.ok) throw new Error('Falha ao atualizar status');

    const idx = state.todosLeads.findIndex(l => l.id === leadIdAlvo);
    if (idx !== -1) {
        state.todosLeads[idx].status = novoStatus;
        aplicarFiltrosLeads();
    }

    if (leadIdAlvo === state.leadSelecionadoId) {
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
        await salvarStatusLead(state.leadSelecionadoId, e.target.value);
    } catch (erro) {
        alert('Não foi possível atualizar o status na planilha.');
        console.error(erro);
    }
});

export async function carregarLeads() {
    try {
        const resp = await fetchAuth("/api/leads");
        if (!resp.ok) throw new Error('Falha ao buscar leads');
        state.todosLeads = await resp.json();
        aplicarFiltrosLeads();

        if (state.leadSelecionadoId) {
            const atualizado = state.todosLeads.find(l => l.id === state.leadSelecionadoId);
            if (atualizado) preencherDetalhesLead(atualizado);
        }
    } catch (erro) {
        console.error(erro);
        if (clientListContainer) {
            clientListContainer.innerHTML = '<p style="padding: 20px; color: #dc2626; font-size: 13px;">Erro ao conectar com o servidor.</p>';
        }
    }
}

clientListContainer?.addEventListener('click', (e) => {
    const item = e.target.closest('.client-item');
    if (!item) return;

    document.querySelector('.client-item.selected')?.classList.remove('selected');
    item.classList.add('selected');

    const lead = state.todosLeads.find(l => l.id === item.dataset.id);
    preencherDetalhesLead(lead);
});

searchInput?.addEventListener('input', aplicarFiltrosLeads);
filterSegment?.addEventListener('change', aplicarFiltrosLeads);
filterStatus?.addEventListener('change', aplicarFiltrosLeads);

document.getElementById('refresh-leads-btn1')?.addEventListener('click', carregarLeads);
document.getElementById('refresh-leads-btn2')?.addEventListener('click', carregarLeads);

// Modal Criar / Editar Lead
const newLeadBtn = document.getElementById('new-lead-btn');
const editLeadBtn = document.getElementById('edit-lead-btn');
const newLeadModal = document.getElementById('new-lead-modal');
const closeNewLeadBtn = document.getElementById('close-new-lead-btn');
const newLeadForm = document.getElementById('new-lead-form');

function definirSelectSDR(valor, travado) {
    const sdrSelect = document.getElementById('lead-sdr');
    if (!sdrSelect) return;

    if (valor && ![...sdrSelect.options].some(o => o.value === valor)) {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = valor;
        sdrSelect.appendChild(opt);
    }
    sdrSelect.value = valor || '';
    sdrSelect.disabled = travado;
}

newLeadBtn?.addEventListener('click', () => {
    leadEditandoId = null;
    document.getElementById('lead-modal-title').textContent = 'Novo Lead';
    document.getElementById('submit-new-lead-btn').textContent = 'Salvar Lead';
    newLeadForm.reset();

    definirSelectSDR(state.sessaoAtual.nome, true);
    newLeadModal.classList.add('active');
});

editLeadBtn?.addEventListener('click', () => {
    if (!state.leadSelecionadoId) return;
    const lead = state.todosLeads.find(l => l.id === state.leadSelecionadoId);
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

    const sdrPadrao = lead.responsavel_sdr || state.sessaoAtual.nome || '';
    definirSelectSDR(sdrPadrao, !ehGestor());

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
            const patchDados = { ...payload };
            if (ehGestor()) {
                patchDados.responsavel_sdr = sdrSelecionado;
            }
            const resp = await fetchAuth(`/api/leads/${leadEditandoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchDados)
            });
            if (!resp.ok) throw new Error('Erro ao editar lead');
        } else {
            const resp = await fetchAuth(`/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error('Erro ao cadastrar lead');
            const resultado = await resp.json();
            state.leadSelecionadoId = resultado.id;
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

// Histórico e Modal de Interações
async function carregarInteracoesDoLead(leadId) {
    const box = document.getElementById('lead-history-list');
    if (!box) return;
    box.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Carregando histórico...</p>';

    try {
        const resp = await fetchAuth(`/api/leads/${leadId}/interacoes`);
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

    const ordenada = [...lista].sort((a, b) => {
        const infoA = classificarInteracao(a, hojeISO);
        const infoB = classificarInteracao(b, hojeISO);

        if (infoA.ordem !== infoB.ordem) return infoA.ordem - infoB.ordem;

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
    const respSelect = document.getElementById('interacao-responsavel');

    if (!interacaoId) {
        if (!state.leadSelecionadoId) {
            alert('Selecione um lead primeiro.');
            return;
        }
        interacaoLeadAlvoId = state.leadSelecionadoId;
        const leadAtual = state.todosLeads.find(l => l.id === state.leadSelecionadoId);

        configurarCamposModalInteracao(modo);
        document.getElementById('interaction-modal-title').textContent =
            modo === 'agendar' ? 'Agendar Interação' : 'Registrar Interação';

        const respPadrao = state.sessaoAtual.nome || leadAtual?.responsavel_sdr || '';
        if (respSelect && respPadrao) {
            if (![...respSelect.options].some(o => o.value === respPadrao)) {
                const opt = document.createElement('option');
                opt.value = respPadrao;
                opt.textContent = respPadrao;
                respSelect.appendChild(opt);
            }
            respSelect.value = respPadrao;
        }

        if (modo === 'registrar') {
            document.getElementById('interacao-data-realizada').value = hojeISO;
            document.getElementById('interacao-hora-realizada').value = horaAtual;
        }
    } else {
        const item = interacoesDoLeadAtual.find(i => i.id === interacaoId)
            || state.todasInteracoes.find(i => i.id === interacaoId);
        if (!item) return;

        interacaoLeadAlvoId = item.id_lead || state.leadSelecionadoId;

        document.getElementById('interacao-acao').value = item.acao || '';
        if (respSelect) {
            const respValor = item.responsavel || state.sessaoAtual.nome || '';
            if (respValor && ![...respSelect.options].some(o => o.value === respValor)) {
                const opt = document.createElement('option');
                opt.value = respValor;
                opt.textContent = respValor;
                respSelect.appendChild(opt);
            }
            respSelect.value = respValor;
        }
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
            resp = await fetchAuth(`/api/interacoes/${interacaoEditandoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        } else {
            resp = await fetchAuth(`/api/interacoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lead: interacaoLeadAlvoId, ...dados })
            });
        }

        if (!resp.ok) throw new Error('Erro ao salvar interação');

        if (dados.data_realizada && interacaoLeadAlvoId) {
            const leadAtual = state.todosLeads.find(l => l.id === interacaoLeadAlvoId);
            if (leadAtual && (!leadAtual.status || leadAtual.status === 'Novo')) {
                await salvarStatusLead(interacaoLeadAlvoId, 'Em contato');
            }
        }

        callModal.classList.remove('active');

        if (state.leadSelecionadoId) {
            await carregarInteracoesDoLead(state.leadSelecionadoId);
        }
        if (document.getElementById('screen-calendar')?.classList.contains('active') && aoAtualizarAgendaCallback) {
            await aoAtualizarAgendaCallback();
        }
    } catch (erro) {
        alert('Não foi possível salvar a interação.');
        console.error(erro);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
});