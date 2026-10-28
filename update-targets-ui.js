// Browsing never expands continuous refresh scope. Legacy registry entries stay intact.
function getWatchUpdateCodes(){try{const local=workspace.read().watch||[];return EdgePerformance.codes([...(state.data?.watchlist||[]),...local]);}catch{return EdgePerformance.codes(state.data?.watchlist||[]);}}
function getPriorityUpdateCodes(){return EdgePerformance.universe(__modules.nikkei225.UNIVERSE,getWatchUpdateCodes(),state.route==='stock'?state.ticker:null).priority;}
function getAutoUpdateCodes(){return getPriorityUpdateCodes();}
function getFullUpdateCodes(){return EdgePerformance.universe(__modules.nikkei225.UNIVERSE,getWatchUpdateCodes()).full;}
function updateInfo(code){return __modules.nikkei225.rows().find(r=>r.code===code)||{code,name:StockNames.display(code,code),sector:'保存済み閲覧銘柄'};}
function normalizeFullUpdateJob(reset=false){if(!fullUpdateJob)return;Object.assign(fullUpdateJob,EdgePerformance.normalizeJob(fullUpdateJob,getFullUpdateCodes(),{reset}));if(!fullUpdateJob.running&&fullUpdateJob.status==='complete'&&EdgePerformance.counts(fullUpdateJob).remaining>0)fullUpdateJob.status='paused';}
