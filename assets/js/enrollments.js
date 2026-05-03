import { auth } from './auth.js';
import { db } from './db.js';
import { ui } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = auth.requireAuth('admin');
  if (!user) return;
  ui.init();
  document.getElementById('logout-btn')?.addEventListener('click', auth.logout);

  await loadSelectOptions();
  await renderEnrollments();

  window.enrollModal = {
    open: () => {
      document.getElementById('enroll-form').reset();
      ui.openModal('modal-enroll');
    }
  };

  document.getElementById('enroll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-enroll');
    ui.setLoading(btn, true);

    const payload = {
      student_id: document.getElementById('e-student').value,
      course_id: document.getElementById('e-course').value,
      status: document.getElementById('e-status').value
    };

    try {
      // Check if already enrolled
      const { data: existing } = await window.db.supabase.from('enrollments')
        .select('*')
        .eq('student_id', payload.student_id)
        .eq('course_id', payload.course_id)
        .maybeSingle();

      if (existing) {
        ui.toast('Este aluno já está matriculado neste curso.', 'warning');
      } else {
        await db.collection('enrollments').create(payload);
        ui.toast('Matrícula efetuada com sucesso!', 'success');
        ui.closeModal('modal-enroll');
        await renderEnrollments();
      }
    } catch (err) {
      console.error(err);
      ui.toast('Erro ao criar matrícula.', 'error');
    } finally {
      ui.setLoading(btn, false);
    }
  });

  window.toggleEnrollmentStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await db.collection('enrollments').update(id, { status: newStatus });
      ui.toast('Estado da matrícula atualizado!', 'success');
      await renderEnrollments();
    } catch (err) {
      console.error(err);
      ui.toast('Erro ao atualizar matrícula: ' + (err.message || ''), 'error');
    }
  };

  window.deleteEnrollment = async (id) => {
    if (confirm('Tem a certeza que deseja cancelar/apagar esta matrícula?')) {
      try {
        await db.collection('enrollments').delete(id);
        ui.toast('Matrícula apagada.', 'success');
        await renderEnrollments();
      } catch (err) {
        console.error(err);
        ui.toast('Erro ao apagar matrícula: ' + (err.message || ''), 'error');
      }
    }
  };
});

async function loadSelectOptions() {
  try {
    const students = await db.collection('profiles').getAll();
    const courses = await db.collection('courses').getAll();

    const studentSelect = document.getElementById('e-student');
    studentSelect.innerHTML = '<option value="">Selecione o aluno...</option>' + 
      students.filter(s => s.role === 'student').map(s => `<option value="${s.id}">${s.display_name || s.email}</option>`).join('');

    const courseSelect = document.getElementById('e-course');
    courseSelect.innerHTML = '<option value="">Selecione o curso...</option>' + 
      courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
  } catch (err) {
    console.error('Erro ao carregar opções', err);
  }
}

async function renderEnrollments() {
  try {
    const enrollments = await db.collection('enrollments').getAll();
    document.getElementById('tot-enroll').textContent = `${enrollments.length} Matrículas`;

    const tbody = document.getElementById('enrollments-table-body');
    
    if (enrollments.length === 0) {
      tbody.innerHTML = '<div class="p-4 text-center text-gray">Nenhuma matrícula encontrada.</div>';
      return;
    }

    const rows = await Promise.all(enrollments.map(async (e) => {
      const student = await db.collection('profiles').getById(e.student_id).catch(()=>null);
      const course = await db.collection('courses').getById(e.course_id).catch(()=>null);
      
      const studentName = student ? (student.display_name || student.email) : 'Aluno Removido';
      const courseTitle = course ? course.title : 'Curso Removido';
      const date = new Date(e.enrolled_at || e.enrolledAt || e.created_at).toLocaleDateString('pt');
      
      const statusBadge = e.status === 'active' 
        ? '<span class="badge badge-success">Ativa</span>' 
        : '<span class="badge badge-warning">Suspensa</span>';

      return `
        <div class="data-table-row" style="grid-template-columns: 2fr 2fr 1fr 1fr 1fr; align-items: center;">
          <div class="font-bold">${studentName}</div>
          <div>${courseTitle}</div>
          <div class="text-sm text-gray">${date}</div>
          <div>${statusBadge}</div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm" onclick="window.toggleEnrollmentStatus('${e.id}', '${e.status}')">
              ${e.status === 'active' ? 'Suspender' : 'Ativar'}
            </button>
            <button class="btn btn-danger btn-ghost btn-sm px-2 py-1" onclick="window.deleteEnrollment('${e.id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
    }));

    tbody.innerHTML = rows.join('');
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error(err);
    document.getElementById('enrollments-table-body').innerHTML = '<div class="p-4 text-center text-red-500">Erro ao carregar matrículas.</div>';
  }
}
