// ==================== QUẢN LÝ NCKH & SÁNG KIẾN ====================

const ADMIN_PASSWORD = "Admin123";

// ⚠️ THAY URL NÀY BẰNG URL CỦA BẠN ⚠️
const API_URL = "https://script.google.com/macros/s/AKfycbwYf_U1FETC6_tnLLf1y9S0_LIX9fNpURLCP5DISDmA82PjrRGlzlfqKNrMth5Y3DoHwA/exec";

let researchData = [];
let nextId = 1;
let currentChart = null;
let currentPieChart = null;
let deleteTargetId = null;
let pendingAction = null;
let pendingId = null;

// ==================== KHỞI TẠO & LOAD DỮ LIỆU ====================

async function fetchDataFromSheet() {
  try {
    showLoading(true);
    const res = await fetch(API_URL);
    const result = await res.json();
    
    if (result.success && result.data) {
      researchData = result.data;
      researchData = researchData.filter(r => r && typeof r === 'object');
      nextId = researchData.length ? Math.max(...researchData.map(r => parseInt(r.id))) + 1 : 1;
      
      researchData.forEach(item => {
        if (!item.extra) item.extra = {};
        if (!item.extra.files) item.extra.files = [];
        if (!item.extra.members) item.extra.members = [];
      });
      
      saveToLocalStorage();
    } else {
      loadFromLocalStorage();
    }
  } catch (e) {
    console.error('Fetch error:', e);
    loadFromLocalStorage();
  } finally {
    showLoading(false);
  }
}

function saveToLocalStorage() {
  localStorage.setItem('researchData', JSON.stringify(researchData));
  localStorage.setItem('nextId', nextId);
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('researchData');
  if (saved) {
    researchData = JSON.parse(saved);
    nextId = parseInt(localStorage.getItem('nextId')) || (researchData.length + 1);
    researchData.forEach(item => {
      if (!item.extra) item.extra = {};
      if (!item.extra.files) item.extra.files = [];
      if (!item.extra.members) item.extra.members = [];
    });
  } else {
    // Dữ liệu mẫu ban đầu
    researchData = [
      { id: 1, year: 2025, name: "Nghiên cứu mất ngủ", type: "NCKH", author: "Nguyễn Quang Ngọc", decisionNumber: "", fileLink: "", extra: { members: [{ name: "Trần Thị B", percent: "30" }, { name: "Lê Văn C", percent: "20" }], domain: "Điều trị", specialty: "Y học cổ truyền", registerDate: new Date().toISOString(), resultDuyet: "Thông qua", resultNghiemThu: "Thông qua", unit: "Bệnh viện Y học cổ truyền Quảng Nam", level: "Cơ sở", files: [] } },
      { id: 2, year: 2024, name: "Nghiên cứu G về y học cổ truyền", type: "SKKT", author: "Nguyễn Văn Dũng", decisionNumber: "QĐ/G/2024", fileLink: "#", extra: {} },
      { id: 3, year: 2022, name: "Sáng kiến B: Cải tiến quy trình", type: "SKKT", author: "Nguyễn Văn Dũng", extra: {} },
      { id: 4, year: 2021, name: "Nghiên cứu A về phục hồi chức năng", type: "SKKT", author: "Nguyễn Văn A", decisionNumber: "QĐ/A/2021", fileLink: "#", extra: {} },
      { id: 5, year: 2021, name: "Nghiên cứu C về hiệu quả điều trị", type: "SKKT", author: "Nguyễn Thị Ánh Quang", fileLink: "#", extra: {} },
      { id: 6, year: 2020, name: "Nghiên cứu đau lưng", type: "NCKH", author: "Cao Văn Trọng", extra: {} }
    ];
    nextId = 7;
    researchData.forEach(item => {
      if (!item.extra) item.extra = {};
      if (!item.extra.files) item.extra.files = [];
      if (!item.extra.members) item.extra.members = [];
    });
  }
}

// ==================== CRUD VỚI SHEET ====================

