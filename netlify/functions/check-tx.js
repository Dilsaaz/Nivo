const ADDR="0x4e58b3522112ba59621d808e3687a566a87d7623";
const USDT="0x55d398326f99059ff775485246999027b3197955";
const TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

exports.handler=async function(event){
  try{
    var b=JSON.parse(event.body||"{}");
    var hash=String(b.hash||"").trim();
    var want=Number(b.amt||0);
    if(hash.length<10||!want)return ok({ok:false,msg:"Bad hash"});
    var rec=await rpc("eth_getTransactionReceipt",[hash]);
    if(!rec||rec.status!=="0x1")return ok({ok:false,msg:"TX not found"});
    var to=String(rec.to||"").toLowerCase();
        if(to!==USDT.toLowerCase())return ok({ok:false,msg:"Not USDT BEP20"});
    var hit=null;
    (rec.logs||[]).forEach(function(l){
      if(String(l.topics&&l.topics[0]).toLowerCase()!==TOPIC)return;
      var dest=("0x"+String(l.topics[2]||"").slice(-40)).toLowerCase();
      var amt=Number(BigInt(l.data||"0x0"))/1e18;
      if(dest===ADDR)hit=amt;
    });
    if(hit==null)return ok({ok:false,msg:"Wrong address"});
    if(Math.abs(hit-want)>0.05)return ok({ok:false,msg:"Amount mismatch"});
    return ok({ok:true,amt:hit});
  }catch(e){
    return ok({ok:false,msg:"Scan fail"});
  }
};
function ok(j){return{statusCode:200,headers:{"Content-Type":"application/json"},body:JSON.stringify(j)};}
function rpc(method,params){
  return fetch("https://bsc-dataseed.binance.org/",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method:method,params:params})
  }).then(function(r){return r.json();}).then(function(j){return j.result;});
}
