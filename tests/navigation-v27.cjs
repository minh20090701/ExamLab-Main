// npm install --prefix /tmp/exam-test-deps jsdom
// NODE_PATH=/tmp/exam-test-deps/node_modules node tests/navigation-v27.cjs
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function mock(w){
 w.__admin=false;w.__notice='Thông báo kiểm thử';w.__saveError=false;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
 const auth={getUser:async()=>({data:{user:{id:'test',email:'test@example.com',user_metadata:{display_name:'Minh'}}}}),getSession:async()=>({data:{session:{user:{id:'test',email:'test@example.com',user_metadata:{display_name:'Minh'}}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}}),listFactors:async()=>({data:{totp:[]}})}};
 const db={auth,from(table){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},upsert(v){if(w.__saveError)return Promise.resolve({error:{message:'offline'}});w.__notice=v.content;return Promise.resolve({error:null})},maybeSingle(){return Promise.resolve({data:table==='examlab_material_admins'?(w.__admin?{user_id:'test'}:null):table==='examlab_announcements'?{content:w.__notice}:null,error:null})},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};return q}};w.supabase={createClient:()=>db};
}
const wait=()=>new Promise(r=>setTimeout(r,100));
(async()=>{for(let round=1;round<=5;round++){
 for(const file of ['index.html','documents.html','study.html','profile.html','admin.html','admin-docs.html','login.html','friends-beta/index.html']){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type==='unhandled-exception')errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'https://exam.test/'+file,runScripts:'outside-only',pretendToBeVisual:true,beforeParse:mock,virtualConsole:vc});
 const w=dom.window,d=w.document;
 for(const script of d.querySelectorAll('script')){Object.defineProperty(d,'currentScript',{value:script,configurable:true});if(!script.src)w.eval(script.textContent);else {const u=new URL(script.src);if(u.host==='exam.test'&&/\/(supabase-config|supabase-client|admin-auth|role-visibility|calculator-v22|site-unified-v27|app)\.js$/.test(u.pathname))w.eval(fs.readFileSync(path.join(root,u.pathname),'utf8'))}}
 await wait();
 assert.deepEqual(errors,[],file);
 assert.equal(d.querySelectorAll('header [data-admin-only]').length,0,file);
 assert.equal(d.querySelectorAll('header a[href$="friends-beta/index.html"]').length,1,file);
 assert.equal(d.querySelectorAll('#excalcSettingsOpen svg rect').length,1,file);
 const controls=[...d.querySelector('.top-actions').children];assert(controls[0].matches('[data-mode-v7]')&&controls[1].id==='excalcSettingsOpen'&&controls[2].id==='accountLink');
 d.querySelector('#excalcSettingsOpen').click();assert.equal(d.querySelector('.excalc-settings-overlay').hidden,false,file);d.querySelector('.excalc-settings-overlay .excalc-close').click();assert.equal(d.querySelector('.excalc-settings-overlay').hidden,true,file);
 const theme=d.documentElement.dataset.theme;w.Function(d.querySelector('[data-mode-v7]').getAttribute('onclick')).call(d.querySelector('[data-mode-v7]'));assert.notEqual(d.documentElement.dataset.theme,theme,file);
 assert.equal(d.querySelector('#announcementText').textContent,'Thông báo kiểm thử',file);
 for(const el of d.querySelectorAll('script[src],link[rel=stylesheet],header a[href]')){const u=new URL(el.src||el.href);if(u.host==='exam.test')assert(fs.existsSync(path.join(root,u.pathname)),file+' missing '+u.pathname)}
 if(file==='profile.html'){
 const admin=d.querySelector('#profileAdmin');assert(admin.hidden);w.__admin=true;await w.ExamLabRole.refresh();assert(!admin.hidden);
 assert(d.querySelector('#loginHistory').compareDocumentPosition(admin)&w.Node.DOCUMENT_POSITION_FOLLOWING);
 d.querySelector('#announcementInput').value='<b>Thông báo mới</b>';d.querySelector('#announcementForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await wait();assert.equal(d.querySelector('#announcementText').textContent,'<b>Thông báo mới</b>');assert.equal(d.querySelector('#announcementText b'),null);
 w.__saveError=true;d.querySelector('#announcementForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await wait();assert.match(d.querySelector('#announcementStatus').textContent,/Không lưu được/);
 w.__admin=false;await w.ExamLabRole.refresh();assert(admin.hidden);
 d.querySelector('#announcementForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await wait();assert.match(d.querySelector('#announcementStatus').textContent,/Chỉ quản trị viên/);
 }
 if(file==='index.html')for(const key of ['history','guide','library']){d.querySelector('[data-page="'+key+'"]').click();assert(d.querySelector('#view').textContent.trim())}
 dom.window.close();
 }
 console.log(`Round ${round}: PASS — 8 pages, mocked Supabase; no visual/live-backend coverage`);
}})().catch(e=>{console.error(e);process.exit(1)});
