import { auth } from './auth.js';
import { db } from './db.js';
import { ui } from './ui.js';

let currentUser = null;
let currentCourse = null;
let currentLessonIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = auth.requireAuth('student');
  if (!currentUser) return;
  ui.init();
  document.getElementById('logout-btn')?.addEventListener('click', auth.logout);

  // Nav
  document.getElementById('btn-back').addEventListener('click', showDashboard);
  document.getElementById('btn-complete-lesson').addEventListener('click', markAsCompleted);
  document.getElementById('btn-prev-lesson').addEventListener('click', () => selectLesson(currentLessonIndex - 1));
  document.getElementById('btn-next-lesson').addEventListener('click', () => selectLesson(currentLessonIndex + 1));

  showDashboard();
});

async function showDashboard() {
  document.getElementById('view-dashboard').style.display = 'block';
  document.getElementById('view-player').style.display = 'none';
  await renderMyCourses();
}

async function showPlayer(courseId) {
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-player').style.display = 'block';
  
  currentCourse = await db.collection('courses').getById(courseId);
  // Fetch lessons for this course
  const { data: lessons } = await window.db.supabase.from('lessons').select('*').eq('course_id', courseId).order('order', { ascending: true });
  currentCourse.lessons = lessons || [];
  
  currentLessonIndex = 0; 
  
  const progObj = await getStudentProgress(courseId);
  if (progObj && progObj.lastLessonId) {
     const idx = currentCourse.lessons.findIndex(l => l.id === progObj.lastLessonId);
     if (idx !== -1) currentLessonIndex = idx;
  }
  
  selectLesson(currentLessonIndex);
}

async function getStudentProgress(courseId) {
  const { data } = await window.db.supabase.from('progress').select('*').eq('student_id', currentUser.id).eq('course_id', courseId).maybeSingle();
  return data;
}

window.openCourse = showPlayer;

async function renderMyCourses() {
  const allEnrolls = await db.collection('enrollments').getAll();
  const enrolls = allEnrolls.filter(e => e.student_id === currentUser.id && e.status === 'active');
  const grid = document.getElementById('my-courses-grid');
  
  if (enrolls.length === 0) {
    grid.innerHTML = '<div class="col-span-3 text-center text-gray p-8">Não está matriculado em nenhum curso.</div>';
    return;
  }

  const coursePromises = enrolls.map(async (e) => {
    const c = await db.collection('courses').getById(e.course_id);
    if(!c) return '';
    const p = await getStudentProgress(c.id);
    const { count } = await window.db.supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
    const total = count || 0;
    const completed = p ? (p.completed_lessons || []).length : 0;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    return `
      <div class="card card-course">
        <img src="${c.thumbnail}" alt="Course thumb">
        <div class="card-course-body flex-col justify-between" style="height: 100%;">
          <div>
            <span class="badge badge-info mb-2">${c.category}</span>
            <h2 class="font-bold mb-2">${c.title}</h2>
          </div>
          <div class="mt-4">
             <div class="progress-bar-container mb-4">
                <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                <span class="progress-label">${pct}%</span>
             </div>
             <button class="btn btn-primary" style="width:100%" onclick="window.openCourse('${c.id}')">Continuar Curso</button>
          </div>
        </div>
      </div>
    `;
  });

  const cardsHtml = await Promise.all(coursePromises);
  grid.innerHTML = cardsHtml.join('');
  window.lucide.createIcons();
}

