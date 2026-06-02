window.Util={
  escape(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")},
  toast(m){const el=document.getElementById("toast");el.textContent=m;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)},
  money(v){return new Intl.NumberFormat("en-US",{style:"currency","currency":"USD"}).format(Number(v||0))}
};
document.addEventListener("DOMContentLoaded",()=>{const m=document.getElementById("menuBtn"),n=document.getElementById("nav");if(m)m.onclick=()=>n.classList.toggle("open")});
