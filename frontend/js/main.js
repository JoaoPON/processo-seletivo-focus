import { carregarSessaoAtual, carregarListas } from './state.js';
import { carregarLeads, registrarCallbackAgenda } from './leads.js';
import { carregarAgendamentos, registrarCallbackAbrirLead } from './agendamentos.js';
import { carregarGerencia, iniciarModalContas } from './gerencia.js';

const mainLayout = document.getElementById('main-layout');
const navButtons = document.querySelectorAll('.navbar-btn[data-tab]');
const blankScreens = document.querySelectorAll('.blank-screen');
const navPill = document.getElementById('nav-pill');

function checkScreenWidth() {
    if (!mainLayout) return;
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

const initialActiveBtn = document.querySelector('.navbar-btn.active');
if (initialActiveBtn) {
    navPill.style.transition = 'none';
    moveNavPill(initialActiveBtn);
    setTimeout(() => navPill.style.transition = '', 50);
}

function alternarParaAbaLeads() {
    const btnLeads = document.querySelector('.navbar-btn[data-tab="leads"]');
    if (btnLeads) {
        document.querySelector('.navbar-btn.active')?.classList.remove('active');
        btnLeads.classList.add('active');
        moveNavPill(btnLeads);
    }
    blankScreens.forEach(screen => screen.classList.remove('active'));
    mainLayout.classList.remove('hidden');
}

registrarCallbackAgenda(carregarAgendamentos);
registrarCallbackAbrirLead(alternarParaAbaLeads);

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
        } else {
            document.getElementById(`screen-${target}`)?.classList.add('active');
        }
    });
});

(async function iniciarApp() {
    try {
        await carregarSessaoAtual(() => moveNavPill(document.querySelector('.navbar-btn.active')));
        iniciarModalContas();
        await Promise.all([carregarListas(), carregarLeads()]);
    } catch (erro) {
        console.error("Falha na inicialização:", erro);
    }
})();