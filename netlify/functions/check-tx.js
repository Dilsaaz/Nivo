const USDT = "0x55d398326f99059ff775485246999027b3197955";
const ADDR = (process.env.NIVO_ADDR || "0x4E58b3522112BA59621d808E3687a566A87d7623").toLowerCase();

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST" };
  }
  var key = process.env.BSC_API_KEY;
  if (!key) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "No API key" }) };
  }
  try {
    var b = JSON.parse(event.body || "{}");
    var hash = String(b.hash || "").trim();
    var amt = Number(b.amt || 0);
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "Bad hash" }) };
    }
    if (!(amt > 0)) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "Bad amount" }) };
    }
    var stUrl = "https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=" + hash + "&apikey=" + key;
    var st = await (await fetch(stUrl)).json();
    if (String(st.result && st.result.status) !== "1") {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "TX not success on BSC" }) };
    }
    var tkUrl = "https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=" + USDT + "&address=" + ADDR + "&page=1&offset=50&sort=desc&apikey=" + key;
    var tk = await (await fetch(tkUrl)).json();
    var list = Array.isArray(tk.result) ? tk.result : [];
    var hit = list.filter(function (x) {
      return String(x.hash).toLowerCase() === hash.toLowerCase();
    })[0];
    if (!hit) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "Hash not USDT to our address" }) };
    }
    if (String(hit.to).toLowerCase() !== ADDR) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "Wrong receiver" }) };
    }
    var got = Number(hit.value) / 1e18;
    if (Math.abs(got - amt) > 0.02) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "Amount mismatch" }) };
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, got: got }) };
  } catch (e) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, reason: "Scan error" }) };
  }
};
