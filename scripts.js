// ==================== QUẢN LÝ NCKH & SÁNG KIẾN ====================
// Bản đồng bộ trực tiếp với Google Sheets - KHÔNG DÙNG CACHE

const ADMIN_PASSWORD = "Admin123";

// URL Google Apps Script của bạn
const API_URL = "https://script.google.com/macros/s/AKfycbxltzc7mUkjBy3Ney1140pcmivKddNJoVSNZHQRP-MvyXpulCbGdhlQkq2Ok7Ryib2_cw/exec";

let researchData = [];
let currentChart = null;
let currentPieChart = null;
let deleteTargetId = null;
let pendingAction = null;

// Proxy variables
let proxyFrame = null;
let requestId = 0;
let pendingRequests = {};

// ==================== PROXY ĐỂ VƯỢT CORS ====================

function initProxy() {
    return new Promise((resolve) => {
        if (proxyFrame) {
            resolve();
            return;
        }
        
        proxyFrame = document.createElement('iframe');
        proxyFrame.src = 'proxy.html';
        proxyFrame.style.display = 'none';
        document.body.appendChild(proxyFrame);
        
        window.addEventListener('message', function(event) {
            if (event.data.type === 'PROXY_READY') {
                console.log('Proxy ready');
                resolve();
            } else if (event.data.type === 'FETCH_RESULT') {
                if (pendingRequests[event.data.requestId]) {
                    pendingRequests[event.data.requestId].resolve(event.data.data);
                    delete pendingRequests[event.data.requestId];
                }
            } else if (event.data.type === 'FETCH_ERROR') {
                if (pendingRequests[event.data.requestId]) {
                    pendingRequests[event.data.requestId].reject(new Error(event.data.error));
                    delete pendingRequests[event.data.requestId];
                }
            }
        });
    });
}

async function fetchViaProxy(url, options = {}) {
    return new Promise((resolve, reject) => {
        const id = ++requestId;
        pendingRequests[id] = { resolve, reject };
        
        if (!proxyFrame) {
            reject(new Error('Proxy not initialized'));
            return;
        }
        
        proxyFrame.contentWindow.postMessage({
            type: 'FETCH_DATA',
            requestId: id,
            url: url,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body || null
        }, '*');
        
        setTimeout(() => {
            if (pendingRequests[id]) {
                pendingRequests[id].reject(new Error('Request timeout'));
                delete pendingRequests[id];
            }
        }, 30000);
    });
}

// ==================== ĐỌC DỮ LIỆU TRỰC TIẾP TỪ GOOGLE SHEETS ====================

async function fetchDataFromSheet() {
    try {
        showLoading(true);
        const url = `${API_URL}?t=${Date.now()}`;
        const result = await fetchViaProxy(url);
        
        if (result.success && result.data) {
            researchData = result.data;
            
            // Đảm bảo mỗi item có cấu trúc đúng
            researchData.forEach(item => {
                if (!item.extra) item.extra = {};
                if (!item.extra.files) item.extra.files = [];
                if (!item.extra.members) item.extra.members = [];
                // Chuyển đổi year sang number nếu cần
                if (item.year) item.year = parseInt(item.year);
                if (item.id) item.id = parseInt(item.id);
            });
            
            console.log('Đã tải từ Google Sheets:', researchData.length, 'bản ghi');
            return true;
        } else {
            console.error('Lỗi khi tải từ Sheets:', result);
            return false;
        }
    } catch (e) {
        console.error('Fetch error:', e);
        return false;
    } finally {
        showLoading(false);
    }
}

// ==================== THÊM/SỬA/XÓA TRÊN GOOGLE SHEETS ====================

