const ADMIN_PASSWORD = "Admin123";
    
    let pendingAction = null;
    let pendingId = null;
    
    const API_URL = "https://script.google.com/macros/s/AKfycbx_7X2kHYO-___a9ZNniwaom9-_Qdxvu73lzJN7-bEEiJzeomiIkQtsMaydMw1Pc0Z-Fg/exec";
    let researchData = [], nextId = 1, currentChart = null, currentPieChart = null, deleteTargetId = null;
    
    // Hàm thêm thành viên (tối đa 3)
    function addMemberField() {
        const container = document.getElementById('membersList');
        if (container.children.length >= 3) {
            alert('Chỉ được thêm tối đa 3 thành viên tham gia!');
            return;
        }
        const idx = container.children.length;
        const div = document.createElement('div');
        div.className = 'member-item';
        div.innerHTML = `
            <input type="text" placeholder="Tên thành viên" class="member-name" style="flex:2">
            <input type="text" placeholder="Tỷ lệ tham gia (%)" class="member-percent" style="width: 100px;">
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
                    <input type="text" placeholder="Tỷ lệ tham gia (%)" class="member-percent" value="${escapeHtml(m.percent || '')}" style="width: 100px;">
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
            if (name) {
                members.push({ name: name, percent: percent || '' });
            }
        }
        return members;
    }
    
    function toggleScienceFields() {
        const type = document.getElementById('type').value;
        const scienceFields = document.getElementById('scienceFields');
        if (type === 'NCKH') {
            scienceFields.classList.add('show');
        } else {
            scienceFields.classList.remove('show');
        }
    }
    
    function showPasswordModal(action, id = null) {
        pendingAction = action;
        pendingId = id;
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordError').style.display = 'none';
        document.getElementById('passwordModal').style.display = 'flex';
    }
    
    function verifyPassword() {
        const enteredPassword = document.getElementById('passwordInput').value;
        if (enteredPassword === ADMIN_PASSWORD) {
            document.getElementById('passwordModal').style.display = 'none';
            if (pendingAction === 'save') {
                saveItemToData();
            } else if (pendingAction === 'delete') {
                executeDeleteItem();
            }
            pendingAction = null;
        } else {
            document.getElementById('passwordError').style.display = 'block';
        }
    }
    
    function closePasswordModal() {
        document.getElementById('passwordModal').style.display = 'none';
        pendingAction = null;
    }
    
    function generateProjectCode(year, id) {
        let seq = (id % 100).toString().padStart(2,'0');
        return `${year}.${seq}.01`;
    }

    function showLoading(show) { document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none'; }

    async function fetchDataFromSheet() {
        try {
            showLoading(true);
            const res = await fetch(API_URL);
            const result = await res.json();
            if (result.success && result.data) {
                researchData = result.data;
                nextId = researchData.length ? Math.max(...researchData.map(r => parseInt(r.id))) + 1 : 1;
                saveToLocalStorage();
            } else loadFromLocalStorage();
        } catch(e) { loadFromLocalStorage(); }
        finally { showLoading(false); }
    }

    async function saveDataToSheet() {
        try {
            showLoading(true);
            await fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveAllData", data: researchData }) });
            saveToLocalStorage();
        } catch(e) { console.error(e); }
        finally { showLoading(false); }
    }

    function saveToLocalStorage() { localStorage.setItem('researchData', JSON.stringify(researchData)); localStorage.setItem('nextId', nextId); }
    
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('researchData');
        if(saved) { 
            researchData = JSON.parse(saved); 
            nextId = parseInt(localStorage.getItem('nextId')) || researchData.length+1; 
        } else {
            researchData = [
                { id:1, year:2025, name:"Nghiên cứu mất ngủ", type:"NCKH", author:"Nguyễn Quang Ngọc", decisionNumber:"", fileLink:"", extra: { members: [{name:"Trần Thị B", percent:"30"},{name:"Lê Văn C", percent:"20"}], domain:"Điều trị", specialty:"Y học cổ truyền", registerDate:"2025-07-29T10:50:41", resultDuyet:"Thông qua", resultNghiemThu:"Thông qua", unit:"Bệnh viện Y học cổ truyền Quảng Nam", level:"Cơ sở", files:[] } },
                { id:2, year:2024, name:"Nghiên cứu G về y học cổ truyền", type:"SKKT", author:"Nguyễn Văn Dũng", decisionNumber:"QĐ/G/2024", fileLink:"#", extra: {} },
                { id:3, year:2022, name:"Sáng kiến B: Cải tiến quy trình", type:"SKKT", author:"Nguyễn Văn Dũng", extra: {} },
                { id:4, year:2021, name:"Nghiên cứu A về phục hồi chức năng", type:"SKKT", author:"Nguyễn Văn A", decisionNumber:"QĐ/A/2021", fileLink:"#", extra: {} },
                { id:5, year:2021, name:"Nghiên cứu C về hiệu quả điều trị", type:"SKKT", author:"Nguyễn Thị Ánh Quang", fileLink:"#", extra: {} },
                { id:6, year:2020, name:"Nghiên cứu đau lưng", type:"NCKH", author:"Cao Văn Trọng", extra: {} }
            ];
            nextId = 7;
        }
        researchData.forEach(item => { if(!item.extra) item.extra = {}; if(!item.extra.files) item.extra.files = []; if(!item.extra.members) item.extra.members = []; });
    }

    function getStats() {
        const total=researchData.length, nckh=researchData.filter(r=>r.type==='NCKH').length, skkt=researchData.filter(r=>r.type==='SKKT').length;
        const years = [...new Set(researchData.map(r=>r.year))].sort();
        const byYear = years.map(y=>({year:y, total:researchData.filter(r=>r.year===y).length, nckh:researchData.filter(r=>r.year===y && r.type==='NCKH').length, skkt:researchData.filter(r=>r.year===y && r.type==='SKKT').length}));
        return {total,nckh,skkt,byYear};
    }
    
    function updateKPI() { 
        const s=getStats(); 
        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card"><div class="kpi-title"><i class="fas fa-tasks"></i> Tổng số</div><div class="kpi-value">${s.total}</div></div>
            <div class="kpi-card"><div class="kpi-title"><i class="fas fa-flask"></i> Nghiên cứu khoa học</div><div class="kpi-value">${s.nckh}</div><div class="kpi-sub">${s.total?((s.nckh/s.total)*100).toFixed(1):0}%</div></div>
            <div class="kpi-card"><div class="kpi-title"><i class="fas fa-lightbulb"></i> Sáng kiến</div><div class="kpi-value">${s.skkt}</div><div class="kpi-sub">${s.total?((s.skkt/s.total)*100).toFixed(1):0}%</div></div>
            <div class="kpi-card"><div class="kpi-title"><i class="fas fa-chart-line"></i> Năm gần nhất</div><div class="kpi-value">${s.byYear.length?Math.max(...s.byYear.map(y=>y.year)):0}</div></div>
        `; 
    }
    
    function updateCharts(metric='total') { 
        const s=getStats(), years=s.byYear.map(y=>y.year), data=metric==='total'?s.byYear.map(y=>y.total):metric==='nckh'?s.byYear.map(y=>y.nckh):s.byYear.map(y=>y.skkt), colors={total:'#2dd4bf',nckh:'#a78bfa',skkt:'#facc15'}; 
        if(currentChart) currentChart.destroy(); 
        currentChart=new Chart(document.getElementById('trendChart'),{type:'line',data:{labels:years,datasets:[{label:metric==='total'?'Tổng':metric==='nckh'?'Nghiên cứu khoa học':'Sáng kiến',data:data,borderColor:colors[metric],backgroundColor:colors[metric]+'20',borderWidth:2,tension:0.3,fill:true,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:true,scales:{y:{ticks:{stepSize:1}}}}}); 
        if(currentPieChart) currentPieChart.destroy(); 
        currentPieChart=new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels:['Nghiên cứu khoa học','Sáng kiến'],datasets:[{data:[s.nckh,s.skkt],backgroundColor:['#a78bfa','#facc15']}]},options:{cutout:'55%',plugins:{legend:{position:'bottom'}}}}); 
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
                <td><span class="badge ${item.type === 'NCKH' ? 'badge-nckh' : 'badge-skkt'}">${item.type === 'NCKH' ? 'Nghiên cứu khoa học' : 'Sáng kiến'}</span></td>
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
    
    function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>]/g, m=> m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }

    function showDetail(id){
        const item = researchData.find(r=>r.id==id);
        if(!item) return;
        const code = item.extra?.projectCode || generateProjectCode(item.year, item.id);
        const extra = item.extra || {};
        const files = extra.files || [];
        const members = extra.members || [];
        const registerDate = extra.registerDate ? new Date(extra.registerDate).toLocaleString() : "Chưa cập nhật";
        const domain = extra.domain || "Điều trị";
        const specialty = extra.specialty || "Y học cổ truyền";
        const resultDuyet = extra.resultDuyet || "Thông qua";
        const resultNghiemThu = extra.resultNghiemThu || "Thông qua";
        const unit = extra.unit || "Bệnh viện Y học cổ truyền Quảng Nam";
        const level = extra.level || "Cơ sở";
        const isNCKH = item.type === 'NCKH';
        
        let filesHtml = `<div class="file-list"><div style="font-weight:600; margin-bottom:8px;"><i class="fas fa-paperclip"></i> Danh sách file đính kèm</div>`;
        if(files.length){
            files.forEach(f=>{ filesHtml += `<div class="file-row"><span>📄 ${escapeHtml(f.label)}</span><a href="${escapeHtml(f.url)}" class="file-link" target="_blank">Xem file</a></div>`; });
        } else {
            filesHtml += `<div class="file-row">Chưa có file đính kèm</div>`;
        }
        filesHtml += `</div>`;
        
        let membersHtml = '';
        if (isNCKH && members.length > 0) {
            membersHtml = `<div class="detail-item"><div class="detail-label">Thành viên tham gia</div><div class="detail-value">`;
            members.forEach(m => {
                membersHtml += `<div>• ${escapeHtml(m.name)} ${m.percent ? `(${m.percent}%)` : ''}</div>`;
            });
            membersHtml += `</div></div>`;
        }
        
        let scienceHtml = '';
        if (isNCKH) {
            scienceHtml = `
                <div class="detail-item"><div class="detail-label">MS đề tài</div><div class="detail-value"><strong style="color:#2dd4bf">${escapeHtml(code)}</strong></div></div>
                <div class="detail-item"><div class="detail-label">Ngày đăng kí</div><div class="detail-value">${registerDate}</div></div>
                <div class="detail-item"><div class="detail-label">Lĩnh vực</div><div class="detail-value">${escapeHtml(domain)}</div></div>
                <div class="detail-item"><div class="detail-label">Chuyên ngành</div><div class="detail-value">${escapeHtml(specialty)}</div></div>
                ${membersHtml}
            `;
        }
        
        const html = `
            <div class="detail-grid">
                ${scienceHtml}
                <div class="detail-item"><div class="detail-label">Người thực hiện</div><div class="detail-value">${escapeHtml(item.author)}</div></div>
                <div class="detail-item"><div class="detail-label">Đơn vị</div><div class="detail-value">${escapeHtml(unit)}</div></div>
                <div class="detail-item"><div class="detail-label">Thời gian nghiệm thu</div><div class="detail-value">Trong năm ${item.year}</div></div>
                <div class="detail-item"><div class="detail-label">Cấp độ</div><div class="detail-value">${escapeHtml(level)}</div></div>
                <div class="detail-item"><div class="detail-label">Kết quả duyệt</div><div class="detail-value"><span class="badge-result">${escapeHtml(resultDuyet)}</span></div></div>
                <div class="detail-item"><div class="detail-label">Kết quả nghiệm thu</div><div class="detail-value"><span class="badge-result">${escapeHtml(resultNghiemThu)}</span></div></div>
            </div>
            ${filesHtml}
        `;
        document.getElementById('detailBody').innerHTML = html;
        document.getElementById('detailModal').style.display = 'flex';
    }

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
        if(files && files.length){
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
            if(label && url) files.push({ label, url });
        });
        return files;
    }

    function openAddModal(){ 
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
    
    function requestEdit(id){ 
        const item = researchData.find(r=>r.id==id); 
        if(!item) return; 
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
        document.getElementById('registerDate').value = extra.registerDate ? extra.registerDate.slice(0,16) : '';
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
    
    function requestSave(event){
        event.preventDefault();
        showPasswordModal('save');
    }
    
    function saveItemToData(){ 
        const id = document.getElementById('editId').value;
        const year = parseInt(document.getElementById('year').value);
        const name = document.getElementById('name').value.trim();
        const type = document.getElementById('type').value;
        const author = document.getElementById('author').value.trim();
        const decisionNumber = document.getElementById('decisionNumber').value.trim();
        const fileLink = document.getElementById('fileLink').value.trim();
        
        const projectCode = document.getElementById('projectCode').value.trim();
        const registerDate = document.getElementById('registerDate').value;
        const domain = document.getElementById('domain').value;
        const specialty = document.getElementById('specialty').value;
        const unit = document.getElementById('unit').value;
        const level = document.getElementById('level').value;
        const resultDuyet = document.getElementById('resultDuyet').value;
        const resultNghiemThu = document.getElementById('resultNghiemThu').value;
        const files = collectFilesFromForm();
        const members = (type === 'NCKH') ? collectMembersFromForm() : [];
        
        if(!name || !author){ alert('Vui lòng nhập đầy đủ thông tin cơ bản!'); return; } 
        
        const extraData = {
            projectCode: projectCode,
            registerDate: registerDate,
            domain: type === 'NCKH' ? domain : '',
            specialty: type === 'NCKH' ? specialty : '',
            unit: unit,
            level: level,
            resultDuyet: resultDuyet,
            resultNghiemThu: resultNghiemThu,
            files: files,
            members: members
        };
        
        if(id){ 
            const idx = researchData.findIndex(r => r.id == id); 
            if(idx !== -1) researchData[idx] = {...researchData[idx], year, name, type, author, decisionNumber, fileLink, extra: extraData }; 
        } else { 
            researchData.push({ id: nextId++, year, name, type, author, decisionNumber, fileLink, extra: extraData }); 
        } 
        saveDataToSheet().then(() => {
            closeModal(); 
            refreshAll(); 
        });
    }
    
    function requestDelete(id, name){ 
        deleteTargetId = id; 
        document.getElementById('deleteItemName').innerText = name;
        document.getElementById('deleteModal').style.display = 'flex';
    }
    
    function confirmDeleteRequest(){
        document.getElementById('deleteModal').style.display = 'none';
        showPasswordModal('delete', deleteTargetId);
    }
    
    function executeDeleteItem(){ 
        if(deleteTargetId){ 
            researchData = researchData.filter(r => r.id != deleteTargetId); 
            saveDataToSheet().then(() => {
                refreshAll(); 
                deleteTargetId = null; 
            });
        } 
    }
    
    function closeModal(){ document.getElementById('researchModal').style.display = 'none'; }
    function closeDeleteModal(){ document.getElementById('deleteModal').style.display = 'none'; }
    function resetFilters(){ document.getElementById('yearFilter').value = 'all'; document.getElementById('typeFilter').value = 'all'; renderTable(); }
    
    async function refreshAll(){ 
        await fetchDataFromSheet(); 
        updateKPI(); 
        const activeTab = document.querySelector('.chart-tab.active'); 
        updateCharts(activeTab ? activeTab.dataset.metric : 'total'); 
        renderTable(); 
        const years = [...new Set(researchData.map(r => r.year))].sort((a,b) => b - a);
        const yearSelect = document.getElementById('yearFilter');
        let opts = '<option value="all">Tất cả</option>';
        years.forEach(y => { opts += `<option value="${y}">${y}</option>`; });
        yearSelect.innerHTML = opts;
    }

    document.addEventListener('DOMContentLoaded', async() => {
        await refreshAll();
        document.getElementById('openAddModalBtn').onclick = openAddModal;
        document.getElementById('resetFilterBtn').onclick = resetFilters;
        document.getElementById('yearFilter').onchange = renderTable;
        document.getElementById('typeFilter').onchange = renderTable;
        document.getElementById('researchForm').onsubmit = requestSave;
        document.getElementById('confirmDeleteBtn').onclick = confirmDeleteRequest;
        document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => btn.onclick = closeModal);
        document.querySelectorAll('.close-delete-modal, .cancel-delete-btn').forEach(btn => btn.onclick = closeDeleteModal);
        document.querySelector('.close-detail').onclick = () => document.getElementById('detailModal').style.display = 'none';
        document.querySelector('.close-password').onclick = closePasswordModal;
        document.getElementById('cancelPasswordBtn').onclick = closePasswordModal;
        document.getElementById('confirmPasswordBtn').onclick = verifyPassword;
        window.onclick = (e) => { if(e.target.classList.contains('modal')){ closeModal(); closeDeleteModal(); document.getElementById('detailModal').style.display = 'none'; closePasswordModal(); } };
        document.querySelectorAll('.chart-tab').forEach(tab => { tab.onclick = () => { document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); updateCharts(tab.dataset.metric); }; });
    });
    
    window.showDetail = showDetail; 
    window.requestEdit = requestEdit; 
    window.requestDelete = requestDelete; 
    window.addFileField = addFileField;
    window.addMemberField = addMemberField;
    window.toggleScienceFields = toggleScienceFields;