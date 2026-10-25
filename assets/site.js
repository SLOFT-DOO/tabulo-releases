// Theme toggle (remembered per browser), copy buttons on code blocks, docs nav toggle on phones,
// and the staged-change example on the landing page.
(function(){
  var root=document.documentElement;
  try{var t=localStorage.getItem('tabulo-theme'); if(t) root.setAttribute('data-theme',t);}catch(e){}
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.querySelector('.theme');
    if(b) b.addEventListener('click',function(){
      var dark=root.getAttribute('data-theme')?root.getAttribute('data-theme')==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
      var next=dark?'light':'dark'; root.setAttribute('data-theme',next);
      try{localStorage.setItem('tabulo-theme',next);}catch(e){}
    });
    document.querySelectorAll('pre').forEach(function(pre){
      if(pre.closest('[data-demo]')) return;
      var btn=document.createElement('button'); btn.className='copy'; btn.type='button'; btn.textContent='Copy';
      btn.addEventListener('click',function(){
        var text=(pre.querySelector('code')||pre).innerText.trim();
        var done=function(){btn.textContent='Copied';setTimeout(function(){btn.textContent='Copy';},1400);};
        try{navigator.clipboard.writeText(text).then(done,function(){sel(pre);});}catch(e){sel(pre);}
      });
      pre.appendChild(btn);
    });
    function sel(el){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);}
    var st=document.querySelector('.side-toggle');
    if(st) st.addEventListener('click',function(){var s=st.closest('.side');var o=s.classList.toggle('open');st.setAttribute('aria-expanded',o);});
    var demo=document.querySelector('[data-demo]');
    if(demo) stagedDemo(demo);
  });

  // A small copy of Tabulo's grid: edits are staged, then shown as the statements the app generates
  // for SQLite (SQLDialect.statements: deletes, then updates, then inserts; values as text literals).
  function stagedDemo(el){
    var COLS=['id','customer_id','total','status','note'], EDITABLE={total:1,status:1,note:1}, NUM={id:1,customer_id:1,total:1};
    var BASE=[[9,231,'1111.16','shipped',null],[12,14,'1252.84','shipped','gift wrap'],[21,190,'1464.56','shipped',null],
              [50,59,'1002.7','shipped',null],[64,171,'1089.44','shipped','gift wrap']];
    var rows,edits,dropped,inserts,nextId,committed;
    function reset(){
      rows=BASE.map(function(r){var o={};COLS.forEach(function(c,i){o[c]=r[i];});return o;});
      edits={9:{note:'priority'}}; dropped={50:true};
      inserts=[{id:null,customer_id:'14',total:'89.90',status:'pending',note:null}];
      nextId=462; committed=0; render();
    }
    var tbody=el.querySelector('tbody'), review=el.querySelector('.demo-review'), count=el.querySelector('.count');
    var btnDiscard=el.querySelector('[data-act=discard]'), btnCommit=el.querySelector('[data-act=commit]');
    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
    function lit(v){return v===null?'<span class="k">NULL</span>':'<span class="s">\''+esc(String(v).replace(/'/g,"''"))+'\'</span>';}
    function id(s){return '"'+s+'"';}
    function pending(){return Object.keys(dropped).length+Object.keys(edits).length+inserts.length;}
    function statements(){
      var out=[], K=function(w){return '<span class="k">'+w+'</span>';};
      Object.keys(dropped).forEach(function(k){out.push(K('DELETE FROM')+' '+id('orders')+' '+K('WHERE')+' '+id('id')+' '+K('IS')+' '+lit(k)+';');});
      Object.keys(edits).forEach(function(k){
        var set=Object.keys(edits[k]).map(function(c){return id(c)+' = '+lit(edits[k][c]);}).join(', ');
        out.push(K('UPDATE')+' '+id('orders')+' '+K('SET')+' '+set+' '+K('WHERE')+' '+id('id')+' '+K('IS')+' '+lit(k)+';');
      });
      inserts.forEach(function(r){
        var cols=COLS.filter(function(c){return c!=='id'&&r[c]!==null;});
        out.push(K('INSERT INTO')+' '+id('orders')+' ('+cols.map(id).join(', ')+') '+K('VALUES')+' ('+cols.map(function(c){return lit(r[c]);}).join(', ')+');');
      });
      return out;
    }
    function cell(r,c,isNew){
      var v=r[c], changed=false;
      if(!isNew&&edits[r.id]&&c in edits[r.id]){v=edits[r.id][c];changed=true;}
      var td=document.createElement('td'); if(NUM[c]) td.className='num'; if(c==='customer_id') td.classList.add('cust'); if(changed) td.classList.add('changed');
      var inner;
      if(c==='id'&&!isNew){
        inner=document.createElement('button'); inner.type='button'; inner.className='rowid';
        inner.setAttribute('aria-label',(dropped[r.id]?'Keep':'Delete')+' row '+r.id);
        inner.addEventListener('click',function(){ if(dropped[r.id]) delete dropped[r.id]; else {dropped[r.id]=true; delete edits[r.id];} committed=0; render(); });
      } else if(EDITABLE[c]&&!dropped[r.id]){
        inner=document.createElement('button'); inner.type='button';
        inner.setAttribute('aria-label','Edit '+c+(isNew?' of the new row':' of row '+r.id));
        inner.addEventListener('click',function(){ startEdit(td,r,c,isNew,v); });
      } else inner=document.createElement('span');
      if(v===null){inner.innerHTML='<span class="null">'+(c==='id'&&isNew?'auto':'NULL')+'</span>';}
      else inner.textContent=v;
      td.appendChild(inner); return td;
    }
    function startEdit(td,r,c,isNew,v){
      var input=document.createElement('input'); input.value=v===null?'':v; input.setAttribute('aria-label',c);
      td.innerHTML=''; td.appendChild(input); input.focus(); input.select();
      var done=false;
      function finish(save){
        if(done) return; done=true;
        if(save){
          var nv=input.value.trim()===''?null:input.value;
          if(isNew) r[c]=nv;
          else if(nv===r[c]){ if(edits[r.id]){delete edits[r.id][c]; if(!Object.keys(edits[r.id]).length) delete edits[r.id];} }
          else { edits[r.id]=edits[r.id]||{}; edits[r.id][c]=nv; }
          committed=0;
        }
        render();
      }
      input.addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault();finish(true);} else if(e.key==='Escape'){finish(false);} });
      input.addEventListener('blur',function(){finish(true);});
    }
    function render(){
      tbody.innerHTML='';
      rows.forEach(function(r){
        var tr=document.createElement('tr'); if(dropped[r.id]) tr.className='dropped';
        COLS.forEach(function(c){tr.appendChild(cell(r,c,false));}); tbody.appendChild(tr);
      });
      inserts.forEach(function(r){
        var tr=document.createElement('tr'); tr.className='new';
        COLS.forEach(function(c){tr.appendChild(cell(r,c,true));}); tbody.appendChild(tr);
      });
      var n=pending(), sql=statements();
      count.textContent=n?n+' pending change'+(n===1?'':'s'):'No pending changes';
      count.classList.toggle('none',!n);
      btnDiscard.disabled=btnCommit.disabled=!n;
      if(n) review.innerHTML='<pre><code>'+sql.join('\n')+'</code></pre>';
      else review.innerHTML='<p class="empty">'+(committed?'Committed '+committed+' change'+(committed===1?'':'s')+' in one transaction.':'Nothing staged. Click a cell to change it.')+'</p>';
    }
    btnDiscard.addEventListener('click',function(){edits={};dropped={};inserts=[];committed=0;render();});
    btnCommit.addEventListener('click',function(){
      committed=pending();
      rows=rows.filter(function(r){return !dropped[r.id];}).map(function(r){
        var e=edits[r.id]; if(e) Object.keys(e).forEach(function(c){r[c]=e[c];}); return r;
      });
      inserts.forEach(function(r){r.id=nextId++;rows.push(r);});
      edits={};dropped={};inserts=[];render();
    });
    var rb=document.querySelector('[data-act=reset]'); if(rb) rb.addEventListener('click',reset);
    reset();
  }
})();
