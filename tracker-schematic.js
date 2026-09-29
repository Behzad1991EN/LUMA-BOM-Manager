'use strict';

(function(global){
  const COLORS=Object.freeze({
    background:'#20272F',
    module:'#246BFD',
    moduleFill:'#152C54',
    tube:'#00D05A',
    rail:'#D24AD6',
    drivePile:'#FF9A1C',
    bearingPile:'#FF3131',
    dimension:'#34E35D',
    bearingDimension:'#FF3131',
    text:'#F5F7FA',
    muted:'#B7C0CA',
  });
  const TUBE_STYLES=Object.freeze({
    0:Object.freeze({code:'A',label:'Torque Tube A / Connection',profile:120,fill:'#0A663A',stroke:'#00D05A',layer:'TORQUE_TUBE_A',minimumPixels:12}),
    1:Object.freeze({code:'B',label:'Torque Tube B',profile:110,fill:'#12626A',stroke:'#27D3C2',layer:'TORQUE_TUBE_B',minimumPixels:9}),
    2:Object.freeze({code:'C',label:'Torque Tube C',profile:100,fill:'#28537A',stroke:'#52A9FF',layer:'TORQUE_TUBE_C',minimumPixels:6}),
  });

  function number(value,fallback=0){
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function positive(value,fallback){
    const parsed=number(value,fallback);
    return parsed>0?parsed:fallback;
  }
  function integer(value,fallback=0){return Math.max(0,Math.trunc(number(value,fallback)));}
  function clean(value){
    const parsed=number(value,0);
    if(Number.isInteger(parsed))return String(parsed);
    return String(Math.round(parsed*1000)/1000);
  }
  function xml(value){
    return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  }
  function dxfText(value){return String(value??'').replace(/[\r\n]+/g,' ').replace(/[^\x20-\x7E]/g,' ');}

  function buildTopViewModel(project,row){
    const inputs=project?.inputs||{};
    const pvCount=integer(row?.['PV Modules per Tracker']);
    const northModules=integer(row?.['Modules / North Side'],Math.ceil(pvCount/2));
    const southModules=integer(row?.['Modules / South Side'],Math.floor(pvCount/2));
    const moduleWidth=positive(inputs.pv_module_width,1134);
    const moduleLength=positive(inputs.pv_module_length,2384);
    const moduleGap=Math.max(0,number(inputs.pv_module_gap,19));
    const motorGap=Math.max(0,number(row?.['Motor Gap (mm)'],number(inputs.motor_gap,400)));
    const targetEndGap=Math.max(0,number(inputs.target_end_gap,50));
    const modules=[];
    function addSide(side,count,sign){
      for(let index=0;index<count;index++){
        const near=motorGap/2+index*(moduleWidth+moduleGap);
        const far=near+moduleWidth;
        modules.push({side,index:index+1,label:`${side==='North'?'N':'S'}${index+1}`,x1:-moduleLength/2,x2:moduleLength/2,y1:sign>0?near:-far,y2:sign>0?far:-near});
      }
    }
    addSide('North',northModules,1);
    addSide('South',southModules,-1);
    const northModuleEnd=northModules?motorGap/2+northModules*moduleWidth+Math.max(0,northModules-1)*moduleGap:motorGap/2;
    const southModuleEnd=southModules?motorGap/2+southModules*moduleWidth+Math.max(0,southModules-1)*moduleGap:motorGap/2;
    let northEnd=positive(row?.['Main Tube C End North from Midplane'],northModuleEnd+targetEndGap);
    let southEnd=positive(row?.['Main Tube C End South from Midplane'],southModuleEnd+targetEndGap);
    const trackerLength=positive(row?.['Tracker Length (mm)'],northEnd+southEnd);
    const requiredNorth=positive(row?.['Required North Side'],northModuleEnd+targetEndGap),requiredSouth=positive(row?.['Required South Side'],southModuleEnd+targetEndGap);
    if(Math.abs(northEnd+southEnd-trackerLength)>.5&&Math.abs(requiredNorth+requiredSouth-trackerLength)<=.5){northEnd=requiredNorth;southEnd=requiredSouth;}
    const rails=Array.from(row?._module_support_rows||[]).map(rail=>({
      side:String(rail.Side||''),
      type:String(rail['Rail Type']||'Module Rail'),
      position:number(rail['Signed Distance from Mid Plane (mm)']??rail['Distance from Mid Plane (mm)']),
      warning:String(rail['Clearance Status']||'')==='Warning',
    })).sort((a,b)=>b.position-a.position);
    const bearings=Array.from(row?._bearing_rows||[]).map((bearing,index)=>({
      side:String(bearing.Side||''),
      pair:integer(bearing['Pair No.'],index+1),
      position:number(bearing['Distance from Main Post (mm)']),
      type:String(bearing['Bearing Type']||'Bearing Pile'),
    })).sort((a,b)=>b.position-a.position);
    const bearingSegments=[];
    for(const side of ['North','South']){
      const sideBearings=bearings.filter(item=>item.side===side).sort((a,b)=>Math.abs(a.position)-Math.abs(b.position));
      let previous=0;
      sideBearings.forEach(item=>{
        bearingSegments.push({side,from:previous,to:item.position,distance:Math.abs(item.position-previous),pair:item.pair});
        previous=item.position;
      });
    }
    const pilePositions=[...new Set([0,...bearings.map(item=>item.position)])].sort((a,b)=>b-a);
    const pileSegments=[];
    for(let index=0;index<pilePositions.length-1;index++){
      const from=pilePositions[index],to=pilePositions[index+1];
      pileSegments.push({from,to,distance:Math.abs(from-to)});
    }
    const zoneA=Math.max(0,number(row?.['Zone A End (120)'])),zoneB=Math.max(zoneA,number(row?.['Zone B End (110)'],zoneA));
    const firstPieceName=String(row?.['First Piece Name']||'Torque Tube A'),firstPieceLength=positive(row?.['First Piece Length'],zoneA),firstPieceStart=Math.max(0,zoneA-firstPieceLength);
    const overlapAb=Math.max(0,number(row?.['Overlap A/B (mm)'])),overlapBc=Math.max(0,number(row?.['Overlap B/C (mm)']));
    const tubeBStart=Math.max(0,zoneA-overlapAb),tubeCStart=Math.max(0,number(row?.['Main Tube C Start from Midplane']??row?.['Base Until C'],zoneB-overlapBc));
    const tubeSegments=[];
    const addTubeSegment=(side,sign,fromDistance,toDistance,label,track)=>{
      if(toDistance-fromDistance>.5)tubeSegments.push({side,from:sign*fromDistance,to:sign*toDistance,distance:toDistance-fromDistance,label,track,profile:TUBE_STYLES[track].profile});
    };
    for(const [side,sign,end] of [['North',1,northEnd],['South',-1,southEnd]]){
      addTubeSegment(side,sign,firstPieceStart,zoneA,firstPieceName,0);
      addTubeSegment(side,sign,tubeBStart,zoneB,'Torque Tube B',1);
      const required=Math.max(0,number(row?.[`Main Tube C Required Length ${side}`],Math.max(0,end-tubeCStart)));
      addTubeSegment(side,sign,tubeCStart,tubeCStart+required,'Torque Tube C',2);
    }
    return Object.freeze({
      pvCount,northModules,southModules,moduleWidth,moduleLength,moduleGap,motorGap,targetEndGap,
      northModuleEnd,southModuleEnd,northEnd,southEnd,trackerLength,modules,rails,bearings,bearingSegments,pileSegments,tubeSegments,
      bearingMode:String(row?.['Bearing Rule Mode']||'Symmetrical'),
      bearingSource:String(row?.['Bearing Rule Source']||''),
    });
  }

  function buildTopViewSvg(model,width=1400,height=900){
    const drawLeft=95,drawRight=width-95,drawCenterY=height/2+15,drawHeight=Math.max(260,height-340);
    const longitudinal=[-model.southEnd,model.northEnd,...model.modules.flatMap(item=>[item.y1,item.y2]),...model.tubeSegments.flatMap(item=>[item.from,item.to]),...model.bearings.map(item=>item.position),0];
    const minLong=Math.min(...longitudinal),maxLong=Math.max(...longitudinal),totalExtent=Math.max(1,maxLong-minLong);
    const scale=Math.min((drawRight-drawLeft)/totalExtent,drawHeight/Math.max(model.moduleLength,1));
    const sx=position=>drawLeft+(position-minLong)*scale;
    const sy=crossPosition=>drawCenterY+crossPosition*scale;
    const moduleTop=Math.min(sy(-model.moduleLength/2),sy(model.moduleLength/2)),moduleBottom=Math.max(sy(-model.moduleLength/2),sy(model.moduleLength/2));
    const parts=[];
    const line=(x1,y1,x2,y2,stroke,widthValue=1,dash='')=>parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${widthValue}"${dash?` stroke-dasharray="${dash}"`:''}/>`);
    const rect=(x1,y1,x2,y2,fill,stroke,strokeWidth=1,attributes='')=>parts.push(`<rect x="${Math.min(x1,x2)}" y="${Math.min(y1,y2)}" width="${Math.abs(x2-x1)}" height="${Math.abs(y2-y1)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${attributes}/>`);
    const text=(x,y,value,size=12,color=COLORS.text,anchor='middle',weight='normal')=>parts.push(`<text x="${x}" y="${y}" fill="${color}" font-family="Calibri,Arial,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="middle">${xml(value)}</text>`);
    const horizontalDimension=(y,x1,x2,label,color=COLORS.dimension,labelSide=-1)=>{
      const left=Math.min(x1,x2),right=Math.max(x1,x2),arrow=8;
      line(left,y,right,y,color,1.5);line(left,y,left+arrow*1.6,y-arrow,color,1.5);line(left,y,left+arrow*1.6,y+arrow,color,1.5);line(right,y,right-arrow*1.6,y-arrow,color,1.5);line(right,y,right-arrow*1.6,y+arrow,color,1.5);text((left+right)/2,y+labelSide*16,label,13,color,'middle','bold');
    };
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${COLORS.background}"/>`);
    text(32,34,'LUMA Tracker Schematic — Horizontal Top View',22,COLORS.text,'start','bold');
    text(32,64,`${model.pvCount} PV modules | ${model.bearingMode} bearing layout`,13,COLORS.muted,'start');
    text(32,88,'Dimension values are in millimetres. Torque-tube lengths are above; pile-to-pile distances are below.',11,COLORS.muted,'start');
    model.modules.forEach(module=>{
      rect(sx(module.y1),sy(module.x1),sx(module.y2),sy(module.x2),COLORS.moduleFill,COLORS.module,2);
      text(sx((module.y1+module.y2)/2),drawCenterY,module.label,10,'#C9D8FF','middle','bold');
    });
    [...model.tubeSegments].sort((a,b)=>b.track-a.track).forEach(segment=>{
      const style=TUBE_STYLES[segment.track],displayWidth=Math.max(style.minimumPixels,style.profile*scale);
      rect(sx(segment.from),drawCenterY-displayWidth/2,sx(segment.to),drawCenterY+displayWidth/2,style.fill,style.stroke,2,` data-torque-tube="${style.code}" data-profile="${style.profile}"`);
    });
    line(sx(minLong),drawCenterY,sx(maxLong),drawCenterY,'#C5FFD9',.75,'7 5');
    const railHalf=model.moduleLength*.22;
    model.rails.forEach(rail=>line(sx(rail.position),sy(-railHalf),sx(rail.position),sy(railHalf),rail.warning?COLORS.bearingPile:COLORS.rail,rail.warning?5:3));
    const pile=(position,color)=>{
      const x=sx(position),halfLong=Math.max(4,55*scale),halfCross=Math.max(14,150*scale);
      rect(x-halfLong,drawCenterY-halfCross,x+halfLong,drawCenterY+halfCross,'none',color,2);line(x,drawCenterY-halfCross-6,x,drawCenterY+halfCross+6,color,2);
    };
    pile(0,COLORS.drivePile);model.bearings.forEach(item=>pile(item.position,COLORS.bearingPile));
    model.tubeSegments.forEach(segment=>{
      const dimensionY=moduleTop-46-segment.track*36,x1=sx(segment.from),x2=sx(segment.to);
      line(x1,dimensionY+5,x1,moduleTop-8,COLORS.dimension,1);line(x2,dimensionY+5,x2,moduleTop-8,COLORS.dimension,1);
      horizontalDimension(dimensionY,x1,x2,clean(segment.distance),COLORS.dimension,-1);
    });
    const pileDimensionY=moduleBottom+64;
    model.pileSegments.forEach(segment=>{
      const x1=sx(segment.from),x2=sx(segment.to);
      line(x1,moduleBottom+8,x1,pileDimensionY-5,COLORS.dimension,1);line(x2,moduleBottom+8,x2,pileDimensionY-5,COLORS.dimension,1);
      horizontalDimension(pileDimensionY,x1,x2,clean(segment.distance),COLORS.dimension,1);
    });
    const legends=[
      [COLORS.module,'PV Module'],[TUBE_STYLES[0].stroke,'Tube A / Connection — 120 × 120'],[TUBE_STYLES[1].stroke,'Tube B — 110 × 110'],[TUBE_STYLES[2].stroke,'Tube C — 100 × 100'],
      [COLORS.rail,'Module Rail'],[COLORS.drivePile,'Drive Pile'],[COLORS.bearingPile,'Bearing Pile'],[COLORS.dimension,'Dimensions'],
    ];
    const legendTop=height-80,columnWidth=(width-100)/4;
    legends.forEach(([color,label],index)=>{const column=index%4,row=Math.floor(index/4),x=50+column*columnWidth,y=legendTop+row*25;line(x,y,x+24,y,color,4);text(x+32,y,label,10,COLORS.text,'start');});
    text(width-30,height-20,'TOP VIEW — NOT FOR FABRICATION',11,COLORS.muted,'end','bold');
    parts.push('</svg>');
    return parts.join('');
  }

  function buildTopViewDxf(model){
    const entities=[];
    const pair=(code,value)=>{entities.push(String(code),String(value));};
    const line=(layer,x1,y1,x2,y2)=>{pair(0,'LINE');pair(8,layer);pair(10,clean(x1));pair(20,clean(y1));pair(30,0);pair(11,clean(x2));pair(21,clean(y2));pair(31,0);};
    const rectangle=(layer,x1,y1,x2,y2)=>{line(layer,x1,y1,x2,y1);line(layer,x2,y1,x2,y2);line(layer,x2,y2,x1,y2);line(layer,x1,y2,x1,y1);};
    const text=(layer,x,y,height,value,rotation=0)=>{pair(0,'TEXT');pair(8,layer);pair(10,clean(x));pair(20,clean(y));pair(30,0);pair(40,clean(height));pair(1,dxfText(value));if(rotation){pair(50,clean(rotation));}};
    const horizontalDimension=(y,x1,x2,label,layer='DIMENSIONS',labelSide=1)=>{
      const left=Math.min(x1,x2),right=Math.max(x1,x2),arrowWidth=65,arrowLength=125;
      line(layer,left,y,right,y);
      line(layer,left,y,left+arrowLength,y-arrowWidth);line(layer,left,y,left+arrowLength,y+arrowWidth);
      line(layer,right,y,right-arrowLength,y-arrowWidth);line(layer,right,y,right-arrowLength,y+arrowWidth);
      text(layer,(left+right)/2-String(label).length*30,y+labelSide*150,120,label);
    };
    model.modules.forEach(module=>rectangle('PV_MODULE',module.y1,-module.x2,module.y2,-module.x1));
    [...model.tubeSegments].sort((a,b)=>b.track-a.track).forEach(segment=>{
      const style=TUBE_STYLES[segment.track],half=style.profile/2;
      rectangle(style.layer,segment.from,-half,segment.to,half);
    });
    line('CENTERLINE',-model.southEnd,0,model.northEnd,0);
    const railHalf=model.moduleLength*.22;
    model.rails.forEach(rail=>line(rail.warning?'WARNING':'MODULE_RAIL',rail.position,-railHalf,rail.position,railHalf));
    rectangle('DRIVE_PILE',-55,-150,55,150);line('DRIVE_PILE',0,-190,0,190);
    model.bearings.forEach(item=>{rectangle('BEARING_PILE',item.position-50,-125,item.position+50,125);line('BEARING_PILE',item.position,-165,item.position,165);});
    model.tubeSegments.forEach(segment=>{
      const dimensionY=model.moduleLength/2+430+segment.track*300;
      line('DIMENSIONS',segment.from,model.moduleLength/2+80,segment.from,dimensionY-80);line('DIMENSIONS',segment.to,model.moduleLength/2+80,segment.to,dimensionY-80);
      horizontalDimension(dimensionY,segment.from,segment.to,clean(segment.distance),'DIMENSIONS',1);
    });
    const pileDimensionY=-model.moduleLength/2-500;
    model.pileSegments.forEach(segment=>{
      line('PILE_DIM',segment.from,-model.moduleLength/2-80,segment.from,pileDimensionY+80);line('PILE_DIM',segment.to,-model.moduleLength/2-80,segment.to,pileDimensionY+80);
      horizontalDimension(pileDimensionY,segment.from,segment.to,clean(segment.distance),'PILE_DIM',-1);
    });
    text('TEXT',-model.southEnd,model.moduleLength/2+1550,180,`LUMA TRACKER HORIZONTAL TOP VIEW - ${model.pvCount} PV`);
    text('TEXT',-model.southEnd,model.moduleLength/2+1320,100,'DIMENSIONS IN MILLIMETRES - NOT FOR FABRICATION');
    const layers=[['0',7],['PV_MODULE',5],['TORQUE_TUBE_A',3],['TORQUE_TUBE_B',4],['TORQUE_TUBE_C',5],['CENTERLINE',3],['MODULE_RAIL',6],['WARNING',1],['DRIVE_PILE',30],['BEARING_PILE',1],['DIMENSIONS',3],['PILE_DIM',3],['TEXT',7]];
    const output=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1009','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','TABLES','0','TABLE','2','LAYER','70',String(layers.length)];
    layers.forEach(([name,color])=>output.push('0','LAYER','2',name,'70','0','62',String(color),'6','CONTINUOUS'));
    output.push('0','ENDTAB','0','ENDSEC','0','SECTION','2','ENTITIES',...entities,'0','ENDSEC','0','EOF');
    return output.join('\r\n')+'\r\n';
  }

  global.LumaTrackerSchematic=Object.freeze({COLORS,buildTopViewModel,buildTopViewSvg,buildTopViewDxf});
})(typeof window!=='undefined'?window:globalThis);
