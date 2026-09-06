(() => {
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_IMAGE_WIDTH = 1400;
  const MAX_IMAGE_HEIGHT = 1000;

  const token = () => localStorage.getItem("casharrowToken") || "";
  const headers = () => ({ Authorization: "Bearer " + token() });
  const jsonHeaders = () => ({ ...headers(), "Content-Type": "application/json" });
  const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
  const money = value => "UGX " + Number(value || 0).toLocaleString();

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
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
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function ensureUI() {
    if (document.getElementById("casharrowMachineManager")) return;
    const card = document.createElement("div");
    card.className = "card";
    card.id = "casharrowMachineManager";
    card.innerHTML = `
      <h2>🏭 Machine Photos</h2>
      <p class="muted">Change machine photos directly from your phone. No GitHub or coding needed. Only administrators can use this section.</p>
      <div id="machineManagerMessage" class="message"></div>
      <div id="machineManagerList"><div class="empty">Loading machines...</div></div>`;
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
      if (!products.length) {
        list.innerHTML = '<div class="empty">No machines found.</div>';
        return;
      }
      list.innerHTML = products.map(product => `
        <div class="deposit machine-editor" data-product-id="${esc(product.id)}">
          <div class="machine-editor-top">
            <div>
              <strong>${esc(product.code)} — ${esc(product.name)}</strong>
              <div class="deposit-meta">Rental: ${money(product.rental_fee)} · ${esc(product.rental_days)} days · Return: ${money(product.return_amount)}</div>
            </div>
            ${product.image_url ? '<span class="approved">Photo set</span>' : '<span class="pending">No photo</span>'}
          </div>
          <div class="machine-photo-preview">${product.image_url ? `<img src="${esc(product.image_url)}" alt="${esc(product.name)}">` : '<span>📷 No machine photo yet</span>'}</div>
          <input class="machine-photo-input" type="file" accept="image/*" capture="environment" data-id="${esc(product.id)}" aria-label="Choose photo for ${esc(product.code)}">
          <div class="action-row">
            <button type="button" class="machine-upload-button" data-id="${esc(product.id)}">📷 Change Photo</button>
            ${product.image_url ? `<button type="button" class="reject machine-remove-button" data-id="${esc(product.id)}">Remove Photo</button>` : ''}
          </div>
          <div class="reference-help">Choose a clear photo of ${esc(product.code)}. The photo is resized automatically for the site.</div>
        </div>`).join("");

      list.querySelectorAll(".machine-upload-button").forEach(button => {
        button.addEventListener("click", () => list.querySelector(`.machine-photo-input[data-id="${button.dataset.id}"]`)?.click());
      });
      list.querySelectorAll(".machine-photo-input").forEach(input => {
        input.addEventListener("change", () => input.files?.[0] && savePhoto(input.dataset.id, input.files[0]));
      });
      list.querySelectorAll(".machine-remove-button").forEach(button => {
        button.addEventListener("click", () => removePhoto(button.dataset.id));
      });
    } catch (error) {
      message.textContent = error.message || "Unable to load machines.";
      list.innerHTML = '<div class="empty">Unable to load machine photos.</div>';
    }
  }

  async function getProduct(id) {
    const data = await api("/api/admin/products", { headers: headers() });
    return (data.products || []).find(product => String(product.id) === String(id));
  }

  async function savePhoto(id, file) {
    const message = document.getElementById("machineManagerMessage");
    try {
      message.textContent = "Preparing photo...";
      const product = await getProduct(id);
      if (!product) throw new Error("Machine not found.");
      const imageUrl = await imageToDataUrl(file);
      await api(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({
          series: product.series,
          code: product.code,
          name: product.name,
          description: product.description || "",
          image_url: imageUrl,
          rental_fee: product.rental_fee,
          rental_days: product.rental_days,
          return_amount: product.return_amount,
          active: product.active,
          featured: product.featured
        })
      });
      message.textContent = `${product.code} photo updated successfully.`;
      await loadMachines();
    } catch (error) {
      message.textContent = error.message || "Unable to update photo.";
    }
  }

  async function removePhoto(id) {
    const message = document.getElementById("machineManagerMessage");
    try {
      const product = await getProduct(id);
      if (!product) throw new Error("Machine not found.");
      if (!confirm(`Remove the photo for ${product.code}?`)) return;
      await api(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({
          series: product.series,
          code: product.code,
          name: product.name,
          description: product.description || "",
          image_url: null,
          rental_fee: product.rental_fee,
          rental_days: product.rental_days,
          return_amount: product.return_amount,
          active: product.active,
          featured: product.featured
        })
      });
      message.textContent = `${product.code} photo removed.`;
      await loadMachines();
    } catch (error) {
      message.textContent = error.message || "Unable to remove photo.";
    }
  }

  function styles() {
    if (document.getElementById("casharrow-machine-manager-styles")) return;
    const style = document.createElement("style");
    style.id = "casharrow-machine-manager-styles";
    style.textContent = `.machine-editor{margin-top:12px}.machine-editor-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.machine-photo-preview{margin-top:12px;border:1px solid #e1e8f2;border-radius:14px;min-height:170px;background:#f5f8fc;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#718096;font-size:13px}.machine-photo-preview img{display:block;width:100%;height:220px;object-fit:contain}.machine-photo-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.machine-upload-button{margin-top:10px}.machine-remove-button{margin-top:10px}@media(max-width:480px){.machine-photo-preview{min-height:150px}.machine-photo-preview img{height:190px}}`;
    document.head.appendChild(style);
  }

  function start() {
    if (!document.querySelector("main.container")) return;
    styles();
    ensureUI();
    loadMachines();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
