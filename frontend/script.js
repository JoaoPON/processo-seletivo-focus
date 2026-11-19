//referências principais e responsividade
const mainLayout = document.getElementById('main-layout');
const detailName = document.getElementById('detail-name');
const stripToggle = document.getElementById('leads-strip-toggle');
const clientListContainer = document.getElementById('client-list');

const navButtons = document.querySelectorAll('.navbar-btn[data-tab]');
const blankScreens = document.querySelectorAll('.blank-screen');
const navPill = document.getElementById('nav-pill');

//verifica se a janela do navegador ocupa <75%
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

//cliques no leads
stripToggle.addEventListener('click', () => {
    mainLayout.classList.toggle('leads-expanded');
});

clientListContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.client-item');
    if (!item) return;

    document.querySelector('.client-item.selected')?.classList.remove('selected');
    item.classList.add('selected');

    detailName.textContent = item.querySelector('.client-name')?.textContent || '';
    document.getElementById('detail-status').textContent = item.querySelector('.client-status')?.textContent || '';
    document.getElementById('detail-segment').textContent = item.querySelector('.client-segment')?.textContent || '';
    document.getElementById('detail-phone').textContent = item.querySelector('.client-number')?.textContent || '';
    document.getElementById('detail-address').textContent = item.dataset.endereco || 'Não informado';
    document.getElementById('detail-hours').textContent = item.dataset.funcionamento || 'Não informado';

    mainLayout.classList.add('split-view');
});

//barra de navegação
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

//popup registrar ligação
const logCallBtn = document.getElementById('log-call-btn');
const callModal = document.getElementById('call-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

logCallBtn.addEventListener('click', () => callModal.classList.add('active'));
closeModalBtn.addEventListener('click', () => callModal.classList.remove('active'));
callModal.addEventListener('click', (e) => {
    if (e.target === callModal) callModal.classList.remove('active');
});

//popup de novo segmento e status
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
    el.addEventListener('change', () => {
        if (el.value === 'novo') openCategoryModal(el, title);
    });
});

categoryColorInput.addEventListener('input', (e) => {
    colorHexLabel.textContent = e.target.value;
});

closeCategoryBtn.addEventListener('click', closeCategoryModal);
categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) closeCategoryModal();
});

saveCategoryBtn.addEventListener('click', () => {
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
