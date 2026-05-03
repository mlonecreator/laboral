import { auth } from './auth.js';
import { ui } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  ui.init();
  
  // Se já estiver logado, redireciona
  const user = auth.getCurrentUser();
  if (user) {
    window.location.href = user.role === 'admin' ? '/dashboard.html' : '/student/portal.html';
  }

  const form = document.getElementById('login-form');
  const btn = document.getElementById('login-btn');
  const tabs = document.querySelectorAll('.tab');
  let currentRole = 'student';

  // Mudança de Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentRole = e.target.dataset.role;
    });
  });

  // Login handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    ui.setLoading(btn, true);

    try {
      const userObj = await auth.login(email, password);
      // Validar role pretendida (simples check UX)
      if(userObj.role !== currentRole) {
         ui.toast(`Atenção: Entrou como ${userObj.role === 'admin' ? 'Administrador' : 'Aluno'}!`, 'info');
         await new Promise(r => setTimeout(r, 1000));
      }
      
    window.location.href = userObj.role === 'admin' ? '/dashboard.html' : '/student/portal.html';
      
    } catch (err) {
      ui.toast(err.message, 'error');
      ui.setLoading(btn, false, 'Entrar');
    }
  });

});
