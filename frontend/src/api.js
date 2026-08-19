import WebApp from "@twa-dev/sdk";

// Backend serveringiz manzili — deploy qilgach shu yerni yangilang
// yoki .env orqali VITE_API_URL bilan bering.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function request(path, body = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, initData: WebApp.initData }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Server xatosi");
  return data;
}

async function getRequest(path) {
  const res = await fetch(`${API_URL}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Server xatosi");
  return data;
}

export const api = {
  auth: () => request("/api/auth"),
  spin: () => request("/api/spin"),
  sponsorChannels: () => getRequest("/api/sponsor-channels"),
  sponsorStatus: () => request("/api/sponsor-status"),
  referralInfo: () => request("/api/referral-info"),
  skins: () => getRequest("/api/skins"),
  withdraw: (payload) => request("/api/withdraw", payload),
  myWithdrawals: () => request("/api/my-withdrawals"),
};
