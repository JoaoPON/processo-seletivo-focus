import {
    state,
    ehAdmin,
    normalizarDataISO,
    fetchAuth,
    carregarListas
} from './state.js';
import { aplicarFiltrosLeads } from './leads.js';

export async function carregarGerencia() {
    const btn = document.getElementById('refresh-adm-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Atualizando...';
    }

    try {
        const respLeads = await fetchAuth("/api/leads");
        if (!respLeads.ok) throw new Error(`Erro ao buscar leads (HTTP ${respLeads.status})`);
        state.todosLeads = await respLeads.json();

        const respInteracoes = await fetchAuth("/api/interacoes");
        if (!respInteracoes.ok) throw new Error(`Erro ao buscar interações (HTTP ${respInteracoes.status})`);
        state.todasInteracoes = await respInteracoes.json();

        carregarListas().catch(err => console.warn('Aviso ao atualizar listas:', err));

        aplicarFiltrosLeads();
        renderizarGerencia();
    } catch (erro) {
        console.error('Erro detalhado na Gerência:', erro);
        alert(`Não foi possível atualizar os dados do painel.\nDetalhe: ${erro.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Atualizar Painel';
        }
    }
}

function obterInicioSemanaISO(dataISO) {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const dt = new Date(ano, mes - 1, dia);
    const diff = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - diff);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatarDiaMes(dataISO) {
    const [, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}`;
}

export function renderizarGerencia() {
    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
    const norm = (txt) => String(txt ?? '').trim().toLowerCase();
    const setTxt = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    };

    const realizadas = state.todasInteracoes.filter(i => Boolean(String(i.data_realizada ?? '').trim()));

    const ehContatoEfetivo = (i) => {
        const res = norm(i.resultado);
        return res === 'atendeu' || res === 'rd marcada';
    };

    const efetivasCount = realizadas.filter(ehContatoEfetivo).length;
    const leadsTrabalhadosSet = new Set(realizadas.map(i => i.id_lead).filter(Boolean));
    const totalLeads = state.todosLeads.length;
    const trabalhadosCount = state.todosLeads.filter(l => leadsTrabalhadosSet.has(l.id)).length;
    const semContatoCount = Math.max(0, totalLeads - trabalhadosCount);
    const reunioesMarcadasCount = state.todosLeads.filter(l => norm(l.status) === 'rd marcada').length;

    setTxt('adm-kpi-leads', totalLeads);
    setTxt('adm-kpi-trabalhados', `${trabalhadosCount} já trabalhados`);
    setTxt('adm-kpi-interacoes', realizadas.length);
    setTxt('adm-kpi-efetivo', `${pct(efetivasCount, realizadas.length)}% com contato efetivo`);
    setTxt('adm-kpi-reunioes', reunioesMarcadasCount);
    setTxt('adm-kpi-conversao', `${pct(reunioesMarcadasCount, trabalhadosCount)}% dos leads convertidos`);
    setTxt('adm-kpi-sem-contato', semContatoCount);

    // 1. Gráfico de barras verticais por semana
    const semanasMap = {};
    realizadas.forEach(i => {
        const dISO = normalizarDataISO(i.data_realizada);
        if (!dISO || dISO.length < 10) return;
        const sem = obterInicioSemanaISO(dISO);
        if (!semanasMap[sem]) semanasMap[sem] = { total: 0, reunioes: 0 };
        semanasMap[sem].total += 1;
        if (norm(i.resultado) === 'rd marcada') semanasMap[sem].reunioes += 1;
    });

    const semanasOrdenadas = Object.keys(semanasMap).sort().slice(-8);
    const chartEl = document.getElementById('adm-chart-semanal');
    if (chartEl) {
        if (!semanasOrdenadas.length) {
            chartEl.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Sem interações realizadas para exibir.</p>';
        } else {
            const maxVal = Math.max(...semanasOrdenadas.map(s => semanasMap[s].total), 1);
            chartEl.innerHTML = semanasOrdenadas.map(sem => {
                const { total, reunioes } = semanasMap[sem];
                const hTotal = Math.round((total / maxVal) * 100);
                const hReuniao = Math.round((reunioes / maxVal) * 100);
                return `
                    <div>
                        <div class="bs">
                            <i style="height: ${hTotal}%; background: var(--navbar);" title="${total} interações">
                                ${total > 0 ? `<s>${total}</s>` : ''}
                            </i>
                            <i style="height: ${hReuniao}%; background: var(--btn);" title="${reunioes} reuniões marcadas">
                                ${reunioes > 0 ? `<s>${reunioes}</s>` : ''}
                            </i>
                        </div>
                        <small>${formatarDiaMes(sem)}</small>
                    </div>
                `;
            }).join('');
        }
    }

    // 2. Desempenho da equipe
    const sdrsAtivos = new Set([
        ...(state.todasListas.membros || []),
        ...state.todosLeads.map(l => String(l.responsavel_sdr ?? '').trim()).filter(Boolean),
        ...realizadas.map(i => String(i.responsavel ?? '').trim()).filter(Boolean)
    ]);

    const tbodyEquipe = document.getElementById('adm-tbody-equipe');
    if (tbodyEquipe) {
        const sdrsLista = Array.from(sdrsAtivos).sort();
        tbodyEquipe.innerHTML = sdrsLista.length
            ? sdrsLista.map(sdr => {
                const leadsDoSdr = state.todosLeads.filter(l => String(l.responsavel_sdr ?? '').trim() === sdr);
                const intsDoSdr = realizadas.filter(i => String(i.responsavel ?? '').trim() === sdr);
                const rdsDoSdr = intsDoSdr.filter(i => norm(i.resultado) === 'rd marcada').length;
                const efetivasSdr = intsDoSdr.filter(ehContatoEfetivo).length;
                const txEfetivo = pct(efetivasSdr, intsDoSdr.length);

                return `
                    <tr>
                        <td><strong>${sdr}</strong></td>
                        <td class="n">${leadsDoSdr.length}</td>
                        <td class="n">${intsDoSdr.length}</td>
                        <td class="n">${rdsDoSdr}</td>
                        <td>
                            <div class="adm-mb">
                                <div><i style="width: ${txEfetivo}%;"></i></div>
                                <span>${txEfetivo}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="5" style="color: var(--txt-3);">Nenhum membro encontrado.</td></tr>';
    }

    // 3. Distribuição por Status
    const statusPanel = document.getElementById('adm-status-panel');
    if (statusPanel) {
        const statusMap = {};
        state.todosLeads.forEach(l => {
            const st = String(l.status ?? '').trim() || 'Novo';
            statusMap[st] = (statusMap[st] || 0) + 1;
        });

        const coresStatus = {
            'novo': '#6591d3',
            'em contato': '#eba919',
            'rd marcada': '#15803d',
            'contrato': '#0d9488',
            'descartado': '#94a3b8'
        };
        const paletteExtra = ['#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
        let extraIdx = 0;

        const statusOrdenados = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
        if (!statusOrdenados.length) {
            statusPanel.innerHTML = '<p style="color: var(--txt-3); font-size: 13px;">Sem leads cadastrados.</p>';
        } else {
            const itens = statusOrdenados.map(([st, qtd]) => {
                const cor = coresStatus[norm(st)] || paletteExtra[extraIdx++ % paletteExtra.length];
                const p = pct(qtd, totalLeads);
                return { st, qtd, p, cor };
            });

            const barraHTML = itens.map(it =>
                `<i style="width: ${it.p}%; background: ${it.cor};" title="${it.st}: ${it.qtd} (${it.p}%)"></i>`
            ).join('');

            const legendaHTML = itens.map(it =>
                `<span><u style="background: ${it.cor};"></u>${it.st}<b>${it.qtd} (${it.p}%)</b></span>`
            ).join('');

            statusPanel.innerHTML = `
                <div class="adm-stk">${barraHTML}</div>
                <div class="adm-lg">${legendaHTML}</div>
            `;
        }
    }

    // 4. Origem dos Leads & Resultados
    const origemEl = document.getElementById('adm-origem-bars');
    if (origemEl) {
        const origMap = {};
        state.todosLeads.forEach(l => {
            const orig = String(l.origem ?? '').trim() || 'SITE';
            origMap[orig] = (origMap[orig] || 0) + 1;
        });

        const origOrdenadas = Object.entries(origMap).sort((a, b) => b[1] - a[1]);
        origemEl.innerHTML = origOrdenadas.length
            ? origOrdenadas.map(([orig, qtd]) => {
                const p = pct(qtd, totalLeads);
                return `
                    <div class="adm-bar">
                        <span>${orig}</span>
                        <div class="adm-track"><i style="width: ${p}%;"></i></div>
                        <b>${qtd}</b>
                    </div>
                `;
            }).join('')
            : '<p style="color: var(--txt-3); font-size: 13px;">Sem dados de origem.</p>';
    }

    const resEl = document.getElementById('adm-resultado-panel');
    if (resEl) {
        const resMap = {};
        realizadas.forEach(i => {
            const r = String(i.resultado ?? '').trim() || 'Sem resultado';
            resMap[r] = (resMap[r] || 0) + 1;
        });

        const resOrdenados = Object.entries(resMap).sort((a, b) => b[1] - a[1]);
        resEl.innerHTML = resOrdenados.length
            ? resOrdenados.map(([r, qtd]) => {
                const p = pct(qtd, realizadas.length);
                return `
                    <div class="adm-bar">
                        <span>${r}</span>
                        <div class="adm-track"><i style="width: ${p}%; background: var(--stts-txt);"></i></div>
                        <b>${qtd}</b>
                    </div>
                `;
            }).join('')
            : '<p style="color: var(--txt-3); font-size: 13px;">Sem resultados registrados.</p>';
    }

    // 5. Leads por Nicho
    const tbodyNichos = document.getElementById('adm-tbody-nichos');
    if (tbodyNichos) {
        const nichoMap = {};
        state.todosLeads.forEach(l => {
            const n = String(l.nicho ?? '').trim() || 'Geral';
            if (!nichoMap[n]) nichoMap[n] = { leads: 0, rds: 0 };
            nichoMap[n].leads += 1;
            if (norm(l.status) === 'rd marcada') nichoMap[n].rds += 1;
        });

        const nichosOrdenados = Object.entries(nichoMap).sort((a, b) => b[1].leads - a[1].leads);
        tbodyNichos.innerHTML = nichosOrdenados.length
            ? nichosOrdenados.map(([nicho, st]) => {
                const conv = pct(st.rds, st.leads);
                return `
                    <tr>
                        <td><strong>${nicho}</strong></td>
                        <td class="n">${st.leads}</td>
                        <td class="n">${st.rds}</td>
                        <td>
                            <div class="adm-mb">
                                <div><i style="width: ${conv}%;"></i></div>
                                <span>${conv}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="4" style="color: var(--txt-3);">Sem dados de nicho.</td></tr>';
    }
}

document.getElementById('refresh-adm-btn')?.addEventListener('click', carregarGerencia);

// Modal Criar e Excluir Contas
export function iniciarModalContas() {
    const tela = document.getElementById("screen-adm");
    const overlay = document.getElementById("conta-overlay");
    if (!tela || !overlay) return;

    const admTop = tela.querySelector(".adm-top");
    const botaoContas = document.createElement("button");
    botaoContas.type = "button";
    botaoContas.className = "list";
    botaoContas.id = "abrir-contas";
    botaoContas.textContent = "Gerenciar contas";

    if (admTop) {
        const grupoBtns = document.createElement("div");
        grupoBtns.style.display = "flex";
        grupoBtns.style.gap = "8px";
        grupoBtns.style.alignItems = "center";

        const btnRefresh = document.getElementById("refresh-adm-btn");
        grupoBtns.appendChild(botaoContas);
        if (btnRefresh) grupoBtns.appendChild(btnRefresh);
        admTop.appendChild(grupoBtns);
    }

    let aguardandoConfirmacao = false;
    const btnExcluir = document.querySelector('#form-excluir button[type="submit"]');

    function resetarBotaoExcluir() {
        aguardandoConfirmacao = false;
        if (btnExcluir) btnExcluir.textContent = "Excluir Conta";
    }

    async function atualizarListaContas() {
        const selectExcluir = document.getElementById("excluir-usuario");
        const selectCargo = document.getElementById("criar-cargo");

        if (selectCargo) {
            const optGerencia = selectCargo.querySelector('option[value="gerencia"]');
            if (optGerencia) optGerencia.hidden = !ehAdmin();
            if (!ehAdmin()) selectCargo.value = "sdr";
        }

        if (!selectExcluir) return;
        try {
            const resp = await fetchAuth("/contas");
            if (!resp.ok) return;
            const contas = await resp.json();

            selectExcluir.innerHTML = "";
            if (!contas.length) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "Nenhuma conta disponível para exclusão";
                selectExcluir.appendChild(opt);
                return;
            }

            const optPadrao = document.createElement("option");
            optPadrao.value = "";
            optPadrao.textContent = "Selecione um perfil...";
            selectExcluir.appendChild(optPadrao);

            contas.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.usuario;
                const labelCargo = (c.cargo || "").toLowerCase() === "gerencia" ? "Gerência" : "SDR";
                opt.textContent = `${c.nome} (@${c.usuario}) · ${labelCargo}`;
                selectExcluir.appendChild(opt);
            });
        } catch (err) {
            console.error("Erro ao carregar contas:", err);
        }
    }

    const abrir = () => {
        document.getElementById("criar-msg").textContent = "";
        document.getElementById("excluir-msg").textContent = "";
        resetarBotaoExcluir();
        atualizarListaContas();
        overlay.classList.add("aberto");
    };
    const fechar = () => {
        resetarBotaoExcluir();
        overlay.classList.remove("aberto");
    };

    botaoContas.addEventListener("click", abrir);
    overlay.querySelectorAll(".conta-fechar").forEach((b) => b.addEventListener("click", fechar));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) fechar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });

    overlay.querySelectorAll(".conta-tab").forEach((aba) => {
        aba.addEventListener("click", () => {
            overlay.querySelectorAll(".conta-tab").forEach((a) => a.classList.remove("ativa"));
            aba.classList.add("ativa");
            resetarBotaoExcluir();
            document.getElementById("criar-msg").textContent = "";
            document.getElementById("excluir-msg").textContent = "";
            document.getElementById("form-criar").hidden = aba.dataset.form !== "form-criar";
            document.getElementById("form-excluir").hidden = aba.dataset.form !== "form-excluir";
            if (aba.dataset.form === "form-excluir") atualizarListaContas();
        });
    });

    document.getElementById("excluir-usuario")?.addEventListener("change", resetarBotaoExcluir);

    function mostrarMsg(el, texto, tipo) {
        el.textContent = texto;
        el.className = "conta-msg " + tipo;
    }

    async function enviarConta(url, corpo) {
        const resp = await fetchAuth(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
        });
        let dados = {};
        try { dados = await resp.json(); } catch {}
        const detalhe = typeof dados.detail === "string"
            ? dados.detail : "Preencha todos os campos corretamente.";
        return { ok: resp.ok, detalhe };
    }

    document.getElementById("form-criar")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = document.getElementById("criar-msg");
        mostrarMsg(msg, "", "");
        try {
            const cargoEl = document.getElementById("criar-cargo");
            const r = await enviarConta("/contas", {
                nome: document.getElementById("criar-nome").value,
                usuario: document.getElementById("criar-usuario").value,
                senha: document.getElementById("criar-senha").value,
                cargo: cargoEl ? cargoEl.value : "sdr",
            });
            if (r.ok) {
                e.target.reset();
                await atualizarListaContas();
                mostrarMsg(msg, "Conta criada com sucesso!", "ok");
            } else {
                mostrarMsg(msg, r.detalhe, "erro");
            }
        } catch {
            mostrarMsg(msg, "Não foi possível conectar ao servidor.", "erro");
        }
    });

    document.getElementById("form-excluir")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = document.getElementById("excluir-msg");
        mostrarMsg(msg, "", "");
        const selectExcluir = document.getElementById("excluir-usuario");
        const usuario = selectExcluir.value;

        if (!usuario) {
            mostrarMsg(msg, "Selecione uma conta para excluir.", "erro");
            return;
        }

        if (!aguardandoConfirmacao) {
            aguardandoConfirmacao = true;
            if (btnExcluir) btnExcluir.textContent = "Confirmar exclusão";
            mostrarMsg(msg, "Clique novamente para confirmar a exclusão permanente.", "erro");
            return;
        }

        try {
            const r = await enviarConta("/contas/excluir", {
                usuario: usuario,
                senha_atual: document.getElementById("excluir-senha").value,
            });
            resetarBotaoExcluir();
            if (r.ok) {
                e.target.reset();
                await atualizarListaContas();
                mostrarMsg(msg, "Conta excluída com sucesso.", "ok");
            } else {
                mostrarMsg(msg, r.detalhe, "erro");
            }
        } catch {
            resetarBotaoExcluir();
            mostrarMsg(msg, "Não foi possível conectar ao servidor.", "erro");
        }
    });
}