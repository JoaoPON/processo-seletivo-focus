export const API_BASE = "";

export const state = {
    sessaoAtual: { usuario: "", nome: "", cargo: "sdr" },
    todosLeads: [],
    todasInteracoes: [],
    todasListas: {
        nichos: [],
        cidades: [],
        membros: [],
        origem: [],
        status: [],
        acoes: [],
        prioridade_ia: [],
        status_ia: [],
        resultado: []
    },
    leadSelecionadoId: null,
};

export const ehGestor = () => ["gerencia", "admin"].includes((state.sessaoAtual.cargo || "").toLowerCase());
export const ehAdmin = () => (state.sessaoAtual.cargo || "").toLowerCase() === "admin";

export function gerarIniciais(texto) {
    if (!texto) return "LD";
    return texto.trim().slice(0, 2).toUpperCase();
}

export function obterDataHojeISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function normalizarDataISO(dataStr) {
    if (!dataStr) return "";
    const limpo = String(dataStr).trim().split("T")[0].split(" ")[0];
    if (limpo.includes("/")) {
        const partes = limpo.split("/");
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
    }
    return limpo;
}

export function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    const limpo = String(dataISO).trim().split("T")[0].split(" ")[0];
    if (limpo.includes("/")) return limpo;
    const partes = limpo.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return limpo;
}

export function preencherSelect(selectEl, opcoes, textoPadrao = null) {
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

export async function fetchAuth(url, options = {}) {
    const resp = await fetch(`${API_BASE}${url}`, options);
    if (resp.status === 401) {
        window.location.href = "/";
        throw new Error("Sessão expirada");
    }
    return resp;
}

export async function carregarSessaoAtual(onRestrito) {
    const resp = await fetchAuth("/me");
    if (!resp.ok) throw new Error("Não autenticado");
    state.sessaoAtual = await resp.json();

    if (!ehGestor()) {
        document.getElementById("nav-btn-adm")?.remove();
        document.querySelector('.navbar-btn[data-tab="adm"]')?.remove();
        document.getElementById("screen-adm")?.remove();
        if (onRestrito) onRestrito();
    }
}

export async function carregarListas() {
    try {
        const resp = await fetchAuth("/api/listas");
        if (!resp.ok) throw new Error('Falha ao buscar listas');
        state.todasListas = await resp.json();

        preencherSelect(document.getElementById('segments'), state.todasListas.nichos || [], "Todos Nichos");
        preencherSelect(document.getElementById('status'), state.todasListas.status || [], "Todos Status");

        const statusOpcoes = (state.todasListas.status && state.todasListas.status.length)
            ? state.todasListas.status
            : ["Novo", "Em contato", "RD marcada", "Contrato", "Descartado"];
        preencherSelect(document.getElementById('detail-status-select'), statusOpcoes);

        const acoesOpcoes = (state.todasListas.acoes && state.todasListas.acoes.length)
            ? state.todasListas.acoes
            : ["Ligar", "WhatsApp", "E-mail", "Outro"];
        preencherSelect(document.getElementById('interacao-acao'), acoesOpcoes);
        preencherSelect(document.getElementById('interacao-responsavel'), state.todasListas.membros || [], "Selecione o responsável...");
        preencherSelect(document.getElementById('interacao-resultado'), state.todasListas.resultado || [], "Sem resultado específico");
        preencherSelect(document.getElementById('lead-sdr'), state.todasListas.membros || [], "Não atribuído");

        preencherSelect(document.getElementById('cal-filter-resp'), state.todasListas.membros || [], "Todos Responsáveis");
        preencherSelect(document.getElementById('cal-filter-acao'), acoesOpcoes, "Todas Ações");

        const dlNichos = document.getElementById('lista-nichos-options');
        if (dlNichos) {
            dlNichos.innerHTML = (state.todasListas.nichos || []).map(n => `<option value="${n}">`).join('');
        }
        const dlCidades = document.getElementById('lista-cidades-options');
        if (dlCidades) {
            dlCidades.innerHTML = (state.todasListas.cidades || []).map(c => `<option value="${c}">`).join('');
        }
    } catch (erro) {
        console.error("Erro ao carregar listas:", erro);
    }
}