import { auth } from './auth.js';
import { db } from './db.js';
import { ui } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = auth.requireAuth('admin');
  if (!user) return;
  ui.init();
  document.getElementById('logout-btn')?.addEventListener('click', auth.logout);

  await renderCourses();

  // Modal setup
  window.coursesModal = {
    open: async (id = null) => {
      document.getElementById('course-form').reset();
      document.getElementById('c-id').value = '';
      document.getElementById('mc-title').textContent = 'Novo Curso';
      
      if (id) {
        try {
          const c = await db.collection('courses').getById(id);
          if(c) {
            document.getElementById('mc-title').textContent = 'Editar Curso';
            document.getElementById('c-id').value = c.id;
            document.getElementById('c-title').value = c.title;
            document.getElementById('c-cat').value = c.category;
            document.getElementById('c-level').value = c.level;
            document.getElementById('c-desc').value = c.description;
            document.getElementById('c-thumb-file').value = '';
            document.getElementById('c-thumb').value = c.thumbnail || '';
            document.getElementById('c-dur').value = c.duration || '';
            document.getElementById('c-price').value = c.price || 0;
            document.getElementById('c-status').value = c.status;
          }
        } catch (e) { console.error(e); }
      }
      ui.openModal('modal-course');
    }
  };

  document.getElementById('course-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.setLoading(document.getElementById('c-submit'), true);
    
    const thumbValue = await processFileAndUrl('c-thumb-file', 'c-thumb', 2);

    const payload = {
      title: document.getElementById('c-title').value,
      category: document.getElementById('c-cat').value,
      level: document.getElementById('c-level').value,
      description: document.getElementById('c-desc').value,
      thumbnail: thumbValue || 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      duration: document.getElementById('c-dur').value,
      price: document.getElementById('c-price').value,
      status: document.getElementById('c-status').value,
    };
    const id = document.getElementById('c-id').value;
    
    try {
      if (id) {
        await db.collection('courses').update(id, payload);
        ui.toast('Curso actualizado com sucesso!', 'success');
      } else {
        await db.collection('courses').create(payload);
        ui.toast('Curso criado com sucesso!', 'success');
      }
      ui.closeModal('modal-course');
      await renderCourses();
    } catch (err) {
      ui.toast('Erro ao guardar curso.', 'error');
    } finally {
      ui.setLoading(document.getElementById('c-submit'), false);
    }
  });
  
  // Lessons Management Logics
  let currentManagingCourseId = null;

  window.manageLessons = async (courseId) => {
    currentManagingCourseId = courseId;
    const c = await db.collection('courses').getById(courseId);
    if (!c) return;
    document.getElementById('ml-title').textContent = `Aulas: ${c.title}`;
    await renderLessonsList(c);
    ui.openModal('modal-lessons');
  };

  async function renderLessonsList(course) {
    const container = document.getElementById('lessons-list-container');
    const { data: lessons, error } = await window.db.supabase.from('lessons').select('*').eq('course_id', course.id).order('order', { ascending: true });
    
    if (error || !lessons || lessons.length === 0) {
      container.innerHTML = '<div class="p-4 text-center text-gray">Nenhuma aula registada.</div>';
      return;
    }

    container.innerHTML = lessons.map(l => `
      <div class="data-table-row flex justify-between items-center px-4 py-3" style="border-bottom: 1px solid var(--color-gray-100)">
         <div>
            <div class="font-bold text-sm">${l.order || 0}. ${l.title}</div>
            <div class="text-xs text-gray mt-1">${l.duration || '--:--'}</div>
         </div>
         <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm py-1 px-2" onclick="window.lessonModal.open('${l.id}')"><i data-lucide="edit-2"></i></button>
            <button class="btn btn-danger btn-ghost btn-sm py-1 px-2" onclick="window.deleteLesson('${l.id}')"><i data-lucide="trash"></i></button>
         </div>
      </div>
    `).join('');
    
    window.lucide.createIcons({root: container});
  }

  window.lessonModal = {
    open: async (lessonId = null) => {
      document.getElementById('lesson-form').reset();
      document.getElementById('l-id').value = '';
      document.getElementById('mlf-title').textContent = 'Nova Aula';
      
      const c = await db.collection('courses').getById(currentManagingCourseId);
      const { count } = await window.db.supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', currentManagingCourseId);
      document.getElementById('l-order').value = (count || 0) + 1;

      if (lessonId && c) {
        const { data: l } = await window.db.supabase.from('lessons').select('*').eq('id', lessonId).single();
        if (l) {
          document.getElementById('mlf-title').textContent = 'Editar Aula';
          document.getElementById('l-id').value = l.id;
          document.getElementById('l-title').value = l.title;
          document.getElementById('l-subtitle').value = l.subtitle || '';
          document.getElementById('l-video-file').value = '';
          document.getElementById('l-video').value = l.video_url || '';
          document.getElementById('l-dur').value = l.duration || '';
          document.getElementById('l-order').value = l.order || 1;
          document.getElementById('l-desc').value = l.description || '';
          document.getElementById('l-resource-file').value = '';
          document.getElementById('l-resource').value = l.resource_url || '';
        }
      }
      ui.openModal('modal-lesson-form');
    }
  };

  document.getElementById('lesson-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lId = document.getElementById('l-id').value;
    const course = await db.collection('courses').getById(currentManagingCourseId);
    if (!course) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    ui.setLoading(submitBtn, true);

    const videoValue = await processFileAndUrl('l-video-file', 'l-video', 10);
    const resourceValue = await processFileAndUrl('l-resource-file', 'l-resource', 5);

    if (!videoValue) {
       ui.toast('É obrigatório fornecer um vídeo!', 'error');
       ui.setLoading(submitBtn, false);
       return;
    }

    const payload = {
      course_id: currentManagingCourseId,
      title: document.getElementById('l-title').value,
      subtitle: document.getElementById('l-subtitle').value,
      video_url: videoValue,
      duration: document.getElementById('l-dur').value,
      order: parseInt(document.getElementById('l-order').value) || 1,
      description: document.getElementById('l-desc').value,
      resource_url: resourceValue,
    };

    try {
      if (lId) {
        await window.db.supabase.from('lessons').update(payload).eq('id', lId);
        ui.toast('Aula atualizada!', 'success');
      } else {
        await window.db.supabase.from('lessons').insert([payload]);
        ui.toast('Aula adicionada!', 'success');
      }
      ui.closeModal('modal-lesson-form');
      await renderLessonsList(course);
      await renderCourses();
    } catch (err) {
      ui.toast('Erro ao guardar aula.', 'error');
    } finally {
      ui.setLoading(submitBtn, false);
    }
  });

  window.deleteLesson = async (lessonId) => {
    if(!confirm('Tem a certeza que deseja apagar esta aula?')) return;
    const course = await db.collection('courses').getById(currentManagingCourseId);
    if (!course) return;

    try {
      await window.db.supabase.from('lessons').delete().eq('id', lessonId);
      ui.toast('Aula apagada!', 'success');
      await renderLessonsList(course);
      await renderCourses();
    } catch (e) {
      ui.toast('Erro ao apagar aula.', 'error');
    }
  };
});

