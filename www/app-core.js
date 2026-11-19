const IDB_NAME = 'FangYuanProDB', IDB_STORE = 'kv', DB_KEY = 'FY_APP_V5_CLOUD';
const TPL = {
  '客厅': ['防盗门锁', '客厅空调', '沙发', '茶几', '电视', '窗帘', '照明插座', '墙面地板'],
  '卧室': ['卧室门锁', '卧室空调', '床及床垫', '衣柜', '书桌椅', '窗帘', '照明插座', '墙面地板'],
  '厨房': ['燃气灶', '抽油烟机', '热水器', '冰箱', '橱柜台面', '水槽龙头', '燃气表阀门'],
  '卫生间': ['马桶', '淋浴花洒', '浴室柜洗手盆', '浴霸排风扇', '洗衣机', '地漏下水'],
  '整套': ['水电总闸', '钥匙门禁卡', '网络光猫', '阳台晾衣架', '窗户纱窗']
};

let STATE = {
  lastBackupAt: null,
  cloud: { ...window.DEFAULT_CLOUD_CFG },
  settings: { contractRemindDays: 30, rentRemindDays: 5, dailyNotifyTime: '09:00' },
  properties: [],
  masters: [{ id: 'm1', category: '水电综合', name: '王师傅维修', phone: '13900001111', note: '随叫随到，支持微信拍照回单' }]
};
let VIEW = { name: 'home', propId: null, tab: 'rooms' };

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function loadState() {
  try {
    const db = await openIDB();
    const val = await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const r = tx.objectStore(IDB_STORE).get(DB_KEY);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    if (val) { STATE = val; STATE.cloud = { ...window.DEFAULT_CLOUD_CFG, ...(STATE.cloud || {}) }; return; }
  } catch (e) { }
}
async function save() {
  try {
    const db = await openIDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(STATE, DB_KEY);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  } catch (e) { toast('存储异常：' + e.message); }
  scheduleNotify();
}

const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const nowDT = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const esc = s => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function toast(m) { const e = document.getElementById('toast'); e.textContent = m; e.style.display = 'block'; clearTimeout(window._tt); window._tt = setTimeout(() => e.style.display = 'none', 2400); }
function addMonths(ds, m) { const [y, mo, d] = ds.split('-').map(Number), dt = new Date(y, mo - 1 + m, d); if (dt.getDate() !== d) dt.setDate(0); const p = n => String(n).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; }
function addDays(ds, days) { const [y, m, d] = ds.split('-').map(Number), dt = new Date(y, m - 1, d + days), p = n => String(n).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; }

async function pushWorkOrderToCloud(prop, wo) {
  const c = STATE.cloud; if (!c?.url || !c?.key) return false;
  try {
    const payload = {
      id: wo.id, prop_name: prop.name, prop_address: prop.address || '联系房东获取详细门牌',
      item_name: wo.itemName, issue_desc: wo.desc, before_photo: wo.beforePhoto || '',
      master_name: wo.masterName || '', master_phone: wo.masterPhone || '',
      payer: wo.payer || '房东', status: wo.status || '待接单', updated_at: new Date().toISOString()
    };
    const r = await fetch(`${c.url}/rest/v1/work_orders_cloud?on_conflict=id`, {
      method: 'POST',
      headers: { 'apikey': c.key, 'Authorization': 'Bearer ' + c.key, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload)
    });
    return r.ok;
  } catch (e) { return false; }
}

