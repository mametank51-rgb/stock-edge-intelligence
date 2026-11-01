// Keep world textures below 1024px per side for devices with small GPU limits.
export const MAP_TILE_WIDTH=917,MAP_TILE_HEIGHT=853;
export const MAP_TILES=Array.from({length:6},(_,index)=>{
 const column=index%3,row=Math.floor(index/3);
 return {key:`town-${column}-${row}`,x:column*MAP_TILE_WIDTH,y:row*MAP_TILE_HEIGHT};
});
