const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='fpSaved'; const PAGE_SIZE_A4=10; const PAGE_SIZE_A5=6;
function pageItemSize(){return $('#paperSize')?.value==='A5'?PAGE_SIZE_A5:PAGE_SIZE_A4}
let savedCache=[];
const DB_NAME='FactorPlusDB', DB_VERSION=3, STORE='invoices', BACKUP_STORE='backups', SETTINGS_STORE='settings';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE)){const st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('date','date');st.createIndex('invoiceNo','invoiceNo');st.createIndex('customer','customer')}if(!db.objectStoreNames.contains(BACKUP_STORE)){db.createObjectStore(BACKUP_STORE,{keyPath:'createdAt'})}if(!db.objectStoreNames.contains(SETTINGS_STORE)){db.createObjectStore(SETTINGS_STORE,{keyPath:'key'})}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbAll(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function dbGet(id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function dbPut(x){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function dbPutBackup(x){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(BACKUP_STORE,'readwrite').objectStore(BACKUP_STORE).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function dbDeleteAll(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function dbSetSetting(key,value){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(SETTINGS_STORE,'readwrite').objectStore(SETTINGS_STORE).put({key,value});r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function dbGetSetting(key){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(SETTINGS_STORE,'readonly').objectStore(SETTINGS_STORE).get(key);r.onsuccess=()=>res(r.result?.value);r.onerror=()=>rej(r.error)})}
async function initSavedDB(){savedCache=await dbAll();if(!savedCache.length){try{const old=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(old)&&old.length){for(const x of old) await dbPut(x);savedCache=old;localStorage.removeItem(KEY)}}catch{}}}
let accent=localStorage.getItem('fpAccent')||'#2b7cff';
let items=(JSON.parse(localStorage.getItem('fpDraftItems')||'null')||[{name:'کالای جدید',qty:1,price:0}]).map(normalizeItem);
let editingId=localStorage.getItem('fpEditingId')||null; let template=loadTemplate();
function fa(n){return new Intl.NumberFormat('fa-IR').format(Number(n)||0)}
function unit(){return localStorage.getItem('fpCurrency')||'toman'} function money(n){return fa(n)+' '+(unit()==='rial'?'ریال':'تومان')}
function pad(n){return String(n).padStart(2,'0')}
function gregorianToJalali(gy,gm,gd){let gdm=[0,31,59,90,120,151,181,212,243,273,304,334],jy=gy<=1600?0:979;gy-=gy<=1600?621:1600;let gy2=gm>2?gy+1:gy;let days=365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)-80+gd+gdm[gm-1];jy+=33*Math.floor(days/12053);days%=12053;jy+=4*Math.floor(days/1461);days%=1461;if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365}let jm=days<186?1+Math.floor(days/31):7+Math.floor((days-186)/30),jd=1+(days<186?days%31:(days-186)%30);return[jy,jm,jd]}
function todayJalali(){let d=new Date(),j=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate());return `${j[0]}/${pad(j[1])}/${pad(j[2])}`}
function jalaliKey(s){let m=String(s||'').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);return m? +m[1]*10000 + +m[2]*100 + +m[3]:0}
function words(n){n=Math.round(Number(n)||0);if(!n)return unit()==='rial'?'صفر ریال':'صفر تومان';const o=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه','ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'],t=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'],h=['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];function u(x){let a=[];if(x>=100){a.push(h[Math.floor(x/100)]);x%=100}if(x>=20){a.push(t[Math.floor(x/10)]);x%=10;if(x)a.push(o[x])}else if(x)a.push(o[x]);return a.join(' و ')}let sc=['','هزار','میلیون','میلیارد','تریلیون'],p=[],i=0;while(n){let x=n%1000;if(x)p.unshift(u(x)+(sc[i]?' '+sc[i]:''));n=Math.floor(n/1000);i++}return p.join(' و ')+' '+(unit()==='rial'?'ریال':'تومان')}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function getCompany(){return localStorage.getItem('fpCompanyName')||'اسمارت دیاگ'} function getLogo(){return localStorage.getItem('fpLogo')||''}
function loadTemplate(){try{let t=JSON.parse(localStorage.getItem('fpTemplate'))||{};return Object.assign({header:'split',density:'normal',radius:14,sections:['header','customer','table','totals','footer'],hidden:[],headerItems:['brand','meta'],totalsItems:['left','right'],totalsAlign:'left'},t)}catch{return{header:'split',density:'normal',radius:14,sections:['header','customer','table','totals','footer'],hidden:[],headerItems:['brand','meta'],totalsItems:['left','right'],totalsAlign:'left'}}}
function saveTemplate(){localStorage.setItem('fpTemplate',JSON.stringify(template));}
function snapshot(){return{customer:$('#customer').value,phone:$('#phone').value,invoiceNo:$('#invoiceNo').value,date:$('#date').value,companyName:$('#companyName').value,currency:unit(),pageMode:$('#pageMode').value,paperSize:$('#paperSize').value,discount:Number($('#discount').value)||0,tax:Number($('#tax').value)||0,items,accent,logo:getLogo(),template}}
function persistDraft(){localStorage.setItem('fpDraft',JSON.stringify(snapshot()));localStorage.setItem('fpDraftItems',JSON.stringify(items))}
function syncAccentPicker(){const p=$('#accentColorPicker');const h=$('#accentHex');const d=$('#accentColorDot');if(p)p.value=(accent||'#2563EB').toLowerCase();if(h)h.textContent=(accent||'#2563EB').toUpperCase();if(d)d.style.background=accent||'#2563EB'}
function setDefaults(){let d=JSON.parse(localStorage.getItem('fpDraft')||'null');$('#date').value=d?.date||todayJalali();$('#invoiceNo').value=d?.invoiceNo||String(Math.floor(10000+Math.random()*89999));$('#customer').value=d?.customer||'';$('#phone').value=d?.phone||'';$('#companyName').value=d?.companyName||getCompany();$('#discount').value=d?.discount||0;$('#tax').value=d?.tax||0;$('#currencyUnit').value=d?.currency||unit();$('#pageMode').value=d?.pageMode||'next';$('#paperSize').value=d?.paperSize||'A4';if(d?.items?.length)items=d.items.map(normalizeItem);accent=d?.accent||accent;syncAccentPicker();if(d?.template){template=d.template;saveTemplate()}renderItems();$('#fontSelect').value=localStorage.getItem('fpFont')||'Noto';applyFont();renderLogoPreview();render();refreshAll();updateStatus();runWeeklyBackup()}
function normalizeItem(x){x=x||{};const qty=Number(x.qty)||0, price=Number(x.price)||0;let totalMode=!!x.totalMode;let totalPrice=Number(x.totalPrice);if(!Number.isFinite(totalPrice)) totalPrice=qty*price;return {name:x.name??'کالای جدید',qty,price:totalMode?(qty?totalPrice/qty:0):price,totalMode,totalPrice:totalMode?totalPrice:undefined}}
function itemDisplayPrice(x){return x.totalMode?(Number(x.totalPrice)||0):(Number(x.price)||0)}
function renderItems(){
  items=items.map(normalizeItem);
  let box=$('#items');
  box.innerHTML=items.map((x,i)=>{const totalMode=!!x.totalMode;return `<div class="item" draggable="true" data-drag="${i}">
    <div class="drag-handle" title="جابجایی">⠿</div>
    <label class="desc">شرح کالا/خدمت<input data-i="${i}" data-k="name" value="${esc(x.name)}"></label>
    <label>تعداد<input type="number" min="0" step="any" data-i="${i}" data-k="qty" value="${x.qty}"></label>
    <label><span class="price-label">${totalMode?'قیمت کل':'قیمت واحد'} <span class="total-mode-wrap"><input class="total-mode" type="checkbox" data-total-mode="${i}" ${totalMode?'checked':''} title="این مبلغ، قیمت کل این ردیف است"><span>کل</span></span></span><input type="number" min="0" step="1" data-i="${i}" data-k="price" value="${itemDisplayPrice(x)}"></label>
    <div class="move-actions"><button class="move" data-up="${i}">↑</button><button class="move" data-down="${i}">↓</button><button class="remove" data-remove="${i}">×</button></div>
  </div>`}).join('');
  $$('#items input[data-k]').forEach(el=>el.addEventListener('input',()=>{
    const i=+el.dataset.i,k=el.dataset.k,x=items[i];
    if(!x)return;
    if(k==='name') x.name=el.value;
    else if(k==='qty'){
      x.qty=Number(el.value)||0;
      if(x.totalMode){x.price=x.qty?(Number(x.totalPrice)||0)/x.qty:0;const p=el.closest('.item')?.querySelector('input[data-k=price]');if(p)p.value=Number(x.totalPrice)||0}
      else x.price=Number(x.price)||0;
    }else if(k==='price'){
      const v=Number(el.value)||0;
      if(x.totalMode){x.totalPrice=v;x.price=x.qty?v/x.qty:0}else{x.price=v}
    }
    persistDraft();markChanged();render();
  }));
  $$('[data-total-mode]').forEach(b=>b.onchange=()=>{
    const i=+b.dataset.totalMode,x=items[i];if(!x)return;
    if(b.checked){x.totalMode=true;x.totalPrice=(Number(x.qty)||0)*(Number(x.price)||0)}
    else{x.totalMode=false;x.price=x.qty?(Number(x.totalPrice)||0)/x.qty:(Number(x.price)||0);delete x.totalPrice}
    renderItems();persistDraft();markChanged();render();
    requestAnimationFrame(()=>$('#items .item')[i]?.querySelector('input[data-k=price]')?.focus());
  });
  $$('[data-remove]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.remove,1);if(!items.length)items=[{name:'کالای جدید',qty:1,price:0,totalMode:false}];renderItems();persistDraft();markChanged();render()});
  $$('[data-up]').forEach(b=>b.onclick=()=>moveItem(+b.dataset.up,-1));$$('[data-down]').forEach(b=>b.onclick=()=>moveItem(+b.dataset.down,1));
  $$('.item').forEach(row=>{row.ondragstart=e=>{e.dataTransfer.setData('text/plain',row.dataset.drag);row.classList.add('dragging')};row.ondragend=()=>row.classList.remove('dragging');row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();let from=+e.dataTransfer.getData('text/plain'),to=+row.dataset.drag;if(from!==to){let[x]=items.splice(from,1);items.splice(to,0,x);renderItems();persistDraft();markChanged();render()}}});
  $$('#items input[data-k=price]').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addItem(true)}}));
}
function moveItem(i,d){let j=i+d;if(j<0||j>=items.length)return;[items[i],items[j]]=[items[j],items[i]];renderItems();persistDraft();markChanged();render()}
function addItem(focusDescription=false){items.push({name:'کالای جدید',qty:1,price:0,totalMode:false});renderItems();persistDraft();markChanged();render();requestAnimationFrame(()=>{let row=$('#items .item:last-child');let e=row?.querySelector(focusDescription?'input[data-k=name]':'input[data-k=name]');e?.focus();e?.select()})}
function fontFamilyFor(v){return ({Noto:'Noto',Vazir:'Vazir',Lalezar:'Lalezar',Dirooz:'Dirooz',IRANSans:'IRANSans',BZiba:'BZiba',Tahoma:'Tahoma',Arial:'Arial',system:'system-ui',custom:'FP_Custom'})[v]||'Noto'}
function applyFont(){let v=localStorage.getItem('fpFont')||'Noto',custom=localStorage.getItem('fpCustomFont'),family=v==='custom'&&custom?'FP_Custom':fontFamilyFor(v);document.documentElement.style.setProperty('--invoice-font',family);let st=$('#customFontStyle')||document.createElement('style');st.id='customFontStyle';let css='';if(v==='custom'&&custom)css+=`@font-face{font-family:FP_Custom;src:url(${custom});font-display:swap}`;const bd=localStorage.getItem('fpBuiltinFontData_'+v);if(bd&&BUILTIN_FONT_URLS[v]){const fmt=v==='Dirooz'?'woff':'woff2';css+=`@font-face{font-family:${family};src:url(${bd}) format('${fmt}');font-weight:100 900;font-style:normal;font-display:swap}`;}st.textContent=css;if(css&&!st.parentNode)document.head.appendChild(st);if(!css&&st.parentNode)st.remove()}
const BUILTIN_FONT_URLS={
  Vazir:'https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v29.1.0/dist/Vazir-Regular.woff2',
  Lalezar:'https://cdn.jsdelivr.net/gh/BornaIz/Lalezar/master/fonts/webfonts/Lalezar-Regular.woff2',
  Dirooz:'https://raw.githubusercontent.com/githubber/dirooz-font/master/dist/Dirooz.woff'
};
function exportFontInfo(){const v=localStorage.getItem('fpFont')||'Noto',custom=localStorage.getItem('fpCustomFont'),builtin=localStorage.getItem('fpBuiltinFontData_'+v);return {key:v,family:v==='custom'&&custom?'FP_Custom':fontFamilyFor(v),dataUrl:v==='custom'&&custom?custom:(builtin||null),format:v==='custom'&&custom&&String(custom).includes('font/otf')?'opentype':(builtin&&v==='Dirooz'?'woff':(builtin?'woff2':'truetype'))}}
function escCssUrl(v){return String(v||'').replace(/([\"'])/g,'\\$1')}
async function loadBuiltinFont(v){if(!BUILTIN_FONT_URLS[v])return;const key='fpBuiltinFontData_'+v;if(localStorage.getItem(key))return;try{const r=await fetch(BUILTIN_FONT_URLS[v],{mode:'cors'});if(!r.ok)throw new Error('font fetch '+r.status);const b=new Uint8Array(await r.arrayBuffer());let bin='';for(let i=0;i<b.length;i+=0x8000)bin+=String.fromCharCode(...b.subarray(i,i+0x8000));const mime=v==='Dirooz'?'font/woff':'font/woff2';localStorage.setItem(key,`data:${mime};base64,${btoa(bin)}`)}catch(e){console.warn('Builtin font unavailable:',v,e)}}
async function ensureExportFont(){const v=localStorage.getItem('fpFont')||'Noto';await loadBuiltinFont(v);const f=exportFontInfo();try{if(document.fonts&&f.family)await document.fonts.load(`16px "${f.family}"`)}catch(e){}return f}
function renderLogoPreview(){let b=$('#logoPreview'),l=getLogo();if(!l){b.classList.add('hidden');b.innerHTML='';return}b.classList.remove('hidden');b.innerHTML=`<img src="${l}"><span>لوگو فعال است</span>`}
function calc(){let subtotal=items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0),discount=Math.min(Math.max(Number($('#discount').value)||0,0),subtotal),after=subtotal-discount,tax=Number($('#tax').value)||0,taxAmt=after*tax/100;return{subtotal,discount,tax,taxAmt,total:after+taxAmt}}
function invoicePage(rows,p,totalPages){
  let c=$('#customer').value||'مشتری',phone=$('#phone').value||'—',no=$('#invoiceNo').value||'—',date=$('#date').value||'—',
      company=($('#companyName').value||getCompany()).trim()||'اسمارت دیاگ',logo=getLogo(),z=calc();
  let show=s=>!template.hidden.includes(s);
  const headerParts={
    brand: `<div class="inv-brand-block hdr-brand">${logo?`<img class="inv-logo" src="${logo}">`:''}<div><div class="inv-brand">فاکتور فروش</div><div class="inv-company">${esc(company)}</div></div></div>`,
    meta: `<div class="muted hdr-meta">شماره فاکتور: ${fa(no)}<br>تاریخ: ${esc(date)}<br>صفحه ${fa(p)} از ${fa(totalPages)}</div>`
  };
  const headerOrder=(template.headerItems||['brand','meta']).filter(k=>headerParts[k]);
  const headerInner=headerOrder.map(k=>headerParts[k]).join('');
  const blocks={
    header: show('header') ? `<section class="tpl-section tpl-header ${template.header}" data-tpl="header"><div class="inv-head">${headerInner}</div></section>` : '',
    customer: show('customer') ? `<section class="tpl-section" data-tpl="customer"><div class="inv-info"><div><b>مشخصات مشتری</b><br>${esc(c)}<br>${esc(phone)}</div><div><b>فروشنده</b><br>${esc(company)}</div></div></section>` : '',
    table: show('table') ? `<section class="tpl-section" data-tpl="table"><table class="inv-table density-${template.density}"><thead><tr><th>ردیف</th><th>شرح کالا / خدمت</th><th>تعداد</th><th>قیمت واحد</th><th>مبلغ کل</th></tr></thead><tbody>${rows.map((x,k)=>`<tr><td>${fa((p-1)*pageItemSize()+k+1)}</td><td>${esc(x.name)}</td><td>${fa(x.qty)}</td><td>${money(x.price)}</td><td>${money((x.qty||0)*(x.price||0))}</td></tr>`).join('')}</tbody></table></section>` : '',
    totals: (p===totalPages&&show('totals')) ? `<section class="tpl-section" data-tpl="totals"><div class="totals totals-${template.totalsAlign||'left'}"><div class="total-row"><span>جمع کالاها</span><b>${money(z.subtotal)}</b></div><div class="total-row"><span>تخفیف</span><b>${money(z.discount)}</b></div><div class="total-row"><span>مالیات (${fa(z.tax)}٪)</span><b>${money(z.taxAmt)}</b></div><div class="total-row grand"><span>مبلغ نهایی</span><b>${money(z.total)}</b></div><div class="amount-word">به حروف: ${words(z.total)}</div></div></section>` : '',
    footer: show('footer') ? `<section class="tpl-section" data-tpl="footer"><div class="inv-foot"><span>${esc(company)}</span><span>مهر و امضا</span></div></section>` : ''
  };
  const ordered=(template.sections||['header','customer','table','totals','footer']).map(k=>blocks[k]||'').join('');
  const sectionGap=Math.max(8,Math.min(22,24-(rows.length*1.35)));
  return `<article class="invoice-page" style="--r:${template.radius}px;--section-gap:${sectionGap}px"><div class="invoice-content">${ordered}</div></article>`;
}
function render(){
  let size=pageItemSize();
  let pages= $('#pageMode').value==='single'?1:Math.max(1,Math.ceil(items.length/size));
  let html='';
  for(let p=1;p<=pages;p++) html+=invoicePage($('#pageMode').value==='single'?items:items.slice((p-1)*size,p*size),p,pages);
  let box=$('#invoicePreview');
  box.innerHTML=`<div class="preview-stage">${html}</div>`;
  box.classList.toggle('a5',$('#paperSize').value==='A5');
  document.documentElement.style.setProperty('--accent',accent);
  fitPreview();
}
function fitPreview(){
  const box=$('#invoicePreview'), stage=box.querySelector('.preview-stage');
  const pages=[...box.querySelectorAll('.invoice-page')];
  if(!stage||!pages.length)return;
  const isA5=$('#paperSize').value==='A5';
  const baseW=isA5?560:794, baseH=isA5?792:1122;
  const available=Math.max(280,box.clientWidth-28);
  const targetW=Math.min(isA5?430:540, available);
  const scale=targetW/baseW;
  stage.style.width=targetW+'px';
  stage.style.minHeight=(pages.length*baseH*scale+(pages.length-1)*18)+'px';
  pages.forEach((p,i)=>{
    p.style.width=baseW+'px';
    p.style.minHeight=baseH+'px';
    p.style.transform=`scale(${scale})`;
    p.style.transformOrigin='top center';
    p.style.marginBottom=`${-(baseH*(1-scale)-18)}px`;
  });
}
function showSection(n){$$('.page-section').forEach(s=>s.classList.add('hidden'));$('#'+n+'Section')?.classList.remove('hidden');$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.section===n));if(n==='saved')loadSaved();if(n==='customers')loadCustomers();if(n==='products')loadProducts();if(n==='reports')loadReports();if(n==='dashboard')loadDashboard();if(n==='invoice')setTimeout(fitPreview,30)}
function markChanged(){let s=$('#invoiceStatus');s.textContent=editingId?'تغییر یافته':'پیش‌نویس';s.className='status-pill changed';clearTimeout(window._saveTimer);window._saveTimer=setTimeout(persistDraft,250)}
async function saveInvoice(){let x={...snapshot(),id:editingId||crypto.randomUUID(),savedAt:Date.now(),status:'registered'};let idx=savedCache.findIndex(v=>v.id===x.id);await dbPut(x);if(idx>=0)savedCache[idx]=x;else savedCache.unshift(x);let nativeResult=await autoFolderSave(x);editingId=x.id;localStorage.setItem('fpEditingId',editingId);localStorage.removeItem('fpDraft');updateStatus('ثبت شده');refreshAll();loadSaved();loadCustomers();if(nativeResult?.ok&&window.desktopInfo?.isElectron){$('#folderStatus').textContent='JSON + PDF + تصویر در پوشه تاریخ ذخیره شد';}alert(idx>=0?'تغییرات فاکتور ثبت شد.':'فاکتور با موفقیت ثبت شد.')}
function updateStatus(force){let s=$('#invoiceStatus');if(!s)return;if(force){s.textContent=force;s.className='status-pill success';return}s.textContent=editingId?'ثبت شده':'پیش‌نویس';s.className='status-pill '+(editingId?'success':'')}
function newInvoice(){editingId=null;localStorage.removeItem('fpEditingId');items=[{name:'کالای جدید',qty:1,price:0,totalMode:false}];['customer','phone'].forEach(k=>$('#'+k).value='');$('#invoiceNo').value=String(Math.floor(10000+Math.random()*89999));$('#date').value=todayJalali();$('#discount').value=0;$('#tax').value=0;persistDraft();renderItems();render();updateStatus();showSection('invoice')}
async function loadInvoice(id){
  const key=String(id??'');
  let x=savedCache.find(v=>String(v.id)===key);
  if(!x){
    try{
      const all=await dbAll();
      x=all.find(v=>String(v.id)===key)||null;
      if(x&&!savedCache.some(v=>String(v.id)===key)) savedCache.unshift(x);
    }catch(e){console.error('db read failed',e)}
  }
  if(!x){alert('فاکتور پیدا نشد. فهرست فاکتورهای ذخیره‌شده با داده‌های فعلی مرورگر همخوانی ندارد.');return false;}
  try{
    editingId=x.id;
    localStorage.setItem('fpEditingId',String(editingId));
    items=(x.items||x.products||[]).map(normalizeItem);
    if(!items.length) items=[{name:'کالای جدید',qty:1,price:0,totalMode:false}];
    ['customer','phone','invoiceNo','date','companyName','discount','tax'].forEach(k=>{if($('#'+k)&&x[k]!=null)$('#'+k).value=x[k]});
    $('#currencyUnit').value=x.currency||'toman';
    $('#pageMode').value=x.pageMode||'next';
    $('#paperSize').value=x.paperSize||'A4';
    accent=x.accent||accent;
    syncAccentPicker();
    if(x.logo)localStorage.setItem('fpLogo',x.logo);else localStorage.removeItem('fpLogo');
    if(x.template){template=x.template;saveTemplate()}
    renderLogoPreview();
    renderItems();
    render();
    updateStatus('ثبت شده');
    showSection('invoice');
    window.scrollTo({top:0,behavior:'instant'});
    return true;
  }catch(err){
    console.error('loadInvoice failed',err,x);
    alert('فاکتور پیدا شد ولی هنگام باز کردن آن خطایی رخ داد.');
    return false;
  }
}
function loadSaved(){
  let a=[...savedCache],q=($('#savedSearch')?.value||'').trim().toLowerCase();
  if(q)a=a.filter(x=>String(x.customer).toLowerCase().includes(q)||String(x.invoiceNo).includes(q));
  let sort=$('#savedSort')?.value||'dateDesc';
  a.sort((x,y)=>sort==='dateAsc'?jalaliKey(x.date)-jalaliKey(y.date):sort==='noDesc'?Number(y.invoiceNo)-Number(x.invoiceNo):sort==='noAsc'?Number(x.invoiceNo)-Number(y.invoiceNo):sort==='customer'?String(x.customer).localeCompare(String(y.customer),'fa'):jalaliKey(y.date)-jalaliKey(x.date)||Number(y.invoiceNo)-Number(x.invoiceNo));
  const box=$('#savedList');
  box.innerHTML=a.length?a.map(x=>`<div class="saved-row clickable saved-invoice-row" data-load="${esc(x.id)}" role="button" tabindex="0"><span class="saved-invoice-main"><b>فاکتور ${fa(x.invoiceNo)}</b> — ${esc(x.customer||'بدون نام')} — ${esc(x.date||'')}</span><button class="soft" type="button" data-load-btn="${esc(x.id)}">باز کردن</button></div>`).join(''):'<div class="muted">هنوز فاکتوری ثبت نشده است.</div>';
}
window.openSavedInvoice=async id=>{const ok=await loadInvoice(id);if(ok)loadSaved();};
if(!window.__savedInvoiceClickBound){
  window.__savedInvoiceClickBound=true;
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#savedList [data-load-btn]');
    if(btn){e.preventDefault();e.stopPropagation();window.openSavedInvoice(btn.dataset.loadBtn);return;}
    const row=e.target.closest?.('#savedList [data-load]');
    if(row){e.preventDefault();e.stopPropagation();window.openSavedInvoice(row.dataset.load);}
  },true);
  document.addEventListener('keydown',e=>{
    const row=e.target.closest?.('#savedList [data-load]');
    if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();window.openSavedInvoice(row.dataset.load);}
  },true);
}