async function processFileAndUrl(fileInputId, urlInputId, maxSizeMB = 100) {
  const fileInput = document.getElementById(fileInputId);
  const urlInput = document.getElementById(urlInputId);
  
  if (fileInput && fileInput.files.length > 0) {
     const file = fileInput.files[0];
     if (file.size > maxSizeMB * 1024 * 1024) {
         ui.toast(`O ficheiro excede o limite de ${maxSizeMB}MB.`, 'error');
         throw new Error('File too large');
     }
     
     ui.toast(`A fazer upload de ${file.name}...`, 'info');
     const fileExt = file.name.split('.').pop();
     const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
     const filePath = `uploads/${fileName}`;

     const { data, error } = await window.db.supabase.storage
       .from('media')
       .upload(filePath, file);

     if (error) {
       console.error('Upload error:', error);
       ui.toast('Erro ao fazer upload do ficheiro.', 'error');
       throw error;
     }

     const { data: publicData } = window.db.supabase.storage
       .from('media')
       .getPublicUrl(filePath);

     return publicData.publicUrl;
  }
  return urlInput ? urlInput.value : null;
}

window.deleteCourse = async (id) => {
  if (confirm("Tem a certeza que deseja apagar este curso?")) {
    try {
      await db.collection('courses').delete(id);
      ui.toast('Curso removido!', 'success');
      await renderCourses();
    } catch (e) {
      ui.toast('Erro ao apagar curso.', 'error');
    }
  }
};

async function renderCourses() {
  try {
    const courses = await db.collection('courses').getAll();
    document.getElementById('total-courses').textContent = `${courses.length} Cursos totais`;
    
    const grid = document.getElementById('courses-grid');
    
    if (courses.length === 0) {
       grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:var(--color-gray-500)">Nenhum curso encontrado.</div>`;
       return;
    }

    const cardsPromises = courses.map(async (c) => {
      const badgeColor = c.status === 'published' ? 'success' : 'neutral';
      const { count: numAlunos } = await window.db.supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
      const { count: numLessons } = await window.db.supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
      
      return `
        <div class="card card-course">
          <img src="${c.thumbnail}" alt="Course thumb">
          <div class="card-course-body">
            <div class="flex justify-between items-center">
               <span class="badge badge-info">${c.category}</span>
               <span class="badge badge-${badgeColor}">${c.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
            </div>
            <h2 class="font-bold mb-2 pt-2">${c.title}</h2>
            <p class="text-sm text-gray" style="flex:1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${c.description}</p>
            
            <div class="flex justify-between text-sm text-gray mt-4 border-t" style="padding-top:16px;">
              <div class="flex items-center gap-2"><i data-lucide="book-open"></i> ${numLessons || 0}</div>
              <div class="flex items-center gap-2"><i data-lucide="clock"></i> ${c.duration}</div>
              <div class="flex items-center gap-2"><i data-lucide="users"></i> ${numAlunos || 0}</div>
            </div>
            
            <div class="flex gap-2 mt-4">
               <button class="btn btn-secondary flex-1" onclick="window.coursesModal.open('${c.id}')"><i data-lucide="edit"></i></button>
               <button class="btn btn-secondary flex-1" onclick="window.manageLessons('${c.id}')" title="Gerir Aulas"><i data-lucide="list-video"></i></button>
               <button class="btn btn-danger btn-ghost" onclick="deleteCourse('${c.id}')"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        </div>
      `;
    });

    const cardsHtml = await Promise.all(cardsPromises);
    grid.innerHTML = cardsHtml.join('');
    window.lucide.createIcons();
  } catch (err) {
    console.error(err);
  }
}
