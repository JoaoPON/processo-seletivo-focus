import {
    state,
    obterDataHojeISO,
    normalizarDataISO,
    formatarDataBR,
    fetchAuth
} from './state.js';
import { carregarLeads, aplicarFiltrosLeads, preencherDetalhesLead } from './leads.js';

let aoAbrirLeadCallback = null;

export function registrarCallbackAbrirLead(fn) {
    aoAbrirLeadCallback = fn;
}

export async function carregarAgendamentos() {
    const container = document.getElementById('calendar-sections');
    if (container) {
        container.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Atualizando agenda...</p>';
    }

    try {
        if (!state.todosLeads.length) {
            await carregarLeads();
        }
        const resp = await fetchAuth("/api/interacoes");
        if (!resp.ok) throw new Error('Falha ao buscar interações');
        state.todasInteracoes = await resp.json();
        renderizarAgendamentos();
    } catch (erro) {
        console.error(erro);
        if (container) {
            container.innerHTML = '<p style="color: #dc2626; font-size: 13px;">Erro ao carregar agendamentos.</p>';
        }
    }
}

export function renderizarAgendamentos() {
    const container = document.getElementById('calendar-sections');
    if (!container) return;

    const hojeISO = obterDataHojeISO();
    const leadsMap = Object.fromEntries(state.todosLeads.map(l => [l.id, l]));

    const agendados = state.todasInteracoes
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
    const lead = state.todosLeads.find(l => l.id === leadId);
    if (!lead) {
        alert('Lead não encontrado na lista.');
        return;
    }

    if (aoAbrirLeadCallback) aoAbrirLeadCallback();

    state.leadSelecionadoId = lead.id;
    aplicarFiltrosLeads();
    preencherDetalhesLead(lead);
};

document.getElementById('refresh-calendar-btn')?.addEventListener('click', carregarAgendamentos);
document.getElementById('cal-search')?.addEventListener('input', renderizarAgendamentos);
document.getElementById('cal-filter-resp')?.addEventListener('change', renderizarAgendamentos);
document.getElementById('cal-filter-acao')?.addEventListener('change', renderizarAgendamentos);
document.getElementById('cal-filter-situacao')?.addEventListener('change', renderizarAgendamentos);