async function addToSheet(item) {
  try {
    showLoading(true);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item: item })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    showLoading(false);
  }
}

async function updateToSheet(item) {
  try {
    showLoading(true);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", item: item })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    showLoading(false);
  }
}

async function deleteFromSheet(id) {
  try {
    showLoading(true);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: id })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    showLoading(false);
  }
}

// ==================== THÀNH VIÊN ====================

function addMemberField() {
  const container = document.getElementById('membersList');
  if (container.children.length >= 3) {
    alert('Chỉ được thêm tối đa 3 thành viên!');
    return;
  }
  const div = document.createElement('div');
  div.className = 'member-item';
  div.innerHTML = `
    <input type="text" placeholder="Tên thành viên" class="member-name" style="flex:2">
    <input type="text" placeholder="Tỷ lệ (%)" class="member-percent" style="width: 100px;">
    <button type="button" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(div);
}

function loadMembersToForm(members) {
  const container = document.getElementById('membersList');
  container.innerHTML = '';
  if (members && members.length) {
    members.forEach(m => {
      const div = document.createElement('div');
      div.className = 'member-item';
      div.innerHTML = `
        <input type="text" placeholder="Tên thành viên" class="member-name" value="${escapeHtml(m.name)}" style="flex:2">
        <input type="text" placeholder="Tỷ lệ (%)" class="member-percent" value="${escapeHtml(m.percent || '')}" style="width: 100px;">
        <button type="button" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
      `;
      container.appendChild(div);
    });
  }
}

function collectMembersFromForm() {
  const memberItems = document.querySelectorAll('#membersList .member-item');
  const members = [];
  for (let i = 0; i < Math.min(memberItems.length, 3); i++) {
    const item = memberItems[i];
    const name = item.querySelector('.member-name')?.value.trim();
    const percent = item.querySelector('.member-percent')?.value.trim();
    if (name) members.push({ name: name, percent: percent || '' });
  }
  return members;
}

// ==================== FILE ĐÍNH KÈM ====================

function addFileField() {
  const container = document.getElementById('filesList');
  const div = document.createElement('div');
  div.className = 'file-input-group';
  div.innerHTML = `
    <input type="text" placeholder="Tên file" class="file-label" style="flex:2">
    <input type="text" placeholder="URL" class="file-url" style="flex:3">
    <button type="button" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(div);
}

function loadFilesToForm(files) {
  const container = document.getElementById('filesList');
  container.innerHTML = '';
  if (files && files.length) {
    files.forEach(f => {
      const div = document.createElement('div');
      div.className = 'file-input-group';
      div.innerHTML = `
        <input type="text" placeholder="Tên file" class="file-label" value="${escapeHtml(f.label)}" style="flex:2">
        <input type="text" placeholder="URL" class="file-url" value="${escapeHtml(f.url)}" style="flex:3">
        <button type="button" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
      `;
      container.appendChild(div);
    });
  }
}

function collectFilesFromForm() {
  const fileGroups = document.querySelectorAll('#filesList .file-input-group');
  const files = [];
  fileGroups.forEach(group => {
    const label = group.querySelector('.file-label')?.value.trim();
    const url = group.querySelector('.file-url')?.value.trim();
    if (label && url) files.push({ label, url });
  });
  return files;
}

// ==================== UI & HIỂN THỊ ====================

function toggleScienceFields() {
  const type = document.getElementById('type').value;
  const scienceFields = document.getElementById('scienceFields');
  scienceFields.classList.toggle('show', type === 'NCKH');
}

function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function generateProjectCode(year, id) {
  let seq = (id % 100).toString().padStart(2, '0');
  return `${year}.${seq}.01`;
}

