const projects=["足球","篮球","羽毛球","王者荣耀","歌王争霸"];
const el=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const imagePath=v=>/^\/(uploads\/[a-f0-9]+\.(png|jpg|webp)|static\/photos\/\d+\.jpg)$/.test(v)?new URL("."+v,document.baseURI).href:"";
