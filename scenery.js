/* Scene composition: a stationary plate and isolated alpha objects.
   Source PNGs stay unchanged. No rectangular crops of the background are moved. */
(function(root){
  'use strict';

  function splitScenePixels(data,width,height,options={}){
    const minPixels=options.minPixels??600;
    const edge=options.edge??12;
    const maxWidth=options.maxWidth??width*.23;
    const maxHeight=options.maxHeight??height*.43;
    const limit=options.limit??4;
    const alphaThreshold=options.alphaThreshold??8;
    const feather=8;
    const visited=new Uint8Array(width*height);
    const queue=new Uint32Array(width*height);
    const candidates=[];
    // Ignore near-invisible alpha bridges when finding separate silhouettes.
    // Their actual soft edges are recovered below, without clipping a rectangle.
    for(let seed=0;seed<visited.length;seed++){
      if(visited[seed]||data[seed*4+3]<=alphaThreshold)continue;
      let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;
      queue[0]=seed;visited[seed]=1;
      while(head<tail){
        const pixel=queue[head++],x=pixel%width,y=(pixel/width)|0;
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        for(let ny=Math.max(0,y-1);ny<=Math.min(height-1,y+1);ny++){
          for(let nx=Math.max(0,x-1);nx<=Math.min(width-1,x+1);nx++){
            const next=ny*width+nx;
            if(!visited[next]&&data[next*4+3]>alphaThreshold){visited[next]=1;queue[tail++]=next}
          }
        }
      }
      const w=maxX-minX+1,h=maxY-minY+1;
      const detached=minX>edge&&minY>edge&&maxX<width-edge&&maxY<height-edge;
      const peripheral=maxX<width*.33||minX>width*.67||maxY<height*.33;
      if(detached&&(options.anywhere||peripheral)&&tail>=minPixels&&w>=16&&h>=20&&w<=maxWidth&&h<=maxHeight){
        candidates.push({x:minX,y:minY,width:w,height:h,count:tail,indices:queue.slice(0,tail)});
      }
    }
    const selected=candidates.sort((a,b)=>b.count-a.count).slice(0,limit);
    const background=new Uint8ClampedArray(data);
    const owned=new Uint8Array(width*height);
    const distance=new Uint8Array(width*height);
    const objects=selected.map(component=>{
      let head=0,tail=component.indices.length;
      queue.set(component.indices);
      let minX=component.x,minY=component.y,maxX=minX+component.width-1,maxY=minY+component.height-1;
      for(const index of component.indices){owned[index]=1;distance[index]=0}
      while(head<tail){
        const index=queue[head++];
        if(distance[index]>=feather)continue;
        const x=index%width,y=index/width|0;
        for(let ny=Math.max(0,y-1);ny<=Math.min(height-1,y+1);ny++){
          for(let nx=Math.max(0,x-1);nx<=Math.min(width-1,x+1);nx++){
            const next=ny*width+nx,alpha=data[next*4+3];
            if(owned[next]||alpha===0||alpha>alphaThreshold)continue;
            owned[next]=1;distance[next]=distance[index]+1;queue[tail++]=next;
            minX=Math.min(minX,nx);minY=Math.min(minY,ny);maxX=Math.max(maxX,nx);maxY=Math.max(maxY,ny);
          }
        }
      }
      component={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1,indices:queue.slice(0,tail)};
      const pixels=new Uint8ClampedArray(component.width*component.height*4);
      for(const index of component.indices){
        const source=index*4;
        const target=(((index/width|0)-component.y)*component.width+index%width-component.x)*4;
        pixels.set(data.subarray(source,source+4),target);
        // Remove the exact object from the stationary plate, not a soft mask.
        background[source]=0;background[source+1]=0;background[source+2]=0;background[source+3]=0;
      }
      return {x:component.x,y:component.y,width:component.width,height:component.height,pixels};
    });
    return {width,height,background,objects};
  }

  if(typeof module!=='undefined'&&module.exports){module.exports={splitScenePixels};return}

  const cache=new Map();
  function prepare(image){
    if(cache.has(image.src))return cache.get(image.src);
    const buffer=document.createElement('canvas');
    buffer.width=image.naturalWidth;buffer.height=image.naturalHeight;
    const context=buffer.getContext('2d',{willReadFrequently:true});
    context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,buffer.width,buffer.height);
    const composition=splitScenePixels(pixels.data,buffer.width,buffer.height);
    composition.image=image;
    cache.set(image.src,composition);
    if(cache.size>3)cache.delete(cache.keys().next().value);
    return composition;
  }

  class WorldScenery {
    constructor(canvas,objectHost){
      this.canvas=canvas;this.host=objectHost;this.objects=[];
      this.target={x:0,y:0};this.current={x:0,y:0};this.frame=0;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.mobile=matchMedia('(max-width: 720px)');
      this.reduced.addEventListener('change',()=>{this.stop();this.paintObjects()});
      this.mobile.addEventListener('change',()=>this.render());
      this.observer=new ResizeObserver(()=>this.render());
      this.observer.observe(canvas.parentElement);
    }
    setImage(image){
      this.stop();
      this.canvas.dataset.source=image?.src||'';
      this.composition=image?prepare(image):null;
      this.render();
    }
    render(){
      if(!this.composition){this.canvas.hidden=true;this.host.replaceChildren();this.objects=[];this.host.dataset.objectCount='0';return}
      this.canvas.hidden=false;
      const scene=this.composition;
      this.stop();this.objects=[];this.host.replaceChildren();
      if(this.mobile.matches){
        // The compact layout is deliberately static. Its two edge views are
        // composited once, never shifted independently on pointer movement.
        const rect=this.canvas.parentElement.getBoundingClientRect();
        const ratio=Math.min(devicePixelRatio||1,2);
        this.canvas.width=Math.max(1,Math.round(rect.width*ratio));
        this.canvas.height=Math.max(1,Math.round(rect.height*ratio));
        const ctx=this.canvas.getContext('2d');
        const w=this.canvas.width,h=this.canvas.height,dw=h*scene.width/scene.height;
        const side=document.createElement('canvas');side.width=w;side.height=h;
        const sc=side.getContext('2d');
        for(const right of [false,true]){
          sc.clearRect(0,0,w,h);sc.globalCompositeOperation='source-over';
          sc.drawImage(scene.image,right?w-dw:0,0,dw,h);
          const mask=sc.createLinearGradient(w*.42,0,w*.58,0);
          mask.addColorStop(0,right?'transparent':'#000');mask.addColorStop(1,right?'#000':'transparent');
          sc.globalCompositeOperation='destination-in';sc.fillStyle=mask;sc.fillRect(0,0,w,h);
          ctx.drawImage(side,0,0);
        }
      }else{
        this.canvas.width=scene.width;this.canvas.height=scene.height;
        this.canvas.getContext('2d').putImageData(new ImageData(scene.background,scene.width,scene.height),0,0);
        scene.objects.forEach((part,index)=>{
          const element=document.createElement('canvas');
          element.className='scenery-object';element.width=part.width;element.height=part.height;
          element.getContext('2d').putImageData(new ImageData(part.pixels,part.width,part.height),0,0);
          element.style.left=`${part.x/scene.width*100}%`;element.style.top=`${part.y/scene.height*100}%`;
          element.style.width=`${part.width/scene.width*100}%`;element.style.height=`${part.height/scene.height*100}%`;
          element.dataset.sourceBounds=[part.x,part.y,part.width,part.height].join(',');
          this.host.append(element);this.objects.push({element,depth:.55+index*.13});
        });
      }
      this.host.dataset.objectCount=String(this.objects.length);
      this.canvas.dataset.paintCount=String(Number(this.canvas.dataset.paintCount||0)+1);
      this.paintObjects();
    }
    move(x,y){
      if(this.reduced.matches||this.mobile.matches||!this.objects.length)return;
      this.target={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};
      if(!this.frame)this.frame=requestAnimationFrame(()=>this.tick());
    }
    tick(){
      this.frame=0;
      this.current.x+=(this.target.x-this.current.x)*.16;
      this.current.y+=(this.target.y-this.current.y)*.16;
      const moving=Math.abs(this.target.x-this.current.x)+Math.abs(this.target.y-this.current.y)>.008;
      if(!moving)this.current={...this.target};
      this.paintObjects();
      if(moving)this.frame=requestAnimationFrame(()=>this.tick());
    }
    paintObjects(){
      // Only small, isolated sprite canvases get a transform.
      // The backdrop and the full-size plate are never redrawn or transformed.
      for(const {element,depth} of this.objects){
        const x=Math.round(this.current.x*6*depth*2)/2;
        const y=Math.round(this.current.y*4*depth*2)/2;
        element.style.transform=`translate(${x}px,${y}px)`;
      }
    }
    stop(){
      if(this.frame)cancelAnimationFrame(this.frame);
      this.frame=0;this.current={x:0,y:0};this.target={x:0,y:0};
    }
  }
  root.WorldScenery=WorldScenery;
})(typeof window==='undefined'?this:window);
