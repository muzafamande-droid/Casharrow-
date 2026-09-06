(() => {
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_IMAGE_WIDTH = 1200;
  const MAX_IMAGE_HEIGHT = 800;
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
      if (file.size > MAX_FILE_BYTES) return reject(new Error("Choose a photo under 8 MB."));
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
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function ensureUI() {
    // admin.html already provides these containers. Do not create a second card or duplicate IDs.
    if (!document.getElementById("machineManagerList")) return false;
    return true;
  }

  async function getProduct(id) {
    const data = await api("/api/admin/products", { headers: headers() });
    return (data.products || []).find(p => String(p.id) === String(id));
  }

  function renderProduct(p) {
    const id = esc(p.id);
    return `<div class="deposit machine-editor" data-product-id="${id}">
      <div class="machine-editor-top">
        <div><strong>${esc(p.code)} — ${esc(p.name)}</strong><div class="deposit-meta">Current rental: ${money(p.rental_fee)} · ${esc(p.rental_days)} days · Return: ${money(p.return_amount)}</div></div>
        <span class="${p.active ? "approved" : "pending"}">${p.active ? "🟢 Active" : "🔴 Inactive"}</span>
      </div>
      <div class="machine-photo-preview">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : '<span>📷 No machine photo yet</span>'}</div>
      <input id="gallery-${id}" class="machine-photo-input" type="file" accept="image/*" data-id="${id}" aria-label="Choose ${esc(p.code)} photo from Gallery">
      <input id="camera-${id}" class="machine-photo-input" type="file" accept="image/*" capture="environment" data-id="${id}" aria-label="Take ${esc(p.code)} photo with Camera">
      <div class="action-row">
        <label for="gallery-${id}" class="machine-upload-button">📁 Gallery</label>
        <label for="camera-${id}" class="machine-upload-button">📷 Camera</label>
        ${p.image_url ? `<button type="button" class="btn danger machine-remove-button" data-id="${id}">Remove Photo</button>` : ""}
      </div>
      <div class="machine-edit-grid">
        <label>Name<input data-field="name" value="${esc(p.name)}"></label>
        <label>Rental price (UGX)<input data-field="rental_fee" type="number" min="1" step="1" value="${esc(p.rental_fee)}"></label>
        <label>Rental days<input data-field="rental_days" type="number" min="1" step="1" value="${esc(p.rental_days)}"></label>
        <label>Return amount (UGX)<input data-field="return_amount" type="number" min="0" step="1" value="${esc(p.return_amount)}"></label>
      </div>
      <label class="machine-description">Description<textarea data-field="description" rows="3" placeholder="Describe this machine for members">${esc(p.description || "")}</textarea></label>
      <div class="machine-switches">
        <label><input data-field="active" type="checkbox" ${p.active ? "checked" : ""}> 🟢 Active in catalog</label>
        <label><input data-field="featured" type="checkbox" ${p.featured ? "checked" : ""}> ⭐ Featured machine</label>
      </div>
      <button type="button" class="btn machine-save-button" data-id="${id}">💾 Save Changes</button>
      <div class="reference-help">You can change the photo, name, price, rental period, return amount, description and visibility directly here.</div>
    </div>`;
  }

  async function loadMachines() {
    if (!ensureUI()) return;
    const list = document.getElementById("machineManagerList");
    const message = document.getElementById("machineManagerMessage");
    try {
      list.innerHTML = '<div class="empty">Loading machines...</div>';
      const data = await api("/api/admin/products", { headers: headers() });
      const products = data.products || [];
      list.innerHTML = products.length ? products.map(renderProduct).join("") : '<div class="empty">No machines found.</div>';
      list.querySelectorAll(".machine-photo-input").forEach(input => input.addEventListener("change", () => input.files?.[0] && savePhoto(input.dataset.id, input.files[0])));
      list.querySelectorAll(".machine-remove-button").forEach(button => button.addEventListener("click", () => removePhoto(button.dataset.id)));
      list.querySelectorAll(".machine-save-button").forEach(button => button.addEventListener("click", () => saveProduct(button.dataset.id)));
    } catch (e) {
      message.textContent = e.message || "Unable to load machines.";
      list.innerHTML = '<div class="empty">Unable to load machine catalog.</div>';
    }
  }

  async function savePhoto(id, file) {
    const message = document.getElementById("machineManagerMessage");
    try {
      message.textContent = "Preparing photo...";
      const p = await getProduct(id);
      if (!p) throw new Error("Machine not found.");
      const imageUrl = await imageToDataUrl(file);
      await updateProduct(p, { image_url: imageUrl });
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
      await updateProduct(p, { image_url: null });
      message.textContent = `${p.code} photo removed.`;
      await loadMachines();
    } catch (e) { message.textContent = e.message || "Unable to remove photo."; }
  }

  async function saveProduct(id) {
    const message = document.getElementById("machineManagerMessage");
    const editor = document.querySelector(`.machine-editor[data-product-id="${CSS.escape(String(id))}"]`);
    if (!editor) return;
    try {
      const p = await getProduct(id);
      if (!p) throw new Error("Machine not found.");
      const value = field => editor.querySelector(`[data-field="${field}"]`);
      const name = value("name").value.trim();
      const rental_fee = Number(value("rental_fee").value);
      const rental_days = Number(value("rental_days").value);
      const return_amount = Number(value("return_amount").value);
      const description = value("description").value.trim();
      const active = value("active").checked;
      const featured = value("featured").checked;
      if (!name) throw new Error("Machine name is required.");
      if (!Number.isFinite(rental_fee) || rental_fee <= 0) throw new Error("Enter a valid rental price.");
      if (!Number.isInteger(rental_days) || rental_days <= 0) throw new Error("Rental days must be a whole number above 0.");
      if (!Number.isFinite(return_amount) || return_amount < 0) throw new Error("Enter a valid return amount.");
      message.textContent = `Saving ${p.code}...`;
      await updateProduct(p, { name, description, rental_fee, rental_days, return_amount, active, featured });
      message.textContent = `${p.code} changes saved successfully.`;
      await loadMachines();
    } catch (e) { message.textContent = e.message || "Unable to save machine."; }
  }

  async function updateProduct(p, changes) {
    const body = {
      series: p.series,
      code: p.code,
      name: changes.name ?? p.name,
      description: changes.description ?? p.description ?? "",
      image_url: Object.prototype.hasOwnProperty.call(changes, "image_url") ? changes.image_url : (p.image_url || null),
      rental_fee: changes.rental_fee ?? p.rental_fee,
      rental_days: changes.rental_days ?? p.rental_days,
      return_amount: changes.return_amount ?? p.return_amount,
      active: changes.active ?? p.active,
      featured: changes.featured ?? p.featured
    };
    await api(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: "PATCH", headers: jsonHeaders(), body: JSON.stringify(body) });
  }

  function styles() {
    if (document.getElementById("aveilot-machine-manager-styles")) return;
    const s = document.createElement("style");
    s.id = "aveilot-machine-manager-styles";
    s.textContent = `.machine-editor{margin-top:12px}.machine-editor-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.machine-photo-preview{margin-top:12px;border:1px solid #e1e8f2;border-radius:14px;min-height:170px;background:#f5f8fc;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#718096;font-size:13px}.machine-photo-preview img{display:block;width:100%;height:220px;object-fit:contain}.machine-photo-input{position:absolute;left:-10000px;width:1px;height:1px;opacity:0}.machine-upload-button{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:10px 14px;border-radius:11px;background:#edf4ff;color:#0757e8;font-weight:800;margin-top:10px}.machine-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.machine-edit-grid label,.machine-description{font-size:12px;font-weight:800;color:#536174}.machine-edit-grid input,.machine-description input,.machine-description textarea{width:100%;margin-top:5px;padding:11px 12px;border:1px solid #d6dfec;border-radius:10px;font:inherit;background:#fff}.machine-description{display:block;margin-top:10px}.machine-description textarea{resize:vertical}.machine-switches{display:grid;gap:8px;margin-top:12px;padding:11px;border:1px solid #e4eaf2;border-radius:11px;font-size:13px}.machine-switches input{margin-right:6px}.machine-save-button{width:100%;margin-top:11px}.machine-remove-button{margin-top:10px}.reference-help{margin-top:7px}@media(max-width:480px){.machine-photo-preview{min-height:150px}.machine-photo-preview img{height:190px}.machine-upload-button{width:100%}.machine-edit-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function start() {
    if (!document.querySelector("main.container") || !token()) return;
    styles();
    if (ensureUI()) loadMachines();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
