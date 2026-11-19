function setNav(id) { document.querySelectorAll('.ni').forEach(e => e.classList.remove('act')); document.getElementById(id)?.classList.add('act'); }
function goHome() { VIEW = { name: 'home' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '🏠 资产驾驶舱'; setNav('nav-home'); renderHome(); }

function renderHome(q = '') {
  const ym = today().slice(0, 7), yr = today().slice(0, 4);
  let mPaid = 0, mDue = 0, ovDue = 0, depPool = 0, yrNet = 0, vacantLoss = 0;
  STATE.properties.forEach(p => {
    (p.payments || []).forEach(x => { if ((x.date || '').startsWith(ym)) mPaid += Number(x.amount || 0); if ((x.date || '').startsWith(yr)) yrNet += Number(x.amount || 0); });
    (p.bills || []).filter(b => !b.voided).forEach(b => {
      if ((b.dueDate || '').startsWith(ym)) mDue += Number(b.amount || 0);
      if (b.dueDate < today() && b.amount > b.paidAmount) ovDue += (b.amount - b.paidAmount);
      if (b.type === 'deposit' && p.status === '已出租') depPool += Number(b.paidAmount || 0);
    });
    (p.workOrders || []).forEach(x => { if ((x.date || '').startsWith(yr)) yrNet -= Math.max(0, x.cost - x.tenantShare); });
    (p.renovations || []).forEach(x => { if ((x.date || '').startsWith(yr)) yrNet -= Number(x.cost || 0); });
    (p.landlordExpenses || []).forEach(x => { if ((x.date || '').startsWith(yr)) yrNet -= Number(x.amount || 0); });
    if (p.status !== '已出租') {
      const days = Math.max(1, Math.floor((new Date(today()) - new Date(p.vacantSince || p.createdAt || today())) / 86400000));
      vacantLoss += Math.round((Number(p.expectedRent || 3000) / 30) * days);
    }
  });
  const tds = computeTodos();
  let h = `<div class="cockpit">
    <div class="cp-top"><div><small style="opacity:.8">年度累计纯利润（扣除支出与押金）</small><div class="cp-big">¥${yrNet.toLocaleString()}</div></div><div style="text-align:right"><small style="opacity:.8">代管押金池</small><b style="font-size:17px">¥${depPool.toLocaleString()}</b></div></div>
    <div class="cp-grid">
      <div><small>本月已收</small><b>¥${mPaid.toFixed(0)}</b></div>
      <div><small>本月应收</small><b>¥${mDue.toFixed(0)}</b></div>
      <div><small>目前欠款</small><b style="color:#fca5a5">¥${ovDue.toFixed(0)}</b></div>
      <div><small>空置预估损</small><b style="color:#fcd34d">¥${vacantLoss}</b></div>
    </div>
  </div>
  <div class="qg"><div class="qb" onclick="openCreateProp()">➕<br>新建房源</div><div class="qb" onclick="renderStatsView()">📊<br>收支看板</div><div class="qb" onclick="renderMastersView()">👷<br>云端派单</div><div class="qb" onclick="loadDemoData()">✨<br>载入样板房</div></div>
  <input class="inp" placeholder="🔍 搜索房源、物品、租客、工单、师傅..." value="${esc(q)}" oninput="renderHome(this.value)" />`;

  h += `<div class="card"><div class="ct"><span>📌 实时待办与审核提醒</span><span class="pill p-va">${tds.length}项</span></div>${tds.length ? tds.map(t => `<div class="todo" onclick="openProp('${t.propId}','${t.tab}')"><div><b>${t.badge}</b> ${esc(t.text)}</div><small>${t.date} ›</small></div>`).join('') : '<div style="font-size:12px;color:var(--g4);text-align:center">暂无待办 🎉</div>'}</div>`;

  if (!STATE.properties.length) {
    h += `<div class="card" style="border:1.5px dashed var(--p);background:var(--pl);text-align:center"><b style="color:var(--p)">👋 资产驾驶舱已就绪</b><p style="font-size:13px;color:var(--g6)">点上方「✨ 载入样板房」可一秒体验完整样板数据，或直接新建您的真实房源。</p><button class="btn bp blk" onclick="openCreateProp()">➕ 新建我的第一套房源</button></div>`;
  } else {
    STATE.properties.forEach(p => {
      const cov = (p.media || []).find(m => m.kind === 'image' && m.status === 'ok');
      const pw = (p.workOrders || []).filter(w => w.status !== '已验收归档').length;
      let progHtml = '';
      if (p.status === '已出租' && p.currentLease) {
        const l = p.currentLease, tot = Math.max(1, new Date(l.endDate) - new Date(l.startDate)), left = Math.max(0, new Date(l.endDate) - new Date(today()));
        const pct = Math.min(100, Math.max(5, Math.round(left / tot * 100))), daysLeft = Math.ceil(left / 86400000);
        progHtml = `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--g6);margin-top:4px"><span>租客：<b>${esc(l.tenantName)}</b> · ¥${l.rent}/月</span><span style="color:${daysLeft < 30 ? 'var(--d)' : 'var(--s)'}">剩 ${daysLeft} 天到期</span></div><div class="prog-bg"><div class="prog-fg" style="width:${pct}%;background:${daysLeft < 30 ? 'var(--d)' : 'var(--s)'}"></div></div>`;
      } else {
        const vDays = Math.max(1, Math.floor((new Date(today()) - new Date(p.vacantSince || p.createdAt || today())) / 86400000));
        progHtml = `<div style="font-size:12px;color:var(--w);margin-top:4px">已空置 <b>${vDays}</b> 天 · 预期月租 ¥${p.expectedRent || 3000}</div>`;
      }
      h += `<div class="pcard">
        <div class="pc-main" onclick="openProp('${p.id}','rooms')">
          <div class="pc-img">${cov ? `<img src="${cov.dataUrl}">` : '🏢'}<span class="pc-badge ${p.status === '已出租' ? 'p-ok' : 'p-va'}">${p.status}</span></div>
          <div style="padding:10px 12px;flex:1"><div style="display:flex;justify-content:space-between"><b>${esc(p.name)}</b><small style="color:var(--g6)">工单 ${pw}</small></div><div style="font-size:11px;color:var(--g6)">${esc(p.layout || '')} ${p.area ? p.area + '㎡' : ''} · ${esc(p.address || '')}</div>${progHtml}</div>
        </div>
        <div class="pc-actions">
          <div class="pc-act" onclick="openTenantLink('${p.id}')">📱 住户报修码</div>
          <div class="pc-act" onclick="openPayModal('${p.id}')">💵 快速记收款</div>
          <div class="pc-act" onclick="openWoModal('${p.id}')">🔧 房东派工单</div>
        </div>
      </div>`;
    });
  }
  document.getElementById('main-content').innerHTML = h;
}

function openTenantLink(pid) {
  const p = STATE.properties.find(x => x.id === pid);
  const tBase = STATE.cloud.masterWebBase.replace('master.html', 'tenant.html');
  const url = `${tBase}?p=${encodeURIComponent(p.name)}&a=${encodeURIComponent(p.address || '')}&u=${encodeURIComponent(STATE.cloud.url)}&k=${encodeURIComponent(STATE.cloud.key)}`;
  navigator.clipboard?.writeText(url).catch(() => { });
  openModal('📱 住户专属微信报修入口（只发房东审核）', `<p style="font-size:13px">将下方链接发给 <b>${esc(p.name)}</b> 的住户（整套房所有室友共用此链接）。住户提交故障与照片后，<b>会先发到您的手机 App 审核</b>，不会直接发给师傅：</p><textarea class="inp" rows="4" readonly onclick="this.select()">${esc(url)}</textarea><button class="btn bp blk" onclick="navigator.clipboard?.writeText('${url}');toast('已复制住户报修链接，去微信发给租客即可')">一键复制住户报修链接</button>`);
}

function openCreateProp() {
  openModal('➕ 新建房源', `<select id="np-m" class="inp"><option value="tpl">使用全屋模板（客厅/卧室/厨房/卫生间/整套）</option><option value="blk">空白房源</option></select>
  <input id="np-n" class="inp" placeholder="房源名称 *（如：滨江壹号 1202）"><input id="np-a" class="inp" placeholder="详细地址">
  <div class="row3"><input id="np-l" class="inp" placeholder="户型"><input id="np-ar" type="number" class="inp" placeholder="面积㎡"><input id="np-er" type="number" class="inp" placeholder="预期月租"></div>
  <button class="btn bp blk" onclick="saveNewProp()">保存创建</button>`);
}
async function saveNewProp() {
  const name = document.getElementById('np-n').value.trim(); if (!name) return toast('请填房源名称');
  const rooms = document.getElementById('np-m').value === 'tpl' ? Object.keys(TPL).map(rn => ({ id: uid('r'), name: rn, items: TPL[rn].map(inm => ({ id: uid('i'), name: inm, status: '完好', desc: '', photo: null, history: [] })) })) : [];
  const p = { id: uid('p'), name, address: document.getElementById('np-a').value.trim(), layout: document.getElementById('np-l').value.trim(), area: document.getElementById('np-ar').value, expectedRent: Number(document.getElementById('np-er').value || 3000), status: '空置', vacantSince: today(), createdAt: today(), publicIntro: '', privateNote: '', media: [], rooms, currentLease: null, leaseHistory: [], workOrders: [], renovations: [], utilityConfig: { mode: '房东代收', cycle: '每月', elecPrice: 0.65, waterPrice: 3.8, gasPrice: 2.8, lastElec: 0, lastWater: 0, lastGas: 0, lastReadDate: today() }, bills: [], payments: [], unallocatedCredit: 0, depositSettlements: [], landlordExpenses: [] };
  STATE.properties.unshift(p); await save(); closeModal(); openProp(p.id, 'rooms');
}

function openProp(id, tab = 'rooms') { VIEW = { name: 'detail', propId: id, tab }; document.getElementById('btn-back').classList.remove('hidden'); renderProp(); }
function renderProp() {
  const p = STATE.properties.find(x => x.id === VIEW.propId); if (!p) return goHome();
  document.getElementById('hdr-title').textContent = p.name;
  const cov = (p.media || []).find(m => m.kind === 'image' && m.status === 'ok');
  let h = `<div class="banner">${cov ? `<img src="${cov.dataUrl}">` : ''}<div class="bov"><div style="display:flex;justify-content:space-between"><b>${esc(p.name)}</b><span class="pill p-ok">${p.status}</span></div><small>${esc(p.address || '')} · ${esc(p.layout || '')} ${p.area ? p.area + '㎡' : ''}</small></div></div>
  <div class="card" style="padding:9px;display:flex;gap:5px;flex-wrap:wrap;justify-content:space-between;align-items:center">
    <select style="width:auto;margin:0;padding:4px 8px" onchange="STATE.properties.find(x=>x.id==='${p.id}').status=this.value;save().then(renderProp)">${['空置', '待出租', '已出租', '维修中'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <div style="display:flex;gap:5px">
      <button class="btn bu bsm" onclick="openTenantLink('${p.id}')">📱 住户报修码</button>
      ${p.status !== '已出租' ? `<button class="btn bs bsm" onclick="openCheckIn('${p.id}')">🔑 入住底单</button>` : `<button class="btn bd bsm" onclick="openCheckOut('${p.id}')">📦 退房对比精算</button>`}
    </div>
  </div>
  <div class="tabs">
    <button class="tbtn ${VIEW.tab === 'rooms' ? 'act' : ''}" onclick="VIEW.tab='rooms';renderProp()">🛋️ 房间验房</button>
    <button class="tbtn ${VIEW.tab === 'workorders' ? 'act' : ''}" onclick="VIEW.tab='workorders';renderProp()">🔧 报修与派单(${(p.workOrders || []).length})</button>
    <button class="tbtn ${VIEW.tab === 'finance' ? 'act' : ''}" onclick="VIEW.tab='finance';renderProp()">💰 账单水电</button>
    <button class="tbtn ${VIEW.tab === 'media' ? 'act' : ''}" onclick="VIEW.tab='media';renderProp()">📷 相册合同(${(p.media || []).length})</button>
    <button class="tbtn ${VIEW.tab === 'lease' ? 'act' : ''}" onclick="VIEW.tab='lease';renderProp()">📝 租约</button>
  </div>`;

  if (VIEW.tab === 'rooms') {
    h += `<div style="text-align:right;margin-bottom:8px"><button class="btn bp bsm" onclick="addRoom('${p.id}')">＋ 添加房间</button></div>`;
    (p.rooms || []).forEach(r => {
      const okCnt = r.items.filter(i => i.status === '完好').length;
      h += `<div class="rbox"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>${esc(r.name)} <span class="pill ${okCnt === r.items.length ? 'p-ok' : 'p-ma'}">${okCnt}/${r.items.length} 完好</span></b><button class="btn bo bsm" style="color:var(--d)" onclick="delRoom('${p.id}','${r.id}')">删</button></div>`;
      r.items.forEach(it => {
        const pc = it.status === '完好' ? 'p-ok' : (it.status === '待维修' ? 'p-da' : 'p-ma');
        const th = it.photo?.status === 'ok' ? `<img src="${it.photo.dataUrl}" class="ithumb" onclick="openAttachmentViewer(STATE.properties.find(x=>x.id==='${p.id}').rooms.find(x=>x.id==='${r.id}').items.find(x=>x.id==='${it.id}').photo)">` : '';
        h += `<div class="irow">${th}<div onclick="editItem('${p.id}','${r.id}','${it.id}')" style="flex:1;cursor:pointer"><b>${esc(it.name)}</b> <span class="pill ${pc}">${it.status}</span><div style="font-size:12px;color:var(--g6)">${esc(it.desc || '点击拍照留底')}</div></div><button class="btn bo bsm" onclick="editItem('${p.id}','${r.id}','${it.id}')">拍照/改</button></div>`;
      });
      h += `<button class="btn bo bsm blk" onclick="batchAddItems('${p.id}','${r.id}')">＋ 批量加物品</button></div>`;
    });
  } else if (VIEW.tab === 'workorders') {
    h += `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><button class="btn bo bsm" onclick="syncCloudWorkOrders(true)">☁️ 刷新住户/师傅进度</button><button class="btn bp bsm" onclick="openWoModal('${p.id}')">＋ 房东直接派单</button></div>`;
    h += (p.workOrders || []).map(w => {
      const link = `${STATE.cloud.masterWebBase}?id=${encodeURIComponent(w.id)}&u=${encodeURIComponent(STATE.cloud.url)}&k=${encodeURIComponent(STATE.cloud.key)}`;
      const isPendingApprove = w.status === '住户报修待审';
      const stCls = isPendingApprove ? 'p-re' : (w.status === '已完工待验收' ? 'p-ok' : (w.status === '已验收归档' ? 'p-va' : 'p-ma'));
      return `<div class="card" style="${isPendingApprove ? 'border:1.5px solid var(--u)' : ''}">
        <div class="ct"><span>🔧 ${esc(w.itemName)}</span><span class="pill ${stCls}">${w.status}</span></div>
        <div style="font-size:13px;margin-bottom:6px">${esc(w.desc)}</div>
        <div style="font-size:12px;color:var(--g6);margin-bottom:8px">派单师傅：<b>${esc(w.masterName || '待房东指派')}</b> · 费用：<b>¥${w.cost}</b>（${w.payer}）${w.masterNote ? '<br>师傅留言：' + esc(w.masterNote) : ''}</div>
        ${(w.beforePhoto || w.afterPhoto) ? `<div class="cmp-grid"><div><small>故障现场照</small>${w.beforePhoto ? `<img src="${w.beforePhoto}" style="width:100%;max-height:95px;object-fit:cover;border-radius:6px">` : '<br>无'}</div><div><small>师傅完工照片</small>${w.afterPhoto ? `<img src="${w.afterPhoto}" style="width:100%;max-height:95px;object-fit:cover;border-radius:6px">` : '<br>未完工'}</div></div>` : ''}
        ${isPendingApprove ? `<div class="row2"><button class="btn bu bsm" onclick="openApproveWoModal('${p.id}','${w.id}')">✅ 审核通过并派给师傅</button><button class="btn bo bsm" style="color:var(--d)" onclick="rejectTenantWo('${p.id}','${w.id}')">驳回/无需上门</button></div>` : `<div class="row2"><button class="btn bu bsm" onclick="copyMasterLink('${link}')">📲 复制师傅接单链接</button>${w.status === '已完工待验收' ? `<button class="btn bs bsm" onclick="acceptWorkOrder('${p.id}','${w.id}')">✅ 确认验收并入账</button>` : `<button class="btn bo bsm" onclick="acceptWorkOrder('${p.id}','${w.id}')">完结归档</button>`}</div>`}
      </div>`;
    }).join('') || '<div class="card" style="text-align:center;color:var(--g4)">暂无维修与住户报修记录</div>';
  } else if (VIEW.tab === 'finance') {
    h += `<div class="card" style="background:var(--g5)"><div class="ct"><span>💰 账务操作（预存 ¥${(p.unallocatedCredit || 0).toFixed(2)}）</span></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn bs bsm" onclick="openPayModal('${p.id}')">💵 记收款</button><button class="btn bp bsm" onclick="openAdhocModal('${p.id}')">＋ 加费用</button><button class="btn bw bsm" onclick="openMeterModal('${p.id}')">⚡ 抄表</button></div></div>
      <div class="card"><div class="ct">📑 账单明细</div>${(p.bills || []).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(b => {
      const up = Math.max(0, +(b.amount - b.paidAmount).toFixed(2));
      return `<div class="irow" onclick="editBill('${p.id}','${b.id}')"><div><b>${esc(b.title)}</b><div style="font-size:11px;color:var(--g6)">应收日 ${b.dueDate} · 总额¥${b.amount} 已抵¥${b.paidAmount}</div></div><span class="pill ${up <= 0 && !b.voided ? 'p-ok' : 'p-ma'}">${b.voided ? '已作废' : (up <= 0 ? '已收齐' : '欠¥' + up)}</span></div>`;
    }).join('') || '暂无账单'}</div>`;
  } else if (VIEW.tab === 'media') {
    h += `<div class="card"><div class="ct"><span>📷 房源相册与合同</span><label class="btn bp bsm">＋ 上传/拍照<input type="file" multiple style="display:none" onchange="uploadPropMedia('${p.id}',this)"></label></div>
    <div class="mgrid">${(p.media || []).map((m, idx) => `<div class="mth" onclick="openAttachmentViewer(STATE.properties.find(x=>x.id==='${p.id}').media[${idx}])">${m.kind === 'image' && m.status === 'ok' ? `<img src="${m.dataUrl}">` : `<b>📄 文档</b><span>${esc(m.name)}</span>`}</div>`).join('') || '<div style="grid-column:1/-1;text-align:center;color:var(--g4);padding:16px">支持照片、HEIC、PDF、Excel</div>'}</div></div>`;
  } else if (VIEW.tab === 'lease') {
    if (p.currentLease) {
      const l = p.currentLease;
      h += `<div class="card"><div class="ct"><span>👤 在租：${esc(l.tenantName)}</span><span class="pill p-ok">${l.payType}</span></div><div style="font-size:13px">电话：${esc(l.phone)} · 租期：${l.startDate} ~ ${l.endDate} · 月租 ¥${l.rent} · 押金 ¥${l.deposit}</div></div>`;
    } else h += `<div class="card">当前空置待出租</div>`;
  }
  document.getElementById('main-content').innerHTML = h;
}

function openApproveWoModal(pid, wid) {
  const mOpts = (STATE.masters || []).map(m => `<option value="${esc(m.name)}::${esc(m.phone)}">${esc(m.name)} (${esc(m.phone)})</option>`).join('');
  openModal('✅ 审核住户报修并转派师傅', `<label style="font-size:12px">1. 选择指派哪位维修师傅：</label><select id="ap-m" class="inp">${mOpts}<option value="指派师傅::">其他师傅</option></select>
  <label style="font-size:12px">2. 判定维修费用责任方：</label><select id="ap-p" class="inp"><option value="房东">房东承担（自然老化/设备故障）</option><option value="租客">租客承担（人为损坏/耗材）</option><option value="分摊">双方对半分摊</option></select>
  <button class="btn bs blk" onclick="confirmApproveWo('${pid}','${wid}')">确认批准并生成师傅接单链接</button>`);
}
async function confirmApproveWo(pid, wid) {
  const p = STATE.properties.find(x => x.id === pid), w = p.workOrders.find(x => x.id === wid);
  const [mName, mPhone] = document.getElementById('ap-m').value.split('::');
  w.masterName = mName; w.masterPhone = mPhone; w.payer = document.getElementById('ap-p').value; w.status = '待接单';
  await pushWorkOrderToCloud(p, w);
  await save(); closeModal(); renderProp();
  const link = `${STATE.cloud.masterWebBase}?id=${encodeURIComponent(w.id)}&u=${encodeURIComponent(STATE.cloud.url)}&k=${encodeURIComponent(STATE.cloud.key)}`;
  copyMasterLink(link);
}
async function rejectTenantWo(pid, wid) {
  const p = STATE.properties.find(x => x.id === pid), w = p.workOrders.find(x => x.id === wid);
  w.status = '已驳回/住户自理';
  await pushWorkOrderToCloud(p, w);
  await save(); renderProp(); toast('已驳回该报修申请');
}

function copyMasterLink(url) {
  navigator.clipboard?.writeText(url).catch(() => { });
  openModal('📲 师傅专属派单链接已生成', `<p style="font-size:13px">只有经过您审核批准后才会生成此链接。直接复制发给维修师傅即可：</p><textarea class="inp" rows="4" readonly onclick="this.select()">${esc(url)}</textarea><button class="btn bs blk" onclick="navigator.clipboard?.writeText('${url}');toast('已复制到剪贴板，快去微信粘贴给师傅吧')">一键复制链接发给师傅</button>`);
}

async function acceptWorkOrder(pid, wid) {
  const p = STATE.properties.find(x => x.id === pid), w = p.workOrders.find(x => x.id === wid);
  w.status = '已验收归档';
  (p.rooms || []).forEach(r => r.items.forEach(i => { if ((r.name + '·' + i.name) === w.itemName) i.status = '完好'; }));
  if (w.tenantShare > 0 && !w.billedToTenant) {
    w.billedToTenant = true;
    p.bills.push({ id: uid('b'), type: 'adhoc', title: `维修分摊：${w.itemName}`, dueDate: today(), amount: w.tenantShare, paidAmount: 0, voided: false });
    reallocPay(p);
  }
  await pushWorkOrderToCloud(p, w);
  await save(); renderProp(); toast('✅ 已验收归档并同步账单');
}

function openWoModal(pid) {
  const p = STATE.properties.find(x => x.id === pid), opts = [], mOpts = (STATE.masters || []).map(m => `<option value="${esc(m.name)}::${esc(m.phone)}">${esc(m.name)} (${esc(m.phone)})</option>`).join('');
  (p.rooms || []).forEach(r => r.items.forEach(i => opts.push(`<option value="${r.id}::${i.id}">${esc(r.name)}·${esc(i.name)}</option>`)));
  openModal('🔧 房东创建云端维修工单', `<select id="wo-item" class="inp">${opts.join('')}</select>
  <select id="wo-master" class="inp">${mOpts}<option value="指派师傅::">其他师傅</option></select>
  <input id="wo-desc" class="inp" placeholder="故障描述 *">
  <div class="row2"><input type="number" id="wo-cost" class="inp" value="0" placeholder="预估费用"><select id="wo-payer" class="inp"><option value="房东">房东承担</option><option value="租客">租客承担</option><option value="分摊">双方对半分摊</option></select></div>
  <input type="file" id="wo-photo" accept="image/*" class="inp">
  <button class="btn bp blk" onclick="createCloudWo('${pid}')">☁️ 生成工单并获取师傅链接</button>`);
}
async function createCloudWo(pid) {
  const p = STATE.properties.find(x => x.id === pid), [rid, iid] = document.getElementById('wo-item').value.split('::');
  const r = p.rooms.find(x => x.id === rid), it = r.items.find(x => x.id === iid);
  const [mName, mPhone] = document.getElementById('wo-master').value.split('::');
  const desc = document.getElementById('wo-desc').value.trim(); if (!desc) return toast('请填故障描述');
  const c = Number(document.getElementById('wo-cost').value || 0), py = document.getElementById('wo-payer').value;
  let bPhoto = ''; const f = document.getElementById('wo-photo');
  if (f.files?.[0]) { const m = await processUploadedFile(f.files[0]); if (m.status === 'ok') bPhoto = m.dataUrl; }
  const wo = { id: uid('wo'), date: today(), itemName: r.name + '·' + it.name, desc, cost: c, payer: py, tenantShare: py === '分摊' ? +(c / 2).toFixed(2) : (py === '租客' ? c : 0), status: '待接单', masterName: mName, masterPhone: mPhone, beforePhoto: bPhoto, afterPhoto: '' };
  p.workOrders.unshift(wo); it.status = '待维修';
  const ok = await pushWorkOrderToCloud(p, wo);
  await save(); closeModal(); renderProp();
  if (ok) copyMasterLink(`${STATE.cloud.masterWebBase}?id=${encodeURIComponent(wo.id)}&u=${encodeURIComponent(STATE.cloud.url)}&k=${encodeURIComponent(STATE.cloud.key)}`);
}

async function uploadPropMedia(pid, inp) { if (!inp.files?.length) return; const p = STATE.properties.find(x => x.id === pid); for (const f of inp.files) p.media.push(await processUploadedFile(f)); await save(); renderProp(); }
async function delRoom(pid, rid) { const p = STATE.properties.find(x => x.id === pid); p.rooms = p.rooms.filter(r => r.id !== rid); await save(); renderProp(); }
function addRoom(pid) { openModal('＋ 添加房间', `<select id="ar-t" class="inp"><option value="客厅">客厅</option><option value="卧室">卧室</option><option value="厨房">厨房</option><option value="卫生间">卫生间</option></select><input id="ar-n" class="inp" placeholder="房间名"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),t=document.getElementById('ar-t').value,n=document.getElementById('ar-n').value.trim()||t;p.rooms.push({id:uid('r'),name:n,items:(TPL[t]||[]).map(x=>({id:uid('i'),name:x,status:'完好',desc:'',photo:null,history:[]}))});save().then(()=>{closeModal();renderProp()})">确定</button>`); }
function batchAddItems(pid, rid) { openModal('＋ 批量加物品', `<input id="bi-in" class="inp" placeholder="空格或逗号隔开"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),r=p.rooms.find(x=>x.id==='${rid}');document.getElementById('bi-in').value.split(/[,，\\s]+/).filter(Boolean).forEach(n=>r.items.push({id:uid('i'),name:n,status:'完好',desc:'',photo:null,history:[]}));save().then(()=>{closeModal();renderProp()})">添加</button>`); }
function editItem(pid, rid, iid) { const p = STATE.properties.find(x => x.id === pid), it = p.rooms.find(r => r.id === rid).items.find(i => i.id === iid); openModal('编辑：' + it.name, `<select id="ei-s" class="inp"><option value="完好" ${it.status === '完好' ? 'selected' : ''}>完好</option><option value="待维修" ${it.status === '待维修' ? 'selected' : ''}>待维修</option><option value="暂不维修" ${it.status === '暂不维修' ? 'selected' : ''}>暂不维修</option></select><input id="ei-d" class="inp" value="${esc(it.desc || '')}" placeholder="现状描述"><input type="file" id="ei-f" accept="image/*" class="inp"><button class="btn bp blk" onclick="saveItem('${pid}','${rid}','${iid}')">保存</button>`); }
async function saveItem(pid, rid, iid) { const p = STATE.properties.find(x => x.id === pid), it = p.rooms.find(r => r.id === rid).items.find(i => i.id === iid); it.status = document.getElementById('ei-s').value; it.desc = document.getElementById('ei-d').value.trim(); const f = document.getElementById('ei-f'); if (f.files?.[0]) it.photo = await processUploadedFile(f.files[0]); await save(); closeModal(); renderProp(); }

function openCheckIn(pid) { openModal('🔑 入住交接', `<div class="row2"><input id="ci-name" class="inp" placeholder="租客姓名 *"><input id="ci-phone" class="inp" placeholder="电话"></div><div class="row2"><input type="date" id="ci-start" class="inp" value="${today()}"><input type="date" id="ci-end" class="inp"></div><div class="row2"><input type="number" id="ci-rent" class="inp" placeholder="月租金 *"><input type="number" id="ci-deposit" class="inp" placeholder="押金"></div><select id="ci-pay-type" class="inp"><option value="押一付三">押一付三</option><option value="押一付一">押一付一</option></select><button class="btn bs blk" onclick="doCheckIn('${pid}')">确认入住</button>`); }
async function doCheckIn(pid) { const p = STATE.properties.find(x => x.id === pid), nm = document.getElementById('ci-name').value.trim(), sd = document.getElementById('ci-start').value, ed = document.getElementById('ci-end').value; if (!nm || !sd || !ed) return toast('请填完整'); const snap = {}; (p.rooms || []).forEach(r => r.items.forEach(i => snap[i.id] = { status: i.status, desc: i.desc || '', photoUrl: i.photo?.dataUrl || '' })); p.currentLease = { id: uid('l'), tenantName: nm, phone: document.getElementById('ci-phone').value, startDate: sd, endDate: ed, rent: Number(document.getElementById('ci-rent').value || 0), deposit: Number(document.getElementById('ci-deposit').value || 0), payType: document.getElementById('ci-pay-type').value, advanceDays: 5, fixedFee: 0, baselineSnapshot: snap }; p.status = '已出租'; genBills(p, p.currentLease, sd, false); await save(); closeModal(); renderProp(); }
function openCheckOut(pid) { const p = STATE.properties.find(x => x.id === pid), l = p.currentLease, snap = l.baselineSnapshot || {}; let diff = ''; (p.rooms || []).forEach(r => r.items.forEach(it => { const old = snap[it.id]; if ((old && old.status !== it.status) || it.status !== '完好') diff += `<div class="cmp-grid cmp-diff"><div><b>入住：${esc(it.name)}</b><br>${old?.status || '完好'}${old?.photoUrl ? `<img src="${old.photoUrl}" style="width:100%;max-height:80px;object-fit:cover">` : ''}</div><div><b>退房：${it.status}</b>${it.photo?.dataUrl ? `<img src="${it.photo.dataUrl}" style="width:100%;max-height:80px;object-fit:cover">` : ''}</div></div>`; })); openModal('📦 退房对比与押金精算', `<input type="date" id="co-d" class="inp" value="${today()}">${diff || '<div style="color:var(--s);font-size:12px;margin-bottom:8px">✓ 全屋对照无新增损坏</div>'}<input type="number" id="co-ded" class="inp" value="0" placeholder="扣款金额"><button class="btn bd blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}');p.currentLease=null;p.status='空置';p.vacantSince=today();save().then(()=>{closeModal();renderProp();toast('已退房归档')})">确认退房归档</button>`); }

function openPayModal(pid) { openModal('💵 记收款', `<input type="number" id="pa" class="inp" placeholder="金额 *"><button class="btn bs blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),a=Number(document.getElementById('pa').value||0);if(a<=0)return;p.payments.push({id:uid('py'),date:today(),amount:a});reallocPay(p);save().then(()=>{closeModal();if(VIEW.name==='detail')renderProp();else renderHome()})">确认入账</button>`); }
function openAdhocModal(pid) { openModal('＋ 加费用', `<input id="at" class="inp" placeholder="费用名"><input type="number" id="aa" class="inp" placeholder="金额"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}');p.bills.push({id:uid('b'),type:'adhoc',title:document.getElementById('at').value,dueDate:today(),amount:Number(document.getElementById('aa').value||0),paidAmount:0,voided:false});reallocPay(p);save().then(()=>{closeModal();renderProp()})">添加</button>`); }
function editBill(pid, bid) { const p = STATE.properties.find(x => x.id === pid), b = p.bills.find(x => x.id === bid); openModal('账单操作', `<input type="number" id="eba" class="inp" value="${b.amount}"><div class="row2"><button class="btn bp" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),b=p.bills.find(x=>x.id==='${bid}');b.amount=Number(document.getElementById('eba').value);reallocPay(p);save().then(()=>{closeModal();renderProp()})">保存</button><button class="btn bd" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),b=p.bills.find(x=>x.id==='${bid}');b.voided=!b.voided;reallocPay(p);save().then(()=>{closeModal();renderProp()})">作废</button></div>`); }
function openMeterModal(pid) { openModal('⚡ 抄表算费', `<input type="number" id="mf" class="inp" placeholder="本次水电燃气总费用"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),f=Number(document.getElementById('mf').value||0);if(f>0){p.bills.push({id:uid('b'),type:'utility',title:'水电费('+today()+')',dueDate:today(),amount:f,paidAmount:0,voided:false});reallocPay(p)}save().then(()=>{closeModal();renderProp()})">记入账单</button>`); }

function renderStatsView() { VIEW = { name: 'stats' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '📊 收支看板'; setNav('nav-stats'); const yr = today().slice(0, 4); document.getElementById('main-content').innerHTML = `<div class="card"><div class="ct">${yr} 年度各房源收益</div>${STATE.properties.map(p => { const inc = (p.payments || []).filter(x => x.date.startsWith(yr)).reduce((s, x) => s + x.amount, 0); return `<div class="irow"><b>${esc(p.name)}</b><b style="color:var(--s)">实收 ¥${inc}</b></div>`; }).join('') || '暂无'}</div>`; }
function renderMastersView() {
  VIEW = { name: 'masters' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '👷 云端派单与师傅库'; setNav('nav-masters');
  let wos = []; STATE.properties.forEach(p => (p.workOrders || []).forEach(w => wos.push({ p, w })));
  document.getElementById('main-content').innerHTML = `<div class="card"><div class="ct"><span>☁️ 全部云端工单进度</span><button class="btn bp bsm" onclick="syncCloudWorkOrders(true)">刷新状态</button></div>${wos.map(({ p, w }) => `<div class="todo" onclick="openProp('${p.id}','workorders')"><div><b>[${w.status}]</b> ${esc(p.name)} · ${esc(w.itemName)}</div><span>¥${w.cost} ›</span></div>`).join('') || '<small style="color:var(--g4)">暂无派单记录</small>'}</div>
  <div class="card"><div class="ct"><span>👷 合作师傅通讯录</span><button class="btn bp bsm" onclick="openModal('＋ 添加师傅','<input id=mn class=inp placeholder=姓名><input id=mp class=inp placeholder=电话><button class=\\'btn bp blk\\' onclick=\\'STATE.masters.push({id:uid(),category:\"综合\",name:document.getElementById(\"mn\").value,phone:document.getElementById(\"mp\").value});save().then(()=>{closeModal();renderMastersView()})\\'>保存</button>')">＋ 添加</button></div>${(STATE.masters || []).map(m => `<div class="irow"><b>${esc(m.name)}</b><a class="btn bs bsm" href="tel:${esc(m.phone)}">📞 ${esc(m.phone)}</a></div>`).join('')}</div>`;
}
function renderBackupView() {
  VIEW = { name: 'backup' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '⚙️ 云端配置与通知'; setNav('nav-backup');
  document.getElementById('main-content').innerHTML = `<div class="card"><div class="ct">☁️ 云端协同引擎状态</div><div style="font-size:12px;color:var(--s);margin-bottom:8px">✓ 已连接至 Supabase 实时云端（lsrqdyupxyjbckegyfdv）</div><button class="btn bp blk" onclick="syncCloudWorkOrders(true)">立即同步住户与师傅动态</button></div>
  <div class="card"><div class="ct">✨ 演示样板数据管理</div><div class="row2"><button class="btn bu" onclick="loadDemoData()">一键载入样板房</button><button class="btn bd" onclick="STATE.properties=[];save().then(()=>{goHome();toast('已清空')})">清空全部数据</button></div></div>
  <div class="card"><div class="ct">💾 本地全量备份与通知测试</div><div class="row2"><button class="btn bo" onclick="exportBk()">📤 导出备份</button><button class="btn bs" onclick="testPushNow()">🔔 测试系统通知</button></div></div>`;
}
async function loadDemoData() {
  const d1 = { id: 'demo_1', name: '滨江壹号 1802室（江景精装）', address: '滨江大道88号1栋1802', layout: '2室1厅1卫', area: '89', expectedRent: 4800, status: '已出租', createdAt: '2026-01-10', publicIntro: '一线江景，全屋品牌家电', media: [], rooms: [{ id: 'r1', name: '客厅', items: [{ id: 'i1', name: '客厅空调', status: '完好', desc: '格力3匹柜机' }, { id: 'i2', name: '智能门锁', status: '完好', desc: '指纹密码正常' }] }], currentLease: { id: 'l1', tenantName: '林先生', phone: '13800138000', startDate: '2026-06-01', endDate: '2026-12-10', rent: 4800, deposit: 4800, payType: '押一付三', advanceDays: 5 }, workOrders: [], renovations: [], utilityConfig: { mode: '房东代收', cycle: '每月', elecPrice: 0.65, waterPrice: 3.8, gasPrice: 2.8, lastElec: 1200, lastWater: 340, lastGas: 80, lastReadDate: today() }, bills: [], payments: [{ id: 'p1', date: today(), amount: 19200 }], unallocatedCredit: 0, depositSettlements: [], landlordExpenses: [] };
  genBills(d1, d1.currentLease, '2026-06-01', false);
  const d2 = { id: 'demo_2', name: '阳光花园 503室', address: '学府路12号503', layout: '1室1厅', area: '52', expectedRent: 2800, status: '空置', vacantSince: addDays(today(), -14), createdAt: '2026-03-01', media: [], rooms: [{ id: 'r2', name: '卫生间', items: [{ id: 'i3', name: '洗手盆龙头', status: '待维修', desc: '阀芯滴水' }] }], currentLease: null, workOrders: [], renovations: [], utilityConfig: { mode: '房东代收', cycle: '每月', elecPrice: 0.65, waterPrice: 3.8, gasPrice: 2.8, lastElec: 500, lastWater: 120, lastGas: 40, lastReadDate: today() }, bills: [], payments: [], unallocatedCredit: 0, depositSettlements: [], landlordExpenses: [] };
  STATE.properties = [d1, d2]; await save(); goHome(); toast('✨ 已载入高颜值样板数据');
}
async function testPushNow() { triggerInstantAlert('🔔 房源管家通知测试', '住户提交新报修或师傅完工时，手机将收到此类提醒！'); }
async function exportBk() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(STATE)], { type: 'application/json' })); a.download = `房源管家备份_${today()}.json`; a.click(); }
function openDocTesterModal() { openModal('📎 离线文档与 HEIC 预览', `<input type="file" id="sfi" class="inp" onchange="if(this.files?.[0])processUploadedFile(this.files[0]).then(openAttachmentViewer)">`); }
function openModal(t, b) { document.getElementById('modal-panel').innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:10px"><b>${esc(t)}</b><button class="btn bo bsm" onclick="closeModal()">✕</button></div>${b}`; document.getElementById('modal-backdrop').classList.add('open'); }
function closeModal() { document.getElementById('modal-backdrop').classList.remove('open'); }

loadState().then(() => { renderHome(); scheduleNotify(); syncCloudWorkOrders(false); setInterval(() => syncCloudWorkOrders(false), 15000); });
