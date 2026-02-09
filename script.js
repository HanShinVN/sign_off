const API_URL = 'https://script.google.com/macros/s/AKfycbwVXj8-WuohDjwhHj5SvRvS3gfYrnk9GX5Xpk4G5Pn6fmMnGMBx1xCFqPKxXef9p1bYow/exec';

const el = (id) => document.getElementById(id);
const setLoader = (show) => el('loader').classList.toggle('d-none', !show);
const urlParams = new URLSearchParams(window.location.search);
const isDashboardView = urlParams.get('view') === 'dashboard';

function formatDateVN(dateStr) {
    if (!dateStr) return "";
    const p = dateStr.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dateStr;
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedEmail = localStorage.getItem('tis_email');
    const savedToken = localStorage.getItem('tis_token');

    if (savedEmail && savedToken) {
        setLoader(true);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'AUTO_LOGIN', email: savedEmail, token: savedToken })
            }).then(r => r.json());

            setLoader(false);
            if (res.status === 'success') handleLoginSuccess(res, savedEmail);
            else localStorage.removeItem('tis_token');
        } catch (e) { setLoader(false); }
    }
});

function handleLoginSuccess(data, email) {
    localStorage.setItem('tis_email', email);
    if (data.token) localStorage.setItem('tis_token', data.token);

    if (isDashboardView) showDashboard(email);
    else showForm(data, email);
}

function showForm(data, email) {
    el('mainContainer').classList.remove('d-none');
    el('dashboardContainer').classList.add('d-none');
    el('stepEmail').classList.add('d-none');
    el('stepOtp').classList.add('d-none');
    el('stepForm').classList.remove('d-none');
    el('historySection').classList.remove('d-none');

    el('email').value = email;
    el('myName').innerText = data.name;
    el('myDept').innerText = data.dept;
    el('myBal').innerText = data.balance;
    el('bossEmail').value = data.manager;

    const role = (data.role || "").toLowerCase();
    if (['admin', 'manager', 'quản lý'].includes(role)) {
        el('btnToDashboard').classList.remove('d-none');
    } else {
        el('btnToDashboard').classList.add('d-none');
    }

    loadHistory(email);
    calculateLeave();
}

async function showDashboard(email) {
    el('mainContainer').classList.add('d-none');
    el('dashboardContainer').classList.remove('d-none');
    setLoader(true);
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'GET_ALL_HISTORY', email: email })
        }).then(r => r.json());
        setLoader(false);
        if(res.status === 'success') renderDashboard(res.data);
    } catch(e) { setLoader(false); }
}

function renderDashboard(data) {
    const tbody = el('allHistoryBody');
    const grid = el('calendarGrid');
    tbody.innerHTML = ''; grid.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Chưa có dữ liệu.</td></tr>'; return;
    }

    data.forEach(item => {
        let badgeClass = item.status === 'Đã duyệt' ? 'bg-success' : (item.status === 'Chờ duyệt' ? 'bg-warning text-dark' : 'bg-danger');
        tbody.innerHTML += `<tr><td class="ps-3 fw-bold text-secondary">${item.start}</td><td><div class="fw-bold text-dark">${item.name}</div><small class="text-muted">${item.dept}</small></td><td><div class="small text-dark">${item.type}</div><small class="text-muted fst-italic">"${item.reason}"</small></td><td><span class="badge ${badgeClass}">${item.status}</span></td></tr>`;
        
        if (item.status !== 'Từ chối') {
            grid.innerHTML += `<div class="col-md-4 col-sm-6"><div class="p-3 bg-white rounded border-start border-4 ${item.status === 'Đã duyệt' ? 'border-success' : 'border-warning'} shadow-sm h-100"><div class="d-flex justify-content-between mb-2"><span class="fw-bold text-dark">${item.start}</span><span class="badge ${badgeClass}">${item.status}</span></div><h6 class="mb-1 fw-bold">${item.name}</h6><p class="small text-muted mb-1">${item.type} (${item.days} ngày)</p></div></div>`;
        }
    });

    const filterFunc = () => {
        const txt = el('searchBox').value.toLowerCase();
        const stat = el('filterStatus').value;
        Array.from(tbody.rows).forEach(row => {
            const name = row.cells[1].innerText.toLowerCase();
            const status = row.cells[3].innerText;
            row.style.display = (name.includes(txt) && (stat === 'all' || status.includes(stat))) ? '' : 'none';
        });
    };
    el('searchBox').onkeyup = filterFunc;
    el('filterStatus').onchange = filterFunc;
}


