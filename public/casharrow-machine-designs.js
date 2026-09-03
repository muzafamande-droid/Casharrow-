(() => {
  if (window.__cashArrowMachineDesigns) return;
  window.__cashArrowMachineDesigns = true;

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'
  }[ch]));

  const SERIES = {
    A: { label:'STARTER', base:'#0757e8', dark:'#06306f', light:'#62b0ff' },
    B: { label:'GROWTH', base:'#0b73ff', dark:'#063d82', light:'#7bc5ff' },
    C: { label:'PRO', base:'#1261d8', dark:'#052b68', light:'#70b8ff' },
    D: { label:'FLAGSHIP', base:'#0646b8', dark:'#031d52', light:'#79bdff' }
  };

  function shell(series, code, body) {
    const c = SERIES[series] || SERIES.A;
    const id = String(code).replace(/[^A-Za-z0-9]/g,'');
    return `<svg class="ca-machine-svg ca-machine-${series.toLowerCase()}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 430" role="img" aria-label="CashArrow ${esc(code)} machine">
      <defs>
        <linearGradient id="caTop${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset=".45" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
        <linearGradient id="caMetal${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dcecff"/><stop offset=".28" stop-color="#7194b9"/><stop offset=".55" stop-color="#243d60"/><stop offset="1" stop-color="#091a34"/></linearGradient>
        <filter id="caShadow${id}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="13" stdDeviation="11" flood-opacity=".28"/></filter>
      </defs>
      <rect width="700" height="430" rx="30" fill="#eef4fb"/>
      <ellipse cx="350" cy="375" rx="255" ry="22" fill="#0a1830" opacity=".18"/>
      <g filter="url(#caShadow${id})">${body}</g>
      <rect x="28" y="25" width="132" height="38" rx="19" fill="${c.base}"/>
      <text x="94" y="50" text-anchor="middle" font-family="Arial" font-size="16" font-weight="900" fill="#fff">${esc(series)} SERIES</text>
      <text x="350" y="414" text-anchor="middle" font-family="Arial" font-size="14" font-weight="800" fill="#41617f">${esc(code)} · CASHARROW MACHINE</text>
    </svg>`;
  }

  function draw(code) {
    const s = String(code || 'A1').toUpperCase().charAt(0);
    const n = Math.max(1, Math.min(5, Number(String(code).replace(/\D/g,'')) || 1));
    const c = SERIES[s] || SERIES.A;
    const accent = ['#2c9dff','#22d3ee','#4ade80','#facc15','#a78bfa'][n-1];
    let body = '';

    if (s === 'A') {
      const w = 300 + n*20;
      body = `<path d="M105 125L145 94H${545+n*8}L590 119V310L548 338H105Z" fill="url(#caTop${String(code).replace(/[^A-Za-z0-9]/g,'')})" stroke="#d9ecff" stroke-width="5"/>
        <path d="M${545+n*8} 94L590 119V310L548 338V121Z" fill="#031a49" stroke="#b9dcff" stroke-width="4"/>
        <path d="M145 94H${545+n*8}L590 119H184Z" fill="#9bd3ff" opacity=".65"/>
        <rect x="135" y="145" width="205" height="130" rx="15" fill="#052e68" stroke="#bfe3ff" stroke-width="4"/>
        <g stroke="#6ebcff" stroke-width="7" opacity=".7">${Array.from({length:n+3},(_,i)=>`<path d="M158 ${166+i*20}h158"/>`).join('')}</g>
        <rect x="374" y="140" width="155" height="86" rx="14" fill="#031733" stroke="#74bdff" stroke-width="4"/>
        <rect x="396" y="160" width="72" height="30" rx="5" fill="#001024"/>
        <circle cx="498" cy="175" r="10" fill="${accent}"/>
        <circle cx="390" cy="253" r="30" fill="#020d24" stroke="#d8ecff" stroke-width="6"/>
        <path d="M390 253l18-18" stroke="#63d7ff" stroke-width="6"/>
        <rect x="150" y="300" width="375" height="25" rx="7" fill="#02152f"/>
        <circle cx="160" cy="345" r="23" fill="#07172d" stroke="#bfe3ff" stroke-width="4"/><circle cx="535" cy="345" r="23" fill="#07172d" stroke="#bfe3ff" stroke-width="4"/>`;
    } else if (s === 'B') {
      const id = String(code).replace(/[^A-Za-z0-9]/g,'');
      body = `<path d="M150 335V105L185 72H505L550 105V335Z" fill="#092b59" stroke="#d9ecff" stroke-width="5"/>
        <path d="M185 72H505L550 105H220Z" fill="#79c7ff" opacity=".7" stroke="#cdeaff" stroke-width="3"/>
        <path d="M505 72L550 105V335L505 335Z" fill="#031a43"/>
        <rect x="178" y="125" width="292" height="178" rx="18" fill="url(#caTop${id})"/>
        <rect x="202" y="150" width="132" height="105" rx="12" fill="#041c45" stroke="#bfe4ff" stroke-width="4"/>
        <circle cx="268" cy="202" r="39" fill="#020f2c" stroke="#d9ecff" stroke-width="6"/><path d="M268 202l27-25" stroke="#62d9ff" stroke-width="7"/>
        <rect x="355" y="150" width="91" height="34" rx="6" fill="#001027"/>
        <g fill="#dcecff">${Array.from({length:n+1},(_,i)=>`<rect x="360" y="198" width="${58+i*5}" height="9" rx="4"/>`).join('')}</g>
        <g fill="#02152f"><rect x="118" y="132" width="25" height="145" rx="8"/><rect x="557" y="132" width="25" height="145" rx="8"/></g>
        <rect x="190" y="316" width="315" height="27" rx="8" fill="#061a34"/>
        <circle cx="205" cy="355" r="25" fill="#06172d" stroke="#c9e7ff" stroke-width="4"/><circle cx="495" cy="355" r="25" fill="#06172d" stroke="#c9e7ff" stroke-width="4"/>`;
    } else if (s === 'C') {
      const id = String(code).replace(/[^A-Za-z0-9]/g,'');
      body = `<path d="M92 295L125 92L162 66H538L575 92L608 295L568 330H132Z" fill="#062f6d" stroke="#d9ecff" stroke-width="6"/>
        <path d="M162 66H538L575 92H199Z" fill="#8bcaff" opacity=".72"/>
        <path d="M538 66L575 92L608 295L568 330V98Z" fill="#021b4a"/>
        <rect x="126" y="108" width="440" height="184" rx="18" fill="url(#caTop${id})" stroke="#bfe3ff" stroke-width="3"/>
        <rect x="154" y="137" width="164" height="125" rx="12" fill="#031a45" stroke="#d5edff" stroke-width="4"/>
        <g fill="#0d4e9b">${Array.from({length:5},(_,i)=>`<rect x="178" y="155" width="116" height="12" rx="6"/><rect x="178" y="179" width="${105-i*7}" height="12" rx="6"/>`).join('')}</g>
        <rect x="344" y="137" width="194" height="125" rx="12" fill="#03152f" stroke="#76c2ff" stroke-width="4"/>
        <circle cx="395" cy="184" r="28" fill="#020d22" stroke="#d9ecff" stroke-width="5"/><path d="M395 184l19-17" stroke="#67dcff" stroke-width="5"/>
        <rect x="440" y="163" width="72" height="30" rx="5" fill="#001027"/>
        <g fill="${accent}"><circle cx="461" cy="222" r="7"/><circle cx="485" cy="222" r="7"/><circle cx="509" cy="222" r="7"/></g>
        <rect x="120" y="300" width="460" height="27" rx="8" fill="#03162f"/>
        <circle cx="145" cy="354" r="27" fill="#06172d" stroke="#cdeaff" stroke-width="4"/><circle cx="555" cy="354" r="27" fill="#06172d" stroke="#cdeaff" stroke-width="4"/>`;
    } else {
      const id = String(code).replace(/[^A-Za-z0-9]/g,'');
      body = `<path d="M76 318V112L111 77H589L624 112V318" fill="#071a31" stroke="#cdeaff" stroke-width="7"/>
        <path d="M111 77H589L624 112H146Z" fill="#79bdff" opacity=".75"/>
        <path d="M589 77L624 112V318L589 340Z" fill="#021536"/>
        <rect x="110" y="112" width="480" height="205" rx="15" fill="url(#caTop${id})"/>
        <rect x="140" y="137" width="150" height="145" rx="14" fill="#03204b" stroke="#d8eeff" stroke-width="5"/>
        <circle cx="215" cy="209" r="50" fill="#020d23" stroke="#d9ecff" stroke-width="7"/><path d="M215 209l34-32" stroke="#63d9ff" stroke-width="8"/>
        <rect x="320" y="137" width="235" height="72" rx="12" fill="#02132e" stroke="#7ac5ff" stroke-width="4"/>
        <rect x="346" y="158" width="88" height="32" rx="5" fill="#000c1f"/>
        <g fill="${accent}"><circle cx="475" cy="174" r="10"/><circle cx="505" cy="174" r="10"/><circle cx="535" cy="174" r="10"/></g>
        <g fill="#05285d"><rect x="323" y="232" width="205" height="13" rx="6"/><rect x="323" y="255" width="170" height="13" rx="6"/></g>
        <path d="M92 318H608" stroke="#d9ecff" stroke-width="5"/>
        <circle cx="115" cy="355" r="30" fill="#06172d" stroke="#cdeaff" stroke-width="5"/><circle cx="585" cy="355" r="30" fill="#06172d" stroke="#cdeaff" stroke-width="5"/>
        <path d="M92 120V310M608 120V310" stroke="#0b73ff" stroke-width="10" opacity=".55"/>`;
    }
    return shell(s, code, body);
  }

  function replaceIn(root) {
    const scope = root || document;
    scope.querySelectorAll('.ca-product').forEach(row => {
      const title = row.querySelector('h3');
      if (!title) return;
      const match = title.textContent.match(/[ABCD][1-5]/i);
      if (!match) return;
      const code = match[0].toUpperCase();
      const art = row.querySelector('.ca-product-art');
      if (art && art.dataset.caDesign !== code) {
        art.innerHTML = draw(code);
        art.dataset.caDesign = code;
      }
    });

    const modal = document.querySelector('.ca-modal');
    if (modal) {
      const title = modal.querySelector('.ca-modal-top h3');
      const match = title?.textContent.match(/[ABCD][1-5]/i);
      const art = modal.querySelector('.ca-detail-art');
      if (match && art && art.dataset.caDesign !== match[0].toUpperCase()) {
        const code = match[0].toUpperCase();
        art.innerHTML = draw(code);
        art.dataset.caDesign = code;
      }
    }
  }

  function addStyle() {
    if (document.getElementById('cashArrowMachineDesignStyle')) return;
    const style = document.createElement('style');
    style.id = 'cashArrowMachineDesignStyle';
    style.textContent = `
      .ca-product-art{background:linear-gradient(145deg,#f8fbff,#e7f0fb)!important;border:1px solid #b9d7f7!important;box-shadow:0 12px 28px rgba(7,60,120,.13)!important;overflow:hidden!important}
      .ca-product-art .ca-machine-svg{transition:transform .28s ease,filter .28s ease!important;transform-origin:center!important}
      .ca-product-art:hover .ca-machine-svg{transform:translateY(-3px) scale(1.035)!important;filter:saturate(1.08)!important}
      .ca-product{grid-template-columns:minmax(155px,175px) 1fr auto!important;gap:20px!important}
      .ca-product h3{font-size:24px!important;line-height:1.15!important}
      .ca-product p{font-size:17px!important;line-height:1.55!important}
      .ca-buy{padding:9px 15px!important;min-height:40px!important;height:40px!important;font-size:14px!important;border-radius:10px!important;align-self:center!important;box-shadow:0 5px 12px rgba(7,87,232,.18)!important}
      .ca-machine-hint{font-size:12px!important;margin-top:6px!important}
      .ca-detail-art{background:linear-gradient(145deg,#f8fbff,#e7f0fb)!important;border:1px solid #c5def7!important}
      .ca-detail-art .ca-machine-svg{width:100%!important;height:100%!important}
      @media(max-width:560px){
        .ca-product{grid-template-columns:1fr!important;gap:10px!important;padding:16px 2px!important}
        .ca-product-art{width:100%!important;height:180px!important}
        .ca-product h3{font-size:23px!important}
        .ca-product p{font-size:16px!important}
        .ca-buy{width:auto!important;min-width:88px!important;padding:8px 14px!important;height:38px!important;min-height:38px!important;font-size:13px!important;justify-self:start!important}
      }
    `;
    document.head.appendChild(style);
  }

  addStyle();
  replaceIn(document);
  const observer = new MutationObserver(() => replaceIn(document));
  observer.observe(document.body, {childList:true, subtree:true});
  setTimeout(() => observer.disconnect(), 120000);
})();