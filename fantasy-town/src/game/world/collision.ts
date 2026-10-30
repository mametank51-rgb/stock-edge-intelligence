type Rect=readonly [number,number,number,number];
// Collision approximations are intentionally separate from the flattened image.
export const BLOCKS:readonly Rect[]=[
 // Western water. The bridge at y=340–382 remains open.
 [78,0,200,150],[78,150,140,165],[0,0,78,150],
 // The lower river narrows towards its banks; preserve walkable woodland
 // beside it instead of blocking the whole enclosing rectangle.
 [138,407,174,60],[160,467,180,73],[188,540,152,80],[205,620,115,87],
 // Inn, stone hall, houses and smithy.
 [453,0,240,220],[759,0,225,235],[595,540,191,247],[898,610,167,180],
 // Fountain and its planted surround; market stalls and fences.
 [737,292,154,154],[933,302,48,73],[1016,300,55,75],[1088,354,45,83],
 [920,448,49,78],[986,467,66,82],[470,315,118,35],[478,430,112,35],
 [421,638,130,120],[1110,0,170,180],[1070,575,210,278],[0,712,330,141],
 // Trees, banks and isolated objects.
 [304,75,37,62],[1026,181,45,64],[324,371,48,54],[372,507,45,70],
 [366,0,75,128],[1208,320,72,100],[1094,288,30,68],
];

export const segments:readonly (readonly [number,number,number,number])[]=[
   [0,0,330,735],[735,0,0,1280],[2015,0,330,735],
   [0,853,330,735],[735,853,330,735],[1470,853,330,545],[2015,853,330,735],
  ];

/** Project source-image obstacles into the expanded world, clipping at crop edges. */
export const WORLD_BLOCKS:readonly Rect[]=segments.flatMap(([dx,dy,sx,width])=>BLOCKS.flatMap(([x,y,w,h])=>{
 const left=Math.max(x,sx),right=Math.min(x+w,sx+width);
 return right>left?[[dx+left-sx,dy+y,right-left,h] as const]:[];
}));