async function syncCloudWorkOrders(manual = false) {
  const c = STATE.cloud; if (!c?.url || !c?.key) return;
  try {
    const r = await fetch(`${c.url}/rest/v1/work_orders_cloud?select=*`, { headers: { 'apikey': c.key, 'Authorization': 'Bearer ' + c.key } });
    if (!r.ok) return;
    const rows = await r.json();
    let updatedCount = 0;
    for (const row of rows) {
      let targetProp = STATE.properties.find(p => p.name === row.prop_name) || STATE.properties[0];
      if (!targetProp) continue;
      targetProp.workOrders = targetProp.workOrders || [];
      let wo = targetProp.workOrders.find(w => w.id === row.id);
      if (!wo && row.status === '住户报修待审') {
        wo = {
          id: row.id, date: today(), itemName: row.item_name || '住户报修', desc: row.issue_desc || '',
          cost: 0, payer: '房东', tenantShare: 0, status: '住户报修待审',
          masterName: '', masterPhone: '', beforePhoto: row.before_photo || '', afterPhoto: ''
        };
        targetProp.workOrders.unshift(wo);
        updatedCount++;
        triggerInstantAlert('🟣 收到住户新报修申请！', `${targetProp.name} · ${wo.itemName}：${wo.desc}`);
      } else if (wo && (wo.status !== row.status || Number(row.quote_cost || 0) !== Number(wo.cost || 0) || (row.after_photo && !wo.afterPhoto))) {
        const prevStatus = wo.status;
        wo.status = row.status;
        if (Number(row.quote_cost) > 0) {
          wo.cost = Number(row.quote_cost);
          wo.tenantShare = wo.payer === '分摊' ? +(wo.cost / 2).toFixed(2) : (wo.payer === '租客' ? wo.cost : 0);
        }
        if (row.after_photo) wo.afterPhoto = row.after_photo;
        if (row.master_note) wo.masterNote = row.master_note;
        if (row.status === '已完工待验收' && prevStatus !== '已完工待验收') {
          updatedCount++;
          triggerInstantAlert('🔔 师傅已提交完工验收！', `${targetProp.name} · ${wo.itemName} 维修完成，报价 ¥${wo.cost}`);
        }
      }
    }
    if (updatedCount > 0) {
      await save();
      if (VIEW.name === 'detail') renderProp(); else if (VIEW.name === 'home') renderHome();
    } else if (manual) toast('☁️ 云端工单已同步（暂无新消息）');
  } catch (e) { if (manual) toast('云端连接检查中'); }
}

async function triggerInstantAlert(title, body) {
  toast(title + ' ' + body);
  try {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (LN) await LN.schedule({ notifications: [{ id: Math.floor(Math.random() * 80000) + 2000, title, body, schedule: { at: new Date(Date.now() + 500) } }] });
  } catch (e) { }
}

const readDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('读取失败')); r.readAsDataURL(b); });
const findSOI = (b, o = 0) => { for (let i = o; i < b.length - 2; i++) if (b[i] === 0xFF && b[i + 1] === 0xD8 && b[i + 2] === 0xFF) return i; return -1; };
function compressImg(blob, max = 1200, q = 0.8) {
  return new Promise(async (res, rej) => {
    try {
      const u = await readDataUrl(blob), im = new Image();
      im.onload = () => {
        if (!im.width) return rej(new Error('尺寸为0'));
        let w = im.width, h = im.height;
        if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); res(c.toDataURL('image/jpeg', q));
      };
      im.onerror = () => rej(new Error('像素损坏')); im.src = u;
    } catch (e) { rej(e); }
  });
}
async function processUploadedFile(file) {
  const name = file.name || '文件', ext = name.toLowerCase().split('.').pop();
  if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) return { id: uid('m'), name, kind: 'video', mime: file.type || 'video/mp4', dataUrl: await readDataUrl(file), status: 'ok' };
  if (['pdf', 'docx', 'xlsx', 'xls', 'csv', 'txt'].includes(ext)) return { id: uid('d'), name, kind: 'doc', ext, mime: file.type || 'application/octet-stream', dataUrl: await readDataUrl(file), status: 'ok' };
  try {
    let blob = file, heic = false;
    const hdr = String.fromCharCode(...new Uint8Array(await file.slice(0, 24).arrayBuffer()));
    if (['heic', 'heif'].includes(ext) || hdr.includes('ftypheic') || hdr.includes('ftypmif1')) {
      heic = true;
      if (typeof window.heic2any === 'function') {
        try { const o = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 }); blob = Array.isArray(o) ? o[0] : o; }
        catch (e) { const fb = new Uint8Array(await file.arrayBuffer()), s = findSOI(fb, 12); if (s > 0) blob = new Blob([fb.slice(s)], { type: 'image/jpeg' }); else throw e; }
      } else { const fb = new Uint8Array(await file.arrayBuffer()), s = findSOI(fb, 12); if (s > 0) blob = new Blob([fb.slice(s)], { type: 'image/jpeg' }); else throw new Error('HEIC未就绪'); }
    }
    return { id: uid('i'), name: heic ? name.replace(/\.(heic|heif)$/i, '.jpg') : name, kind: 'image', mime: 'image/jpeg', dataUrl: await compressImg(blob), convertedFromHeic: heic, status: 'ok' };
  } catch (err) {
    return { id: uid('i'), name, kind: 'image', mime: 'image/jpeg', dataUrl: '', status: 'broken', errorReason: `无法解码（${name}）` };
  }
}
async function openAttachmentViewer(m) {
  if (!m || m.status === 'broken') return openModal('⚠️ 无法显示', `<div class="card" style="background:var(--db);color:var(--d)">${esc(m?.errorReason || '文件损坏')}</div>`);
  if (m.kind === 'image') return openModal(m.name, `<img src="${m.dataUrl}" style="max-width:100%;border-radius:9px">`);
  if (m.kind === 'video') { window._curM = m; return openModal(m.name, `<video src="${m.dataUrl}" controls style="width:100%;border-radius:9px"></video><button class="btn bo blk" style="margin-top:8px" onclick="openExt()">📤 导出</button>`); }
  window._curM = m; openModal('📄 ' + m.name, `<div id="doc-render-area" class="docbox">离线解析中...</div><button class="btn bp blk" style="margin-top:10px" onclick="openExt()">📤 用其他软件打开</button>`);
  const area = document.getElementById('doc-render-area'), bin = atob(m.dataUrl.split(',')[1]), ab = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) ab[i] = bin.charCodeAt(i);
  const ext = (m.ext || m.name.split('.').pop()).toLowerCase();
  try {
    if (ext === 'txt' || ext === 'csv') { const t = new TextDecoder().decode(ab); area.innerHTML = ext === 'csv' ? '<table>' + t.trim().split(/\r?\n/).map((r, i) => '<tr>' + r.split(',').map(c => i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('') + '</tr>').join('') + '</table>' : `<pre style="white-space:pre-wrap">${esc(t)}</pre>`; }
    else if (ext === 'xlsx' || ext === 'xls') { const wb = window.XLSX.read(ab.buffer, { type: 'array' }); area.innerHTML = wb.SheetNames.map(n => `<b>${esc(n)}</b>` + window.XLSX.utils.sheet_to_html(wb.Sheets[n])).join(''); }
    else if (ext === 'docx') { const r = await window.mammoth.convertToHtml({ arrayBuffer: ab.buffer }); area.innerHTML = r.value; }
    else if (ext === 'pdf') {
      if (window.__PDF_WORKER_B64__ && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([atob(window.__PDF_WORKER_B64__)], { type: 'application/javascript' }));
      const pdf = await window.pdfjsLib.getDocument({ data: ab.buffer }).promise; let cp = 1, tp = pdf.numPages;
      area.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><button class="btn bo bsm" id="pdf-prev">上一页</button><span id="pdf-page-info">第 1 / ${tp} 页</span><button class="btn bo bsm" id="pdf-next">下一页</button></div><canvas id="pdf-c" style="max-width:100%;border:1px solid #cbd5e1"></canvas>`;
      const draw = async n => { const pg = await pdf.getPage(n), vp = pg.getViewport({ scale: 1.2 }), c = document.getElementById('pdf-c'); c.height = vp.height; c.width = vp.width; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; document.getElementById('pdf-page-info').textContent = `第 ${n} / ${tp} 页`; };
      document.getElementById('pdf-prev').onclick = () => { if (cp > 1) draw(--cp); }; document.getElementById('pdf-next').onclick = () => { if (cp < tp) draw(++cp); }; await draw(1);
    }
  } catch (e) { area.innerHTML = `<span style="color:var(--d)">解析失败：${esc(e.message)}</span>`; }
}
function openExt() { const m = window._curM; if (!m) return; const a = document.createElement('a'); a.href = m.dataUrl; a.download = m.name; a.click(); }

function genBills(prop, lease, fromD = null, keepPaid = true) {
  prop.bills = prop.bills || []; const cut = fromD || lease.startDate;
  if (keepPaid) prop.bills = prop.bills.filter(b => !(b.leaseId === lease.id && b.type === 'rent' && !b.voided && b.paidAmount === 0 && b.dueDate >= cut));
  else prop.bills = prop.bills.filter(b => !(b.leaseId === lease.id && b.type === 'rent'));
  if (!prop.bills.some(b => b.leaseId === lease.id && b.type === 'deposit' && !b.voided) && Number(lease.deposit) > 0)
    prop.bills.push({ id: uid('b'), leaseId: lease.id, tenantName: lease.tenantName, type: 'deposit', title: `租房押金（${lease.payType}）`, periodStart: lease.startDate, periodEnd: lease.endDate, dueDate: lease.startDate, amount: Number(lease.deposit), paidAmount: 0, voided: false });
  const step = { '押一付一': 1, '押一付三': 3, '押二付三': 3, '押一付六': 6, '押一付十二': 12 }[lease.payType] || 1;
  const mTot = Number(lease.rent || 0) + Number(lease.fixedFee || 0); let cur = lease.startDate, idx = 1;
  while (cur < lease.endDate && idx <= 120) {
    let nxt = addMonths(cur, step), am = step;
    if (nxt > lease.endDate) { am = +(Math.max(1, Math.round((new Date(lease.endDate) - new Date(cur)) / 86400000)) / 30).toFixed(2); nxt = lease.endDate; }
    const due = idx === 1 ? cur : addDays(cur, -Number(lease.advanceDays || 0));
    if ((due >= cut || !keepPaid) && !prop.bills.some(b => b.leaseId === lease.id && b.type === 'rent' && !b.voided && b.periodStart === cur))
      prop.bills.push({ id: uid('b'), leaseId: lease.id, tenantName: lease.tenantName, type: 'rent', title: `第${idx}期房租（${cur}~${nxt}）`, periodStart: cur, periodEnd: nxt, dueDate: due, amount: Math.round(mTot * am * 100) / 100, paidAmount: 0, voided: false });
    cur = nxt; idx++;
  }
  reallocPay(prop);
}
function reallocPay(prop) {
  prop.bills = (prop.bills || []); prop.payments = (prop.payments || []); prop.bills.forEach(b => b.paidAmount = 0);
  const act = prop.bills.filter(b => !b.voided).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  let rem = Math.round(prop.payments.reduce((s, p) => s + Number(p.amount || 0), 0) * 100) / 100;
  for (const b of act) { if (rem <= 0) break; const al = Math.min(b.amount, rem); b.paidAmount = Math.round(al * 100) / 100; rem = Math.round((rem - al) * 100) / 100; }
  prop.unallocatedCredit = rem;
}
function computeTodos() {
  const td = [], t = today(), tObj = new Date(t);
  STATE.properties.forEach(p => {
    (p.workOrders || []).filter(w => w.status === '住户报修待审').forEach(w => td.push({ badge: '🟣 住户报修待审', text: `${p.name} · ${w.itemName}：${w.desc}`, date: w.date, propId: p.id, tab: 'workorders' }));
    (p.workOrders || []).filter(w => w.status === '已完工待验收').forEach(w => td.push({ badge: '🟢 师傅已完工', text: `${p.name} · ${w.itemName} 报价¥${w.cost} 待验收`, date: w.date, propId: p.id, tab: 'workorders' }));
    (p.bills || []).filter(b => !b.voided && (b.amount - b.paidAmount) > 0.01).forEach(b => {
      const df = Math.ceil((new Date(b.dueDate) - tObj) / 86400000), up = (b.amount - b.paidAmount).toFixed(0);
      if (df < 0) td.push({ badge: '🔴 逾期账单', text: `${p.name} · ${b.title} 欠¥${up}`, date: b.dueDate, propId: p.id, tab: 'finance' });
      else if (df <= STATE.settings.rentRemindDays) td.push({ badge: '🔵 待收账单', text: `${p.name} · ${b.title} 应收¥${up}`, date: b.dueDate, propId: p.id, tab: 'finance' });
    });
    if (p.status === '已出租' && p.currentLease?.endDate) {
      const df = Math.ceil((new Date(p.currentLease.endDate) - tObj) / 86400000);
      if (df <= STATE.settings.contractRemindDays) td.push({ badge: '🟣 合同快到期', text: `${p.name}(${p.currentLease.tenantName}) 剩${df}天`, date: p.currentLease.endDate, propId: p.id, tab: 'lease' });
    }
    (p.workOrders || []).filter(w => w.status === '待接单' || w.status === '待维修').forEach(w => td.push({ badge: '🟠 维修中', text: `${p.name} · ${w.itemName}：${w.desc}`, date: w.date, propId: p.id, tab: 'workorders' }));
  });
  return td;
}
async function scheduleNotify() {
  try {
    const LN = window.Capacitor?.Plugins?.LocalNotifications; if (!LN) return;
    await LN.requestPermissions().catch(() => { }); await LN.cancel({ notifications: [{ id: 1001 }] }).catch(() => { });
    const tds = computeTodos(); if (!tds.length) return;
    const [h, m] = STATE.settings.dailyNotifyTime.split(':').map(Number);
    await LN.schedule({ notifications: [{ id: 1001, title: `🏠 今日房源待办 (${tds.length}项)`, body: tds.slice(0, 4).map(t => `${t.badge} ${t.text}`).join('\n'), schedule: { on: { hour: h, minute: m }, repeats: true } }] });
  } catch (e) { }
}
