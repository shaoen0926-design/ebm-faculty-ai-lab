const config=typeof COURSE_CONFIG==='undefined'?{}:COURSE_CONFIG;
const key=config.storageKey||'ebm.faculty.essentials.v1';
const exercises=COURSE.filter(e=>e.kind!=='tools');
const firstId=config.defaultId??COURSE[0].id;
let saved={},current=firstId,timer;
try{saved=JSON.parse(localStorage.getItem(key)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={}}catch{}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const codeFor=e=>e.code||String(COURSE.indexOf(e)+1).padStart(2,'0');
const allDone=()=>exercises.every(e=>saved[e.id]);
function notice(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>t.classList.remove('show'),3500)}
let copyQueue=Promise.resolve();
function copy(text,label='內容',button){
 const original=button?.textContent;if(button){button.disabled=true;button.textContent='複製中…'}
 const task=async()=>{
  try{await navigator.clipboard.writeText(text);notice('已複製'+label+'，請切換至 AI 工具貼上。')}
  catch{const t=document.getElementById('manualCopy');t.value=text;document.getElementById('copyDialog').showModal();t.focus();t.select()}
  finally{if(button){button.disabled=false;button.textContent=original}}
 };
 copyQueue=copyQueue.then(task,task);return copyQueue;
}
function progress(){const n=exercises.filter(e=>saved[e.id]).length;document.getElementById('progressText').textContent=n+' / '+exercises.length;document.getElementById('progress').max=exercises.length;document.getElementById('progress').value=n}
function route(id){if(!COURSE.some(e=>e.id===id))return;if(location.hash==='#lesson-'+id){render(true);return}location.hash='lesson-'+id}
function toolLinks(e){
 const link=(name,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">開啟 ${name} ↗</a>`;
 if(e.tool==='nblm')return link('NotebookLM','https://notebooklm.google.com/');
 let html=link('Gemini','https://gemini.google.com/')+link('ChatGPT','https://chatgpt.com/');
 if(e.tool!=='image')html+=link('Claude','https://claude.ai/');
 if(!config.storageKey&&[1,10,11].includes(e.id))html+=link('NotebookLM','https://notebooklm.google.com/')+link('Grok','https://grok.com/')+link('Copilot','https://copilot.microsoft.com/');
 return html;
}
function render(scroll=false){
 const e=COURSE.find(x=>x.id===current),index=COURSE.indexOf(e),code=codeFor(e);
 let lastGroup='';
 document.getElementById('lessons').innerHTML=COURSE.map(x=>{
  let group='';if(x.group&&x.group!==lastGroup){group=`<div class="lesson-group">${esc(x.group)}</div>`;lastGroup=x.group}
  return group+`<button data-id="${x.id}" ${current===x.id?'aria-current="step"':''}><span class="num">${esc(codeFor(x))}</span><span>${esc(x.title)}</span>${x.kind!=='tools'&&saved[x.id]?'<span class="done-mark" aria-label="已完成">✓</span>':''}</button>`;
 }).join('');
 const heading=`<div class="meta"><span>${e.code?'練習 '+esc(code):'LAB '+code+' / '+COURSE.length}</span><span>約 ${e.time} 分鐘</span></div><h2 id="lessonTitle">${esc(e.title)}</h2><p class="learning-point">${esc(e.point)}</p>`;
 const actions=`<div class="actions"><button id="prev" ${index===0?'disabled':''}>上一題</button><button id="next" ${index===COURSE.length-1?'disabled':''}>${e.kind==='tools'?'開始 1.1 →':'下一題 →'}</button></div>`;
 const article=document.getElementById('lesson');
 if(e.kind==='tools'){
  article.innerHTML=heading+`<div class="tool-directory">${e.links.map(t=>`<a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(t.name)} <span aria-hidden="true">↗</span></strong><span>${esc(t.description)}</span></a>`).join('')}</div><p class="tip">先選一個工具登入即可。PDF讀取、檔案輸出與生圖功能依工具及帳號而異。這裡提供入口與提示詞，論文請上傳到你選擇的AI工具。</p><div class="finish-target"><strong>帶著成果換工具</strong><p>保留論文PDF、1.2定稿文案、原圖檔與圖文對照清單。</p></div><div class="lesson-bottom">${actions}</div>`;
 }else{
  const showSource=!config.storageKey&&e.id===7;
  article.innerHTML=heading+`<div class="launch-links">${toolLinks(e)}</div><ol class="steps">${e.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${showSource?'<div class="source-action"><button id="copySource">複製共用素材</button><span>先加入來源，再貼下方簡報指令。</span></div>':''}<div class="prompt"><div class="prompt-head"><label for="promptText">本題提示詞<small>${e.prompt.includes('【共用六頁素材】')?'下方完整顯示提示詞與六頁素材，複製內容與此相同。':'複製內容與下方文字相同。'}</small></label><button id="copyPrompt">複製第 ${esc(code)} 題提示詞</button></div><textarea id="promptText" rows="10" readonly aria-label="本題提示詞">${esc(e.prompt)}</textarea></div><div class="finish-target"><strong>完成到這裡</strong><p>${esc(e.done)}</p></div>${e.tip?`<p class="tip">${esc(e.tip)}</p>`:''}${!config.storageKey&&e.id===8?'<p class="tip">圖片簡報的文字已成為圖片，後續較難編輯；先確認內容與中文字，再組合成簡報。</p>':''}<div class="lesson-bottom"><label class="finish"><input id="done" type="checkbox" ${saved[e.id]?'checked':''}>我已完成</label>${actions}</div>`;
  document.getElementById('copyPrompt').onclick=ev=>copy(document.getElementById('promptText').value,'第 '+code+' 題提示詞',ev.currentTarget);
  const source=document.getElementById('copySource');if(source)source.onclick=()=>copy(MATERIAL);
  document.getElementById('done').onchange=ev=>{
   const wasComplete=allDone();saved[e.id]=ev.target.checked;
   try{localStorage.setItem(key,JSON.stringify(saved))}catch{notice('目前無法儲存，紀錄只保留在本次開啟期間。')}
   progress();const b=document.querySelector(`[data-id="${e.id}"]`);b.querySelector('.done-mark')?.remove();if(saved[e.id])b.insertAdjacentHTML('beforeend','<span class="done-mark" aria-label="已完成">✓</span>');
   if(!wasComplete&&allDone())celebrate();
  };
 }
 document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>route(+b.dataset.id));
 document.getElementById('prev').onclick=()=>index>0&&route(COURSE[index-1].id);
 document.getElementById('next').onclick=()=>index<COURSE.length-1&&route(COURSE[index+1].id);
 progress();if(scroll){article.scrollIntoView({block:'start'});article.focus({preventScroll:true})}
}
function fromHash(scroll){const m=location.hash.match(/^#lesson-(\d+)$/);current=m&&COURSE.some(e=>e.id===+m[1])?+m[1]:firstId;render(scroll)}
window.addEventListener('hashchange',()=>fromHash(true));
if(typeof MATERIAL!=='undefined'){
 document.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>copy(MATERIAL));
 const sourceText=document.getElementById('sourceText');if(sourceText)sourceText.textContent=MATERIAL;
}
document.getElementById('selectCopy').onclick=()=>{const t=document.getElementById('manualCopy');t.focus();t.select()};
document.getElementById('closeCopy').onclick=()=>document.getElementById('copyDialog').close();
function celebrate(){
 const dialog=document.getElementById('completionDialog');
 document.getElementById('completionMessage').textContent=`${exercises.length}／${exercises.length} 題全數完成！`+(config.completionMessage||'你已走過文字、圖像、簡報到互動網頁的創作旅程。');
 dialog.querySelector('.celebration-particles').innerHTML=Array.from({length:24},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${(i%6)*0.12}s;--turn:${i%2?180:-180}deg;--color:${['#67e8cd','#8bb7fa','#f4d58a'][i%3]}"></i>`).join('');
 dialog.showModal();
}
const completionDialog=document.getElementById('completionDialog');
document.getElementById('closeCompletion').onclick=()=>completionDialog.close();
completionDialog.addEventListener('close',()=>{completionDialog.querySelector('.celebration-particles').replaceChildren();document.getElementById('done')?.focus({preventScroll:true})});
fromHash(false);
