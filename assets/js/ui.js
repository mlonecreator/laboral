import { auth } from './auth.js';

/**
 * ui.js
 * Utilitários de UI (Toasts, Modais, Init)
 */

export const ui = {
  // Configs Globais
  init: () => {
    // 1. Inicia icones Lucide se persistirem na página
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // 2. Eventos comuns (fechar modais)
    document.addEventListener('click', (e) => {
      if (e.target.matches('.modal-overlay')) {
        e.target.classList.remove('active');
      }
      if (e.target.closest('.modal-close') || e.target.closest('[data-dismiss="modal"]')) {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) activeModal.classList.remove('active');
      }
    });

    // Sidebar Mobile Toggle
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-toggle')) {
        document.querySelector('.sidebar')?.classList.toggle('open');
      } else if (!e.target.closest('.sidebar') && document.querySelector('.sidebar')?.classList.contains('open')) {
        document.querySelector('.sidebar')?.classList.remove('open');
      }
    });
    
    // Injeta informações do utilizador se existirem tags apropriadas
    const user = auth.getCurrentUser();
    if(user) {
       document.querySelectorAll('[data-user="name"]').forEach(el => el.textContent = user.name);
       document.querySelectorAll('[data-user="role"]').forEach(el => el.textContent = user.role === 'admin' ? 'Administrador' : 'Aluno');
       document.querySelectorAll('[data-user="avatar"]').forEach(el => {
         el.innerHTML = '';
         el.appendChild(ui.createAvatar(user));
       });
    }
  },

  // Toast Notifications
  toast: (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if(type === 'success') iconName = 'check-circle';
    if(type === 'error') iconName = 'alert-circle';
    if(type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span style="flex:1">${message}</span>
    `;
    
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons({ root: toast });

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Modal Control
  openModal: (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  },
  
  closeModal: (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  },

  // Avatar Builder
  createAvatar: (user, sizeClass = 'avatar-md') => {
    const div = document.createElement('div');
    div.className = `avatar ${sizeClass}`;
    
    if (user.avatar) {
      div.style.backgroundImage = `url(${user.avatar})`;
    } else {
      const names = (user.name || '').split(' ');
      const initials = names.length > 1 
        ? names[0][0] + names[names.length - 1][0] 
        : names[0] ? names[0].substring(0, 2) : 'U';
      
      div.textContent = initials.toUpperCase();
      
      // Hash a cor
      const colors = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#F43F5E'];
      let hash = 0;
      for (let i = 0; i < (user.id || '').length; i++) {
        hash = user.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      div.style.backgroundColor = colors[Math.abs(hash) % colors.length];
    }
    return div;
  },

  // Toggle Loading em botão
  setLoading: (btn, isLoading, originalText = '') => {
    if (isLoading) {
      btn.classList.add('loading');
      btn.dataset.original = btn.innerHTML;
      btn.innerHTML = `<div class="spinner"></div>`;
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.innerHTML = originalText || btn.dataset.original || '';
      btn.disabled = false;
    }
  }
};