function getStats() {
  const total = researchData.length;
  const nckh = researchData.filter(r => r.type === 'NCKH').length;
  const skkt = researchData.filter(r => r.type === 'SKKT').length;
  const years = [...new Set(researchData.map(r => r.year))].sort();
  const byYear = years.map(y => ({
    year: y,
    total: researchData.filter(r => r.year === y).length,
    nckh: researchData.filter(r => r.year === y && r.type === 'NCKH').length,
    skkt: researchData.filter(r => r.year === y && r.type === 'SKKT').length
  }));
  return { total, nckh, skkt, byYear };
}

function updateKPI() {
  const s = getStats();
  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card"><div class="kpi-title"><i class="fas fa-tasks"></i> Tổng số</div><div class="kpi-value">${s.total}</div></div>
    <div class="kpi-card"><div class="kpi-title"><i class="fas fa-flask"></i> Nghiên cứu KH</div><div class="kpi-value">${s.nckh}</div><div class="kpi-sub">${s.total ? ((s.nckh / s.total) * 100).toFixed(1) : 0}%</div></div>
    <div class="kpi-card"><div class="kpi-title"><i class="fas fa-lightbulb"></i> Sáng kiến</div><div class="kpi-value">${s.skkt}</div><div class="kpi-sub">${s.total ? ((s.skkt / s.total) * 100).toFixed(1) : 0}%</div></div>
    <div class="kpi-card"><div class="kpi-title"><i class="fas fa-chart-line"></i> Năm gần nhất</div><div class="kpi-value">${s.byYear.length ? Math.max(...s.byYear.map(y => y.year)) : 0}</div></div>
  `;
}

function updateCharts(metric = 'total') {
  const s = getStats();
  const years = s.byYear.map(y => y.year);
  const data = metric === 'total' ? s.byYear.map(y => y.total) : metric === 'nckh' ? s.byYear.map(y => y.nckh) : s.byYear.map(y => y.skkt);
  const colors = { total: '#2dd4bf', nckh: '#a78bfa', skkt: '#facc15' };
  
  if (currentChart) currentChart.destroy();
  currentChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: years,
      datasets: [{
        label: metric === 'total' ? 'Tổng' : metric === 'nckh' ? 'Nghiên cứu KH' : 'Sáng kiến',
        data: data,
        borderColor: colors[metric],
        backgroundColor: colors[metric] + '20',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 3
      }]
    },
    options: { responsive: true, maintainAspectRatio: true, scales: { y: { ticks: { stepSize: 1 } } } }
  });
  
  if (currentPieChart) currentPieChart.destroy();
  currentPieChart = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Nghiên cứu khoa học', 'Sáng kiến'],
      datasets: [{ data: [s.nckh, s.skkt], backgroundColor: ['#a78bfa', '#facc15'] }]
    },
    options: { cutout: '55%', plugins: { legend: { position: 'bottom' } } }
  });
}

function renderTable() {
  const yearFilter = document.getElementById('yearFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  let filtered = [...researchData];
  if (yearFilter !== 'all') filtered = filtered.filter(r => r.year == yearFilter);
  if (typeFilter !== 'all') filtered = filtered.filter(r => r.type === typeFilter);
  filtered.sort((a, b) => b.year - a.year);
  
  const tbody = document.getElementById('researchTableBody');
  tbody.innerHTML = filtered.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.year}</td>
      <td style="text-align:left;"><span class="clickable-name" onclick="showDetail(${item.id})">${escapeHtml(item.name)}</span></td>
      <td><span class="badge ${item.type === 'NCKH' ? 'badge-nckh' : 'badge-skkt'}">${item.type === 'NCKH' ? 'Nghiên cứu KH' : 'Sáng kiến'}</span></td>
      <td>${escapeHtml(item.author)}</td>
      <td>${item.decisionNumber || '—'}</td>
      <td>${item.fileLink && item.fileLink !== '#' && item.fileLink !== '' ? `<a href="${item.fileLink}" class="file-link" target="_blank"><i class="fas fa-download"></i> Tải</a>` : '—'}</td>
      <td>
        <button class="action-btn edit-btn" onclick="requestEdit(${item.id})"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete-btn" onclick="requestDelete(${item.id}, '${escapeHtml(item.name)}')"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>
  `).join('');
}

