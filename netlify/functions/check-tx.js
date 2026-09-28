const USDT = "0x55d398326f99059ff775485246999027b3197955";
const ADDR = (process.env.NIVO_ADDR || "0x4E58b3522112BA59621d808E3687a566A87d7623").toLowerCase();
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST" };
  try {
    var b = JSON.parse(event.body || "{}");
    var hash = String(b.hash || "").trim();
    var amt = Number(b.amt || 0);
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      return out(false, "Bad hash");
    }
    if (!(amt > 0)) return out(false, "Bad amount");

    var rpc = await fetch("https://bsc-dataseed.binance.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [hash]
      })
    }).then(function (r) { return r.json(); });

    var rec = rpc.result;
    if (!rec) return out(false, "TX not found on BSC");
    if (String(rec.status) !== "0x1") return out(false, "TX failed on BSC");

    var logs = rec.logs || [];
    var hit = null;
    for (var i = 0; i < logs.length; i++) {
      var lg = logs[i];
      if (String(lg.address).toLowerCase() !== USDT) continue;
      if (!lg.topics || String(lg.topics[0]).toLowerCase() !== TRANSFER) continue;
      var to = "0x" + String(lg.topics[2] || "").slice(-40);
      if (to.toLowerCase() !== ADDR) continue;
      hit = lg;
      break;
    }
    if (!hit) return out(false, "No USDT to our address");
    var got = parseInt(hit.data, 16) / 1e18;
    if (Math.abs(got - amt) > 0.02) return out(false, "Amount mismatch got " + got);
    return out(true, "ok", got);
  } catch (e) {
    return out(false, String(e.message || e));
  }
};

function out(ok, reason, got) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: ok, reason: reason, got: got || 0 })
  };
}
