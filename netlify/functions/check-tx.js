const ADDR="0x4e58b3522112ba59621d808e3687a566a87d7623";
const USDT="0x55d398326f99059ff775485246999027b3197955";
const TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

exports.handler=async function(event){
  try{
    var b=JSON.parse(event.body||"{}");
    var hash=String(b.hash||"").trim();
    var want=Number(b.amt||0);
    if(hash.length<10||!want)return out({ok:false,msg:"Bad hash"});
    var rec=await rpc("eth_getTransactionReceipt",[hash]);
    if(!rec||rec.status!=="0x1")return out({ok:false,msg:"TX not found"});
    var hit=null;
    (rec.logs||[]).forEach(function(l){
      var t0=String((l.topics&&l.topics[0])||"").toLowerCase();
      if(t0!==TOPIC)return;
      if(String(l.address||"").toLowerCase()!==USDT)return;
      var dest=("0x"+String(l.topics[2]||"").slice(-40)).toLowerCase();
      if(dest!==ADDR)return;
      hit=hexAmt(l.data);
    });
    if(hit==null)return out({ok:false,msg:"Wrong address"});
    if(Math.abs(hit-want)>0.2)return out({ok:false,msg:"Amount mismatch"});
    return out({ok:true,amt:hit});
  }catch(e){
    return out({ok:false,msg:"Scan fail"});
  }
};

function hexAmt(h){
  h=String(h||"0x0").replace(/^0x/i,"").replace(/^0+/,"");
  if(!h)return 0;
  if(h.length<=18)return Number("0."+h.padStart(18,"0"));
  return Number(h.slice(0,-18)+"."+h.slice(-18));
}
function out(j){
  return{statusCode:200,headers:{"Content-Type":"application/json"},body:JSON.stringify(j)};
}
async function rpc(method,params){
  var r=await fetch("https://bsc-dataseed.binance.org/",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method:method,params:params})
  });
  var j=await r.json();
  return j.result;
}
