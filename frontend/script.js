const mainLayout = document.getElementById('main-layout');
const clientItems = document.querySelectorAll('.client-item');
const closeBtn = document.getElementById('close-details');
const detailName = document.getElementById('detail-name');
const stripToggle = document.getElementById('leads-strip-toggle');

function checkScreenWidth() {
    // Verifica se a janela do navegador ocupa menos de 3/4 (75%) da largura útil da tela
    if (window.outerWidth < window.screen.availWidth * 0.75) {
        mainLayout.classList.add('narrow-screen');
    } else {
        mainLayout.classList.remove('narrow-screen', 'leads-expanded');
    }
}

window.addEventListener('resize', checkScreenWidth);
checkScreenWidth();

clientItems.forEach(item => {
    item.addEventListener('click', () => {
        document.querySelector('.client-item.selected')?.classList.remove('selected');
        item.classList.add('selected');

        const name = item.querySelector('.client-name').textContent;
        detailName.textContent = name;

        mainLayout.classList.add('split-view');
        mainLayout.classList.remove('leads-expanded');
    });
});

stripToggle.addEventListener('click', () => {
    mainLayout.classList.toggle('leads-expanded');
});

closeBtn.addEventListener('click', () => {
    mainLayout.classList.remove('split-view', 'leads-expanded');
    document.querySelector('.client-item.selected')?.classList.remove('selected');
});


const navButtons = document.querySelectorAll('.navbar-btn[data-tab]');
const leadsScreen = document.getElementById('main-layout');
const blankScreens = document.querySelectorAll('.blank-screen');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.navbar-btn.active')?.classList.remove('active');
        btn.classList.add('active');

        const target = btn.dataset.tab;

        leadsScreen.classList.add('hidden');
        blankScreens.forEach(screen => screen.classList.remove('active'));

        if (target === 'leads') {
            leadsScreen.classList.remove('hidden');
        } else {
            document.getElementById(`screen-${target}`)?.classList.add('active');
        }
    });
});