async function callAPI(action, item = null, id = null) {
    try {
        showLoading(true);
        
        const body = { action: action };
        if (item) body.item = item;
        if (id) body.id = id;
        
        const result = await fetchViaProxy(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        
        console.log(`API ${action} result:`, result);
        return result;
    } catch (e) {
        console.error(`${action} error:`, e);
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
    if (type === 'NCKH') {
        scienceFields.classList.add('show');
    } else {
        scienceFields.classList.remove('show');
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function generateProjectCode(year, id) {
    let seq = (id % 100).toString().padStart(2, '0');
    return `${year}.${seq}.01`;
}

function getStats() {
    const total = researchData.length;
    const nckh = researchData.filter(r => r.type === 'NCKH').length;
    const skkt = researchData.filter(r => r.type === 'SKKT').length;
    const years = [...new Set(researchData.map(r => r.year))].sort((a, b) => a - b);
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
    const kpiGrid = document.getElementById('kpiGrid');
    if (!kpiGrid) return;
    
    kpiGrid.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-title"><i class="fas fa-tasks"></i> Tổng số</div>
            <div class="kpi-value">${s.total}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title"><i class="fas fa-flask"></i> Nghiên cứu KH</div>
            <div class="kpi-value">${s.nckh}</div>
            <div class="kpi-sub">${s.total ? ((s.nckh / s.total) * 100).toFixed(1) : 0}%</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title"><i class="fas fa-lightbulb"></i> Sáng kiến</div>
            <div class="kpi-value">${s.skkt}</div>
            <div class="kpi-sub">${s.total ? ((s.skkt / s.total) * 100).toFixed(1) : 0}%</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title"><i class="fas fa-chart-line"></i> Năm gần nhất</div>
            <div class="kpi-value">${s.byYear.length ? Math.max(...s.byYear.map(y => y.year)) : 0}</div>
        </div>
    `;
}

function updateCharts(metric = 'total') {
    const s = getStats();
    const years = s.byYear.map(y => y.year);
    const data = metric === 'total' ? s.byYear.map(y => y.total) : metric === 'nckh' ? s.byYear.map(y => y.nckh) : s.byYear.map(y => y.skkt);
    const colors = { total: '#2dd4bf', nckh: '#a78bfa', skkt: '#facc15' };
    const labels = { total: 'Tổng', nckh: 'Nghiên cứu KH', skkt: 'Sáng kiến' };
    
    const trendChart = document.getElementById('trendChart');
    if (!trendChart) return;
    
    if (currentChart) currentChart.destroy();
    currentChart = new Chart(trendChart, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: labels[metric],
                data: data,
                borderColor: colors[metric],
                backgroundColor: colors[metric] + '20',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: colors[metric]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#eef5ff' } }
            },
            scales: {
                y: { 
                    ticks: { stepSize: 1, color: '#8aabba' },
                    grid: { color: '#1a3a3a' }
                },
                x: { 
                    ticks: { color: '#8aabba' },
                    grid: { color: '#1a3a3a' }
                }
            }
        }
    });
    
    const pieChart = document.getElementById('pieChart');
    if (!pieChart) return;
    
    if (currentPieChart) currentPieChart.destroy();
    currentPieChart = new Chart(pieChart, {
        type: 'doughnut',
        data: {
            labels: ['Nghiên cứu khoa học', 'Sáng kiến'],
            datasets: [{ 
                data: [s.nckh, s.skkt], 
                backgroundColor: ['#a78bfa', '#facc15'],
                borderWidth: 0
            }]
        },
        options: { 
            cutout: '55%', 
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: { color: '#eef5ff' }
                } 
            }
        }
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
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map((item, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${item.year}</td>
            <td style="text-align:left;">
                <span class="clickable-name" onclick="showDetail(${item.id})">${escapeHtml(item.name)}</span>
            </td>
            <td>
                <span class="badge ${item.type === 'NCKH' ? 'badge-nckh' : 'badge-skkt'}">
                    ${item.type === 'NCKH' ? 'Nghiên cứu KH' : 'Sáng kiến'}
                </span>
            </td>
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
            <div class="detail-item"><div class="detail-label">Ngày đăng ký</div><div class="detail-value">${extra.registerDate ? new Date(extra.registerDate).toLocaleString('vi-VN') : 'Chưa cập nhật'}</div></div>
            <div class="detail-item"><div class="detail-label">Lĩnh vực</div><div class="detail-value">${escapeHtml(extra.domain || 'Điều trị')}</div></div>
            <div class="detail-item"><div class="detail-label">Chuyên ngành</div><div class="detail-value">${escapeHtml(extra.specialty || 'Y học cổ truyền')}</div></div>
            ${membersHtml}
        `;
    }
    
    const detailBody = document.getElementById('detailBody');
    if (!detailBody) return;
    
    detailBody.innerHTML = `
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
    
    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'flex';
}

// ==================== MODAL & MẬT KHẨU ====================

function showPasswordModal(action) {
    pendingAction = action;
    const passwordInput = document.getElementById('passwordInput');
    const passwordError = document.getElementById('passwordError');
    const passwordModal = document.getElementById('passwordModal');
    
    if (passwordInput) passwordInput.value = '';
    if (passwordError) passwordError.style.display = 'none';
    if (passwordModal) passwordModal.style.display = 'flex';
}

function verifyPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const passwordError = document.getElementById('passwordError');
    
    if (passwordInput && passwordInput.value === ADMIN_PASSWORD) {
        const passwordModal = document.getElementById('passwordModal');
        if (passwordModal) passwordModal.style.display = 'none';
        
        if (pendingAction === 'save') saveItemToData();
        else if (pendingAction === 'delete') executeDeleteItem();
        pendingAction = null;
    } else {
        if (passwordError) passwordError.style.display = 'block';
    }
}

function closePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) passwordModal.style.display = 'none';
    pendingAction = null;
}

// ==================== THÊM/SỬA/XÓA ====================

function openAddModal() {
    const modalTitle = document.getElementById('modalTitle');
    const editId = document.getElementById('editId');
    const researchForm = document.getElementById('researchForm');
    const year = document.getElementById('year');
    const projectCode = document.getElementById('projectCode');
    const registerDate = document.getElementById('registerDate');
    const domain = document.getElementById('domain');
    const specialty = document.getElementById('specialty');
    const unit = document.getElementById('unit');
    const level = document.getElementById('level');
    const resultDuyet = document.getElementById('resultDuyet');
    const resultNghiemThu = document.getElementById('resultNghiemThu');
    const filesList = document.getElementById('filesList');
    const membersList = document.getElementById('membersList');
    const researchModal = document.getElementById('researchModal');
    
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Thêm mới';
    if (editId) editId.value = '';
    if (researchForm) researchForm.reset();
    if (year) year.value = new Date().getFullYear();
    if (projectCode) projectCode.value = '';
    if (registerDate) registerDate.value = '';
    if (domain) domain.value = 'Điều trị';
    if (specialty) specialty.value = 'Y học cổ truyền';
    if (unit) unit.value = 'Bệnh viện Y học cổ truyền Quảng Nam';
    if (level) level.value = 'Cơ sở';
    if (resultDuyet) resultDuyet.value = 'Thông qua';
    if (resultNghiemThu) resultNghiemThu.value = 'Thông qua';
    if (filesList) filesList.innerHTML = '';
    if (membersList) membersList.innerHTML = '';
    
    toggleScienceFields();
    if (researchModal) researchModal.style.display = 'flex';
}

function requestEdit(id) {
    const item = researchData.find(r => r.id == id);
    if (!item) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const editId = document.getElementById('editId');
    const year = document.getElementById('year');
    const name = document.getElementById('name');
    const type = document.getElementById('type');
    const author = document.getElementById('author');
    const decisionNumber = document.getElementById('decisionNumber');
    const fileLink = document.getElementById('fileLink');
    const projectCode = document.getElementById('projectCode');
    const registerDate = document.getElementById('registerDate');
    const domain = document.getElementById('domain');
    const specialty = document.getElementById('specialty');
    const unit = document.getElementById('unit');
    const level = document.getElementById('level');
    const resultDuyet = document.getElementById('resultDuyet');
    const resultNghiemThu = document.getElementById('resultNghiemThu');
    const researchModal = document.getElementById('researchModal');
    
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa';
    if (editId) editId.value = item.id;
    if (year) year.value = item.year;
    if (name) name.value = item.name;
    if (type) type.value = item.type;
    if (author) author.value = item.author;
    if (decisionNumber) decisionNumber.value = item.decisionNumber || '';
    if (fileLink) fileLink.value = item.fileLink || '';
    
    const extra = item.extra || {};
    if (projectCode) projectCode.value = extra.projectCode || '';
    if (registerDate) registerDate.value = extra.registerDate ? extra.registerDate.slice(0, 16) : '';
    if (domain) domain.value = extra.domain || 'Điều trị';
    if (specialty) specialty.value = extra.specialty || 'Y học cổ truyền';
    if (unit) unit.value = extra.unit || 'Bệnh viện Y học cổ truyền Quảng Nam';
    if (level) level.value = extra.level || 'Cơ sở';
    if (resultDuyet) resultDuyet.value = extra.resultDuyet || 'Thông qua';
    if (resultNghiemThu) resultNghiemThu.value = extra.resultNghiemThu || 'Thông qua';
    
    loadFilesToForm(extra.files || []);
    loadMembersToForm(extra.members || []);
    toggleScienceFields();
    if (researchModal) researchModal.style.display = 'flex';
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
            createdAt: new Date().toISOString()
        };
        result = await updateToSheet(updatedItem);
    } else {
        // Thêm mới
        const newItem = { year, name, type, author, decisionNumber, fileLink, extra: extraData };
        result = await addToSheet(newItem);
    }
    
    if (result?.success) {
        closeModal();
        await refreshAll(); // Tải lại dữ liệu mới từ Sheets
        alert(id ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
    } else {
        alert('Lỗi: ' + (result?.error || 'Không thể lưu dữ liệu'));
    }
}

async function addToSheet(item) {
    return await callAPI("add", item);
}

async function updateToSheet(item) {
    return await callAPI("update", item);
}

async function deleteFromSheet(id) {
    return await callAPI("delete", null, id);
}

function requestDelete(id, name) {
    deleteTargetId = id;
    const deleteItemName = document.getElementById('deleteItemName');
    const deleteModal = document.getElementById('deleteModal');
    if (deleteItemName) deleteItemName.innerText = name;
    if (deleteModal) deleteModal.style.display = 'flex';
}

function confirmDeleteRequest() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.style.display = 'none';
    showPasswordModal('delete');
}

async function executeDeleteItem() {
    if (deleteTargetId) {
        const result = await deleteFromSheet(deleteTargetId);
        if (result?.success) {
            await refreshAll(); // Tải lại dữ liệu mới từ Sheets
            alert('Xóa thành công!');
        } else {
            alert('Lỗi: ' + (result?.error || 'Không thể xóa'));
        }
        deleteTargetId = null;
    }
}

// ==================== RESET & REFRESH ====================

function closeModal() {
    const researchModal = document.getElementById('researchModal');
    if (researchModal) researchModal.style.display = 'none';
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.style.display = 'none';
}

function resetFilters() {
    const yearFilter = document.getElementById('yearFilter');
    const typeFilter = document.getElementById('typeFilter');
    if (yearFilter) yearFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    renderTable();
}

async function refreshAll() {
    await fetchDataFromSheet();
    updateKPI();
    const activeTab = document.querySelector('.chart-tab.active');
    updateCharts(activeTab ? activeTab.dataset.metric : 'total');
    renderTable();
    
    // Cập nhật dropdown năm
    const years = [...new Set(researchData.map(r => r.year))].sort((a, b) => b - a);
    const yearSelect = document.getElementById('yearFilter');
    if (yearSelect) {
        const currentValue = yearSelect.value;
        yearSelect.innerHTML = '<option value="all">Tất cả</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (currentValue && years.includes(parseInt(currentValue))) {
            yearSelect.value = currentValue;
        }
    }
}

// ==================== KHỞI TẠO ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Khởi tạo ứng dụng...');
    await initProxy();
    await refreshAll();
    console.log('Đã khởi tạo xong! Tổng số bản ghi:', researchData.length);
    
    // Gán sự kiện
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const yearFilter = document.getElementById('yearFilter');
    const typeFilter = document.getElementById('typeFilter');
    const researchForm = document.getElementById('researchForm');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
    
    if (openAddModalBtn) openAddModalBtn.onclick = openAddModal;
    if (resetFilterBtn) resetFilterBtn.onclick = resetFilters;
    if (yearFilter) yearFilter.onchange = renderTable;
    if (typeFilter) typeFilter.onchange = renderTable;
    if (researchForm) researchForm.onsubmit = requestSave;
    if (confirmDeleteBtn) confirmDeleteBtn.onclick = confirmDeleteRequest;
    if (cancelPasswordBtn) cancelPasswordBtn.onclick = closePasswordModal;
    if (confirmPasswordBtn) confirmPasswordBtn.onclick = verifyPassword;
    
    // Đóng modal
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        if (btn) btn.onclick = closeModal;
    });
    document.querySelectorAll('.close-delete-modal, .cancel-delete-btn').forEach(btn => {
        if (btn) btn.onclick = closeDeleteModal;
    });
    
    const closeDetail = document.querySelector('.close-detail');
    if (closeDetail) closeDetail.onclick = () => {
        const detailModal = document.getElementById('detailModal');
        if (detailModal) detailModal.style.display = 'none';
    };
    
    const closePassword = document.querySelector('.close-password');
    if (closePassword) closePassword.onclick = closePasswordModal;
    
    // Click outside modal
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
            closeDeleteModal();
            const detailModal = document.getElementById('detailModal');
            if (detailModal) detailModal.style.display = 'none';
            closePasswordModal();
        }
    };
    
    // Chart tabs
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