el('btnGetOtp').onclick = async () => {
    const email = el('email').value.trim();
    if(!email.includes('@')) return Swal.fire("Lỗi", "Email sai", "warning");
    setLoader(true);
    try {
        const res = await fetch(API_URL, { method:'POST', body:JSON.stringify({action:'REQUEST_OTP', email}) }).then(r=>r.json());
        setLoader(false);
        if(res.status==='success') {
            el('stepEmail').classList.add('d-none'); el('stepOtp').classList.remove('d-none');
            Swal.fire("Đã gửi mã", "Check email nhé", "success");
        } else Swal.fire("Lỗi", res.message, "error");
    } catch(e) { setLoader(false); Swal.fire("Lỗi mạng", "Thử lại sau", "error"); }
};

el('btnVerify').onclick = async () => {
    const email = el('email').value.trim();
    const otp = el('otpCode').value.trim();
    setLoader(true);
    try {
        const res = await fetch(API_URL, { method:'POST', body:JSON.stringify({action:'VERIFY_OTP', email, otp}) }).then(r=>r.json());
        setLoader(false);
        if(res.status==='success') handleLoginSuccess(res, email);
        else Swal.fire("Lỗi", res.message, "error");
    } catch(e) { setLoader(false); }
};

el('btnBack').onclick = (e) => { e.preventDefault(); el('stepOtp').classList.add('d-none'); el('stepEmail').classList.remove('d-none'); };
const doLogout = () => { localStorage.removeItem('tis_token'); window.location.href = window.location.pathname; };
el('btnLogout').onclick = doLogout; el('btnLogoutDash').onclick = doLogout;
el('btnToDashboard').onclick = () => showDashboard(localStorage.getItem('tis_email'));
el('btnBackToForm').onclick = () => window.location.href = window.location.pathname;

function calculateLeave() {
    const bal = parseFloat(el('myBal').innerText)||0, days = parseFloat(el('days').value)||0;
    const typeInp = el('type'), msg = el('calcMsg');
    if(days<=0) return;
    if(bal>=days) { typeInp.value = "Phép năm"; typeInp.className = "form-control fw-bold bg-light text-success"; msg.classList.add('d-none'); }
    else if(bal<=0) { typeInp.value = `Nghỉ không lương (${days} ngày)`; typeInp.className = "form-control fw-bold bg-light text-danger"; msg.innerHTML='Hết phép. Tính nghỉ không lương.'; msg.classList.remove('d-none'); }
    else { const unpaid = days-bal; typeInp.value = `${bal} Phép năm + ${unpaid} Không lương`; typeInp.className="form-control fw-bold bg-light text-warning"; msg.innerHTML='Thiếu phép. Tự tách đơn.'; msg.classList.remove('d-none'); }
}
el('days').addEventListener('input', calculateLeave);

async function loadHistory(email) {
    try {
        const tbody = el('listBody'); tbody.innerHTML='<tr><td colspan="3" class="text-center">Loading...</td></tr>';
        const res = await fetch(`${API_URL}?action=GET_LIST&email=${email}`).then(r=>r.json());
        tbody.innerHTML='';
        if(!res.data || res.data.length===0) { tbody.innerHTML='<tr><td colspan="3" class="text-center text-muted">Trống</td></tr>'; return; }
        res.data.forEach(item => {
            let badge = item.status==='Chờ duyệt'?'bg-warning text-dark':(item.status==='Đã duyệt'?'bg-success':'bg-danger');
            tbody.innerHTML += `<tr><td class="ps-3 py-3 fw-bold">${item.start}</td><td><small>${item.type}</small></td><td class="text-end pe-3"><span class="badge ${badge}">${item.status}</span></td></tr>`;
        });
    } catch(e) {}
}

el('leaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayDate = formatDateVN(el('startDate').value);
    const confirm = await Swal.fire({ title: 'Gửi đơn?', html: `<b>${el('days').value} ngày</b><br>Từ: <b>${displayDate}</b>`, icon: 'question', showCancelButton: true, confirmButtonText: 'Gửi', confirmButtonColor: '#D61F2F' });
    if(!confirm.isConfirmed) return;

    setLoader(true);
    const payload = { action: 'SUBMIT', fullName: el('myName').innerText, email: el('email').value, dept: el('myDept').innerText, manager: el('bossEmail').value, startDate: el('startDate').value, days: el('days').value, type: el('type').value, reason: el('reason').value };
    try {
        await fetch(API_URL, { method:'POST', body:JSON.stringify(payload) });
        setLoader(false);
        await Swal.fire("Thành công", "Đã gửi đơn!", "success");
        el('leaveForm').reset(); el('days').value=1; el('type').value=""; loadHistory(el('email').value);
    } catch(e) { setLoader(false); Swal.fire("Lỗi mạng", "", "error"); }
});