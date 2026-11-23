const API_BASE = window.location.port === "5500" ? "http://127.0.0.1:8000" : "";

// Referências principais e responsividade
const mainLayout = document.getElementById('main-layout');
const detailName = document.getElementById('detail-name');
const stripToggle = document.getElementById('leads-strip-toggle');
const clientListContainer = document.getElementById('client-list');
const searchInput = document.getElementById('search-input');

const navButtons = document.querySelectorAll('.navbar-btn[data-tab]');
const blankScreens = document.querySelectorAll('.blank-screen');
const navPill = document.getElementById('nav-pill');

let todosLeads = [];
let leadSelecionadoId = null;

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

// ==================== LEITURA E CRIAÇÃO DE LEADS ====================

function gerarIniciais(texto) {
    if (!texto) return "LD";
    return texto.trim().slice(0, 2).toUpperCase();
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
    document.getElementById('detail-status').textContent = lead.status || 'Novo';
    document.getElementById('detail-contact').textContent = lead.nome_completo || '-';
    document.getElementById('detail-phone').textContent = lead.whatsapp || '-';
    document.getElementById('detail-segment').textContent = [lead.nicho, lead.cidade].filter(Boolean).join(' · ') || '-';
    document.getElementById('detail-email').textContent = lead.email || '-';
    document.getElementById('detail-solution').textContent = lead.solucao_interesse || '-';
    document.getElementById('detail-origin').textContent = lead.origem || '-';
    document.getElementById('detail-description').textContent = lead.descricao || '-';

    // Dados da IA (Gemini)
    const statusIa = lead.status_ia || 'Pendente';
    const prioridade = lead.prioridade_ia ? ` · Prioridade ${lead.prioridade_ia}` : '';
    const nota = lead.indicador_intencao ? ` (${lead.indicador_intencao}/100)` : '';
    document.getElementById('detail-ia-badge').textContent = `IA: ${statusIa}${prioridade}${nota}`;

    document.getElementById('detail-ia-justificativa').textContent =
        lead.justificativa_ia || 'A IA está processando este lead. Clique em "Atualizar" em alguns segundos.';

    document.getElementById('detail-ia-abordagem').innerHTML =
        `<strong>Sugestão de abordagem:</strong> ${lead.sugestao_abordagem || '-'}`;

    mainLayout.classList.add('split-view');
}

async function carregarLeads() {
    try {
        const resp = await fetch(`${API_BASE}/api/leads`);
        if (!resp.ok) throw new Error('Falha ao buscar leads');
        todosLeads = await resp.json();
        renderizarListaLeads(todosLeads);

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

searchInput?.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const filtrados = todosLeads.filter(l =>
        (l.empresa || '').toLowerCase().includes(termo) ||
        (l.nome_completo || '').toLowerCase().includes(termo) ||
        (l.whatsapp || '').toLowerCase().includes(termo)
    );
    renderizarListaLeads(filtrados);
});

document.getElementById('refresh-leads-btn1')?.addEventListener('click', carregarLeads);
document.getElementById('refresh-leads-btn2')?.addEventListener('click', carregarLeads);

// Modal de Novo Lead
const newLeadBtn = document.getElementById('new-lead-btn');
const newLeadModal = document.getElementById('new-lead-modal');
const closeNewLeadBtn = document.getElementById('close-new-lead-btn');
const newLeadForm = document.getElementById('new-lead-form');

newLeadBtn?.addEventListener('click', () => newLeadModal.classList.add('active'));
closeNewLeadBtn?.addEventListener('click', () => newLeadModal.classList.remove('active'));
newLeadModal?.addEventListener('click', (e) => {
    if (e.target === newLeadModal) newLeadModal.classList.remove('active');
});

newLeadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-new-lead-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

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
        const resp = await fetch(`${API_BASE}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) throw new Error('Erro ao cadastrar lead');
        const resultado = await resp.json();

        newLeadForm.reset();
        newLeadModal.classList.remove('active');
        leadSelecionadoId = resultado.id;
        await carregarLeads();
    } catch (erro) {
        alert('Não foi possível salvar o lead. Verifique o terminal do servidor.');
        console.error(erro);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Lead';
    }
});

// ==================== BARRA DE NAVEGAÇÃO E MODAIS ORIGINAIS ====================

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

// Popup registrar ligação
const logCallBtn = document.getElementById('log-call-btn');
const callModal = document.getElementById('call-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

logCallBtn?.addEventListener('click', () => callModal.classList.add('active'));
closeModalBtn?.addEventListener('click', () => callModal.classList.remove('active'));
callModal?.addEventListener('click', (e) => {
    if (e.target === callModal) callModal.classList.remove('active');
});

// Popup de novo segmento e status
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
        activeSelect.value = '0';
    }
    activeSelect = null;
}

[
    { el: document.getElementById('segments'), title: 'Criar Novo Segmento' },
    { el: document.getElementById('status'), title: 'Criar Novo Status' }
].forEach(({ el, title }) => {
    el?.addEventListener('change', () => {
        if (el.value === 'novo') openCategoryModal(el, title);
    });
});

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
        const slugValue = name.toLowerCase().replace(/\s+/g, '-');

        newOption.value = slugValue;
        newOption.textContent = name;
        newOption.dataset.color = categoryColorInput.value;

        activeSelect.insertBefore(newOption, activeSelect.querySelector('option[value="novo"]'));
        activeSelect.value = slugValue;
    }

    categoryModal.classList.remove('active');
    activeSelect = null;
});

// Carrega os leads da planilha ao abrir a página
carregarLeads();