function loadCustomers(){let a=savedCache,m=new Map();a.forEach(x=>{let n=(x.customer||'').trim();if(n)m.set(n,(m.get(n)||0)+1)});let names=[...m.keys()].sort((x,y)=>x.localeCompare(y,'fa'));$('#customersList').innerHTML=names.length?names.map(n=>`<div class="saved-row customer-row clickable" data-customer="${esc(n)}"><span>👤 ${esc(n)}</span><span>${fa(m.get(n))} فاکتور</span></div>`).join(''):'<div class="muted">مشتری ذخیره‌شده‌ای ندارید.</div>';$$('[data-customer]').forEach(r=>r.onclick=()=>showCustomerInvoices(r.dataset.customer))}
function showCustomerInvoices(name){let a=savedCache.filter(x=>x.customer===name).sort((x,y)=>jalaliKey(y.date)-jalaliKey(x.date)||Number(y.invoiceNo)-Number(x.invoiceNo));$('#customerInvoicesTitle').textContent=`فاکتورهای ${name}`;$('#customerInvoicesList').innerHTML=a.map(x=>`<div class="saved-row"><span>فاکتور ${fa(x.invoiceNo)} — ${esc(x.date)} — ${money(x.items.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.price)||0),0))}</span><button class="soft" data-customer-load="${x.id}">جزئیات</button></div>`).join('')||'<div class="muted">فاکتوری پیدا نشد.</div>';$$('[data-customer-load]').forEach(b=>b.onclick=()=>loadInvoice(b.dataset.customerLoad));$('#customerInvoicesCard').classList.remove('hidden')}
function loadProducts(){let a=savedCache,m=new Map();a.flatMap(x=>x.items||[]).forEach(i=>m.set(i.name,(m.get(i.name)||0)+1));$('#productsList').innerHTML=m.size?[...m].map(([n,c])=>`<div class="saved-row"><span>${esc(n)}</span><span>${fa(c)} بار</span></div>`).join(''):'<div class="muted">هنوز موردی ثبت نشده است.</div>'}
function loadReports(){let a=savedCache,t=a.reduce((s,x)=>s+x.items.reduce((q,i)=>q+(Number(i.qty)||0)*(Number(i.price)||0),0),0);$('#reportCount').textContent=fa(a.length);$('#reportTotal').textContent=money(t)}
function loadDashboard(){let a=savedCache;$('#recentList').innerHTML=a.slice(0,6).map(x=>`<div class="saved-row"><span>فاکتور ${fa(x.invoiceNo)} — ${esc(x.customer||'بدون نام')} — ${esc(x.date||'')}</span><b>${money(x.items.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.price)||0),0))}</b></div>`).join('')||'<div class="muted">هنوز فاکتوری ثبت نشده است.</div>'}
function refreshAll(){let a=savedCache;$('#statInvoices').textContent=fa(a.length);$('#statCustomers').textContent=fa(new Set(a.map(x=>x.customer).filter(Boolean)).size);$('#statTotal').textContent=money(a.reduce((s,x)=>s+x.items.reduce((q,i)=>q+(Number(i.qty)||0)*(Number(i.price)||0),0),0));loadDashboard();loadReports()}
function exportPageSize(){return $('#paperSize').value==='A5'?{w:560,h:794}:{w:794,h:1123}}
function invoiceSvgPage(pg,pageIndex,totalPages,fontInfo,opts={}){
  const {w:W,h:baseH}=exportPageSize();
  const z=calc(); const a=accent||'#2b7cff'; const escSvg=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]));
  const c=$('#customer').value||'مشتری', phone=$('#phone').value||'—', no=$('#invoiceNo').value||'—', date=$('#date').value||'—', company=$('#companyName').value||getCompany(), logo=getLogo();
  const rows=[...pg.querySelectorAll('tbody tr')].map(r=>[...r.children].map(x=>x.textContent.trim()));
  const right=W-42,left=42; let parts=[];
  // Adaptive section spacing: roomy with few items, gradually tighter as rows increase.
  const n=rows.length;
  const gap=Math.max(8, Math.min(22, 24 - n*1.35));
  const customerTop=118+gap;
  const customerH=82;
  const tableTop=customerTop+customerH+gap;
  const wrapEstimate=value=>{const s=String(value??'').trim();if(!s)return 1;const words=s.split(/\s+/);let lines=0,line='';for(const w of words){if(w.length>30){if(line){lines++;line=''}lines+=Math.ceil(w.length/30);continue}const next=line?line+' '+w:w;if(next.length<=30)line=next;else{lines++;line=w}}if(line)lines++;return Math.max(1,lines)};
  const estimatedBodyH=rows.reduce((sum,r)=>{const lines=wrapEstimate(r[1],W<=600?24:30);return sum+Math.max(36,lines*15+16)+6},0);
  const H=opts.longImage?Math.max(baseH,tableTop+34+estimatedBodyH+220):baseH;
  // Clean export: no decorative top stripe that can look like an unwanted line in saved images.
  parts.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
  const ff=escSvg(fontInfo?.family||'Noto');
  const embedded=fontInfo?.dataUrl?`<style>@font-face{font-family:'${ff}';src:url(\'${escCssUrl(fontInfo.dataUrl)}\') format(\'${fontInfo.format||'truetype'}\');font-weight:100 900;font-style:normal;font-display:block}</style>`:'';
  parts.push(`${embedded}<g font-family="${ff},Noto,Tahoma,Arial,sans-serif" fill="#172033">`);
  if(logo){ const safeLogo=String(logo).replace(/&/g,"&amp;").replace(/"/g,"&quot;"); parts.push(`<image href="${safeLogo}" xlink:href="${safeLogo}" x="${right-58}" y="12" width="58" height="58" preserveAspectRatio="xMidYMid meet"/>`); }
  parts.push(`<text x="${right-(logo?72:0)}" y="82" text-anchor="end" font-size="27" font-weight="700">فاکتور فروش</text><text x="${right-(logo?72:0)}" y="106" text-anchor="end" font-size="13" fill="#64748b">${escSvg(company)}</text>`);
  parts.push(`<text x="${left}" y="58" text-anchor="start" font-size="11">شماره: ${escSvg(no)}</text><text x="${left}" y="78" text-anchor="start" font-size="11">تاریخ: ${escSvg(date)}</text><text x="${left}" y="98" text-anchor="start" font-size="11">صفحه ${fa(pageIndex)} از ${fa(totalPages)}</text>`);
  parts.push(`<rect x="${left}" y="${customerTop}" width="${W-84}" height="${customerH}" rx="10" fill="#f5f8ff" stroke="#dbe3ef"/>`);
  parts.push(`<text x="${right-14}" y="${customerTop+27}" text-anchor="end" font-size="13" font-weight="700">مشخصات مشتری</text><text x="${right-14}" y="${customerTop+50}" text-anchor="end" font-size="12">${escSvg(c)}</text><text x="${right-14}" y="${customerTop+69}" text-anchor="end" font-size="11" fill="#64748b">${escSvg(phone)}</text>`);
  parts.push(`<text x="${left+14}" y="${customerTop+27}" text-anchor="start" font-size="13" font-weight="700">فروشنده</text><text x="${left+14}" y="${customerTop+50}" text-anchor="start" font-size="12">${escSvg(company)}</text>`);
  let y=tableTop; parts.push(`<rect x="${left}" y="${y}" width="${W-84}" height="34" rx="6" fill="${a}"/>`);
  const xs=[W-58,W-190,W-390,W-500,W-700]; const heads=['ردیف','شرح کالا / خدمت','تعداد','قیمت واحد','مبلغ کل'];
  parts.push(`<g fill="#fff" font-size="11" font-weight="700">${heads.map((t,i)=>`<text x="${Math.min(xs[i],W-55)}" y="${y+22}" text-anchor="${i<2?"end":i===2?"middle":"middle"}">${t}</text>`).join('')}</g>`); y+=58;
  // Exported images/PDFs are rendered from SVG, so a normal SVG <text> does not wrap by itself.
  // Split long item descriptions into multiple tspans and grow that row accordingly.
  const wrapSvg=(value,maxChars)=>{const s=String(value??'').trim();if(!s)return [''];const words=s.split(/\s+/);const out=[];let line='';for(const w of words){if(w.length>maxChars){if(line){out.push(line);line=''}for(let i=0;i<w.length;i+=maxChars)out.push(w.slice(i,i+maxChars));continue}const next=line?line+' '+w:w;if(next.length<=maxChars)line=next;else{if(line)out.push(line);line=w}}if(line)out.push(line);return out.length?out:['']};
  rows.forEach((r,idx)=>{
    const nameLines=wrapSvg(r[1], W<=600?24:30);
    const rowH=Math.max(36, nameLines.length*15+16);
    const baseY=y+18;
    const cells=r.map((t,j)=>{
      const x=Math.min(xs[j]||W-55,W-55), anchor=j<2?'end':j===2?'middle':'middle';
      if(j!==1)return `<text x="${x}" y="${baseY}" text-anchor="${anchor}">${escSvg(t)}</text>`;
      return `<text x="${x}" y="${baseY}" text-anchor="${anchor}">${nameLines.map((line,k)=>`<tspan x="${x}" dy="${k?15:0}">${escSvg(line)}</tspan>`).join('')}</text>`;
    }).join('');
    parts.push(`<g fill="#172033" font-size="10">${cells}</g><line x1="${left}" x2="${W-42}" y1="${y+rowH}" y2="${y+rowH}" stroke="#dfe4ea"/>`);
    y+=rowH+6;
  });
  if(pageIndex===totalPages){
    const align=template.totalsAlign||'left';
    const boxW=308, boxX=align==='right'?W-42-boxW:left, textX=align==='right'?boxX+boxW-16:boxX+16, anchor=align==='right'?'end':'start';
    // Totals sit directly under the last item, with a small, consistent gap.
    const totalsTop=y+gap;
    const ty=totalsTop+20;
    parts.push(`<rect x="${boxX}" y="${totalsTop}" width="${boxW}" height="128" rx="10" fill="#f5f8ff" stroke="#dbe3ef"/>`);
    const totals=[['جمع کالاها',money(z.subtotal)],['تخفیف',money(z.discount)],[`مالیات (${fa(z.tax)}٪)`,money(z.taxAmt)]];
    totals.forEach((q,i)=>parts.push(`<text x="${textX}" y="${ty+i*27}" text-anchor="${anchor}" font-size="11">${escSvg(q[0])}: ${escSvg(q[1])}</text>`));
    const grandX=align==='right'?boxX+15:boxX+15;
    const grandW=boxW-30;
    const grandTextX=align==='right'?boxX+boxW-18:boxX+18;
    parts.push(`<rect x="${grandX}" y="${ty+62}" width="${grandW}" height="36" rx="8" fill="${a}"/><text x="${grandTextX}" y="${ty+85}" text-anchor="${anchor}" fill="#fff" font-size="14" font-weight="700">مبلغ نهایی: ${escSvg(money(z.total))}</text><text x="${grandTextX}" y="${ty+118}" text-anchor="${anchor}" font-size="9">${escSvg(words(z.total))}</text>`);
  }
  parts.push(`<text x="${right}" y="${H-28}" text-anchor="end" font-size="10" fill="#64748b">${escSvg(company)} — مهر و امضا</text></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}
async function getExportSvgs(longImage=false){const pages=[...document.querySelectorAll('#invoicePreview .invoice-page')];if(!pages.length)throw new Error('Invoice preview is empty');const fontInfo=await ensureExportFont();return pages.map((p,i)=>invoiceSvgPage(p,i+1,pages.length,fontInfo,{longImage}));}
function svgSize(svg){const m=String(svg).match(/<svg[^>]*\bwidth=\"([0-9.]+)\"[^>]*\bheight=\"([0-9.]+)\"/);return m?{w:Number(m[1]),h:Number(m[2])}:exportPageSize()}
function svgToPngUrl(svg,W,H){return new Promise((resolve,reject)=>{const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{try{const c=document.createElement('canvas'),scale=2;c.width=Math.round(W*scale);c.height=Math.round(H*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.94))}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('SVG render failed'))};img.src=url;});}
async function buildExportImages(longImage=false){const svgs=await getExportSvgs(longImage),out=[];for(const s of svgs){const z=svgSize(s);out.push(await svgToPngUrl(s,z.w,z.h))}return out}
async function combineImagesVertical(urls){if(urls.length<=1)return urls[0];const imgs=await Promise.all(urls.map(u=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=u})));const width=Math.max(...imgs.map(i=>i.width)),height=imgs.reduce((s,i)=>s+i.height,0);const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);let y=0;for(const im of imgs){ctx.drawImage(im,0,y);y+=im.height}return c.toDataURL('image/jpeg',.94)}

function asciiBytes(s){const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out}
function base64ToBytes(b64){const raw=atob(b64);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function concatBytes(arrs){const n=arrs.reduce((s,a)=>s+a.length,0),out=new Uint8Array(n);let p=0;for(const a of arrs){out.set(a,p);p+=a.length}return out}
function makePdfFromImages(images,paperSize){const a5=String(paperSize).toUpperCase()==='A5',pw=a5?419.5276:595.2756,ph=a5?595.2756:841.8898,objects=[],pages=[];let no=3;const enc=asciiBytes;for(const img of images){const pageNo=no++,contentNo=no++,imageNo=no++;pages.push(pageNo);const jpg=base64ToBytes(img.split(',')[1]);const content=`q\n${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;objects.push({no:pageNo,b:enc(`<< /Type /Page /Parent 1 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 ${imageNo} 0 R >> >> /Contents ${contentNo} 0 R >>`)});objects.push({no:contentNo,b:enc(`<< /Length ${content.length} >>\nstream\n${content}endstream`)});const comma=enc(`<< /Type /XObject /Subtype /Image /Width ${a5?1120:1588} /Height ${a5?1588:2246} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);objects.push({no:imageNo,b:concatBytes([comma,jpg,enc('\nendstream')])});}objects.push({no:1,b:enc(`<< /Type /Pages /Kids [${pages.map(x=>x+' 0 R').join(' ')}] /Count ${pages.length} >>`)});const catalog=no++;objects.push({no:catalog,b:enc(`<< /Type /Catalog /Pages 1 0 R >>`)});objects.sort((a,b)=>a.no-b.no);const head=enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'),chunks=[head],offs=new Map([[0,0]]);let pos=head.length;for(const o of objects){const oh=enc(`${o.no} 0 obj\n`),tail=enc('\nendobj\n');offs.set(o.no,pos);chunks.push(oh,o.b,tail);pos+=oh.length+o.b.length+tail.length}const xref=pos,size=catalog+1;let x=`xref\n0 ${size}\n0000000000 65535 f \n`;for(let i=1;i<size;i++)x+=(String(offs.get(i)||0).padStart(10,'0')+' 00000 n \n');x+=`trailer\n<< /Size ${size} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;chunks.push(enc(x));return new Blob(chunks,{type:'application/pdf'})}
async function downloadPNG(){try{const imgs=await buildExportImages(true);const u=await combineImagesVertical(imgs);window.__lastPNG=u;$('#imageResult').innerHTML=`<img src="${u}" alt="پیش‌نمایش فاکتور">`;$('#imageModal').classList.remove('hidden')}catch(e){console.error('PNG export:',e);alert('ساخت تصویر فاکتور انجام نشد. لطفاً دوباره تلاش کنید.')}}
async function showPDF(){try{const imgs=await buildExportImages(false);const blob=makePdfFromImages(imgs,$('#paperSize').value);const old=window.__lastPDF;if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(blob);window.__lastPDF=url;$('#pdfFrame').src=url+'#zoom=page-fit';$('#pdfModal').classList.remove('hidden')}catch(e){console.error('PDF export:',e);alert('ساخت پیش‌نمایش PDF انجام نشد. لطفاً دوباره تلاش کنید.')}}
function downloadBlob(url,name){let a=document.createElement('a');a.href=url;a.download=name;a.click()}
function exportBackup(){let data={version:3,createdAt:new Date().toISOString(),saved:savedCache,draft:localStorage.getItem('fpDraft'),template};downloadBlob(URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),`factorplus-backup-${todayJalali().replaceAll('/','-')}.json`)}
async function createBackup(){const createdAt=new Date().toISOString();await dbPutBackup({createdAt,saved:savedCache});localStorage.setItem('fpLastBackupAt',String(Date.now()));$('#backupStatus').textContent='پشتیبان جدید ساخته شد'}
function runWeeklyBackup(){let last=Number(localStorage.getItem('fpLastBackupAt')||0);if(Date.now()-last>7*86400000)createBackup();else if(last)$('#backupStatus').textContent=`آخرین پشتیبان: ${new Date(last).toLocaleDateString('fa-IR')}`}
function importBackup(e){let f=e.target.files?.[0];if(!f)return;let r=new FileReader();r.onload=()=>{(async()=>{try{let d=JSON.parse(r.result);if(!Array.isArray(d.saved))throw 0;await dbDeleteAll();for(const x of d.saved)await dbPut(x);savedCache=d.saved;if(d.template){template=d.template;saveTemplate()}refreshAll();loadSaved();loadCustomers();alert('پشتیبان با موفقیت بازیابی شد.')}catch{alert('فایل پشتیبان معتبر نیست.')}e.target.value=''})()};r.readAsText(f)}
function openTemplate(){renderTemplateControls();$('#templateModal').classList.remove('hidden');renderTemplatePreview()}
function renderTemplateControls(){let labels={header:'سربرگ و عنوان',customer:'مشخصات مشتری',table:'جدول کالا و خدمات',totals:'جمع و مبلغ نهایی',footer:'پاورقی و امضا'};$('#headerLayout').value=template.header;$('#tableDensity').value=template.density;$('#radiusRange').value=template.radius;
  $('#templateSections').innerHTML=template.sections.map((s,i)=>`<div class="tpl-row" draggable="true" data-tplrow="${s}"><span class="drag-handle">⠿</span><span>${labels[s]}</span><label class="switch"><input type="checkbox" data-toggle-tpl="${s}" ${!template.hidden.includes(s)?'checked':''}><i></i></label></div>`).join('');
  $$('[data-toggle-tpl]').forEach(x=>x.onchange=()=>{let s=x.dataset.toggleTpl;template.hidden=x.checked?template.hidden.filter(v=>v!==s):[...new Set([...template.hidden,s])];renderTemplatePreview()});
  $$('[data-tplrow]').forEach(r=>{r.ondragstart=e=>e.dataTransfer.setData('text/plain',r.dataset.tplrow);r.ondragover=e=>e.preventDefault();r.ondrop=e=>{e.preventDefault();let from=e.dataTransfer.getData('text/plain'),to=r.dataset.tplrow,arr=template.sections,fi=arr.indexOf(from),ti=arr.indexOf(to);if(fi>=0&&ti>=0){arr.splice(fi,1);arr.splice(ti,0,from);renderTemplateControls();renderTemplatePreview()}}});
  const wrap=$('#headerItems'); if(!wrap)return; const hl={brand:'عنوان و نام شرکت',meta:'شماره، تاریخ و صفحه'}; const ho=template.headerItems||['brand','meta']; wrap.innerHTML=ho.map(k=>`<div class="tpl-row header-item-row" draggable="true" data-headeritem="${k}"><span class="drag-handle">⠿</span><span>${hl[k]}</span><span class="order-badge">↕</span></div>`).join('');
  $$('[data-headeritem]').forEach(r=>{r.ondragstart=e=>e.dataTransfer.setData('text/header-item',r.dataset.headeritem);r.ondragover=e=>e.preventDefault();r.ondrop=e=>{e.preventDefault();let from=e.dataTransfer.getData('text/header-item'),to=r.dataset.headeritem,arr=template.headerItems||['brand','meta'],fi=arr.indexOf(from),ti=arr.indexOf(to);if(fi>=0&&ti>=0&&fi!==ti){arr.splice(fi,1);arr.splice(ti,0,from);template.headerItems=arr;renderTemplateControls();renderTemplatePreview()}}});
  const twrap=$('#totalsItems');
  if(twrap){
    const tl={left:'جمع و مبلغ نهایی — سمت چپ',right:'جمع و مبلغ نهایی — سمت راست'};
    const order=template.totalsItems||['left','right'];
    twrap.innerHTML=order.map(k=>`<div class="tpl-row totals-item-row" draggable="true" data-totalsitem="${k}"><span class="drag-handle">⠿</span><span>${tl[k]}</span><span class="order-badge">↕</span></div>`).join('');
    $$('[data-totalsitem]').forEach(r=>{r.ondragstart=e=>e.dataTransfer.setData('text/totals-item',r.dataset.totalsitem);r.ondragover=e=>e.preventDefault();r.ondrop=e=>{e.preventDefault();let from=e.dataTransfer.getData('text/totals-item'),to=r.dataset.totalsitem,arr=template.totalsItems||['left','right'],fi=arr.indexOf(from),ti=arr.indexOf(to);if(fi>=0&&ti>=0&&fi!==ti){arr.splice(fi,1);arr.splice(ti,0,from);template.totalsItems=arr;template.totalsAlign=arr[0];renderTemplateControls();renderTemplatePreview()}}});
  }
}
function renderTemplatePreview(){
  const host=$('#templatePreview');
  const isA5=$('#paperSize')?.value==='A5';
  const baseW=isA5?560:794, baseH=isA5?794:1122;
  host.innerHTML=`<div class="template-stage"><div class="template-paper-wrap">${invoicePage(items.slice(0,3),1,1)}</div></div>`;
  const stage=host.querySelector('.template-stage'), wrap=host.querySelector('.template-paper-wrap'), page=host.querySelector('.invoice-page');
  if(page){
    const available=Math.max(300,host.clientWidth-32);
    const targetW=Math.min(isA5?430:540,available);
    const scale=targetW/baseW;
    stage.style.width=targetW+'px'; stage.style.height=(baseH*scale)+'px';
    wrap.style.width=targetW+'px'; wrap.style.height=(baseH*scale)+'px';
    page.style.width=baseW+'px'; page.style.minHeight=baseH+'px';
    page.style.transform=`scale(${scale})`; page.style.transformOrigin='top left';
    page.style.margin= '0';
  }
}
function applyPreset(p){if(p==='modern'){template={header:'split',density:'normal',radius:16,sections:['header','customer','table','totals','footer'],hidden:[],headerItems:['brand','meta'],totalsItems:['left','right'],totalsAlign:'left'};accent='#2b7cff'}if(p==='classic'){template={header:'compact',density:'normal',radius:4,sections:['header','customer','table','totals','footer'],hidden:[],headerItems:['brand','meta'],totalsAlign:'right'};accent='#334155'}if(p==='minimal'){template={header:'center',density:'airy',radius:22,sections:['header','customer','table','totals','footer'],hidden:[],headerItems:['brand','meta'],totalsItems:['left','right'],totalsAlign:'left'};accent='#7c3aed'}$('#headerLayout').value=template.header;$('#tableDensity').value=template.density;$('#radiusRange').value=template.radius;renderTemplateControls();renderTemplatePreview()}
let invoicesDirHandle=null;
function dateFolderName(j){return String(j||todayJalali()).replace(/\//g,'-')}
async function chooseInvoicesFolder(){
  if(window.desktopInfo?.isElectron && window.desktopInfo.invoices){
    try{
      const r=await window.desktopInfo.invoices.chooseRoot();
      if(r?.ok){ localStorage.setItem('fpInvoicesFolderSelected','true'); $('#folderStatus').textContent=`پوشه «فاکتورها» آماده است`; await saveAllInvoicesToFolder(); }
    }catch{alert('انتخاب پوشه انجام نشد.');}
    return;
  }
  if(!window.showDirectoryPicker){alert('این مرورگر امکان انتخاب و ساخت پوشه را پشتیبانی نمی‌کند. برای ذخیره خودکار در پوشه ویندوز از Chrome یا Edge استفاده کنید.');return}
  try{
    const picked=await window.showDirectoryPicker({mode:'readwrite'});
    invoicesDirHandle=picked.name==='فاکتورها'?picked:await picked.getDirectoryHandle('فاکتورها',{create:true});
    try{await dbSetSetting('invoicesDirHandle',invoicesDirHandle)}catch{}
    localStorage.setItem('fpInvoicesFolderSelected','true');
    $('#folderStatus').textContent=`پوشه «فاکتورها» آماده است`;
    await saveAllInvoicesToFolder();
  }catch(e){if(e?.name!=='AbortError') alert('انتخاب یا ساخت پوشه انجام نشد.');}
}
async function writeInvoiceFile(dir,x){
  const dateDir=await dir.getDirectoryHandle(dateFolderName(x.date),{create:true});
  const safeNo=String(x.invoiceNo||x.id).replace(/[\\/:*?"<>|]/g,'-');
  const file=await dateDir.getFileHandle(`فاکتور-${safeNo}.json`,{create:true});
  const w=await file.createWritable(); await w.write(JSON.stringify(x,null,2)); await w.close();
}
async function saveAllInvoicesToFolder(){
  if(window.desktopInfo?.isElectron && window.desktopInfo.invoices){
    try{
      const r=await window.desktopInfo.invoices.saveAll(savedCache);
      if(r?.ok){ $('#folderStatus').textContent=`${fa(r.count)} فاکتور در پوشه «فاکتورها» ذخیره شد`; return; }
    }catch(e){alert('ذخیره در پوشه فاکتورها انجام نشد.'); return;}
  }
  if(!invoicesDirHandle){
    if(window.showDirectoryPicker) return chooseInvoicesFolder();
    alert('برای ذخیره در پوشه ویندوز، یک‌بار این بخش را در Chrome یا Edge باز کنید و پوشه «فاکتورها» را انتخاب کنید.'); return;
  }
  try{
    for(const x of savedCache) await writeInvoiceFile(invoicesDirHandle,x);
    $('#folderStatus').textContent=`${fa(savedCache.length)} فاکتور ذخیره شد`;
  }catch(e){alert('ذخیره در پوشه انجام نشد. ممکن است دسترسی پوشه لغو شده باشد.');}
}
async function invoicePngDataUrl(){
  const svg=invoiceSvg();
  return await new Promise(resolve=>{
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{try{const scale=2,c=document.createElement('canvas');c.width=img.width*scale;c.height=img.height*scale;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/png'));}catch{URL.revokeObjectURL(url);resolve(null)}};
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(null)};img.src=url;
  });
}
async function autoFolderSave(x){
  if(!x)return null;
  if(window.desktopInfo?.isElectron && window.desktopInfo.invoices){
    try{const svg=invoiceSvg();const png=await invoicePngDataUrl();return await window.desktopInfo.invoices.saveBundle(x,png,svg)}catch(e){console.error(e);return null}
  }
  if(!invoicesDirHandle)return null;
  try{await writeInvoiceFile(invoicesDirHandle,x);return {ok:true}}catch{return null}
}
async function restoreInvoicesFolder(){
  if(window.desktopInfo?.isElectron && window.desktopInfo.invoices){
    try{const r=await window.desktopInfo.invoices.getRoot(); if(r?.ok){const fs=$('#folderStatus'); if(fs)fs.textContent='پوشه «فاکتورها» آماده است';} }catch{}
    return;
  }
  if(!window.showDirectoryPicker)return;
  try{
    const h=await dbGetSetting('invoicesDirHandle');
    if(!h)return;
    const p=await h.queryPermission?.({mode:'readwrite'});
    if(p==='granted'||p===undefined){
      invoicesDirHandle=h;
      const fs=$('#folderStatus');
      if(fs)fs.textContent='پوشه «فاکتورها» آماده است';
    }
  }catch{}
}


function bind(){
$$('.nav').forEach(b=>b.onclick=()=>showSection(b.dataset.section));$$('[data-go]').forEach(b=>b.onclick=()=>showSection(b.dataset.go));$('#dashboardNew').onclick=newInvoice;$('#addItem').onclick=addItem;$('#addItemBottom').onclick=addItem;$('#saveBtn').onclick=saveInvoice;$('#loadDraftBtn').onclick=()=>{let d=localStorage.getItem('fpDraft');if(!d)return alert('پیش‌نویسی وجود ندارد.');let x=JSON.parse(d);editingId=null;items=(x.items||items).map(normalizeItem);['customer','phone','invoiceNo','date','companyName','discount','tax'].forEach(k=>{if($('#'+k)&&x[k]!=null)$('#'+k).value=x[k]});renderItems();render();updateStatus()};
['customer','phone','invoiceNo','date','discount','tax','companyName'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(id==='companyName')localStorage.setItem('fpCompanyName',$('#companyName').value);persistDraft();markChanged();render()}));
$('#date').addEventListener('blur',()=>{let v=$('#date').value.replace(/-/g,'/');$('#date').value=v;persistDraft();render()});$('#currencyUnit').onchange=()=>{localStorage.setItem('fpCurrency',$('#currencyUnit').value);persistDraft();markChanged();render()};$('#pageMode').onchange=()=>{localStorage.setItem('fpPageMode',$('#pageMode').value);persistDraft();markChanged();render()};$('#paperSize').onchange=()=>{localStorage.setItem('fpPaperSize',$('#paperSize').value);persistDraft();markChanged();render()};
function setAccentColor(v){accent=String(v||'#2563EB').toUpperCase();localStorage.setItem('fpAccent',accent);const p=$('#accentColorPicker');const h=$('#accentHex');const d=$('#accentColorDot');if(p)p.value=accent.toLowerCase();if(h)h.textContent=accent;if(d)d.style.background=accent;persistDraft();markChanged();render()}
$$('.swatches button').forEach(b=>b.onclick=()=>setAccentColor(b.dataset.color));
$('#accentColorPicker').oninput=e=>setAccentColor(e.target.value);
$('#themeBtn').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('fpLight',document.body.classList.contains('light'))};$('#fontSelect').onchange=async()=>{const v=$('#fontSelect').value;localStorage.setItem('fpFont',v);applyFont();persistDraft();render();if(v==='Vazir'||v==='Lalezar'||v==='Dirooz'){await loadBuiltinFont(v);applyFont();render();}};$('#fontInput').onchange=e=>{let f=e.target.files?.[0];if(!f)return;let r=new FileReader();r.onload=()=>{localStorage.setItem('fpCustomFont',r.result);localStorage.setItem('fpFont','custom');$('#fontSelect').value='custom';applyFont();persistDraft();render()};r.readAsDataURL(f)};$('#removeFont').onclick=()=>{localStorage.removeItem('fpCustomFont');localStorage.setItem('fpFont','Noto');$('#fontSelect').value='Noto';applyFont();render()};
$('#logoInput').onchange=e=>{let f=e.target.files?.[0];if(!f)return;let r=new FileReader();r.onload=()=>{localStorage.setItem('fpLogo',r.result);renderLogoPreview();render();persistDraft();markChanged()};r.readAsDataURL(f)};$('#removeLogo').onclick=()=>{localStorage.removeItem('fpLogo');renderLogoPreview();render();persistDraft();markChanged()};
$('#pngBtn').onclick=downloadPNG;$('#pdfBtn').onclick=showPDF;$('#printBtn').onclick=()=>window.print();$('#modalX').onclick=()=>$('#imageModal').classList.add('hidden');$('#modalClose2').onclick=()=>$('#imageModal').classList.add('hidden');$('#pdfModalX').onclick=()=>$('#pdfModal').classList.add('hidden');$('#pdfModalClose').onclick=()=>$('#pdfModal').classList.add('hidden');$$('[data-close-modal]').forEach(x=>x.onclick=()=>{x.closest('.modal')?.classList.add('hidden')});$('#modalDownload').onclick=()=>window.__lastPNG&&downloadBlob(window.__lastPNG,'factorplus-invoice.png');$('#modalDownloadSvg').onclick=()=>window.__lastSVG&&downloadBlob(window.__lastSVG,'factorplus-invoice.svg');$('#pdfDownload').onclick=()=>window.__lastPDF&&downloadBlob(window.__lastPDF,'factorplus-invoice.pdf');
$('#chooseInvoicesFolder').onclick=chooseInvoicesFolder;$('#saveAllInvoicesToFolder').onclick=saveAllInvoicesToFolder;$('#backupNow').onclick=async()=>{await createBackup();alert('پشتیبان داخلی ساخته شد.')};$('#settingsBackup').onclick=createBackup;$('#exportBackup').onclick=exportBackup;$('#settingsExport').onclick=exportBackup;$('#importBackup').onchange=importBackup;$('#savedSearch').oninput=loadSaved;$('#savedSort').onchange=loadSaved;$('#clearSaved').onclick=()=>{if(confirm('همه فاکتورهای ثبت‌شده حذف شوند؟')){dbDeleteAll().then(()=>{savedCache=[];refreshAll();loadSaved();loadCustomers()})}};$('#closeCustomerInvoices').onclick=()=>$('#customerInvoicesCard').classList.add('hidden');
$('#templateBtn').onclick=openTemplate;$('#templateBtn2').onclick=openTemplate;$('#templateX').onclick=()=>$('#templateModal').classList.add('hidden');$('#templateClose').onclick=()=>$('#templateModal').classList.add('hidden');$('#templateApply').onclick=()=>{template.header=$('#headerLayout').value;template.density=$('#tableDensity').value;template.radius=Number($('#radiusRange').value);template.totalsAlign=template.totalsItems?.[0]||template.totalsAlign||'left';saveTemplate();render();$('#templateModal').classList.add('hidden');markChanged()};$('#radiusRange').oninput=e=>{template.radius=Number(e.target.value);renderTemplatePreview()};$('#headerLayout').onchange=e=>{template.header=e.target.value;renderTemplatePreview()};$('#tableDensity').onchange=e=>{template.density=e.target.value;renderTemplatePreview()};$$('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));$('#resetTemplate').onclick=()=>{template={header:'split',density:'normal',radius:14,sections:['header','customer','table','totals','footer'],hidden:[],headerItems:['brand','meta'],totalsItems:['left','right'],totalsAlign:'left'};renderTemplateControls();renderTemplatePreview()};
window.addEventListener('resize',fitPreview);window.addEventListener('beforeunload',persistDraft);
}
if(localStorage.getItem('fpLight')==='true')document.body.classList.add('light');(async()=>{bind();await initSavedDB();await restoreInvoicesFolder();setDefaults();showSection('dashboard');refreshAll();loadSaved();loadCustomers()})().catch(()=>{bind();setDefaults();showSection('dashboard')});
