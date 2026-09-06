(() => {
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_IMAGE_WIDTH = 1400;
  const MAX_IMAGE_HEIGHT = 1000;
  const token = () => localStorage.getItem("casharrowToken") || "";
  const headers = () => ({ Authorization: "Bearer " + token() });
  const jsonHeaders = () => ({ ...headers(), "Content-Type": "application/json" });
  const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const money = v => "UGX " + Number(v || 0).toLocaleString();

  async function api(path, options = {}) {
    const r = await fetch(path, { ...options, cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  function imageToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
      if (file.size > MAX_FILE_BYTES) return reject(new Error("Image is too large. Choose a photo under 8 MB."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read the selected photo."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Unable to process that photo."));
        img.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width, MAX_IMAGE_HEIGHT / img.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function ensureUI() {
    if (document.getElementById("aveilotMachineManager")) return;
    const card = document.createElement("div");
    card.className = "card";
    card.id = "aveilotMachineManager";
    card.innerHTML = '<h2>🏭 Machine Photos</h2><p class="muted">Choose a saved photo from your Gallery, or take a new photo with the Camera.</p><div id="machineManagerMessage" class="message"></div><div id="machineManagerList"><div class="empty">Loading machines...</div></div>';
    const container = document.querySelector("main.container");
    if (container) container.insertBefore(card, container.lastElementChild);
  }

  async function loadMachines() {
    ensureUI();
    const list = document.getElementById("machineManagerList");
    const message = document.getElementById("machineManagerMessage");
    try {
      const data = await api("/api/admin/products", { headers: headers() });
      const products = data.products || [];
      if (!products.length) return void (list.innerHTML = '<div class="empty">No machines found.</div>');
      list.innerHTML = products.map(p => {
        const id = esc(p.id);
        return `<div class="deposit machine-editor" data-product-id="${id}">
          <div class="machine-editor-top"><div><strong>${esc(p.code)} — ${esc(p.name)}</strong><div class="deposit-meta">Rental: ${money(p.rental_fee)} · ${esc(p.rental_days)} days · Return: ${money(p.return_amount)}</div></div>${p.image_url ? '<span class="approved">Photo set</span>' : '<span class="pending">No photo</span>'}</div>
          <div class="machine-photo-preview">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : '<span>📷 No machine photo yet</span>'}</div>
          <input id="gallery-${id}" class="machine-photo-input" type="file" accept="image/*" data-id="${id}" aria-label="Select ${esc(p.code)} photo from Gallery">
          <input id="camera-${id}" class="machine-photo-input" type="file" accept="image/*" capture="environment" data-id="${id}" aria-label="Take ${esc(p.code)} photo with Camera">
          <div class="action-row">
            <label for="gallery-${id}" class="machine-upload-button gallery-button">📁 Gallery</label>
            <label for="camera-${id}" class="machine-upload-button camera-button">📷 Camera</label>
            ${p.image_url ? `<button type="button" class="reject machine-remove-button" data-id="${id}">Remove Photo</button>` : ''}
          </div>
          <div class="reference-help">Gallery = choose an existing image. Camera = take a new picture.</div>
        </div>`;
      }).join("");
      list.querySelectorAll(".machine-photo-input").forEach(input => input.addEventListener("change", () => input.files?.[0] && savePhoto(input.dataset.id, input.files[0])));
      list.querySelectorAll(".machine-remove-button").forEach(button => button.addEventListener("click", () => removePhoto(button.dataset.id)));
    } catch (e) {
      message.textContent = e.message || "Unable to load machines.";
      list.innerHTML = '<div class="empty">Unable to load machine photos.</div>';
    }
  }

  async function getProduct(id) {
    const data = await api("/api/admin/products", { headers: headers() });
    return (data.products || []).find(p => String(p.id) === String(id));
  }

  async function savePhoto(id, file) {
    const message = document.getElementById("machineManagerMessage");
    try {
      message.textContent = "Preparing photo...";
      const p = await getProduct(id);
      if (!p) throw new Error("Machine not found.");
      const imageUrl = await imageToDataUrl(file);
      await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ series:p.series, code:p.code, name:p.name, description:p.description || "", image_url:imageUrl, rental_fee:p.rental_fee, rental_days:p.rental_days, return_amount:p.return_amount, active:p.active, featured:p.featured }) });
      message.textContent = `${p.code} photo updated successfully.`;
      await loadMachines();
    } catch (e) { message.textContent = e.message || "Unable to update photo."; }
  }

  async function removePhoto(id) {
    const message = document.getElementById("machineManagerMessage");
    try {
      const p = await getProduct(id);
      if (!p) throw new Error("Machine not found.");
      if (!confirm(`Remove the photo for ${p.code}?`)) return;
      await api(`/api/admin/products/${encodeURIComponent(id)}`, { method:"PATCH", headers:jsonHeaders(), body:JSON.stringify({ series:p.series, code:p.code, name:p.name, description:p.description || "", image_url:null, rental_fee:p.rental_fee, rental_days:p.rental_days, return_amount:p.return_amount, active:p.active, featured:p.featured }) });
      message.textContent = `${p.code} photo removed.`;
      await loadMachines();
    } catch (e) { message.textContent = e.message || "Unable to remove photo."; }
  }

  function styles() {
    if (document.getElementById("aveilot-machine-manager-styles")) return;
    const s = document.createElement("style"); s.id = "aveilot-machine-manager-styles";
    s.textContent = '.machine-editor{margin-top:12px}.machine-editor-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.machine-photo-preview{margin-top:12px;border:1px solid #e1e8f2;border-radius:14px;min-height:170px;background:#f5f8fc;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#718096;font-size:13px}.machine-photo-preview img{display:block;width:100%;height:220px;object-fit:contain}.machine-photo-input{position:absolute;left:-10000px;width:1px;height:1px;opacity:0}.machine-upload-button{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-top:10px}.machine-remove-button{margin-top:10px}@media(max-width:480px){.machine-photo-preview{min-height:150px}.machine-photo-preview img{height:190px}.machine-upload-button{width:100%;margin-top:8px}}';
    document.head.appendChild(s);
  }

  function start() { if (!document.querySelector("main.container")) return; styles(); ensureUI(); loadMachines(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true }); else start();
})();
