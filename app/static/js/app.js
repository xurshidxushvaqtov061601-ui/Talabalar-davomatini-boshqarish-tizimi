// Talabalar Davomatini Boshqarish Tizimi - Frontend App

let currentUser = null;
let currentToken = localStorage.getItem('davomat_token') || null;
let attendanceChartInstance = null;
let currentTeacherScheduleId = null;
let currentJournalStudents = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (currentToken) {
    fetchMe();
  } else {
    showAuth();
  }
});

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-blue-600');
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-info');
  
  toast.className = `${bg} text-white text-xs px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 transition-all transform duration-300 pointer-events-auto`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Fetch current user details
async function fetchMe() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      renderAppForRole();
    } else {
      logout();
    }
  } catch (err) {
    console.error(err);
    logout();
  }
}

// Render interface according to role
function renderAppForRole() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('userNavbar').classList.remove('hidden');
  document.getElementById('userNavbar').classList.add('flex');
  document.getElementById('navUserName').textContent = currentUser.full_name;
  
  const roleLabels = { 'admin': 'Bosh Administrator', 'teacher': "O'qituvchi", 'student': 'Talaba' };
  document.getElementById('navUserRole').textContent = roleLabels[currentUser.role] || currentUser.role;

  document.getElementById('adminSection').classList.add('hidden');
  document.getElementById('teacherSection').classList.add('hidden');
  document.getElementById('studentSection').classList.add('hidden');

  if (currentUser.role === 'admin') {
    document.getElementById('adminSection').classList.remove('hidden');
    loadAdminStats();
    loadFacultiesAndGroups();
  } else if (currentUser.role === 'teacher') {
    document.getElementById('teacherSection').classList.remove('hidden');
    document.getElementById('teacherNameHeading').textContent = currentUser.full_name;
    document.getElementById('teacherDeptHeading').textContent = `${currentUser.department || ''} • ${currentUser.title || ''}`;
    loadTeacherSchedules();
  } else if (currentUser.role === 'student') {
    document.getElementById('studentSection').classList.remove('hidden');
    loadStudentDashboard();
  }
}

function showAuth() {
  document.getElementById('authSection').classList.remove('hidden');
  document.getElementById('userNavbar').classList.add('hidden');
  document.getElementById('userNavbar').classList.remove('flex');
  document.getElementById('adminSection').classList.add('hidden');
  document.getElementById('teacherSection').classList.add('hidden');
  document.getElementById('studentSection').classList.add('hidden');
}

function showHome() {
  if (currentUser) renderAppForRole();
  else showAuth();
}

function fillLogin(user, pwd) {
  document.getElementById('loginUsername').value = user;
  document.getElementById('loginPassword').value = pwd;
}

// ----------------- Auth -----------------
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Kirilmoqda...`;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentToken = data.access_token;
      localStorage.setItem('davomat_token', currentToken);
      currentUser = data.user;
      showToast(`Xush kelibsiz, ${currentUser.full_name}!`);
      renderAppForRole();
    } else {
      showToast(data.detail || 'Kirishda xatolik yuz berdi', 'error');
    }
  } catch (err) {
    showToast('Server bilan bog\'lanishda xatolik', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Kirish</span><i class="fa-solid fa-arrow-right text-xs ml-2"></i>`;
  }
}

function logout() {
  localStorage.removeItem('davomat_token');
  currentToken = null;
  currentUser = null;
  showToast('Tizimdan chiqildi', 'info');
  showAuth();
}

