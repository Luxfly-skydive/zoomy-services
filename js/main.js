(function(){
'use strict';
document.documentElement.classList.add('js-ready');
const loader=document.getElementById('loader');
const loaderBar=document.getElementById('loader-bar');
if(loader&&loaderBar){let p=0;const iv=setInterval(()=>{p+=Math.random()*18;if(p>=100){p=100;clearInterval(iv);setTimeout(()=>loader.classList.add('hidden'),400)}loaderBar.style.width=p+'%'},80)}
const progressBar=document.getElementById('scroll-progress');
if(progressBar)window.addEventListener('scroll',()=>{const h=document.body.scrollHeight-window.innerHeight;progressBar.style.width=((window.scrollY/h)*100)+'%'},{passive:true});
const nav=document.querySelector('nav');
if(nav){
  const s=()=>nav.classList.toggle('scrolled',window.scrollY>20);
  window.addEventListener('scroll',s,{passive:true});s();

}
const toggle=document.getElementById('navToggle');
const links=document.getElementById('navLinks');
if(toggle&&links){
  /* ── Overlay backdrop ── */
  const overlay=document.createElement('div');
  overlay.className='nav-overlay';
  document.body.appendChild(overlay);
  /* ── Mobile footer: lang + CTA injected into menu ── */
  if(!links.querySelector('.nav-mobile-footer')){
    const mf=document.createElement('div');
    mf.className='nav-mobile-footer';
    const curPage=window.location.pathname.split('/').pop()||'index.html';
    const cta=document.createElement('a');
    cta.className='btn-nav btn-nav-full';cta.href='contact.html';cta.textContent='Start a Project ›';
    const ls=document.createElement('div');ls.className='lang-switcher lang-switcher-menu';
    const enBtn=document.createElement('button');enBtn.className='lang-btn';enBtn.dataset.lang='en';enBtn.textContent='EN';
    enBtn.addEventListener('click',function(){if(typeof setLang==='function')setLang('en');});
    const frA=document.createElement('a');frA.className='lang-btn';frA.href='fr/'+curPage;frA.textContent='FR';
    const esA=document.createElement('a');esA.className='lang-btn';esA.href='es/'+curPage;esA.textContent='ES';
    ls.appendChild(enBtn);ls.appendChild(frA);ls.appendChild(esA);
    mf.appendChild(cta);mf.appendChild(ls);links.appendChild(mf);
  }
  function openMenu(){toggle.classList.add('open');links.classList.add('open');overlay.classList.add('open');document.body.style.overflow='hidden';const b=document.getElementById('zmy-bubble');if(b)b.style.display='none';}
  function closeMenu(){toggle.classList.remove('open');links.classList.remove('open');overlay.classList.remove('open');document.body.style.overflow='';const b=document.getElementById('zmy-bubble');if(b)b.style.display='';}
  toggle.addEventListener('click',()=>{links.classList.contains('open')?closeMenu():openMenu();});
  links.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  overlay.addEventListener('click',closeMenu);
}
const dot=document.querySelector('.cursor-dot');
const ring=document.querySelector('.cursor-ring');
if(dot&&ring&&window.matchMedia('(hover:hover)').matches){let mx=0,my=0,rx=0,ry=0;document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});document.addEventListener('mousedown',()=>{dot.classList.add('click');ring.classList.add('click')});document.addEventListener('mouseup',()=>{dot.classList.remove('click');ring.classList.remove('click')});const hoverEls=document.querySelectorAll('a,button,.card,.btn,.icon-box');hoverEls.forEach(el=>{el.addEventListener('mouseenter',()=>{dot.classList.add('hover');ring.classList.add('hover')});el.addEventListener('mouseleave',()=>{dot.classList.remove('hover');ring.classList.remove('hover')})});(function tick(){rx+=(mx-rx)*.1;ry+=(my-ry)*.1;dot.style.left=mx+'px';dot.style.top=my+'px';ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(tick)})()}
const canvas=document.getElementById('particle-canvas');
if(canvas){
  const ctx=canvas.getContext('2d');
  let W,H,particles=[],stars=[];
  const mouse={x:null,y:null};
  const P_COLORS=['#6366f1','#a855f7','#06b6d4','#ec4899'];
  const S_COLORS=['#ffffff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8'];
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight}
  resize();
  window.addEventListener('resize',()=>{resize();stars=[];initStars()});
  window.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
  /* ── Moving coloured particles ── */
  class Particle{
    constructor(){this.reset()}
    reset(){this.x=Math.random()*W;this.y=Math.random()*H;this.r=Math.random()*1.6+.4;this.vx=(Math.random()-.5)*.35;this.vy=(Math.random()-.5)*.35;this.col=P_COLORS[Math.floor(Math.random()*P_COLORS.length)];this.a=Math.random()*.45+.08}
    draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle=this.col;ctx.globalAlpha=this.a;ctx.fill();ctx.globalAlpha=1}
    move(){if(mouse.x!=null){const dx=mouse.x-this.x,dy=mouse.y-this.y,d=Math.sqrt(dx*dx+dy*dy);if(d<130){this.vx-=(dx/d)*.5;this.vy-=(dy/d)*.5}}this.x+=this.vx;this.y+=this.vy;this.vx*=.98;this.vy*=.98;if(this.x<0||this.x>W||this.y<0||this.y>H)this.reset()}}
  for(let i=0;i<160;i++)particles.push(new Particle());
  /* ── Static twinkling stars ── */
  function initStars(){
    stars=[];
    for(let i=0;i<200;i++){
      stars.push({
        x:Math.random()*W,y:Math.random()*H,
        r:Math.random()*.8+.1,
        col:S_COLORS[Math.floor(Math.random()*S_COLORS.length)],
        baseA:Math.random()*.5+.1,
        a:0,speed:Math.random()*.02+.005,
        phase:Math.random()*Math.PI*2
      })
    }
  }
  initStars();
  let t=0;
  function drawStars(){
    t+=.016;
    stars.forEach(s=>{
      s.a=s.baseA*(0.5+0.5*Math.sin(t*s.speed*60+s.phase));
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=s.col;
      ctx.globalAlpha=s.a;
      ctx.fill();
      /* bright centre dot for larger stars */
      if(s.r>.5){ctx.beginPath();ctx.arc(s.x,s.y,s.r*.4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.globalAlpha=s.a*.7;ctx.fill()}
      ctx.globalAlpha=1;
    })
  }
  function connect(){
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<85){ctx.beginPath();ctx.strokeStyle='#6366f1';ctx.globalAlpha=(1-d/85)*.1;ctx.lineWidth=.4;ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.stroke();ctx.globalAlpha=1}
      }
    }
  }
  function animate(){
    ctx.clearRect(0,0,W,H);
    drawStars();
    particles.forEach(p=>{p.move();p.draw()});
    connect();
    requestAnimationFrame(animate)
  }
  animate()
}
const reveals=document.querySelectorAll('.reveal,.reveal-left,.reveal-right');
if(reveals.length){const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target)}})},{threshold:0,rootMargin:"0px 0px -20px 0px"});reveals.forEach(el=>io.observe(el))}
const counters=document.querySelectorAll('[data-count]');
if(counters.length){const io2=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target;const end=parseFloat(el.dataset.count);const dur=2000;let start=null;function step(ts){if(!start)start=ts;const prog=Math.min((ts-start)/dur,1);const ease=1-Math.pow(1-prog,3);const val=end*ease;el.textContent=Math.round(val).toLocaleString()+(el.dataset.suffix||'');if(prog<1)requestAnimationFrame(step)}requestAnimationFrame(step);io2.unobserve(entry.target)})},{threshold:.5});counters.forEach(el=>io2.observe(el))}
document.querySelectorAll('.btn-primary,.btn-magnetic').forEach(btn=>{btn.addEventListener('mousemove',e=>{const rect=btn.getBoundingClientRect();const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;btn.style.transform=`translate(${(e.clientX-cx)*.35}px,${(e.clientY-cy)*.35}px)`});btn.addEventListener('mouseleave',()=>{btn.style.transform=''})});
document.querySelectorAll('.card-tilt').forEach(card=>{card.addEventListener('mousemove',e=>{const rect=card.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;card.style.transform=`perspective(800px) rotateY(${x*14}deg) rotateX(${-y*14}deg) scale(1.02)`});card.addEventListener('mouseleave',()=>{card.style.transform='perspective(800px) rotateY(0) rotateX(0) scale(1)';card.style.transition='transform .5s cubic-bezier(.4,0,.2,1)'});card.addEventListener('mouseenter',()=>{card.style.transition='transform .1s'})});
const staggerEls=document.querySelectorAll('.stagger-children');
staggerEls.forEach(parent=>{const io3=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('visible');io3.unobserve(entry.target)})},{threshold:0,rootMargin:"0px 0px -10px 0px"});io3.observe(parent)});
document.querySelectorAll('.btn').forEach(btn=>{btn.addEventListener('click',function(e){const r=document.createElement('span');const d=Math.max(this.clientWidth,this.clientHeight);const rect=this.getBoundingClientRect();r.style.cssText=`position:absolute;width:${d}px;height:${d}px;border-radius:50%;background:rgba(255,255,255,.3);transform:scale(0);left:${e.clientX-rect.left-d/2}px;top:${e.clientY-rect.top-d/2}px;animation:ripple .6s linear;pointer-events:none`;this.style.position='relative';this.style.overflow='hidden';this.appendChild(r);r.addEventListener('animationend',()=>r.remove())})});
document.querySelectorAll('.glitch').forEach(el=>el.setAttribute('data-text',el.textContent));
const page=window.location.pathname.split('/').pop()||'index.html';
document.querySelectorAll('.nav-links a').forEach(a=>{if(a.getAttribute('href')===page)a.classList.add('active')});


/* Safety fallback: reveal any elements still hidden after 2.5s */
setTimeout(function(){
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(function(el){
    if(!el.classList.contains('revealed'))el.classList.add('revealed');
  });
  document.querySelectorAll('.stagger-children').forEach(function(el){
    if(!el.classList.contains('visible'))el.classList.add('visible');
  });
},2500);
const styleEl=document.createElement('style');styleEl.textContent='@keyframes ripple{to{transform:scale(2.5);opacity:0}}';document.head.appendChild(styleEl);
})();