function showDetail(id) {
  const item = researchData.find(r => r.id == id);
  if (!item) return;
  
  const extra = item.extra || {};
  const files = extra.files || [];
  const members = extra.members || [];
  const isNCKH = item.type === 'NCKH';
  const code = extra.projectCode || generateProjectCode(item.year, item.id);
  
  let filesHtml = `<div class="file-list"><div style="font-weight:600; margin-bottom:8px;"><i class="fas fa-paperclip"></i> File đính kèm</div>`;
  if (files.length) {
    files.forEach(f => {
      filesHtml += `<div class="file-row"><span>📄 ${escapeHtml(f.label)}</span><a href="${escapeHtml(f.url)}" class="file-link" target="_blank">Xem</a></div>`;
    });
  } else {
    filesHtml += `<div class="file-row">Chưa có file</div>`;
  }
  filesHtml += `</div>`;
  
  let membersHtml = '';
  if (isNCKH && members.length) {
    membersHtml = `<div class="detail-item"><div class="detail-label">Thành viên</div><div class="detail-value">`;
    members.forEach(m => {
      membersHtml += `<div>• ${escapeHtml(m.name)} ${m.percent ? `(${m.percent}%)` : ''}</div>`;
    });
    membersHtml += `</div></div>`;
  }
  
  let scienceHtml = '';
  if (isNCKH) {
    scienceHtml = `
      <div class="detail-item"><div class="detail-label">MS đề tài</div><div class="detail-value"><strong style="color:#2dd4bf">${escapeHtml(code)}</strong></div></div>
      <div class="detail-item"><div class="detail-label">Ngày đăng ký</div><div class="detail-value">${extra.registerDate ? new Date(extra.registerDate).toLocaleString() : 'Chưa cập nhật'}</div></div>
      <div class="detail-item"><div class="detail-label">Lĩnh vực</div><div class="detail-value">${escapeHtml(extra.domain || 'Điều trị')}</div></div>
      <div class="detail-item"><div class="detail-label">Chuyên ngành</div><div class="detail-value">${escapeHtml(extra.specialty || 'Y học cổ truyền')}</div></div>
      ${membersHtml}
    `;
  }
  
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-grid">
      ${scienceHtml}
      <div class="detail-item"><div class="detail-label">Chủ nhiệm</div><div class="detail-value">${escapeHtml(item.author)}</div></div>
      <div class="detail-item"><div class="detail-label">Đơn vị</div><div class="detail-value">${escapeHtml(extra.unit || 'Bệnh viện Y học cổ truyền Quảng Nam')}</div></div>
      <div class="detail-item"><div class="detail-label">Nghiệm thu</div><div class="detail-value">Năm ${item.year}</div></div>
      <div class="detail-item"><div class="detail-label">Cấp độ</div><div class="detail-value">${escapeHtml(extra.level || 'Cơ sở')}</div></div>
      <div class="detail-item"><div class="detail-label">Duyệt đề cương</div><div class="detail-value"><span class="badge-result">${escapeHtml(extra.resultDuyet || 'Thông qua')}</span></div></div>
      <div class="detail-item"><div class="detail-label">Nghiệm thu</div><div class="detail-value"><span class="badge-result">${escapeHtml(extra.resultNghiemThu || 'Thông qua')}</span></div></div>
    </div>
    ${filesHtml}
  `;
  document.getElementById('detailModal').style.display = 'flex';
}

// ==================== MODAL & MẬT KHẨU ====================

function showPasswordModal(action, id = null) {
  pendingAction = action;
  pendingId = id;
  document.getElementById('passwordInput').value = '';
  document.getElementById('passwordError').style.display = 'none';
  document.getElementById('passwordModal').style.display = 'flex';
}

function verifyPassword() {
  if (document.getElementById('passwordInput').value === ADMIN_PASSWORD) {
    document.getElementById('passwordModal').style.display = 'none';
    if (pendingAction === 'save') saveItemToData();
    else if (pendingAction === 'delete') executeDeleteItem();
    pendingAction = null;
  } else {
    document.getElementById('passwordError').style.display = 'block';
  }
}

function closePasswordModal() {
  document.getElementById('passwordModal').style.display = 'none';
  pendingAction = null;
}

// ==================== THÊM/SỬA/XÓA ====================

function openAddModal() {
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Thêm mới';
  document.getElementById('editId').value = '';
  document.getElementById('researchForm').reset();
  document.getElementById('year').value = new Date().getFullYear();
  document.getElementById('projectCode').value = '';
  document.getElementById('registerDate').value = '';
  document.getElementById('domain').value = 'Điều trị';
  document.getElementById('specialty').value = 'Y học cổ truyền';
  document.getElementById('unit').value = 'Bệnh viện Y học cổ truyền Quảng Nam';
  document.getElementById('level').value = 'Cơ sở';
  document.getElementById('resultDuyet').value = 'Thông qua';
  document.getElementById('resultNghiemThu').value = 'Thông qua';
  document.getElementById('filesList').innerHTML = '';
  document.getElementById('membersList').innerHTML = '';
  toggleScienceFields();
  document.getElementById('researchModal').style.display = 'flex';
}

function requestEdit(id) {
  const item = researchData.find(r => r.id == id);
  if (!item) return;
  
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa';
  document.getElementById('editId').value = item.id;
  document.getElementById('year').value = item.year;
  document.getElementById('name').value = item.name;
  document.getElementById('type').value = item.type;
  document.getElementById('author').value = item.author;
  document.getElementById('decisionNumber').value = item.decisionNumber || '';
  document.getElementById('fileLink').value = item.fileLink || '';
  
  const extra = item.extra || {};
  document.getElementById('projectCode').value = extra.projectCode || '';
  document.getElementById('registerDate').value = extra.registerDate ? extra.registerDate.slice(0, 16) : '';
  document.getElementById('domain').value = extra.domain || 'Điều trị';
  document.getElementById('specialty').value = extra.specialty || 'Y học cổ truyền';
  document.getElementById('unit').value = extra.unit || 'Bệnh viện Y học cổ truyền Quảng Nam';
  document.getElementById('level').value = extra.level || 'Cơ sở';
  document.getElementById('resultDuyet').value = extra.resultDuyet || 'Thông qua';
  document.getElementById('resultNghiemThu').value = extra.resultNghiemThu || 'Thông qua';
  
  loadFilesToForm(extra.files || []);
  loadMembersToForm(extra.members || []);
  toggleScienceFields();
  document.getElementById('researchModal').style.display = 'flex';
}

function requestSave(event) {
  event.preventDefault();
  showPasswordModal('save');
}

async function saveItemToData() {
  const id = document.getElementById('editId').value;
  const year = parseInt(document.getElementById('year').value);
  const name = document.getElementById('name').value.trim();
  const type = document.getElementById('type').value;
  const author = document.getElementById('author').value.trim();
  const decisionNumber = document.getElementById('decisionNumber').value.trim();
  const fileLink = document.getElementById('fileLink').value.trim();
  
  const extraData = {
    projectCode: document.getElementById('projectCode').value.trim(),
    registerDate: document.getElementById('registerDate').value,
    domain: type === 'NCKH' ? document.getElementById('domain').value : '',
    specialty: type === 'NCKH' ? document.getElementById('specialty').value : '',
    unit: document.getElementById('unit').value,
    level: document.getElementById('level').value,
    resultDuyet: document.getElementById('resultDuyet').value,
    resultNghiemThu: document.getElementById('resultNghiemThu').value,
    files: collectFilesFromForm(),
    members: type === 'NCKH' ? collectMembersFromForm() : []
  };
  
  if (!name || !author) {
    alert('Vui lòng nhập đầy đủ thông tin!');
    return;
  }
  
  let result;
  if (id) {
    // Cập nhật
    const updatedItem = {
      id: parseInt(id),
      year, name, type, author, decisionNumber, fileLink,
      extra: extraData,
      createdAt: researchData.find(r => r.id == id)?.createdAt || new Date().toISOString()
    };
    result = await updateToSheet(updatedItem);
    if (result.success) {
      const idx = researchData.findIndex(r => r.id == id);
      if (idx !== -1) researchData[idx] = updatedItem;
      saveToLocalStorage();
    }
  } else {
    // Thêm mới
    const newItem = { year, name, type, author, decisionNumber, fileLink, extra: extraData };
    result = await addToSheet(newItem);
    if (result.success && result.id) {
      newItem.id = result.id;
      researchData.push(newItem);
      nextId = Math.max(nextId, result.id + 1);
      saveToLocalStorage();
    }
  }
  
  if (result?.success) {
    closeModal();
    await refreshAll();
    alert(id ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
  } else {
    alert('Lỗi: ' + (result?.error || 'Không thể lưu dữ liệu'));
  }
}

function requestDelete(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteItemName').innerText = name;
  document.getElementById('deleteModal').style.display = 'flex';
}

function confirmDeleteRequest() {
  document.getElementById('deleteModal').style.display = 'none';
  showPasswordModal('delete', deleteTargetId);
}

async function executeDeleteItem() {
  if (deleteTargetId) {
    const result = await deleteFromSheet(deleteTargetId);
    if (result?.success) {
      researchData = researchData.filter(r => r.id != deleteTargetId);
      saveToLocalStorage();
      await refreshAll();
      alert('Xóa thành công!');
    } else {
      alert('Lỗi: ' + (result?.error || 'Không thể xóa'));
    }
    deleteTargetId = null;
  }
}

// ==================== RESET & REFRESH ====================

function closeModal() {
  document.getElementById('researchModal').style.display = 'none';
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
}

function resetFilters() {
  document.getElementById('yearFilter').value = 'all';
  document.getElementById('typeFilter').value = 'all';
  renderTable();
}

async function refreshAll() {
  await fetchDataFromSheet();
  updateKPI();
  const activeTab = document.querySelector('.chart-tab.active');
  updateCharts(activeTab ? activeTab.dataset.metric : 'total');
  renderTable();
  
  const years = [...new Set(researchData.map(r => r.year))].sort((a, b) => b - a);
  const yearSelect = document.getElementById('yearFilter');
  yearSelect.innerHTML = '<option value="all">Tất cả</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
}

// ==================== KHỞI TẠO ====================

document.addEventListener('DOMContentLoaded', async () => {
  await refreshAll();
  
  document.getElementById('openAddModalBtn').onclick = openAddModal;
  document.getElementById('resetFilterBtn').onclick = resetFilters;
  document.getElementById('yearFilter').onchange = renderTable;
  document.getElementById('typeFilter').onchange = renderTable;
  document.getElementById('researchForm').onsubmit = requestSave;
  document.getElementById('confirmDeleteBtn').onclick = confirmDeleteRequest;
  document.getElementById('cancelPasswordBtn').onclick = closePasswordModal;
  document.getElementById('confirmPasswordBtn').onclick = verifyPassword;
  
  document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => btn.onclick = closeModal);
  document.querySelectorAll('.close-delete-modal, .cancel-delete-btn').forEach(btn => btn.onclick = closeDeleteModal);
  document.querySelector('.close-detail').onclick = () => document.getElementById('detailModal').style.display = 'none';
  document.querySelector('.close-password').onclick = closePasswordModal;
  
  window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal();
      closeDeleteModal();
      document.getElementById('detailModal').style.display = 'none';
      closePasswordModal();
    }
  };
  
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      updateCharts(tab.dataset.metric);
    };
  });
});

// Export functions to global
window.showDetail = showDetail;
window.requestEdit = requestEdit;
window.requestDelete = requestDelete;
window.addFileField = addFileField;
window.addMemberField = addMemberField;
window.toggleScienceFields = toggleScienceFields;