// ----------------- Admin Modules -----------------
function switchAdminTab(tabKey) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('text-slate-600', 'hover:bg-slate-100');
  });
  const activeBtn = document.getElementById(`tabBtn-${tabKey}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
    activeBtn.classList.add('bg-blue-600', 'text-white');
  }

  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  const activeContent = document.getElementById(`adminTab-${tabKey}`);
  if (activeContent) activeContent.classList.remove('hidden');

  if (tabKey === 'overview') loadAdminStats();
  else if (tabKey === 'users') loadAdminUsers();
  else if (tabKey === 'faculties') loadFacultiesAndGroups();
  else if (tabKey === 'subjects') loadSubjectsAndSchedules();
  else if (tabKey === 'leaves') loadAdminLeaveRequests();
  else if (tabKey === 'audit') loadAuditLogs();
}

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('statTotalStudents').textContent = data.total_students;
      document.getElementById('statTotalTeachers').textContent = data.total_teachers;
      document.getElementById('statAttendanceRate').textContent = `${data.attendance_rate}%`;
      document.getElementById('statAtRisk').textContent = data.at_risk_count;

      // Render chart
      renderAttendancePie(data.status_distribution);
    }
  } catch (err) {
    console.error(err);
  }

  // Load At-Risk
  loadAtRiskTable();
  // Load Groups Summary
  loadGroupSummaryTable();
}

function renderAttendancePie(dist) {
  const ctx = document.getElementById('attendancePieChart');
  if (!ctx) return;
  if (attendanceChartInstance) attendanceChartInstance.destroy();

  attendanceChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ["Keldi", "Kechikdi", "Sababli", "Sababsiz"],
      datasets: [{
        data: [dist.keldi || 0, dist.kechikdi || 0, dist.sababli || 0, dist.sababsiz || 0],
        backgroundColor: ['#22c55e', '#eab308', '#0284c7', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function loadAtRiskTable() {
  try {
    const res = await fetch('/api/reports/at-risk-students', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const students = await res.json();
    const tbody = document.getElementById('atRiskTableBody');
    tbody.innerHTML = '';
    if (!students || students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Xavf ostidagi talabalar yo\'q (Barchada dars qatnashishi me\'yorda)</td></tr>';
      return;
    }
    students.forEach(s => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-2 font-medium text-slate-800">${s.full_name}<br><span class="text-slate-400">${s.student_id_number}</span></td>
        <td class="p-2 text-slate-600">${s.group_name}</td>
        <td class="p-2 text-rose-600 font-semibold">${s.absent_lessons} / ${s.total_lessons} dars</td>
        <td class="p-2"><span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">${s.absent_percentage}%</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadGroupSummaryTable() {
  try {
    const res = await fetch('/api/reports/summary', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const groups = await res.json();
    const tbody = document.getElementById('groupSummaryTableBody');
    tbody.innerHTML = '';
    groups.forEach(g => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-3 font-semibold text-slate-800">${g.group_name}</td>
        <td class="p-3 text-slate-500">${g.faculty_name}</td>
        <td class="p-3">${g.students_count} nafar</td>
        <td class="p-3">${g.total_records}</td>
        <td class="p-3 text-emerald-600 font-semibold">${g.present}</td>
        <td class="p-3 text-amber-600 font-semibold">${g.late}</td>
        <td class="p-3 text-rose-600 font-semibold">${g.absent}</td>
        <td class="p-3"><span class="px-2 py-1 rounded font-bold ${g.rate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${g.rate}%</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadAdminUsers() {
  try {
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const users = await res.json();
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    const roleBadges = {
      'admin': '<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Admin</span>',
      'teacher': '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">O\'qituvchi</span>',
      'student': '<span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">Talaba</span>'
    };

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      const extra = u.role === 'teacher' ? `${u.department || ''} (${u.title || ''})` : (u.role === 'student' ? `${u.group_name || ''} • ${u.student_id_number || ''}` : 'Tizim ma\'muri');
      tr.innerHTML = `
        <td class="p-3 font-semibold text-slate-800">${u.full_name}</td>
        <td class="p-3 text-slate-500 font-mono">${u.username}</td>
        <td class="p-3">${roleBadges[u.role] || u.role}</td>
        <td class="p-3 text-slate-500">${extra}</td>
        <td class="p-3"><span class="w-2 h-2 rounded-full inline-block ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300'} mr-1"></span>${u.is_active ? 'Faol' : 'Nofaol'}</td>
        <td class="p-3 text-right">
          ${u.username !== 'admin' ? `<button onclick="deleteUser(${u.id})" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-regular fa-trash-can"></i></button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function deleteUser(userId) {
  if (!confirm("Foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("Foydalanuvchi o'chirildi");
      loadAdminUsers();
      loadAdminStats();
    } else {
      const d = await res.json();
      showToast(d.detail || "Xatolik", 'error');
    }
  } catch (err) {
    showToast("Server xatosi", 'error');
  }
}

async function loadFacultiesAndGroups() {
  try {
    const [fRes, gRes] = await Promise.all([
      fetch('/api/admin/faculties', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
      fetch('/api/admin/groups', { headers: { 'Authorization': `Bearer ${currentToken}` } })
    ]);
    const faculties = await fRes.json();
    const groups = await gRes.json();

    // Faculties List
    const fList = document.getElementById('facultiesList');
    fList.innerHTML = '';
    faculties.forEach(f => {
      const div = document.createElement('div');
      div.className = 'p-3 border border-slate-200 rounded-xl flex justify-between items-center bg-slate-50/50';
      div.innerHTML = `
        <div>
          <div class="font-bold text-slate-800 text-xs">${f.name} <span class="text-blue-600 font-mono">(${f.code})</span></div>
          <div class="text-xs text-slate-400">${f.groups_count} ta guruh</div>
        </div>
        <button onclick="deleteFaculty(${f.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-regular fa-trash-can"></i></button>
      `;
      fList.appendChild(div);
    });

    // Groups List
    const gList = document.getElementById('groupsList');
    gList.innerHTML = '';
    groups.forEach(g => {
      const div = document.createElement('div');
      div.className = 'p-3 border border-slate-200 rounded-xl flex justify-between items-center bg-slate-50/50';
      div.innerHTML = `
        <div>
          <div class="font-bold text-slate-800 text-xs">${g.name} <span class="text-slate-400 font-normal">(${g.course_year}-kurs)</span></div>
          <div class="text-xs text-slate-400">${g.faculty_name} • ${g.students_count} ta talaba</div>
        </div>
        <button onclick="deleteGroup(${g.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-regular fa-trash-can"></i></button>
      `;
      gList.appendChild(div);
    });

    // Populate Import Group select
    const impGrp = document.getElementById('importGroupSelect');
    if (impGrp) {
      impGrp.innerHTML = '';
      groups.forEach(g => {
        impGrp.innerHTML += `<option value="${g.id}">${g.name} (${g.faculty_name})</option>`;
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteFaculty(id) {
  if (!confirm("Fakultetni o'chirmoqchimisiz? Unga tegishli barcha guruhlar ham o'chirilishi mumkin!")) return;
  const res = await fetch(`/api/admin/faculties/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
  if (res.ok) { showToast("Fakultet o'chirildi"); loadFacultiesAndGroups(); }
}

async function deleteGroup(id) {
  if (!confirm("Guruhni o'chirishni tasdiqlaysizmi?")) return;
  const res = await fetch(`/api/admin/groups/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
  if (res.ok) { showToast("Guruh o'chirildi"); loadFacultiesAndGroups(); }
}

async function loadSubjectsAndSchedules() {
  try {
    const [subRes, schRes] = await Promise.all([
      fetch('/api/admin/subjects', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
      fetch('/api/admin/schedules', { headers: { 'Authorization': `Bearer ${currentToken}` } })
    ]);
    const subjects = await subRes.json();
    const schedules = await schRes.json();

    const subList = document.getElementById('subjectsList');
    subList.innerHTML = '';
    subjects.forEach(s => {
      const div = document.createElement('div');
      div.className = 'p-3 border border-slate-200 rounded-xl flex justify-between items-center bg-slate-50/50';
      div.innerHTML = `
        <div>
          <div class="font-bold text-slate-800 text-xs">${s.name} <span class="text-blue-600 font-mono">(${s.code})</span></div>
          <div class="text-xs text-slate-400">Jami soat: ${s.hours_total} soat</div>
        </div>
        <button onclick="deleteSubject(${s.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-regular fa-trash-can"></i></button>
      `;
      subList.appendChild(div);
    });

    const schList = document.getElementById('schedulesList');
    schList.innerHTML = '';
    schedules.forEach(s => {
      const div = document.createElement('div');
      div.className = 'p-3 border border-slate-200 rounded-xl flex justify-between items-center bg-slate-50/50';
      div.innerHTML = `
        <div>
          <div class="font-bold text-slate-800 text-xs">${s.subject_name} • <span class="text-blue-700">${s.group_name}</span></div>
          <div class="text-xs text-slate-500">${s.teacher_name} • ${s.day_name} (${s.start_time} - ${s.end_time}) • ${s.room || 'Xona ko\'rsatilmagan'}</div>
        </div>
        <button onclick="deleteSchedule(${s.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-regular fa-trash-can"></i></button>
      `;
      schList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

async function deleteSubject(id) {
  if (!confirm("Fanni o'chirishni tasdiqlaysizmi?")) return;
  const res = await fetch(`/api/admin/subjects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
  if (res.ok) { showToast("Fan o'chirildi"); loadSubjectsAndSchedules(); }
}

async function deleteSchedule(id) {
  if (!confirm("Dars jadvalini o'chirishni tasdiqlaysizmi?")) return;
  const res = await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
  if (res.ok) { showToast("Dars jadvali o'chirildi"); loadSubjectsAndSchedules(); }
}

async function loadAdminLeaveRequests() {
  try {
    const res = await fetch('/api/admin/leave-requests', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const reqs = await res.json();
    const tbody = document.getElementById('leavesTableBody');
    tbody.innerHTML = '';

    if (!reqs || reqs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">Hech qanday spravka topshirilmagan</td></tr>';
      return;
    }

    reqs.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      const statusBadge = r.status === 'tasdiqlandi' ? '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Tasdiqlandi</span>' :
                          (r.status === 'rad_etildi' ? '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">Rad etildi</span>' :
                          '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Kutilmoqda</span>');
      tr.innerHTML = `
        <td class="p-3 font-semibold text-slate-800">${r.student_name}</td>
        <td class="p-3 text-slate-500">${r.group_name}</td>
        <td class="p-3 font-mono text-slate-600">${r.start_date} ~ ${r.end_date}</td>
        <td class="p-3 text-slate-700">${r.reason}</td>
        <td class="p-3">${r.document_path ? `<a href="${r.document_path}" target="_blank" class="text-blue-600 hover:underline"><i class="fa-solid fa-paperclip mr-1"></i>Hujjatni ko'rish</a>` : 'Yo\'q'}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 text-right space-x-1">
          ${r.status === 'kutilmoqda' ? `
            <button onclick="reviewLeave(${r.id}, 'tasdiqlandi')" class="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">Tasdiqlash</button>
            <button onclick="reviewLeave(${r.id}, 'rad_etildi')" class="px-2 py-1 bg-rose-600 text-white rounded text-xs hover:bg-rose-700">Rad etish</button>
          ` : '<span class="text-slate-400 text-xs">Ko\'rib chiqilgan</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function reviewLeave(reqId, status) {
  try {
    const res = await fetch(`/api/admin/leave-requests/${reqId}/review?status=${status}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast(`Ariza ${status}`);
      loadAdminLeaveRequests();
    }
  } catch (err) {
    showToast("Server xatosi", 'error');
  }
}

async function loadAuditLogs() {
  try {
    const res = await fetch('/api/admin/audit-logs', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const logs = await res.json();
    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = '';
    logs.forEach(l => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-3 text-slate-400 font-mono">${l.timestamp}</td>
        <td class="p-3 font-semibold text-slate-700">${l.user}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-100 font-mono text-blue-700 font-semibold">${l.action}</span></td>
        <td class="p-3 text-slate-600">${l.details || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

// ----------------- Excel Import / Export -----------------
async function handleExcelImport(e) {
  e.preventDefault();
  const fileInput = document.getElementById('importExcelFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("Excel faylini tanlang", 'error');
    return;
  }
  const role = document.getElementById('importRole').value;
  const groupId = document.getElementById('importGroupSelect').value;

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('role', role);
  if (role === 'student' && groupId) formData.append('group_id', groupId);

  try {
    const res = await fetch('/api/admin/import-excel', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Muvaffaqiyatli: ${data.imported_count} ta foydalanuvchi bazaga qo'shildi!`);
      fileInput.value = '';
      loadAdminStats();
    } else {
      showToast(data.detail || "Import xatosi", 'error');
    }
  } catch (err) {
    showToast("Faylni yuklashda xatolik yuz berdi", 'error');
  }
}

function downloadExcelReport() {
  window.location.href = `/api/reports/export-excel`;
}

// ----------------- Teacher Module -----------------
async function loadTeacherSchedules() {
  try {
    const res = await fetch('/api/teacher/my-schedules', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const schedules = await res.json();
    const list = document.getElementById('teacherSchedulesList');
    list.innerHTML = '';

    if (!schedules || schedules.length === 0) {
      list.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">Sizga hali darslar biriktirilmagan</div>';
      return;
    }

    schedules.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = `p-3 rounded-xl border border-slate-200 cursor-pointer transition hover:border-blue-500 hover:bg-blue-50/50 ${idx === 0 ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50'}`;
      item.id = `teacherSchItem-${s.id}`;
      item.onclick = () => selectTeacherSchedule(s.id);
      item.innerHTML = `
        <div class="font-bold text-slate-800 text-xs">${s.subject_name}</div>
        <div class="text-xs text-blue-600 font-semibold mt-0.5">Guruh: ${s.group_name}</div>
        <div class="text-xs text-slate-500 mt-1 flex items-center justify-between">
          <span><i class="fa-regular fa-clock mr-1"></i>${s.day_name} ${s.start_time}-${s.end_time}</span>
          <span class="font-medium">${s.room || ''}</span>
        </div>
      `;
      list.appendChild(item);
    });

    // Default select first schedule
    if (schedules.length > 0) {
      selectTeacherSchedule(schedules[0].id);
    }
  } catch (err) {
    console.error(err);
  }
}

function selectTeacherSchedule(schId) {
  currentTeacherScheduleId = schId;
  document.querySelectorAll('[id^="teacherSchItem-"]').forEach(el => {
    el.classList.remove('bg-blue-50', 'border-blue-500', 'ring-2', 'ring-blue-500/20');
    el.classList.add('bg-slate-50');
  });
  const selectedEl = document.getElementById(`teacherSchItem-${schId}`);
  if (selectedEl) {
    selectedEl.classList.remove('bg-slate-50');
    selectedEl.classList.add('bg-blue-50', 'border-blue-500', 'ring-2', 'ring-blue-500/20');
  }

  // Set today date as default
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('journalDateInput').value = todayStr;
  loadJournalData();
}

async function loadJournalData() {
  if (!currentTeacherScheduleId) return;
  const dateVal = document.getElementById('journalDateInput').value;
  try {
    const res = await fetch(`/api/teacher/journal/${currentTeacherScheduleId}?lesson_date=${dateVal}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('journalTitle').textContent = `${data.schedule.subject_name} • ${data.schedule.group_name}`;
      document.getElementById('journalSubtitle').textContent = `${data.schedule.room || 'Xona'} • ${data.schedule.start_time}-${data.schedule.end_time}`;
      document.getElementById('journalTopicInput').value = data.topic || '';
      currentJournalStudents = data.students;
      renderJournalStudents();
    }
  } catch (err) {
    console.error(err);
  }
}

function renderJournalStudents() {
  const tbody = document.getElementById('journalStudentsBody');
  tbody.innerHTML = '';

  if (currentJournalStudents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Bu guruhda talabalar mavjud emas</td></tr>';
    return;
  }

  currentJournalStudents.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    tr.innerHTML = `
      <td class="p-2.5 font-semibold text-slate-800">${s.full_name}</td>
      <td class="p-2.5 text-slate-400 font-mono">${s.student_id_number}</td>
      <td class="p-2.5">
        <div class="flex items-center justify-center space-x-1">
          <button type="button" onclick="setStudentStatus(${s.student_id}, 'keldi')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition ${s.status === 'keldi' ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
            <i class="fa-solid fa-check mr-1"></i>Keldi
          </button>
          <button type="button" onclick="setStudentStatus(${s.student_id}, 'kechikdi')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition ${s.status === 'kechikdi' ? 'bg-amber-500 text-white shadow' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}">
            <i class="fa-solid fa-clock mr-1"></i>Kechikdi
          </button>
          <button type="button" onclick="setStudentStatus(${s.student_id}, 'sababli')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition ${s.status === 'sababli' ? 'bg-blue-600 text-white shadow' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}">
            <i class="fa-solid fa-file-medical mr-1"></i>Sababli
          </button>
          <button type="button" onclick="setStudentStatus(${s.student_id}, 'sababsiz')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition ${s.status === 'sababsiz' ? 'bg-rose-600 text-white shadow' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}">
            <i class="fa-solid fa-xmark mr-1"></i>Sababsiz
          </button>
        </div>
      </td>
      <td class="p-2.5">
        <input type="text" value="${s.comment || ''}" onchange="updateStudentComment(${s.student_id}, this.value)" placeholder="Qayd..."
          class="w-full text-xs p-1.5 border border-slate-200 rounded-lg">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setStudentStatus(studentId, status) {
  const std = currentJournalStudents.find(s => s.student_id === studentId);
  if (std) {
    std.status = status;
    renderJournalStudents();
  }
}

function updateStudentComment(studentId, comment) {
  const std = currentJournalStudents.find(s => s.student_id === studentId);
  if (std) std.comment = comment;
}

function markAllPresent() {
  currentJournalStudents.forEach(s => s.status = 'keldi');
  renderJournalStudents();
  showToast("Barcha talabalar 'Keldi' deb belgilandi");
}

async function saveAttendanceJournal() {
  if (!currentTeacherScheduleId) return;
  const lessonDate = document.getElementById('journalDateInput').value;
  const topic = document.getElementById('journalTopicInput').value.trim() || "Dars mashg'uloti";

  const payload = {
    lesson_date: lessonDate,
    topic: topic,
    attendances: currentJournalStudents.map(s => ({
      student_id: s.student_id,
      status: s.status,
      comment: s.comment
    }))
  };

  try {
    const res = await fetch(`/api/teacher/journal/${currentTeacherScheduleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Davomat muvaffaqiyatli saqlandi!");
    } else {
      showToast(data.detail || "Saqlashda xatolik", 'error');
    }
  } catch (err) {
    showToast("Server bilan aloqa xatosi", 'error');
  }
}

// ----------------- Student Module -----------------
async function loadStudentDashboard() {
  try {
    const [dashRes, histRes, leavesRes] = await Promise.all([
      fetch('/api/student/dashboard', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
      fetch('/api/student/attendance-history', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
      fetch('/api/student/leave-requests', { headers: { 'Authorization': `Bearer ${currentToken}` } })
    ]);

    const data = await dashRes.json();
    const history = await histRes.json();
    const leaves = await leavesRes.json();

    if (dashRes.ok) {
      document.getElementById('studentCardName').textContent = data.student.full_name;
      document.getElementById('studentCardGroup').textContent = data.student.group_name;
      document.getElementById('studentCardIdNum').textContent = data.student.student_id_number;

      document.getElementById('studentCardPercentage').textContent = `${data.attendance_percentage}%`;
      document.getElementById('studentCardAbsentPct').textContent = `${data.absent_percentage}%`;
      document.getElementById('studentCardTotalClasses').textContent = data.total_classes;

      document.getElementById('studentCountKeldi').textContent = `Keldi: ${data.counts.keldi}`;
      document.getElementById('studentCountKechikdi').textContent = `Kechikdi: ${data.counts.kechikdi}`;
      document.getElementById('studentCountSababli').textContent = `Sababli: ${data.counts.sababli}`;
      document.getElementById('studentCountSababsiz').textContent = `Sababsiz: ${data.counts.sababsiz}`;

      // Warning check
      const warnBox = document.getElementById('studentWarningBanner');
      if (data.is_warning) {
        warnBox.classList.remove('hidden');
      } else {
        warnBox.classList.add('hidden');
      }

      // Subjects List
      const subList = document.getElementById('studentSubjectsList');
      subList.innerHTML = '';
      data.subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'p-3 border border-slate-200 rounded-xl bg-slate-50';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1 text-xs">
            <span class="font-bold text-slate-800">${sub.subject}</span>
            <span class="font-bold ${sub.percentage >= 80 ? 'text-emerald-600' : 'text-rose-600'}">${sub.percentage}%</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2">
            <div class="${sub.percentage >= 80 ? 'bg-emerald-500' : 'bg-rose-500'} h-2 rounded-full" style="width: ${sub.percentage}%"></div>
          </div>
          <div class="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>Jami: ${sub.total} dars</span>
            <span>Qatnashdi: ${sub.present} • Qoldirdi: ${sub.absent}</span>
          </div>
        `;
        subList.appendChild(div);
      });
    }

    // Attendance History
    const histBody = document.getElementById('studentHistoryBody');
    histBody.innerHTML = '';
    const statusBadges = {
      'keldi': '<span class="px-2 py-0.5 rounded status-badge-keldi font-bold">Keldi</span>',
      'kechikdi': '<span class="px-2 py-0.5 rounded status-badge-kechikdi font-bold">Kechikdi</span>',
      'sababli': '<span class="px-2 py-0.5 rounded status-badge-sababli font-bold">Sababli</span>',
      'sababsiz': '<span class="px-2 py-0.5 rounded status-badge-sababsiz font-bold">Sababsiz</span>'
    };

    history.forEach(h => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-2.5 font-mono text-slate-600">${h.date}</td>
        <td class="p-2.5 font-semibold text-slate-800">${h.subject_name}</td>
        <td class="p-2.5 text-slate-500">${h.topic || '-'}</td>
        <td class="p-2.5 text-slate-600">${h.teacher_name}</td>
        <td class="p-2.5">${statusBadges[h.status] || h.status}</td>
      `;
      histBody.appendChild(tr);
    });

    // Leave requests list
    const leavesList = document.getElementById('studentLeavesList');
    leavesList.innerHTML = '';
    if (!leaves || leaves.length === 0) {
      leavesList.innerHTML = '<div class="text-xs text-slate-400">Arizalar mavjud emas</div>';
    } else {
      leaves.forEach(l => {
        const item = document.createElement('div');
        item.className = 'p-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 flex justify-between items-center';
        const stBadge = l.status === 'tasdiqlandi' ? '<span class="text-emerald-600 font-bold">Tasdiqlangan</span>' :
                        (l.status === 'rad_etildi' ? '<span class="text-rose-600 font-bold">Rad etilgan</span>' :
                        '<span class="text-amber-600 font-bold">Kutilmoqda</span>');
        item.innerHTML = `
          <div>
            <div class="font-medium text-slate-700">${l.start_date} ~ ${l.end_date}</div>
            <div class="text-slate-400 text-[11px]">${l.reason}</div>
          </div>
          <div>${stBadge}</div>
        `;
        leavesList.appendChild(item);
      });
    }

  } catch (err) {
    console.error(err);
  }
}

async function handleStudentLeaveSubmit(e) {
  e.preventDefault();
  const startDate = document.getElementById('leaveStartDate').value;
  const endDate = document.getElementById('leaveEndDate').value;
  const reason = document.getElementById('leaveReason').value.trim();
  const fileInput = document.getElementById('leaveFile');

  const formData = new FormData();
  formData.append('start_date', startDate);
  formData.append('end_date', endDate);
  formData.append('reason', reason);
  if (fileInput.files.length > 0) {
    formData.append('file', fileInput.files[0]);
  }

  try {
    const res = await fetch('/api/student/leave-requests', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Ma'lumotnoma muvaffaqiyatli yuborildi!");
      document.getElementById('leaveReason').value = '';
      fileInput.value = '';
      loadStudentDashboard();
    } else {
      showToast(data.detail || "Xatolik", 'error');
    }
  } catch (err) {
    showToast("Server xatosi", 'error');
  }
}

// ----------------- Modals Helper -----------------
function openModal(title, contentHtml) {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
      <h3 class="font-bold text-slate-800 text-lg">${title}</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
    </div>
    ${contentHtml}
  `;
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// Modal: Add User
async function openAddUserModal() {
  const gRes = await fetch('/api/admin/groups', { headers: { 'Authorization': `Bearer ${currentToken}` } });
  const groups = await gRes.json();
  const groupOptions = groups.map(g => `<option value="${g.id}">${g.name} (${g.faculty_name})</option>`).join('');

  const html = `
    <form onsubmit="handleAddUserSubmit(event)" class="space-y-3 text-xs">
      <div>
        <label class="block font-semibold text-slate-600 mb-1">To'liq FIO:</label>
        <input type="text" id="nu_fullName" required placeholder="Masalan: Aziz Rahimov" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Login:</label>
          <input type="text" id="nu_username" required placeholder="aziz99" class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Parol:</label>
          <input type="password" id="nu_password" required placeholder="123456" class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Rol:</label>
        <select id="nu_role" onchange="toggleUserRoleFields(this.value)" class="w-full p-2.5 border border-slate-300 rounded-xl">
          <option value="student">Talaba</option>
          <option value="teacher">O'qituvchi</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      <div id="nu_studentFields" class="space-y-2">
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Akademik Guruh:</label>
          <select id="nu_groupId" class="w-full p-2.5 border border-slate-300 rounded-xl">${groupOptions}</select>
        </div>
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Talaba ID raqami:</label>
          <input type="text" id="nu_studentIdNum" placeholder="STU-2024-..." class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
      </div>

      <div id="nu_teacherFields" class="hidden space-y-2">
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Kafedra:</label>
          <input type="text" id="nu_department" placeholder="Dasturiy injiniring" class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Ilmiy daraja / Unvon:</label>
          <input type="text" id="nu_title" placeholder="Dotsent, Katta o'qituvchi" class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
      </div>

      <div class="pt-3 flex justify-end space-x-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl text-slate-600">Bekor qilish</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow">Yaratish</button>
      </div>
    </form>
  `;
  openModal("Yangi foydalanuvchi qo'shish", html);
}

function toggleUserRoleFields(role) {
  const std = document.getElementById('nu_studentFields');
  const tch = document.getElementById('nu_teacherFields');
  if (role === 'student') {
    std.classList.remove('hidden');
    tch.classList.add('hidden');
  } else if (role === 'teacher') {
    std.classList.add('hidden');
    tch.classList.remove('hidden');
  } else {
    std.classList.add('hidden');
    tch.classList.add('hidden');
  }
}

async function handleAddUserSubmit(e) {
  e.preventDefault();
  const role = document.getElementById('nu_role').value;
  const payload = {
    full_name: document.getElementById('nu_fullName').value.trim(),
    username: document.getElementById('nu_username').value.trim(),
    password: document.getElementById('nu_password').value,
    role: role,
    is_active: true
  };

  if (role === 'student') {
    payload.group_id = parseInt(document.getElementById('nu_groupId').value);
    payload.student_id_number = document.getElementById('nu_studentIdNum').value.trim() || undefined;
  } else if (role === 'teacher') {
    payload.department = document.getElementById('nu_department').value.trim() || undefined;
    payload.title = document.getElementById('nu_title').value.trim() || undefined;
  }

  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    showToast("Foydalanuvchi muvaffaqiyatli yaratildi");
    closeModal();
    loadAdminUsers();
    loadAdminStats();
  } else {
    const d = await res.json();
    showToast(d.detail || "Xatolik", 'error');
  }
}

// Modal: Add Faculty
function openAddFacultyModal() {
  const html = `
    <form onsubmit="handleAddFacultySubmit(event)" class="space-y-3 text-xs">
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Fakultet nomi:</label>
        <input type="text" id="nf_name" required placeholder="Kompyuter injiniringi fakulteti" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Fakultet kodi (Qisqartma):</label>
        <input type="text" id="nf_code" required placeholder="KIF" class="w-full p-2.5 border border-slate-300 rounded-xl uppercase">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Tavsif:</label>
        <textarea id="nf_desc" rows="2" class="w-full p-2.5 border border-slate-300 rounded-xl"></textarea>
      </div>
      <div class="pt-3 flex justify-end space-x-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl text-slate-600">Bekor qilish</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow">Saqlash</button>
      </div>
    </form>
  `;
  openModal("Yangi fakultet qo'shish", html);
}

async function handleAddFacultySubmit(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('nf_name').value.trim(),
    code: document.getElementById('nf_code').value.trim().toUpperCase(),
    description: document.getElementById('nf_desc').value.trim()
  };
  const res = await fetch('/api/admin/faculties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    showToast("Fakultet yaratildi");
    closeModal();
    loadFacultiesAndGroups();
  } else {
    const d = await res.json();
    showToast(d.detail || "Xatolik", 'error');
  }
}

// Modal: Add Group
async function openAddGroupModal() {
  const fRes = await fetch('/api/admin/faculties', { headers: { 'Authorization': `Bearer ${currentToken}` } });
  const faculties = await fRes.json();
  const facOptions = faculties.map(f => `<option value="${f.id}">${f.name} (${f.code})</option>`).join('');

  const html = `
    <form onsubmit="handleAddGroupSubmit(event)" class="space-y-3 text-xs">
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Fakultet:</label>
        <select id="ng_facultyId" class="w-full p-2.5 border border-slate-300 rounded-xl">${facOptions}</select>
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Guruh nomi:</label>
        <input type="text" id="ng_name" required placeholder="KI-21-01" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Kurs (1-4):</label>
        <input type="number" id="ng_course" value="1" min="1" max="5" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div class="pt-3 flex justify-end space-x-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl text-slate-600">Bekor qilish</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow">Saqlash</button>
      </div>
    </form>
  `;
  openModal("Yangi guruh qo'shish", html);
}

async function handleAddGroupSubmit(e) {
  e.preventDefault();
  const payload = {
    faculty_id: parseInt(document.getElementById('ng_facultyId').value),
    name: document.getElementById('ng_name').value.trim(),
    course_year: parseInt(document.getElementById('ng_course').value)
  };
  const res = await fetch('/api/admin/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    showToast("Guruh yaratildi");
    closeModal();
    loadFacultiesAndGroups();
  } else {
    const d = await res.json();
    showToast(d.detail || "Xatolik", 'error');
  }
}

// Modal: Add Subject
function openAddSubjectModal() {
  const html = `
    <form onsubmit="handleAddSubjectSubmit(event)" class="space-y-3 text-xs">
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Fan nomi:</label>
        <input type="text" id="ns_name" required placeholder="Veb dasturlash" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Fan kodi:</label>
        <input type="text" id="ns_code" required placeholder="WEB-301" class="w-full p-2.5 border border-slate-300 rounded-xl uppercase">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Jami o'quv soati:</label>
        <input type="number" id="ns_hours" value="60" min="10" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div class="pt-3 flex justify-end space-x-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl text-slate-600">Bekor qilish</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow">Saqlash</button>
      </div>
    </form>
  `;
  openModal("Yangi fan qo'shish", html);
}

async function handleAddSubjectSubmit(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('ns_name').value.trim(),
    code: document.getElementById('ns_code').value.trim().toUpperCase(),
    hours_total: parseInt(document.getElementById('ns_hours').value)
  };
  const res = await fetch('/api/admin/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    showToast("Fan qo'shildi");
    closeModal();
    loadSubjectsAndSchedules();
  } else {
    const d = await res.json();
    showToast(d.detail || "Xatolik", 'error');
  }
}

// Modal: Add Schedule
async function openAddScheduleModal() {
  const [tRes, subRes, gRes] = await Promise.all([
    fetch('/api/admin/users?role=teacher', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
    fetch('/api/admin/subjects', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
    fetch('/api/admin/groups', { headers: { 'Authorization': `Bearer ${currentToken}` } })
  ]);
  const teachers = await tRes.json();
  const subjects = await subRes.json();
  const groups = await gRes.json();

  const tOptions = teachers.map(t => `<option value="${t.teacher_id}">${t.full_name}</option>`).join('');
  const subOptions = subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const gOptions = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

  const html = `
    <form onsubmit="handleAddScheduleSubmit(event)" class="space-y-3 text-xs">
      <div>
        <label class="block font-semibold text-slate-600 mb-1">O'qituvchi:</label>
        <select id="nsch_teacher" class="w-full p-2.5 border border-slate-300 rounded-xl">${tOptions}</select>
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Fan:</label>
        <select id="nsch_subject" class="w-full p-2.5 border border-slate-300 rounded-xl">${subOptions}</select>
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Guruh:</label>
        <select id="nsch_group" class="w-full p-2.5 border border-slate-300 rounded-xl">${gOptions}</select>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Hafta kuni:</label>
          <select id="nsch_day" class="w-full p-2.5 border border-slate-300 rounded-xl">
            <option value="1">Dushanba</option>
            <option value="2">Seshanba</option>
            <option value="3">Chorshanba</option>
            <option value="4">Payshanba</option>
            <option value="5">Juma</option>
            <option value="6">Shanba</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Boshlanish:</label>
          <input type="time" id="nsch_start" value="08:30" class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
        <div>
          <label class="block font-semibold text-slate-600 mb-1">Tugash:</label>
          <input type="time" id="nsch_end" value="09:50" class="w-full p-2.5 border border-slate-300 rounded-xl">
        </div>
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Auditoriya / Xona:</label>
        <input type="text" id="nsch_room" placeholder="304-auditoriya" class="w-full p-2.5 border border-slate-300 rounded-xl">
      </div>
      <div class="pt-3 flex justify-end space-x-2">
        <button type="button" onclick="closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl text-slate-600">Bekor qilish</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow">Saqlash</button>
      </div>
    </form>
  `;
  openModal("Dars jadvalini biriktirish", html);
}

async function handleAddScheduleSubmit(e) {
  e.preventDefault();
  const payload = {
    teacher_id: parseInt(document.getElementById('nsch_teacher').value),
    subject_id: parseInt(document.getElementById('nsch_subject').value),
    group_id: parseInt(document.getElementById('nsch_group').value),
    day_of_week: parseInt(document.getElementById('nsch_day').value),
    start_time: document.getElementById('nsch_start').value,
    end_time: document.getElementById('nsch_end').value,
    room: document.getElementById('nsch_room').value.trim() || undefined
  };
  const res = await fetch('/api/admin/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    showToast("Dars jadvali saqlandi");
    closeModal();
    loadSubjectsAndSchedules();
  } else {
    const d = await res.json();
    showToast(d.detail || "Xatolik", 'error');
  }
}
