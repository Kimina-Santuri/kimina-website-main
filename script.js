document.querySelectorAll(".booking-link").forEach((bookingLink) => {
  bookingLink.addEventListener("click", (event) => {
    if (!window.Calendly) return;
    event.preventDefault();
    window.Calendly.initPopupWidget({ url: bookingLink.href });
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

const canvas = document.querySelector("#topography");
const context = canvas?.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && context) {
  let width=0, height=0, time=0;
  const mouse={x:-1000,y:-1000}, resolution=32;
  const resize=()=>{ const scale=Math.min(window.devicePixelRatio||1,2); width=innerWidth; height=innerHeight; canvas.width=width*scale; canvas.height=height*scale; context.setTransform(scale,0,0,scale,0,0); };
  const field=(x,y)=>{ let value=(Math.sin(x*.008+time)+Math.cos(y*.009+time*.7)+Math.sin((x+y)*.004))/3; value+=Math.max(0,1-Math.hypot(x-mouse.x,y-mouse.y)/300)*.25; return value; };
  const interpolate=(a,b,level)=>(level-a)/(b-a);
  const draw=()=>{
    context.clearRect(0,0,width,height); context.strokeStyle="#171714"; context.lineWidth=.7;
    const columns=Math.ceil(width/resolution), rows=Math.ceil(height/resolution);
    const values=Array.from({length:columns+1},(_,x)=>Array.from({length:rows+1},(_,y)=>field(x*resolution,y*resolution)));
    [-.6,-.4,-.2,0,.2,.4,.6].forEach(level=>{
      context.beginPath();
      for(let x=0;x<columns;x+=1) for(let y=0;y<rows;y+=1){
        const [a,b,c,d]=[values[x][y],values[x+1][y],values[x+1][y+1],values[x][y+1]], points=[];
        if((a<level)!==(b<level)) points.push([x*resolution+interpolate(a,b,level)*resolution,y*resolution]);
        if((b<level)!==(c<level)) points.push([(x+1)*resolution,y*resolution+interpolate(b,c,level)*resolution]);
        if((c<level)!==(d<level)) points.push([x*resolution+interpolate(d,c,level)*resolution,(y+1)*resolution]);
        if((d<level)!==(a<level)) points.push([x*resolution,y*resolution+interpolate(a,d,level)*resolution]);
        if(points.length===2){ context.moveTo(points[0][0],points[0][1]); context.lineTo(points[1][0],points[1][1]); }
      }
      context.stroke();
    });
    if(!reduceMotion){ time+=.004; requestAnimationFrame(draw); }
  };
  addEventListener("resize",resize);
  addEventListener("mousemove",event=>{mouse.x=event.clientX;mouse.y=event.clientY;});
  resize(); draw();
}
