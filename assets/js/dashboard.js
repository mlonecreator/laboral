import { auth } from './auth.js';
import { db } from './db.js';
import { ui } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const user = auth.requireAuth('admin');
  if (!user) return;
  ui.init();

  // Logout bind
  document.getElementById('logout-btn')?.addEventListener('click', auth.logout);

  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const courses = await db.collection('courses').getAll();
    const students = await db.collection('profiles').getAll(); // Using profiles instead of students
    const enrollments = await db.collection('enrollments').getAll();
    let progressList = []; 
    try {
       const { data } = await window.db.supabase.from('progress').select('*');
       if (data) progressList = data;
    } catch(e) {}

  // 1. Renderizar Metricas
  const metrics = [
    { title: 'Total de Cursos', value: courses.length, icon: 'book-open', color: 'var(--color-brand-500)', bg: 'var(--color-brand-100)', up: '+12%' },
    { title: 'Alunos', value: students.length, icon: 'users', color: 'var(--color-success-500)', bg: 'var(--color-success-100)', up: '+5%' },
    { title: 'Matrículas', value: enrollments.filter(e => e.status === 'active').length, icon: 'trending-up', color: 'var(--color-accent-500)', bg: 'var(--color-accent-100)', up: '+18%' },
    { title: 'Conclusões (mês)', value: progressList.filter(p => !!p.completed_at).length, icon: 'award', color: '#8B5CF6', bg: '#EDE9FE', up: '+2%' }
  ];

  const container = document.getElementById('metrics-container');
  container.innerHTML = metrics.map(m => `
    <div class="card card-metric p-4" style="padding: 24px;">
      <div class="flex items-center gap-4 mb-4">
        <div style="width:48px;height:48px;border-radius:12px;background:${m.bg};color:${m.color};display:flex;align-items:center;justify-content:center;">
          <i data-lucide="${m.icon}"></i>
        </div>
        <div>
          <span class="text-sm font-bold text-gray" style="text-transform: uppercase;">${m.title}</span>
          <h2 style="font-size: 32px; margin-top:4px;">${m.value}</h2>
        </div>
      </div>
      <div class="text-sm font-bold" style="color: var(--color-success-500)">
        ${m.up} <span class="text-gray flex items-center gap-2 font-normal">vs mês anterior</span>
      </div>
    </div>
  `).join('');

  // 2. Renderizar Cursos Recentes
  const rCourses = [...courses].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  document.getElementById('recent-courses-list').innerHTML = rCourses.map(c => `
    <div class="data-table-row cols-dashboard">
      <div class="flex items-center gap-2">
         <img src="${c.thumbnail}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">
         <span class="font-bold text-sm">${c.title}</span>
      </div>
      <div><span class="badge badge-info">${c.category}</span></div>
      <div>
         <span class="badge ${c.status === 'published' ? 'badge-success' : 'badge-neutral'}">
           ${c.status === 'published' ? 'Publicado' : 'Rascunho'}
         </span>
      </div>
    </div>
  `).join('');

  // 3. Actividade (Substituição de Mock por Dados Reais)
  let activities = [];
  
  // Adicionar cursos recentes à atividade
  const recentCoursesList = [...courses].sort((a,b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0, 3);
  recentCoursesList.forEach(c => {
    activities.push({ 
      icon: 'book', 
      color: 'green', 
      text: c.title, 
      sub: c.status === 'published' ? 'Foi publicado' : 'Foi criado (rascunho)', 
      time: new Date(c.created_at || c.createdAt).toLocaleDateString('pt'),
      timestamp: new Date(c.created_at || c.createdAt).getTime()
    });
  });

  // Adicionar alunos recentes à atividade
  const recentStudentsList = [...students].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  recentStudentsList.forEach(s => {
    activities.push({ 
      icon: 'user-plus', 
      color: 'blue', 
      text: s.display_name || s.email, 
      sub: 'Registou-se como aluno', 
      time: new Date(s.created_at).toLocaleDateString('pt'),
      timestamp: new Date(s.created_at).getTime()
    });
  });

  // Ordenar misturado e pegar os últimos 5
  activities.sort((a, b) => b.timestamp - a.timestamp);
  activities = activities.slice(0, 5);

  if (activities.length === 0) {
     document.getElementById('activity-feed').innerHTML = '<div class="p-4 text-center text-gray">Nenhuma atividade recente.</div>';
  } else {
    document.getElementById('activity-feed').innerHTML = activities.map(a => `
       <div class="activity-item">
          <div class="activity-icon ${a.color}"><i data-lucide="${a.icon}"></i></div>
          <div class="activity-content">
            <p><strong>${a.text}</strong> ${a.sub}</p>
            <span>${a.time}</span>
          </div>
       </div>
    `).join('');
  }

  window.lucide.createIcons();
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}
