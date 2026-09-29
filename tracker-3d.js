(function(global){
  'use strict';

  const VARIANTS=Object.freeze({
    '01':Object.freeze({id:'01',label:'Slew Drive 01',detail:'Schematic',url:'assets/models/slew-drive/slew-drive-01.stl'}),
  });
  const PARTS=Object.freeze({
    slewDrive:Object.freeze({label:'Slew Drive 01',url:'assets/models/slew-drive/slew-drive-01.stl'}),
    drivePile:Object.freeze({label:'Drive Pile',url:'assets/models/tracker-parts/drive-pile.stl'}),
    bearingDrive:Object.freeze({label:'Bearing Drive With Bearing',url:'assets/models/tracker-parts/bearing-drive-with-bearing.stl'}),
    hatRail:Object.freeze({label:'Hat Rail',url:'assets/models/tracker-parts/hat-rail.stl'}),
  });
  const COLORS=Object.freeze({
    module:[0.10,0.34,0.78],moduleEdge:[0.34,0.62,1.00],tube:[0.05,0.68,0.32],rail:[0.79,0.22,0.80],
    drivePile:[1.00,0.48,0.04],bearingPile:[0.85,0.10,0.10],bearing:[0.78,0.82,0.88],slew:[0.97,0.58,0.12],ground:[0.20,0.24,0.28]
  });
  const meshCache=new Map();

  function number(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
  function positive(value,fallback){const parsed=number(value,fallback);return parsed>0?parsed:fallback;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function subtract(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function normalize(v){const length=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/length,v[1]/length,v[2]/length];}
  function faceNormal(a,b,c){return normalize(cross(subtract(b,a),subtract(c,a)));}

  function createGeometry(){return {positions:[],normals:[],colors:[]};}
  function addTriangle(geometry,a,b,c,color,normalValue){
    const normal=normalValue&&Math.hypot(...normalValue)>.00001?normalize(normalValue):faceNormal(a,b,c);
    geometry.positions.push(...a,...b,...c);geometry.normals.push(...normal,...normal,...normal);geometry.colors.push(...color,...color,...color);
  }
  function addBox(geometry,center,size,color){
    const [cx,cy,cz]=center,[sx,sy,sz]=size.map(value=>Math.max(.1,value)/2);
    const p=[[-sx,-sy,-sz],[sx,-sy,-sz],[sx,sy,-sz],[-sx,sy,-sz],[-sx,-sy,sz],[sx,-sy,sz],[sx,sy,sz],[-sx,sy,sz]].map(([x,y,z])=>[cx+x,cy+y,cz+z]);
    const faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
    for(const [a,b,c,d] of faces){const normal=faceNormal(p[a],p[b],p[c]);addTriangle(geometry,p[a],p[b],p[c],color,normal);addTriangle(geometry,p[a],p[c],p[d],color,normal);}
  }
  function addCylinderY(geometry,center,radius,length,color,segments=18){
    const [cx,cy,cz]=center,half=length/2;
    for(let index=0;index<segments;index++){
      const a=index*Math.PI*2/segments,b=(index+1)*Math.PI*2/segments;
      const x1=cx+Math.cos(a)*radius,z1=cz+Math.sin(a)*radius,x2=cx+Math.cos(b)*radius,z2=cz+Math.sin(b)*radius;
      const p1=[x1,cy-half,z1],p2=[x2,cy-half,z2],p3=[x2,cy+half,z2],p4=[x1,cy+half,z1];
      const normal=normalize([Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);
      addTriangle(geometry,p1,p2,p3,color,normal);addTriangle(geometry,p1,p3,p4,color,normal);
      addTriangle(geometry,[cx,cy-half,cz],p2,p1,color,[0,-1,0]);addTriangle(geometry,[cx,cy+half,cz],p4,p3,color,[0,1,0]);
    }
  }
  function addGrid(geometry,northEnd,southEnd,moduleLength){
    const step=2000,extentX=Math.max(5000,moduleLength*.85),minY=-Math.ceil(southEnd/step)*step,maxY=Math.ceil(northEnd/step)*step;
    for(let y=minY;y<=maxY;y+=step)addBox(geometry,[0,y,-18],[extentX*2,10,10],COLORS.ground);
    for(let x=-extentX;x<=extentX;x+=step)addBox(geometry,[x,(maxY+minY)/2,-18],[10,maxY-minY,10],COLORS.ground);
  }

  function topViewModel(project,row){
    if(global.LumaTrackerSchematic)return global.LumaTrackerSchematic.buildTopViewModel(project,row);
    const inputs=project?.inputs||{},pvCount=Math.max(0,Math.trunc(number(row?.['PV Modules per Tracker']))),northModules=Math.ceil(pvCount/2),southModules=Math.floor(pvCount/2),moduleWidth=positive(inputs.pv_module_width,1134),moduleLength=positive(inputs.pv_module_length,2384),moduleGap=Math.max(0,number(inputs.pv_module_gap,19)),motorGap=Math.max(0,number(row?.['Motor Gap (mm)'],number(inputs.motor_gap,400))),northEnd=positive(row?.['Main Tube C End North from Midplane'],motorGap/2+northModules*(moduleWidth+moduleGap)),southEnd=positive(row?.['Main Tube C End South from Midplane'],motorGap/2+southModules*(moduleWidth+moduleGap));
    const modules=[];for(const [side,count,sign] of [['North',northModules,1],['South',southModules,-1]])for(let index=0;index<count;index++){const near=motorGap/2+index*(moduleWidth+moduleGap),far=near+moduleWidth;modules.push({side,index:index+1,x1:-moduleLength/2,x2:moduleLength/2,y1:sign>0?near:-far,y2:sign>0?far:-near});}
    return {pvCount,northModules,southModules,moduleWidth,moduleLength,moduleGap,motorGap,northEnd,southEnd,trackerLength:northEnd+southEnd,modules,rails:[],bearings:[]};
  }

  function buildTrackerGeometry(project,row,meshAssets={}){
    const assets=meshAssets?.triangles?{slewDrive:meshAssets}:meshAssets;
    const model=topViewModel(project,row),geometry=createGeometry(),tubeZ=1510,moduleZ=1900,pileTop=1510;
    addGrid(geometry,model.northEnd,model.southEnd,model.moduleLength);
    for(const module of model.modules)addBox(geometry,[(module.x1+module.x2)/2,(module.y1+module.y2)/2,moduleZ],[Math.abs(module.x2-module.x1),Math.abs(module.y2-module.y1),32],COLORS.module);
    const zoneA=Math.max(0,number(row?.['Zone A End (120)'],Math.min(model.northEnd,model.southEnd))),zoneB=Math.max(zoneA,number(row?.['Zone B End (110)'],zoneA));
    const tube=(from,to,size)=>{if(to>from)addBox(geometry,[0,(from+to)/2,tubeZ],[size,to-from,size],COLORS.tube);};
    tube(-Math.min(model.southEnd,zoneA),Math.min(model.northEnd,zoneA),120);
    tube(Math.min(model.northEnd,zoneA),Math.min(model.northEnd,zoneB),110);tube(-Math.min(model.southEnd,zoneB),-Math.min(model.southEnd,zoneA),110);
    tube(Math.min(model.northEnd,zoneB),model.northEnd,100);tube(-model.southEnd,-Math.min(model.southEnd,zoneB),100);
    const rails=model.rails?.length?model.rails:Array.from(row?._module_support_rows||[]).map(item=>({type:String(item['Rail Type']||'Module Rail'),position:number(item['Signed Distance from Mid Plane (mm)']??item['Distance from Mid Plane (mm)']),warning:String(item['Clearance Status']||'')==='Warning'}));
    for(const rail of rails){if(assets.hatRail&&rail.type==='Hat Rail')addStlMesh(geometry,assets.hatRail,[0,rail.position,moduleZ-16],rail.warning?COLORS.bearingPile:COLORS.rail,{axes:[0,1,2],anchors:['center','center','max']});else addBox(geometry,[0,rail.position,moduleZ-82],[model.moduleLength*.72,70,55],rail.warning?COLORS.bearingPile:COLORS.rail);}
    if(assets.drivePile)addStlMesh(geometry,assets.drivePile,[0,0,pileTop],COLORS.drivePile,{axes:[0,1,2],anchors:['center','center','max']});else addBox(geometry,[0,0,pileTop/2],[240,300,pileTop],COLORS.drivePile);
    const bearings=model.bearings?.length?model.bearings:Array.from(row?._bearing_rows||[]).map(item=>({position:number(item['Distance from Main Post (mm)'])}));
    for(const bearing of bearings){if(assets.bearingDrive)addStlMesh(geometry,assets.bearingDrive,[0,bearing.position,pileTop],COLORS.bearingPile,{axes:[0,1,2],anchors:['center','center','max']});else{addBox(geometry,[0,bearing.position,pileTop/2],[190,230,pileTop],COLORS.bearingPile);addCylinderY(geometry,[0,bearing.position,tubeZ],145,260,COLORS.bearing,20);}}
    if(assets.slewDrive)addStlMesh(geometry,assets.slewDrive,[0,0,tubeZ],COLORS.slew);
    else{
      addBox(geometry,[0,0,tubeZ],[640,300,360],COLORS.slew);
      addCylinderY(geometry,[0,0,tubeZ],115,430,COLORS.bearing,20);
    }
    return {geometry,model};
  }

  function parseStl(buffer){
    const bytes=new Uint8Array(buffer),view=new DataView(buffer);let triangles=[];
    const binary=buffer.byteLength>=84&&84+view.getUint32(80,true)*50===buffer.byteLength;
    if(binary){
      const count=view.getUint32(80,true);triangles=new Array(count);
      for(let index=0;index<count;index++){
        const offset=84+index*50,normal=[view.getFloat32(offset,true),view.getFloat32(offset+4,true),view.getFloat32(offset+8,true)],vertices=[];
        for(let vertex=0;vertex<3;vertex++){const start=offset+12+vertex*12;vertices.push([view.getFloat32(start,true),view.getFloat32(start+4,true),view.getFloat32(start+8,true)]);}
        triangles[index]={normal,vertices};
      }
    }else{
      const text=new TextDecoder().decode(bytes),pattern=/facet\s+normal\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)[\s\S]*?vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)[\s\S]*?vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)[\s\S]*?vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/gi;let match;
      while((match=pattern.exec(text)))triangles.push({normal:match.slice(1,4).map(Number),vertices:[match.slice(4,7).map(Number),match.slice(7,10).map(Number),match.slice(10,13).map(Number)]});
    }
    if(!triangles.length)throw new Error('The STL file contains no triangles.');
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const triangle of triangles)for(const vertex of triangle.vertices)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],vertex[axis]);max[axis]=Math.max(max[axis],vertex[axis]);}
    return Object.freeze({triangles,min,max,size:max.map((value,index)=>value-min[index]),bytes:buffer.byteLength});
  }
  function addStlMesh(geometry,mesh,position,color,options={}){
    const sorted=[0,1,2].sort((a,b)=>mesh.size[b]-mesh.size[a]),axes=options.axes||[sorted[0],sorted[2],sorted[1]],anchors=options.anchors||['center','center','center'];
    const offsets=axes.map((axis,index)=>anchors[index]==='min'?mesh.min[axis]:(anchors[index]==='max'?mesh.max[axis]:(mesh.min[axis]+mesh.max[axis])/2));
    const mapVertex=vertex=>axes.map((axis,index)=>vertex[axis]-offsets[index]+position[index]);
    const mapNormal=normal=>axes.map(axis=>normal[axis]);
    for(const triangle of mesh.triangles){const vertices=triangle.vertices.map(mapVertex);addTriangle(geometry,vertices[0],vertices[1],vertices[2],color,mapNormal(triangle.normal));}
  }
  async function loadAsset(key,onProgress){
    const asset=PARTS[key];if(!asset)throw new Error('Unknown tracker model part.');if(meshCache.has(key))return meshCache.get(key);
    onProgress?.(`Loading ${asset.label}…`);const response=await fetch(asset.url,{cache:'no-cache'});if(!response.ok)throw new Error(`${asset.label} model is unavailable (${response.status}).`);
    const mesh=parseStl(await response.arrayBuffer());meshCache.set(key,mesh);return mesh;
  }
  async function loadTrackerAssets(onProgress,onMissing){
    const entries=await Promise.all(Object.keys(PARTS).map(async key=>{
      try{return [key,await loadAsset(key,onProgress)];}
      catch(error){onMissing?.(PARTS[key],error);return [key,null];}
    }));
    return Object.fromEntries(entries.filter(([,mesh])=>mesh));
  }

  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
  function lookAt(eye,center,up){const z=normalize(subtract(eye,center)),x=normalize(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
  function shader(gl,type,source){const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(value)||'WebGL shader error.');return value;}
  function program(gl){
    const value=gl.createProgram();gl.attachShader(value,shader(gl,gl.VERTEX_SHADER,'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uProjection;uniform mat4 uView;varying vec3 vNormal;varying vec3 vColor;void main(){gl_Position=uProjection*uView*vec4(aPosition,1.0);vNormal=aNormal;vColor=aColor;}'));gl.attachShader(value,shader(gl,gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 vNormal;varying vec3 vColor;void main(){vec3 light=normalize(vec3(0.35,-0.45,0.82));float diffuse=max(dot(normalize(vNormal),light),0.0);float shade=0.34+0.66*diffuse;gl_FragColor=vec4(vColor*shade,1.0);}'));gl.linkProgram(value);if(!gl.getProgramParameter(value,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(value)||'WebGL program error.');return value;
  }
  function bufferAttribute(gl,location,data){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);return buffer;}
  function binaryStl(geometry,label='LUMA Tracker'){
    const triangleCount=geometry.positions.length/9,buffer=new ArrayBuffer(84+triangleCount*50),bytes=new Uint8Array(buffer),view=new DataView(buffer),header=new TextEncoder().encode(label.slice(0,80));bytes.set(header,0);view.setUint32(80,triangleCount,true);
    for(let triangle=0;triangle<triangleCount;triangle++){
      const source=triangle*9,offset=84+triangle*50;for(let axis=0;axis<3;axis++)view.setFloat32(offset+axis*4,geometry.normals[source+axis],true);
      for(let value=0;value<9;value++)view.setFloat32(offset+12+value*4,geometry.positions[source+value],true);view.setUint16(offset+48,0,true);
    }
    return new Blob([buffer],{type:'model/stl'});
  }

  class TrackerViewer{
    constructor(container,options){
      this.container=container;this.project=options.project;this.row=options.row;this.variant=options.variant||'01';this.onStatus=options.onStatus||(()=>{});this.yaw=-.78;this.pitch=.52;this.distance=26000;this.target=[0,0,900];this.drag=null;this.vertexCount=0;this.disposed=false;
      this.canvas=document.createElement('canvas');this.canvas.className='tracker-3d-canvas';this.canvas.setAttribute('aria-label','Interactive 3D tracker model');container.replaceChildren(this.canvas);
      this.gl=this.canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:true,alpha:false});if(!this.gl)throw new Error('WebGL is not supported by this browser.');
      this.program=program(this.gl);this.locations={position:this.gl.getAttribLocation(this.program,'aPosition'),normal:this.gl.getAttribLocation(this.program,'aNormal'),color:this.gl.getAttribLocation(this.program,'aColor'),projection:this.gl.getUniformLocation(this.program,'uProjection'),view:this.gl.getUniformLocation(this.program,'uView')};
      this.bindEvents();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    }
    bindEvents(){
      this.canvas.addEventListener('pointerdown',event=>{this.drag={x:event.clientX,y:event.clientY};this.canvas.setPointerCapture(event.pointerId);});
      this.canvas.addEventListener('pointermove',event=>{if(!this.drag)return;this.yaw+=(event.clientX-this.drag.x)*.008;this.pitch=clamp(this.pitch+(event.clientY-this.drag.y)*.008,-1.35,1.35);this.drag={x:event.clientX,y:event.clientY};this.render();});
      const end=()=>{this.drag=null;};this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);
      this.canvas.addEventListener('wheel',event=>{event.preventDefault();this.distance=clamp(this.distance*Math.exp(event.deltaY*.001),2500,90000);this.render();},{passive:false});
    }
    resize(width,height){const ratio=Math.min(2,global.devicePixelRatio||1),cssWidth=width||this.container.clientWidth||900,cssHeight=height||Math.max(520,Math.round(cssWidth*.56));this.canvas.style.height=`${height||Math.max(520,Math.round(cssWidth*.56))}px`;this.canvas.width=Math.max(2,Math.round(cssWidth*ratio));this.canvas.height=Math.max(2,Math.round(cssHeight*ratio));this.render();}
    upload(geometry){const gl=this.gl;for(const buffer of this.buffers||[])gl.deleteBuffer(buffer);gl.useProgram(this.program);this.buffers=[bufferAttribute(gl,this.locations.position,geometry.positions),bufferAttribute(gl,this.locations.normal,geometry.normals),bufferAttribute(gl,this.locations.color,geometry.colors)];this.vertexCount=geometry.positions.length/3;}
    async setVariant(id){
      const previous=this.variant;if(!VARIANTS[id])throw new Error('Unknown slew drive model.');this.variant=id;this.onStatus({type:'loading',text:'Loading supplied tracker parts…'});
      try{const started=performance.now(),missing=[],assets=await loadTrackerAssets(message=>this.onStatus({type:'loading',text:message}),(asset,error)=>{missing.push(asset.label);console.warn(`${error.message} Using schematic fallback.`);});if(this.disposed||this.variant!==id)return;const built=buildTrackerGeometry(this.project,this.row,assets),meshes=Object.values(assets),triangles=meshes.reduce((sum,mesh)=>sum+mesh.triangles.length,0),bytes=meshes.reduce((sum,mesh)=>sum+mesh.bytes,0),fallback=missing.length?` · schematic fallback: ${missing.join(', ')}`:'';this.model=built.model;this.upload(built.geometry);this.fit();this.lastReady={type:'ready',text:`3D tracker ready · ${triangles.toLocaleString()} supplied-part triangles · ${(bytes/1024).toFixed(1)} KB${fallback}`,variant:id,triangles,bytes,missing,loadMs:Math.round(performance.now()-started)};this.onStatus(this.lastReady);}catch(error){this.variant=previous;this.onStatus({type:'error',text:error.message});throw error;}
    }
    update(project,row){this.project=project;this.row=row;return this.setVariant(this.variant);}
    fit(){if(!this.model)return;const radius=Math.max(this.model.moduleLength*.75,(this.model.northEnd+this.model.southEnd)*.55,2200);this.target=[0,(this.model.northEnd-this.model.southEnd)/2,900];this.distance=radius*1.8;this.render();}
    setView(name){if(name==='top'){this.yaw=0;this.pitch=1.535;}else if(name==='side'){this.yaw=Math.PI/2;this.pitch=.12;}else if(name==='front'){this.yaw=0;this.pitch=.12;}else if(name==='slew'){this.target=[0,0,1480];this.distance=2800;this.yaw=Math.PI/2;this.pitch=.10;}else{this.yaw=-.78;this.pitch=.52;}this.render();}
    render(){if(!this.vertexCount||!this.gl)return;const gl=this.gl,aspect=this.canvas.width/Math.max(1,this.canvas.height),horizontal=Math.cos(this.pitch)*this.distance,eye=[this.target[0]+Math.sin(this.yaw)*horizontal,this.target[1]-Math.cos(this.yaw)*horizontal,this.target[2]+Math.sin(this.pitch)*this.distance];gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.075,.095,.12,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.locations.projection,false,perspective(Math.PI/4,aspect,10,150000));gl.uniformMatrix4fv(this.locations.view,false,lookAt(eye,this.target,[0,0,1]));gl.drawArrays(gl.TRIANGLES,0,this.vertexCount);}
    async capture(id,width=2400,height=1400){const previous=this.variant,camera={yaw:this.yaw,pitch:this.pitch,distance:this.distance,target:[...this.target]},cssHeight=this.canvas.style.height,oldWidth=this.canvas.width,oldHeight=this.canvas.height;if(id!==previous){await this.setVariant(id);Object.assign(this,camera);this.target=[...camera.target];}this.canvas.width=width;this.canvas.height=height;this.render();const blob=await new Promise(resolve=>this.canvas.toBlob(resolve,'image/png'));this.canvas.width=oldWidth;this.canvas.height=oldHeight;this.canvas.style.height=cssHeight;if(previous!==id)await this.setVariant(previous);Object.assign(this,camera);this.target=[...camera.target];this.render();if(this.lastReady)this.onStatus(this.lastReady);if(!blob)throw new Error('The 3D image could not be generated.');return blob;}
    async exportStl(id='01'){const variant=VARIANTS[id];if(!variant)throw new Error('Unknown slew drive model.');this.onStatus({type:'loading',text:'Building assembled 3D tracker…'});try{const assets=await loadTrackerAssets(),built=buildTrackerGeometry(this.project,this.row,assets),blob=binaryStl(built.geometry,`LUMA Tracker - ${variant.label}`);if(this.lastReady)this.onStatus(this.lastReady);return blob;}catch(error){this.onStatus({type:'error',text:error.message});throw error;}}
    dispose(){this.disposed=true;this.resizeObserver?.disconnect();for(const buffer of this.buffers||[])this.gl.deleteBuffer(buffer);this.gl.deleteProgram(this.program);}
  }

  function mount(container,options){if(!container)throw new Error('A 3D viewer container is required.');return new TrackerViewer(container,options);}
  global.LumaTracker3D=Object.freeze({VARIANTS,PARTS,COLORS,parseStl,loadTrackerAssets,buildTrackerGeometry,binaryStl,mount});
})(typeof window!=='undefined'?window:globalThis);
