function setNav(id) { document.querySelectorAll('.ni').forEach(e => e.classList.remove('act')); document.getElementById(id)?.classList.add('act'); }
function goHome() { VIEW = { name: 'home' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '🏠 房源管理'; setNav('nav-home'); renderHome(); }

function renderHome(q = '') {
  const ym = today().slice(0, 7); let mPaid = 0, mDue = 0, ovDue = 0;
  STATE.properties.forEach(p => {
    (p.payments || []).forEach(x => { if ((x.date || '').startsWith(ym)) mPaid += Number(x.amount || 0); });
    (p.bills || []).filter(b => !b.voided).forEach(b => { if ((b.dueDate || '').startsWith(ym)) mDue += Number(b.amount || 0); if (b.dueDate < today() && b.amount > b.paidAmount) ovDue += (b.amount - b.paidAmount); });
  });
  const tds = computeTodos(), rented = STATE.properties.filter(p => p.status === '已出租').length;
  let h = `<div class="ov"><div class="ov-item"><small>本月已收</small><b>¥${mPaid.toFixed(0)}</b></div><div class="ov-item"><small>本月应收</small><b>¥${mDue.toFixed(0)}</b></div><div class="ov-item"><small>目前欠款</small><b>¥${ovDue.toFixed(0)}</b></div><div class="ov-item"><small>在租/总套数</small><b>${rented}/${STATE.properties.length}</b></div></div>
  <div class="qg"><div class="qb" onclick="openCreateProp()">➕<br>新建房源</div><div class="qb" onclick="renderStatsView()">📊<br>收支看板</div><div class="qb" onclick="renderMastersView()">👷<br>师傅库</div><div class="qb" onclick="renderBackupView()">⏰<br>备份通知</div></div>
  <input class="inp" placeholder="🔍 全局搜索：房源、物品、租客、工单、装修、师傅..." value="${esc(q)}" oninput="renderHome(this.value)" />`;

  if (q.trim()) {
    const kw = q.trim().toLowerCase(), hits = [];
    STATE.properties.forEach(p => {
      if ((p.name + p.address + p.layout).toLowerCase().includes(kw)) hits.push({ t: '🏠 房源', n: p.name, s: p.address, fn: `openProp('${p.id}','info')` });
      (p.rooms || []).forEach(r => r.items.forEach(i => { if ((i.name + i.desc).toLowerCase().includes(kw)) hits.push({ t: '🛋️ 物品', n: `${p.name}·${r.name}-${i.name}`, s: i.status, fn: `openProp('${p.id}','rooms')` }); }));
      if (p.currentLease && (p.currentLease.tenantName + p.currentLease.phone).toLowerCase().includes(kw)) hits.push({ t: '👤 租客', n: p.currentLease.tenantName, s: p.name, fn: `openProp('${p.id}','lease')` });
      (p.workOrders || []).forEach(w => { if ((w.itemName + w.desc).toLowerCase().includes(kw)) hits.push({ t: '🔧 工单', n: `${p.name}·${w.itemName}`, s: w.desc, fn: `openProp('${p.id}','workorders')` }); });
    });
    (STATE.masters || []).forEach(m => { if ((m.name + m.category + m.phone).toLowerCase().includes(kw)) hits.push({ t: '👷 师傅', n: m.name, s: m.phone, fn: `renderMastersView()` }); });
    return document.getElementById('main-content').innerHTML = h + `<div class="card"><div class="ct">搜索结果 (${hits.length})</div>${hits.map(x => `<div class="todo" onclick="${x.fn}"><div><b>${x.t}</b> ${esc(x.n)} <small style="color:var(--g6)">${esc(x.s)}</small></div><span>›</span></div>`).join('') || '无匹配'}</div>`;
  }

  h += `<div class="card"><div class="ct"><span>📌 今日待办事项</span><small>${tds.length}项</small></div>${tds.length ? tds.map(t => `<div class="todo" onclick="${t.act === 'backup' ? 'renderBackupView()' : `openProp('${t.propId}','${t.tab}')`}"><div><b>${t.badge}</b> ${esc(t.text)}</div><small>${t.date} ›</small></div>`).join('') : '<div style="font-size:12px;color:var(--g4);text-align:center">暂无待办 🎉</div>'}</div>`;

  if (!STATE.properties.length) {
    h += `<div class="card" style="border:1.5px dashed var(--p);background:var(--pl)"><div class="ct" style="color:var(--p)">👋 欢迎使用房源管理满血版</div><div style="font-size:13px">1. 点上方「➕ 新建房源」，支持一键套用全屋房间物品模板。<br>2. 逐项拍照留底，支持苹果 HEIC 原图直传与 PDF/Excel 离线预览。<br>3. 退房时自动左右对比“入住 vs 退房”照片变化并精算押金。</div><button class="btn bp blk" style="margin-top:10px" onclick="openCreateProp()">立即新建第一套房源</button></div>`;
  } else {
    STATE.properties.forEach(p => {
      const stCls = { '已出租': 'st-ok', '维修中': 'st-ma', '待出租': 'st-re' }[p.status] || 'st-va';
      const plCls = { '已出租': 'p-ok', '维修中': 'p-ma', '待出租': 'p-re' }[p.status] || 'p-va';
      const cov = (p.media || []).find(m => m.kind === 'image' && m.status === 'ok');
      const pw = (p.workOrders || []).filter(w => w.status === '待维修').length;
      h += `<div class="pcard" onclick="openProp('${p.id}','rooms')"><div class="stripe ${stCls}"></div><div class="pcov">${cov ? `<img src="${cov.dataUrl}">` : '🏠'}</div><div style="padding:10px;flex:1"><div style="display:flex;justify-content:space-between"><b>${esc(p.name)}</b><span class="pill ${plCls}">${p.status}</span></div><div style="font-size:12px;color:var(--g6);margin:4px 0">${esc(p.layout || '')} ${p.area ? p.area + '㎡' : ''} · ${esc(p.address || '')}</div><div style="font-size:12px">${p.currentLease ? `租客：<b>${esc(p.currentLease.tenantName)}</b> · 到期 ${p.currentLease.endDate}` : '当前空置'} · 待维修 ${pw}</div></div></div>`;
    });
  }
  document.getElementById('main-content').innerHTML = h;
}

function openCreateProp() {
  const opts = STATE.properties.map(p => `<option value="${p.id}">复制：${esc(p.name)}</option>`).join('');
  openModal('➕ 新建房源', `<select id="np-m" class="inp"><option value="tpl">使用默认全屋模板（客厅/卧室/厨房/卫生间/整套）</option><option value="blk">空白房源</option>${opts}</select>
  <input id="np-n" class="inp" placeholder="房源名称 *（如：阳光海岸 101 室）"><input id="np-a" class="inp" placeholder="详细地址">
  <div class="row2"><input id="np-l" class="inp" placeholder="户型（如 2室1厅）"><input id="np-ar" type="number" class="inp" placeholder="面积(㎡)"></div>
  <button class="btn bp blk" onclick="saveNewProp()">保存创建</button>`);
}
async function saveNewProp() {
  const name = document.getElementById('np-n').value.trim(); if (!name) return toast('请填房源名称');
  const mode = document.getElementById('np-m').value; let rooms = [];
  if (mode === 'tpl') rooms = Object.keys(TPL).map(rn => ({ id: uid('r'), name: rn, items: TPL[rn].map(inm => ({ id: uid('i'), name: inm, status: '完好', desc: '', photo: null, history: [{ date: today(), status: '完好', desc: '建档初始化' }] })) }));
  else if (mode !== 'blk') { const src = STATE.properties.find(x => x.id === mode); if (src) rooms = JSON.parse(JSON.stringify(src.rooms)); }
  const p = { id: uid('p'), name, address: document.getElementById('np-a').value.trim(), layout: document.getElementById('np-l').value.trim(), area: document.getElementById('np-ar').value, status: '空置', createdAt: today(), publicIntro: '', privateNote: '', media: [], rooms, currentLease: null, leaseHistory: [], workOrders: [], renovations: [], utilityConfig: { mode: '房东代收', cycle: '每月', elecPrice: 0.65, waterPrice: 3.8, gasPrice: 2.8, lastElec: 0, lastWater: 0, lastGas: 0, lastReadDate: today() }, bills: [], payments: [], unallocatedCredit: 0, depositSettlements: [], landlordExpenses: [] };
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
      <button class="btn bu bsm" onclick="openShareGen('${p.id}')">🖼️ 分享图</button>
      ${p.status !== '已出租' ? `<button class="btn bs bsm" onclick="openCheckIn('${p.id}')">🔑 入住交接</button>` : `<button class="btn bw bsm" onclick="openRenew('${p.id}')">🔄 续租</button><button class="btn bd bsm" onclick="openCheckOut('${p.id}')">📦 退房对比精算</button>`}
    </div>
  </div>
  <div class="tabs">
    <button class="tbtn ${VIEW.tab === 'rooms' ? 'act' : ''}" onclick="VIEW.tab='rooms';renderProp()">🛋️ 房间物品</button>
    <button class="tbtn ${VIEW.tab === 'media' ? 'act' : ''}" onclick="VIEW.tab='media';renderProp()">📷 相册合同(${(p.media || []).length})</button>
    <button class="tbtn ${VIEW.tab === 'finance' ? 'act' : ''}" onclick="VIEW.tab='finance';renderProp()">💰 账单水电</button>
    <button class="tbtn ${VIEW.tab === 'lease' ? 'act' : ''}" onclick="VIEW.tab='lease';renderProp()">📝 租期档案</button>
    <button class="tbtn ${VIEW.tab === 'workorders' ? 'act' : ''}" onclick="VIEW.tab='workorders';renderProp()">🔧 维修(${(p.workOrders || []).length})</button>
    <button class="tbtn ${VIEW.tab === 'timeline' ? 'act' : ''}" onclick="VIEW.tab='timeline';renderProp()">⏳ 装修</button>
    <button class="tbtn ${VIEW.tab === 'info' ? 'act' : ''}" onclick="VIEW.tab='info';renderProp()">📋 档案</button>
  </div>`;

  if (VIEW.tab === 'rooms') {
    h += `<div style="text-align:right;margin-bottom:8px"><button class="btn bp bsm" onclick="addRoom('${p.id}')">＋ 添加房间</button></div>`;
    (p.rooms || []).forEach(r => {
      h += `<div class="rbox"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>${esc(r.name)}</b><button class="btn bo bsm" style="color:var(--d)" onclick="delRoom('${p.id}','${r.id}')">删房间</button></div>`;
      r.items.forEach(it => {
        const pc = it.status === '完好' ? 'p-ok' : (it.status === '待维修' ? 'p-da' : 'p-ma');
        const th = it.photo?.status === 'ok' ? `<img src="${it.photo.dataUrl}" class="ithumb" onclick="openAttachmentViewer(STATE.properties.find(x=>x.id==='${p.id}').rooms.find(x=>x.id==='${r.id}').items.find(x=>x.id==='${it.id}').photo)">` : '';
        h += `<div class="irow">${th}<div onclick="editItem('${p.id}','${r.id}','${it.id}')" style="flex:1;cursor:pointer"><b>${esc(it.name)}</b> <span class="pill ${pc}">${it.status}</span><div style="font-size:12px;color:var(--g6)">${esc(it.desc || '点击拍照或记录现状')}</div></div><button class="btn bo bsm" onclick="editItem('${p.id}','${r.id}','${it.id}')">拍照/改</button></div>`;
      });
      h += `<button class="btn bo bsm blk" onclick="batchAddItems('${p.id}','${r.id}')">＋ 批量加物品（空格或逗号隔开）</button></div>`;
    });
  } else if (VIEW.tab === 'media') {
    h += `<div class="card"><div class="ct"><span>📷 房源相册、视频与合同附件</span><label class="btn bp bsm">＋ 上传/拍照<input type="file" multiple style="display:none" onchange="uploadPropMedia('${p.id}',this)"></label></div>
    <div class="mgrid">${(p.media || []).map((m, idx) => `<div class="mth" onclick="openAttachmentViewer(STATE.properties.find(x=>x.id==='${p.id}').media[${idx}])">${m.kind === 'image' && m.status === 'ok' ? `<img src="${m.dataUrl}">` : `<b>${m.kind === 'video' ? '🎬 视频' : '📄 文档'}</b><span>${esc(m.name)}</span>`}</div>`).join('') || '<div style="grid-column:1/-1;text-align:center;color:var(--g4);padding:16px">支持批量传照片、HEIC、视频、PDF合同、Excel</div>'}</div></div>`;
  } else if (VIEW.tab === 'finance') {
    const u = p.utilityConfig;
    h += `<div class="card" style="background:var(--g5)"><div class="ct"><span>💰 账务操作（预存 ¥${(p.unallocatedCredit || 0).toFixed(2)}）</span></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn bs bsm" onclick="openPayModal('${p.id}')">💵 记收款</button>
        <button class="btn bp bsm" onclick="openAdhocModal('${p.id}')">＋ 加费用</button>
        <button class="btn bw bsm" onclick="openMeterModal('${p.id}')">⚡ 抄表/换表</button>
        <button class="btn bo bsm" onclick="openExpModal('${p.id}')">🧾 房东支出</button>
      </div></div>
      <div class="card"><div class="ct"><span>⚡ 水电燃气（${u.mode} · ${u.cycle}）</span><button class="btn bo bsm" onclick="cfgUtil('${p.id}')">设置</button></div><small>电¥${u.elecPrice} · 水¥${u.waterPrice} · 气¥${u.gasPrice} ｜ 表底：电${u.lastElec} 水${u.lastWater} 气${u.lastGas}</small></div>
      <div class="card"><div class="ct">📑 账单明细</div>${(p.bills || []).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(b => {
      const up = Math.max(0, +(b.amount - b.paidAmount).toFixed(2));
      return `<div class="irow" onclick="editBill('${p.id}','${b.id}')"><div><b>${esc(b.title)}</b><div style="font-size:11px;color:var(--g6)">应收日 ${b.dueDate} · 总额¥${b.amount} 已抵¥${b.paidAmount}</div></div><span class="pill ${up <= 0 && !b.voided ? 'p-ok' : 'p-ma'}">${b.voided ? '已作废' : (up <= 0 ? '已收齐' : '欠¥' + up)}</span></div>`;
    }).join('') || '暂无账单'}</div>`;
  } else if (VIEW.tab === 'lease') {
    if (p.currentLease) {
      const l = p.currentLease;
      h += `<div class="card"><div class="ct"><span>👤 在租：${esc(l.tenantName)}</span><span class="pill p-ok">${l.payType}</span></div><div style="font-size:13px">电话：${esc(l.phone)} · 租期：${l.startDate} ~ ${l.endDate}<br>月租 ¥${l.rent} · 押金 ¥${l.deposit} · 入住表底(电${l.metersIn?.elec}/水${l.metersIn?.water}/气${l.metersIn?.gas})</div><div class="priv" style="margin-top:6px">🔒 私人备注：${esc(l.privateNote || '无')}</div></div>`;
    } else {
      const inh = []; (p.rooms || []).forEach(r => r.items.forEach(i => { if (i.status !== '完好') inh.push(`${r.name}·${i.name}(${i.status})`); }));
      h += `<div class="card"><div class="ct">空置待入住底单</div><div style="font-size:12px;color:var(--d)">${inh.length ? '下一任自动继承遗留问题：' + inh.join('、') : '✓ 全屋完好无遗留'}</div></div>`;
    }
    h += `<div class="card"><div class="ct">📁 历史退租归档</div>${(p.leaseHistory || []).filter(x => x.type === 'checkout').map(x => `<div style="font-size:12px;padding:6px 0;border-bottom:1px solid var(--g2)"><b>${esc(x.tenantName)}</b> (${x.startDate}~${x.checkoutDate}) · 用量：电${x.usage?.elec} 水${x.usage?.water} 气${x.usage?.gas}</div>`).join('') || '暂无'}</div>`;
  } else if (VIEW.tab === 'workorders') {
    h += `<div style="text-align:right;margin-bottom:8px"><button class="btn bp bsm" onclick="openWoModal('${p.id}')">＋ 新建工单</button></div>`;
    h += (p.workOrders || []).map(w => `<div class="card"><div class="ct"><span>🔧 ${esc(w.itemName)}</span><span class="pill p-ma">${w.status}</span></div><div style="font-size:13px">${esc(w.desc)}</div><small>费用¥${w.cost}（${w.payer}${w.payer === '分摊' ? '，租客出¥' + w.tenantShare : ''}）</small></div>`).join('') || '<div class="card">暂无工单</div>';
  } else if (VIEW.tab === 'timeline') {
    h += `<div style="text-align:right;margin-bottom:8px"><button class="btn bp bsm" onclick="openRenoModal('${p.id}')">＋ 记装修改造</button></div><div class="card">${(p.renovations || []).map(r => `<div style="padding:6px 0;border-bottom:1px solid var(--g2)"><b>${r.date}</b> 🔨 ${esc(r.content)} (¥${r.cost})</div>`).join('') || '暂无记录'}</div>`;
  } else if (VIEW.tab === 'info') {
    h += `<div class="card"><div class="ct">房源公开介绍与私人备注</div><textarea id="info-public" class="inp" rows="3" placeholder="房源介绍（生成分享图时展示）">${esc(p.publicIntro || '')}</textarea><textarea id="info-private" class="inp" rows="2" placeholder="私人备注（绝对保密，不进分享图）">${esc(p.privateNote || '')}</textarea><button class="btn bp bsm" onclick="const p=STATE.properties.find(x=>x.id==='${p.id}');p.publicIntro=document.getElementById('info-public').value;p.privateNote=document.getElementById('info-private').value;save().then(()=>toast('已保存'))">保存文字</button></div>`;
  }
  document.getElementById('main-content').innerHTML = h;
}

async function uploadPropMedia(pid, inp) {
  if (!inp.files?.length) return;
  const p = STATE.properties.find(x => x.id === pid); p.media = p.media || [];
  for (const f of inp.files) p.media.push(await processUploadedFile(f));
  await save(); renderProp(); toast('已存入本地相册');
}
async function delRoom(pid, rid) { const p = STATE.properties.find(x => x.id === pid); p.rooms = p.rooms.filter(r => r.id !== rid); await save(); renderProp(); }
function addRoom(pid) { openModal('＋ 添加房间', `<select id="ar-t" class="inp"><option value="客厅">客厅</option><option value="卧室">卧室</option><option value="厨房">厨房</option><option value="卫生间">卫生间</option><option value="空房间">空房间</option></select><input id="ar-n" class="inp" placeholder="显示名称（如：主卧）"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),t=document.getElementById('ar-t').value,n=document.getElementById('ar-n').value.trim()||t;p.rooms.push({id:uid('r'),name:n,items:(TPL[t]||[]).map(x=>({id:uid('i'),name:x,status:'完好',desc:'',photo:null,history:[]}))});save().then(()=>{closeModal();renderProp()})">确定</button>`); }
function batchAddItems(pid, rid) { openModal('＋ 批量加物品', `<input id="batch-items-input" class="inp" placeholder="逗号或空格隔开多个（如：微波炉 空气炸锅）"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),r=p.rooms.find(x=>x.id==='${rid}');document.getElementById('batch-items-input').value.split(/[,，\\s]+/).filter(Boolean).forEach(n=>r.items.push({id:uid('i'),name:n,status:'完好',desc:'',photo:null,history:[]}));save().then(()=>{closeModal();renderProp()})">确认添加</button>`); }
function editItem(pid, rid, iid) {
  const p = STATE.properties.find(x => x.id === pid), it = p.rooms.find(r => r.id === rid).items.find(i => i.id === iid);
  openModal('编辑：' + it.name, `<select id="ei-s" class="inp"><option value="完好" ${it.status === '完好' ? 'selected' : ''}>完好</option><option value="待维修" ${it.status === '待维修' ? 'selected' : ''}>待维修</option><option value="暂不维修" ${it.status === '暂不维修' ? 'selected' : ''}>暂不维修</option></select><input id="ei-d" class="inp" value="${esc(it.desc || '')}" placeholder="现状描述"><label style="font-size:12px;color:var(--g6)">拍照/上传现状照片（留底用于退房对比）：</label><input type="file" id="ei-f" accept="image/*" class="inp"><button class="btn bp blk" onclick="saveItem('${pid}','${rid}','${iid}')">保存</button>`);
}
async function saveItem(pid, rid, iid) {
  const p = STATE.properties.find(x => x.id === pid), it = p.rooms.find(r => r.id === rid).items.find(i => i.id === iid);
  it.status = document.getElementById('ei-s').value; it.desc = document.getElementById('ei-d').value.trim();
  const f = document.getElementById('ei-f'); if (f.files?.[0]) it.photo = await processUploadedFile(f.files[0]);
  it.history = it.history || []; it.history.push({ date: today(), status: it.status, desc: it.desc });
  await save(); closeModal(); renderProp(); toast('已更新现状');
}

// 入住交接（自动拍摄全屋快照）与退房火眼金睛对比
function openCheckIn(pid) {
  openModal('🔑 办理入住交接（自动锁定当前全屋拍照底单）', `<div class="row2"><input id="ci-name" class="inp" placeholder="租客姓名 *"><input id="ci-phone" class="inp" placeholder="电话"></div>
  <div class="row2"><input type="date" id="ci-start" class="inp" value="${today()}"><input type="date" id="ci-end" class="inp"></div>
  <div class="row2"><input type="number" id="ci-rent" class="inp" placeholder="月租金 *"><input type="number" id="ci-deposit" class="inp" placeholder="押金"></div>
  <div class="row2"><select id="ci-pay-type" class="inp"><option value="押一付三">押一付三</option><option value="押一付一">押一付一</option><option value="押二付三">押二付三</option><option value="押一付六">押一付六</option><option value="押一付十二">押一付十二</option></select><input type="number" id="ci-fixed-fee" class="inp" value="0" placeholder="每月固定杂费"></div>
  <div class="row3"><input type="number" id="ci-elec" class="inp" placeholder="电表底数"><input type="number" id="ci-water" class="inp" placeholder="水表底数"><input type="number" id="ci-gas" class="inp" placeholder="气表底数"></div>
  <textarea id="ci-private-note" class="inp" rows="2" placeholder="私人备注（仅自己可见）"></textarea>
  <button class="btn bs blk" onclick="doCheckIn('${pid}')">确认入住并生成分期账单</button>`);
}
async function doCheckIn(pid) {
  const p = STATE.properties.find(x => x.id === pid), nm = document.getElementById('ci-name').value.trim(), sd = document.getElementById('ci-start').value, ed = document.getElementById('ci-end').value;
  if (!nm || !sd || !ed) return toast('请填姓名和起止日期');
  const snap = {}; (p.rooms || []).forEach(r => r.items.forEach(i => snap[i.id] = { roomName: r.name, itemName: i.name, status: i.status, desc: i.desc || '', photoUrl: i.photo?.status === 'ok' ? i.photo.dataUrl : '' }));
  const ei = Number(document.getElementById('ci-elec').value || p.utilityConfig.lastElec), wi = Number(document.getElementById('ci-water').value || p.utilityConfig.lastWater), gi = Number(document.getElementById('ci-gas').value || p.utilityConfig.lastGas);
  Object.assign(p.utilityConfig, { lastElec: ei, lastWater: wi, lastGas: gi, lastReadDate: sd });
  p.currentLease = { id: uid('l'), tenantName: nm, phone: document.getElementById('ci-phone').value, startDate: sd, endDate: ed, rent: Number(document.getElementById('ci-rent').value || 0), deposit: Number(document.getElementById('ci-deposit').value || 0), payType: document.getElementById('ci-pay-type').value, advanceDays: 5, fixedFee: Number(document.getElementById('ci-fixed-fee').value || 0), metersIn: { elec: ei, water: wi, gas: gi }, privateNote: document.getElementById('ci-private-note').value, baselineSnapshot: snap };
  p.status = '已出租'; genBills(p, p.currentLease, sd, false); await save(); closeModal(); renderProp(); toast('入住底单已锁定');
}
function openRenew(pid) { const p = STATE.properties.find(x => x.id === pid), l = p.currentLease; openModal('🔄 续租', `<input type="date" id="rn-e" class="inp" value="${l.endDate}"><input type="number" id="rn-r" class="inp" value="${l.rent}"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}');p.currentLease.endDate=document.getElementById('rn-e').value;p.currentLease.rent=Number(document.getElementById('rn-r').value);genBills(p,p.currentLease,today(),true);save().then(()=>{closeModal();renderProp()})">确认续租</button>`); }

function openCheckOut(pid) {
  const p = STATE.properties.find(x => x.id === pid), l = p.currentLease, u = p.utilityConfig, snap = l.baselineSnapshot || {};
  let diffHtml = '';
  (p.rooms || []).forEach(r => r.items.forEach(it => {
    const old = snap[it.id];
    const changed = old && (old.status !== it.status || (old.desc || '') !== (it.desc || ''));
    if (changed || it.status !== '完好') {
      diffHtml += `<div class="cmp-grid ${changed ? 'cmp-diff' : ''}">
        <div><b>入住底单：${esc(r.name)}·${esc(it.name)}</b><br>状态：${old?.status || '完好'}<br>${old?.photoUrl ? `<img src="${old.photoUrl}" style="width:100%;max-height:90px;object-fit:cover;border-radius:6px;margin-top:4px">` : '<small>无底单照</small>'}</div>
        <div><b>退房现状：${changed ? '⚠️ 有变化' : '延续问题'}</b><br>状态：${it.status} (${esc(it.desc || '')})<br>${it.photo?.status === 'ok' ? `<img src="${it.photo.dataUrl}" style="width:100%;max-height:90px;object-fit:cover;border-radius:6px;margin-top:4px">` : '<small>无新照片</small>'}</div>
      </div>`;
    }
  }));
  const rep = (p.workOrders || []).filter(w => w.tenantShare > 0);
  openModal('📦 退房火眼金睛对比 & 押金精算', `<input type="date" id="co-date" class="inp" value="${today()}" onchange="calcCO('${pid}')">
  <div class="row3"><input type="number" id="co-elec" class="inp" value="${u.lastElec}" oninput="calcCO('${pid}')"><input type="number" id="co-water" class="inp" value="${u.lastWater}" oninput="calcCO('${pid}')"><input type="number" id="co-gas" class="inp" value="${u.lastGas}" oninput="calcCO('${pid}')"></div>
  ${diffHtml ? `<div style="font-weight:700;font-size:13px;margin:6px 0;color:var(--d)">🔍 入住 vs 退房物品变化对照：</div>${diffHtml}` : '<div style="font-size:12px;color:var(--s);margin-bottom:6px">✓ 对比入住底单，全屋物品状态无新增损坏</div>'}
  <div style="margin:6px 0">${rep.map(w => `<label style="display:block;font-size:12px"><input type="checkbox" class="co-rcb" data-amt="${w.tenantShare}" checked onchange="calcCO('${pid}')"> 扣租客承担维修：${esc(w.itemName)} ¥${w.tenantShare}</label>`).join('')}</div>
  <input type="number" id="co-oth" class="inp" value="0" placeholder="其他赔偿/保洁扣款" oninput="calcCO('${pid}')">
  <div id="co-settlement-summary" class="card" style="background:var(--sb);font-size:13px"></div>
  <button class="btn bd blk" onclick="doCheckOut('${pid}')">确认退房并生成结算单</button>`);
  calcCO(pid);
}
function calcCO(pid) {
  const p = STATE.properties.find(x => x.id === pid), l = p.currentLease, u = p.utilityConfig, cd = document.getElementById('co-date').value || today();
  const oe = Number(document.getElementById('co-elec').value || u.lastElec), ow = Number(document.getElementById('co-water').value || u.lastWater), og = Number(document.getElementById('co-gas').value || u.lastGas);
  const uf = u.mode === '房东代收' ? +((Math.max(0, oe - u.lastElec) * u.elecPrice + Math.max(0, ow - u.lastWater) * u.waterPrice + Math.max(0, og - u.lastGas) * u.gasPrice)).toFixed(2) : 0;
  const db = (p.bills || []).find(b => b.leaseId === l.id && b.type === 'deposit' && !b.voided), dep = db ? db.paidAmount : 0, cred = p.unallocatedCredit || 0;
  let unp = 0; (p.bills || []).filter(b => !b.voided && b.type !== 'deposit').forEach(b => { if (!(b.type === 'rent' && b.periodStart >= cd)) unp += Math.max(0, b.amount - b.paidAmount); });
  let rd = 0; document.querySelectorAll('.co-rcb:checked').forEach(c => rd += Number(c.dataset.amt || 0));
  const od = Number(document.getElementById('co-oth').value || 0), net = +(dep + cred - unp - uf - rd - od).toFixed(2);
  window._co = { oe, ow, og, uf, dep, cred, unp, rd, od, net };
  document.getElementById('co-settlement-summary').innerHTML = `已收押金：¥${dep} ｜ 预存结余：¥${cred} ｜ 未清账单：¥${unp}<br>末期水电燃气：¥${uf} ｜ 维修/赔偿扣款：¥${rd + od}<br><b>${net >= 0 ? '✅ 最终应退租客：¥' + net : '⚠️ 租客仍需补缴：¥' + Math.abs(net)}</b>`;
}
async function doCheckOut(pid) {
  const p = STATE.properties.find(x => x.id === pid), l = p.currentLease, cd = document.getElementById('co-date').value || today(), c = window._co;
  (p.bills || []).forEach(b => { if (!b.voided && b.leaseId === l.id && ((b.type === 'rent' && b.periodStart >= cd) || b.type === 'deposit')) b.voided = true; });
  Object.assign(p.utilityConfig, { lastElec: c.oe, lastWater: c.ow, lastGas: c.og });
  p.depositSettlements.push({ id: uid('s'), date: cd, tenantName: l.tenantName, netAmount: c.net, paidDeposit: c.dep, finalUtilityFee: c.uf, repairDeduct: c.rd + c.od });
  p.leaseHistory.push({ ...l, type: 'checkout', checkoutDate: cd, usage: { elec: c.oe - (l.metersIn?.elec || 0), water: c.ow - (l.metersIn?.water || 0), gas: c.og - (l.metersIn?.gas || 0) } });
  p.unallocatedCredit = 0; p.currentLease = null; p.status = '空置'; await save(); closeModal(); renderProp(); toast('退房精算已存档');
}

// 账务、工单与分享图弹窗
function openPayModal(pid) { openModal('💵 记收款', `<input type="date" id="py-d" class="inp" value="${today()}"><input type="number" id="pay-amount" class="inp" placeholder="收款金额 *"><select id="py-m" class="inp"><option value="微信">微信</option><option value="支付宝">支付宝</option><option value="银行转账">银行转账</option><option value="现金">现金</option></select><button class="btn bs blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),a=Number(document.getElementById('pay-amount').value||0);if(a<=0)return;p.payments.push({id:uid('py'),date:document.getElementById('py-d').value,amount:a,method:document.getElementById('py-m').value});reallocPay(p);save().then(()=>{closeModal();renderProp()})">确认入账并自动冲抵</button>`); }
function openAdhocModal(pid) { openModal('＋ 加临时费用', `<input id="adhoc-title" class="inp" placeholder="费用名称 *"><input type="number" id="adhoc-amount" class="inp" placeholder="金额 *"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),t=document.getElementById('adhoc-title').value,a=Number(document.getElementById('adhoc-amount').value||0);if(!t||a<=0)return;p.bills.push({id:uid('b'),type:'adhoc',title:t,dueDate:today(),amount:a,paidAmount:0,voided:false});reallocPay(p);save().then(()=>{closeModal();renderProp()})">确认添加</button>`); }
function editBill(pid, bid) { const p = STATE.properties.find(x => x.id === pid), b = p.bills.find(x => x.id === bid); openModal('修改/作废账单', `<input type="number" id="eb-a" class="inp" value="${b.amount}"><div class="row2"><button class="btn bp" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),b=p.bills.find(x=>x.id==='${bid}');b.amount=Number(document.getElementById('eb-a').value);reallocPay(p);save().then(()=>{closeModal();renderProp()})">保存金额</button><button class="btn bd" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),b=p.bills.find(x=>x.id==='${bid}');b.voided=!b.voided;reallocPay(p);save().then(()=>{closeModal();renderProp()})">作废切换</button></div>`); }
function cfgUtil(pid) { const p = STATE.properties.find(x => x.id === pid), u = p.utilityConfig; openModal('水电燃气设置', `<select id="uc-m" class="inp"><option value="房东代收" ${u.mode === '房东代收' ? 'selected' : ''}>房东代收</option><option value="租客自缴" ${u.mode === '租客自缴' ? 'selected' : ''}>租客自缴</option></select><select id="uc-c" class="inp"><option value="每月">每月抄表</option><option value="每季度">每季度抄表</option><option value="每半年">每半年抄表</option></select><div class="row3"><input type="number" step="0.01" id="uc-e" class="inp" value="${u.elecPrice}"><input type="number" step="0.01" id="uc-w" class="inp" value="${u.waterPrice}"><input type="number" step="0.01" id="uc-g" class="inp" value="${u.gasPrice}"></div><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}');Object.assign(p.utilityConfig,{mode:document.getElementById('uc-m').value,cycle:document.getElementById('uc-c').value,elecPrice:Number(document.getElementById('uc-e').value),waterPrice:Number(document.getElementById('uc-w').value),gasPrice:Number(document.getElementById('uc-g').value)});save().then(()=>{closeModal();renderProp()})">保存</button>`); }
function openMeterModal(pid) { const p = STATE.properties.find(x => x.id === pid), u = p.utilityConfig; openModal('⚡ 抄表（支持中途换表两段算）', `<label><input type="checkbox" id="mr-e-swap"> 本期中途换过电表</label><input type="number" id="mr-e-old-end" class="inp" placeholder="换表填旧表最后读数"><input type="number" id="mr-e-cur" class="inp" placeholder="本次电表读数（上次 ${u.lastElec}）"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),u=p.utilityConfig,c=Number(document.getElementById('mr-e-cur').value||u.lastElec),sw=document.getElementById('mr-e-swap').checked,used=sw?(Math.max(0,Number(document.getElementById('mr-e-old-end').value||u.lastElec)-u.lastElec)+c):Math.max(0,c-u.lastElec),fee=+(used*u.elecPrice).toFixed(2);u.lastElec=c;u.lastReadDate=today();if(fee>0){p.bills.push({id:uid('b'),type:'utility',title:'水电费('+today()+')',dueDate:today(),amount:fee,paidAmount:0,voided:false});reallocPay(p)}save().then(()=>{closeModal();renderProp()})">自动算费并记入账单</button>`); }
function openExpModal(pid) { openModal('🧾 房东支出', `<input id="le-title" class="inp" placeholder="项目（如物业费/取暖费）"><input type="number" id="le-amount" class="inp" placeholder="金额"><button class="btn bw blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}');p.landlordExpenses.push({id:uid('e'),date:today(),title:document.getElementById('le-title').value,amount:Number(document.getElementById('le-amount').value||0)});save().then(()=>{closeModal();renderProp()})">保存</button>`); }
function openWoModal(pid) { const p = STATE.properties.find(x => x.id === pid), opts = []; (p.rooms || []).forEach(r => r.items.forEach(i => opts.push(`<option value="${r.id}::${i.id}">${esc(r.name)}·${esc(i.name)}</option>`))); openModal('🔧 新建维修工单', `<select id="wo-item" class="inp">${opts.join('')}</select><input id="wo-desc" class="inp" placeholder="问题描述 *"><div class="row2"><input type="number" id="wo-cost" class="inp" value="0" placeholder="维修费"><select id="wo-payer" class="inp"><option value="房东">房东承担</option><option value="租客">租客承担</option><option value="分摊">双方对半分摊</option></select></div><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}'),[rid,iid]=document.getElementById('wo-item').value.split('::'),r=p.rooms.find(x=>x.id===rid),it=r.items.find(x=>x.id===iid),c=Number(document.getElementById('wo-cost').value||0),py=document.getElementById('wo-payer').value,ts=py==='分摊'?+(c/2).toFixed(2):(py==='租客'?c:0);p.workOrders.push({id:uid('w'),date:today(),itemName:r.name+'·'+it.name,desc:document.getElementById('wo-desc').value,cost:c,payer:py,tenantShare:ts,status:'待维修'});it.status='待维修';save().then(()=>{closeModal();renderProp()})">保存工单</button>`); }
function openRenoModal(pid) { openModal('🔨 装修改造', `<input id="rn-c" class="inp" placeholder="装修内容"><input type="number" id="rn-cost" class="inp" placeholder="费用"><button class="btn bp blk" onclick="const p=STATE.properties.find(x=>x.id==='${pid}');p.renovations.push({id:uid('rn'),date:today(),content:document.getElementById('rn-c').value,cost:Number(document.getElementById('rn-cost').value||0)});save().then(()=>{closeModal();renderProp()})">保存</button>`); }

function openShareGen(pid) {
  openModal('🖼️ 生成微信分享单（已严格过滤私人备注）', `<select id="sg-type" class="inp" onchange="updShare('${pid}')"><option value="intro">🏠 房源对外介绍单</option><option value="checkin">🔑 入住交接确认单</option><option value="bills">📑 租客待缴账单明细</option><option value="checkout">📦 退房押金结算单</option></select><div id="sg-preview-card" class="ssheet"></div><div style="font-size:12px;color:var(--g6);margin-top:8px;text-align:center">提示：直接手机截屏此卡片即可发给租客或中介</div>`);
  updShare(pid);
}
function updShare(pid) {
  const p = STATE.properties.find(x => x.id === pid), t = document.getElementById('sg-type').value; let b = '';
  if (t === 'intro') b = `<b>🏠 房源介绍 · ${esc(p.name)}</b><p>${esc(p.address)} · ${esc(p.layout)} ${p.area ? p.area + '㎡' : ''}</p><p>${esc(p.publicIntro || '全屋配置齐全，拎包入住')}</p>`;
  else if (t === 'checkin' && p.currentLease) b = `<b>🔑 入住确认单 · ${esc(p.name)}</b><p>租客：${esc(p.currentLease.tenantName)} · 租期：${p.currentLease.startDate}~${p.currentLease.endDate}</p><p>初始表底：电${p.currentLease.metersIn?.elec} / 水${p.currentLease.metersIn?.water} / 气${p.currentLease.metersIn?.gas}</p>`;
  else if (t === 'bills') b = `<b>📑 账单明细 · ${esc(p.name)}</b>` + (p.bills || []).filter(x => !x.voided).map(x => `<div>• ${esc(x.title)}：待缴 ¥${Math.max(0, x.amount - x.paidAmount)}</div>`).join('');
  else if (t === 'checkout') { const s = (p.depositSettlements || []).slice(-1)[0]; b = s ? `<b>📦 退房结算单 · ${esc(p.name)}</b><p>已收押金 ¥${s.paidDeposit} ｜ 末期水电 ¥${s.finalUtilityFee} ｜ 扣款 ¥${s.repairDeduct}</p><b>${s.netAmount >= 0 ? '✅ 应退租客：¥' + s.netAmount : '⚠️ 租客应补：¥' + Math.abs(s.netAmount)}</b>` : '暂无退房结算单'; }
  document.getElementById('sg-preview-card').innerHTML = b + `<div style="font-size:11px;color:var(--g6);margin-top:8px;border-top:1px dashed #cbd5e1;padding-top:4px">生成时间：${nowDT()}</div>`;
}

// 12个月双色可视化收支看板、师傅库、备份与原生通知测试
function renderStatsView() {
  VIEW = { name: 'stats' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '📊 收支可视化看板'; setNav('nav-stats');
  const yr = today().slice(0, 4);
  const mIn = Array(12).fill(0), mOut = Array(12).fill(0);
  STATE.properties.forEach(p => {
    (p.payments || []).forEach(x => { if ((x.date || '').startsWith(yr)) mIn[Number(x.date.slice(5, 7)) - 1] += Number(x.amount || 0); });
    (p.workOrders || []).forEach(x => { if ((x.date || '').startsWith(yr)) mOut[Number(x.date.slice(5, 7)) - 1] += Math.max(0, x.cost - x.tenantShare); });
    (p.renovations || []).forEach(x => { if ((x.date || '').startsWith(yr)) mOut[Number(x.date.slice(5, 7)) - 1] += Number(x.cost || 0); });
    (p.landlordExpenses || []).forEach(x => { if ((x.date || '').startsWith(yr)) mOut[Number(x.date.slice(5, 7)) - 1] += Number(x.amount || 0); });
  });
  const maxV = Math.max(100, ...mIn, ...mOut);
  const bars = mIn.map((v, i) => `<div class="bcol"><div class="bpair"><div class="bar-in" style="height:${Math.round(v / maxV * 95)}px"></div><div class="bar-out" style="height:${Math.round(mOut[i] / maxV * 95)}px"></div></div><span>${i + 1}月</span></div>`).join('');
  const rows = STATE.properties.map(p => {
    const inc = (p.payments || []).filter(x => x.date.startsWith(yr)).reduce((s, x) => s + x.amount, 0) - (p.depositSettlements || []).filter(x => x.date.startsWith(yr) && x.netAmount > 0).reduce((s, x) => s + x.netAmount, 0);
    const exp = (p.workOrders || []).filter(x => x.date.startsWith(yr)).reduce((s, x) => s + Math.max(0, x.cost - x.tenantShare), 0) + (p.renovations || []).filter(x => x.date.startsWith(yr)).reduce((s, x) => s + x.cost, 0) + (p.landlordExpenses || []).filter(x => x.date.startsWith(yr)).reduce((s, x) => s + x.amount, 0);
    return `<div class="irow"><b>${esc(p.name)}</b><span>净收¥${inc} · 支出¥${exp} · <b style="color:var(--s)">纯利¥${inc - exp}</b></span></div>`;
  }).join('');
  document.getElementById('main-content').innerHTML = `<div class="card"><div class="ct"><span>📊 ${yr} 年度月度收支趋势</span><small><span style="color:var(--s)">■</span>实收 <span style="color:var(--w)">■</span>支出</small></div><div class="bars">${bars}</div></div><div class="card"><div class="ct">🏠 各房源纯利润排行</div>${rows || '暂无数据'}</div>`;
}

function renderMastersView() {
  VIEW = { name: 'masters' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '👷 师傅通讯录'; setNav('nav-masters');
  document.getElementById('main-content').innerHTML = `<div style="text-align:right;margin-bottom:8px"><button class="btn bp bsm" onclick="openModal('＋ 添加合作师傅','<input id=mc class=inp placeholder=工种（如水电/家电/开锁）><input id=mn class=inp placeholder=师傅姓名><input id=mp class=inp placeholder=联系电话><input id=mnt class=inp placeholder=备注><button class=\\'btn bp blk\\' onclick=\\'STATE.masters.push({id:uid(),category:document.getElementById(\"mc\").value||\"综合\",name:document.getElementById(\"mn\").value,phone:document.getElementById(\"mp\").value,note:document.getElementById(\"mnt\").value});save().then(()=>{closeModal();renderMastersView()})\\'>保存</button>')">＋ 添加师傅</button></div>` + (STATE.masters || []).map(m => `<div class="card"><div class="ct"><span>👷 ${esc(m.name)} <span class="pill p-va">${esc(m.category)}</span></span><a class="btn bs bsm" href="tel:${esc(m.phone)}">📞 拨打</a></div><small style="color:var(--g6)">${esc(m.phone)} · ${esc(m.note || '')}</small></div>`).join('');
}

function renderBackupView() {
  VIEW = { name: 'backup' }; document.getElementById('btn-back').classList.add('hidden'); document.getElementById('hdr-title').textContent = '💾 备份与系统提醒设置'; setNav('nav-backup');
  document.getElementById('main-content').innerHTML = `<div class="card"><div class="ct">数据全量备份（上次：${STATE.lastBackupAt || '从未'}）</div><div class="row2"><button class="btn bp" onclick="exportBk()">📤 一键导出全量备份</button><label class="btn bo" style="text-align:center">📥 恢复备份<input type="file" accept=".json" style="display:none" onchange="restBk(this)"></label></div></div>
  <div class="card"><div class="ct">⏰ 安卓系统通知栏定时提醒</div><div class="row2"><div><small>合同提前提醒(天)</small><input type="number" id="sc-d" class="inp" value="${STATE.settings.contractRemindDays}"></div><div><small>账单提前提醒(天)</small><input type="number" id="sr-d" class="inp" value="${STATE.settings.rentRemindDays}"></div></div><small>每日锁屏推送时间</small><input type="time" id="st-t" class="inp" value="${STATE.settings.dailyNotifyTime}"><div class="row2"><button class="btn bs" onclick="STATE.settings={contractRemindDays:Number(document.getElementById('sc-d').value),rentRemindDays:Number(document.getElementById('sr-d').value),dailyNotifyTime:document.getElementById('st-t').value};save().then(()=>toast('提醒已生效'))">保存设置</button><button class="btn bo" onclick="testPushNow()">🔔 立即测试手机弹窗</button></div></div>`;
}
async function testPushNow() {
  try {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LN) return toast('当前在网页预览模式，装入安卓手机后可弹出系统通知');
    await LN.requestPermissions();
    await LN.schedule({ notifications: [{ id: 9999, title: '🏠 房源管理提醒测试成功', body: `当前共有 ${computeTodos().length} 项待办，每日 ${STATE.settings.dailyNotifyTime} 将自动提醒您。`, schedule: { at: new Date(Date.now() + 1500) } }] });
    toast('1.5秒后将弹出手机系统通知');
  } catch (e) { toast('通知权限未开启：' + e.message); }
}
async function exportBk() { STATE.lastBackupAt = today(); await save(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(STATE)], { type: 'application/json' })); a.download = `房源管理满血备份_${today()}.json`; a.click(); renderBackupView(); }
function restBk(inp) { if (!inp.files?.[0]) return; const r = new FileReader(); r.onload = async () => { STATE = JSON.parse(r.result); await save(); goHome(); toast('全量数据已恢复'); }; r.readAsText(inp.files[0]); }
function openDocTesterModal() { openModal('📎 离线文档与苹果 HEIC 预览', `<input type="file" id="standalone-file-input" class="inp" onchange="handleTestF(this)">`); }
async function handleTestF(inp) { if (!inp.files?.[0]) return; const m = await processUploadedFile(inp.files[0]); window.__lastTestedMedia = m; await openAttachmentViewer(m); }
function openModal(t, b) { document.getElementById('modal-panel').innerHTML = `<div class="modal-header" style="display:flex;justify-content:space-between;margin-bottom:10px"><b>${esc(t)}</b><button class="btn bo bsm" onclick="closeModal()">✕</button></div>${b}`; document.getElementById('modal-backdrop').classList.add('open'); }
function closeModal() { document.getElementById('modal-backdrop').classList.remove('open'); }

loadState().then(() => { renderHome(); scheduleNotify(); });
