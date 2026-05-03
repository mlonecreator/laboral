import { auth } from './auth.js';
import { db } from './db.js';
import { ui } from './ui.js';


async function initStudents() {
  await renderStudents();

  window.openStudentModal = () => {
    document.getElementById('student-form').reset();
    ui.openModal('modal-student');
  };

  document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await db.collection('profiles').create({
        display_name: document.getElementById('s-name').value,
        email: document.getElementById('s-email').value,
        status: 'Ativo',
        role: 'student'
      });
      ui.toast('Aluno criado com sucesso!', 'success');
      ui.closeModal('modal-student');
      await renderStudents();
    } catch (err) {
      ui.toast('Erro ao criar aluno.', 'error');
    }
  });
}

window.toggleStatus = async (id) => {
  try {
    const student = await db.collection('profiles').getById(id);
    if(student) {
      await db.collection('profiles').update(id, { status: student.status === 'Ativo' ? 'Inativo' : 'Ativo' });
      await renderStudents();
    }
  } catch (err) {
    ui.toast('Erro ao atualizar estado.', 'error');
  }
};

async function renderStudents() {
  try {
    const students = await db.collection('profiles').getAll();
    document.getElementById('total-students').textContent = `${students.length} Alunos`;
    const tpl = students.map(s => {
      const d = new Date(s.created_at);
      const badgeStr = s.status === 'Ativo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>';
      
      const div = document.createElement('div');
      div.appendChild(ui.createAvatar(s, 'avatar-sm'));
      const avHtml = div.innerHTML;

      return `
      <div class="data-table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr;">
         <div class="flex items-center gap-4">
           ${avHtml}
           <div class="flex-col"><span class="font-bold">${s.display_name || s.email}</span><span class="text-sm text-gray">${s.email}</span></div>
         </div>
         <div class="text-sm text-gray">${d.toLocaleDateString('pt')}</div>
         <div class="text-sm text-gray">N/A</div>
         <div>${badgeStr}</div>
         <div class="flex gap-2">
           <button class="btn btn-secondary btn-sm" onclick="toggleStatus('${s.id}')">${s.status === 'Ativo' ? 'Desativar' : 'Ativar'}</button>
         </div>
      </div>`;
    }).join('');

    document.getElementById('students-table-body').innerHTML = tpl || '<div class="p-4 text-center">vazio</div>';
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const user = auth.requireAuth('admin');
  if (!user) return;
  ui.init();
  document.getElementById('logout-btn')?.addEventListener('click', auth.logout);
  initStudents();
});