async function selectLesson(index) {
  if (!currentCourse || !currentCourse.lessons || currentCourse.lessons.length === 0) {
     ui.toast('O curso ainda não tem aulas.', 'warning');
     return;
  }
  if (index < 0 || index >= currentCourse.lessons.length) return;
  currentLessonIndex = index;
  
  const lesson = currentCourse.lessons[index];
  
  const iframe = document.getElementById('video-iframe');
  const videoTag = document.getElementById('video-tag');
  
  if (lesson.video_url && (lesson.video_url.includes('youtube.com') || lesson.video_url.includes('vimeo.com'))) {
     iframe.style.display = 'block';
     videoTag.style.display = 'none';
     videoTag.pause();
     iframe.src = lesson.video_url;
  } else {
     iframe.style.display = 'none';
     videoTag.style.display = 'block';
     iframe.src = '';
     videoTag.src = lesson.video_url;
     videoTag.load();
     videoTag.play().catch(()=>console.log('Autoplay prevent'));
  }

  document.getElementById('lesson-title').textContent = `${index + 1}. ${lesson.title}`;
  
  let descHtml = '';
  if(lesson.subtitle) {
    descHtml += `<strong class="text-gray-800" style="display:block; margin-bottom: 8px;">${lesson.subtitle}</strong>`;
  }
  if(lesson.description) {
    descHtml += `<p>${lesson.description.replace(/\n/g, '<br>')}</p>`;
  }
  document.getElementById('lesson-desc').innerHTML = descHtml || (lesson.duration || '');

  const resourceContainer = document.getElementById('lesson-resource-container');
  if(lesson.resource_url) {
     resourceContainer.style.display = 'block';
     resourceContainer.innerHTML = `<a href="${lesson.resource_url}" target="_blank" class="btn btn-secondary btn-sm mt-2"><i data-lucide="download"></i> Material Anexo da Aula</a>`;
  } else {
     resourceContainer.style.display = 'none';
  }

  // Update lists
  const p = await getStudentProgress(currentCourse.id);
  const compList = p ? (p.completed_lessons || []) : [];
  
  const pct = Math.round((compList.length / currentCourse.lessons.length) * 100);
  document.getElementById('progress-text').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;

  document.getElementById('lessons-sidebar-list').innerHTML = currentCourse.lessons.map((l, i) => {
    const isActive = i === currentLessonIndex;
    const isComp = compList.includes(l.id);
    return `
      <div class="lesson-item ${isActive ? 'active' : ''} ${isComp ? 'completed' : ''}" onclick="window.selectAndPlay(${i})">
         <i data-lucide="${isComp ? 'check-circle' : 'play-circle'}"></i>
         <div style="flex:1">
           <div class="lesson-title font-bold text-sm">${i+1}. ${l.title}</div>
           <div class="text-xs text-gray">${l.duration || ''}</div>
         </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('btn-prev-lesson').disabled = index === 0;
  document.getElementById('btn-next-lesson').disabled = index === currentCourse.lessons.length - 1;
  document.getElementById('btn-complete-lesson').textContent = compList.includes(lesson.id) ? 'Concluída' : 'Marcar como Concluída';
  document.getElementById('btn-complete-lesson').disabled = compList.includes(lesson.id);

  window.lucide.createIcons();
}
window.selectAndPlay = selectLesson;

async function markAsCompleted() {
  const lesson = currentCourse.lessons[currentLessonIndex];
  let p = await getStudentProgress(currentCourse.id);
  
  if (!p) {
    const { data } = await window.db.supabase.from('progress').insert({
      student_id: currentUser.id,
      course_id: currentCourse.id,
      completed_lessons: [lesson.id],
      last_lesson_id: lesson.id
    }).select().single();
    p = data;
    ui.toast('Aula concluída!', 'success');
  } else {
    if (!(p.completed_lessons || []).includes(lesson.id)) {
        const newComp = [...(p.completed_lessons || []), lesson.id];
        await window.db.supabase.from('progress').update({ 
          completed_lessons: newComp, 
          last_lesson_id: lesson.id 
        }).eq('id', p.id);
        ui.toast('Aula concluída!', 'success');
    }
  }

  // check if 100%
  // Re-fetch progress to be sure
  p = await getStudentProgress(currentCourse.id);
  if (p && p.completed_lessons && p.completed_lessons.length === currentCourse.lessons.length) {
     if (!p.completed_at) {
        await window.db.supabase.from('progress').update({ completed_at: new Date().toISOString() }).eq('id', p.id);
     }
     ui.toast('Parabéns! Completou o curso.', 'success');
  }

  await selectLesson(currentLessonIndex);
}
