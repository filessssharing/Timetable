// Robust offline-first loader

const SLOT_LABELS = {
  "08_00_09_00": "08:00–09:00",
  "09_00_10_00": "09:00–10:00",
  "10_15_11_15": "10:15–11:15",
  "11_15_12_15": "11:15–12:15",
  "13_15_14_15": "13:15–14:15",
  "14_15_15_15": "14:15–15:15",
  "15_15_16_15": "15:15–16:15"
};

const SLOTS = ["08_00_09_00","09_00_10_00","10_15_11_15","11_15_12_15","13_15_14_15","14_15_15_15","15_15_16_15"];
const dayIds = ["mon","tue","wed","thu","fri"];
let DATA=null;

function parseInlineJSON(){
  try{
    const el = document.getElementById("default-data");
    if(!el) return null;
    return JSON.parse(el.textContent);
  }catch(e){
    console.warn("Inline JSON parse failed:", e);
    return null;
  }
}

async function tryFetchJSON(){
  try{
    const res = await fetch("timetable.json", {cache:"no-store"});
    if(!res.ok) throw new Error(res.statusText);
    return await res.json();
  }catch(e){
    console.warn("Fetch timetable.json failed (expected when opening via file://):", e);
    return null;
  }
}

function renderItem(item){
  if(typeof item === "string") return item;
  const title = item.title ? `<span class="title">${item.title}</span>` : "";
  const meta  = item.meta  ? `<div class="meta">${item.meta}</div>` : "";
  const tag   = item.tag   ? `<div class="badge">${item.tag}</div>` : "";
  return `${title}${meta}${tag}`;
}

function clearGrid(){}

function fillWeek(weekKey){ renderGrid(weekKey); }

function populateWeekSelect(){
  const select = document.getElementById("week");
  select.innerHTML = "";
  const keys = Object.keys(DATA.weeks);
  // sort by numeric suffix
  keys.sort((a,b)=>{
    const na = parseInt((a.match(/\d+/)||[0])[0],10);
    const nb = parseInt((b.match(/\d+/)||[0])[0],10);
    return na-nb;
  });
  for(const k of keys){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = DATA.weeks[k].label || k;
    select.appendChild(opt);
  }
  select.onchange = (e)=> fillWeek(e.target.value);
  if(keys.length) fillWeek(keys[0]);
}

function hydrate(newData){
  if(!newData || !newData.weeks){
    alert("Invalid JSON format. Expecting an object with a 'weeks' dictionary.");
    return;
  }
  DATA = newData;
  populateWeekSelect();
}

function attachLocalLoader(){
  const fileEl = document.getElementById("fileJSON");
  const btn = document.getElementById("loadBtn");
  btn.addEventListener("click", ()=>{
    if(!fileEl.files || !fileEl.files[0]){
      alert("Choose a JSON file first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const obj = JSON.parse(reader.result);
        hydrate(obj);
      }catch(e){
        alert("Failed to parse JSON: " + e.message);
      }
    };
    reader.readAsText(fileEl.files[0]);
  });
}

(async function init(){
  const viaFetch = await tryFetchJSON();
  const fallback = parseInlineJSON();
  hydrate(viaFetch || fallback);
  attachLocalLoader();
})();
function escapeHtml(s){ return (s??'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }


function setHeaderDates(wk){
  const dayDateIds = {mon:"monDate",tue:"tueDate",wed:"wedDate",thu:"thuDate",fri:"friDate"};
  for(const d of dayIds){
    const el = document.getElementById(dayDateIds[d]);
    if(el) el.textContent = wk.days?.[d]?.date || "";
  }
  const rangeEl = document.getElementById("weekDates");
  if(rangeEl) rangeEl.textContent = wk.range || "";
}

function renderGrid(weekKey){
  const wk = DATA.weeks[weekKey];
  if(!wk) return;
  setHeaderDates(wk);

  const tbody = document.querySelector("#timetable tbody");
  if(!tbody) return;
  tbody.innerHTML = "";

  // Track rowSpan skips per day
  const skip = { mon:0, tue:0, wed:0, thu:0, fri:0 };

  for(let i=0;i<SLOTS.length;i++){
    const slotKey = SLOTS[i];
    const tr = document.createElement("tr");
    tr.className = "slot-row";

    // Time label
    const timeTd = document.createElement("td");
    timeTd.className = "slot";
    timeTd.textContent = (SLOT_LABELS[slotKey] || slotKey.replaceAll("_", ":"));
    tr.appendChild(timeTd);

    for(const dayKey of dayIds){
      if(skip[dayKey] > 0){
        skip[dayKey]--;
        continue; // covered by rowSpan above
      }
      const td = document.createElement("td");
      const day = wk.days?.[dayKey] || {};
      const val = day[slotKey];

      // Normalize to list of entries if needed
      let entries = null;
      if(Array.isArray(val)) entries = val;
      else if(val && typeof val === "object") entries = [val];
      else if(typeof val === "string"){
        // simple text only (no color fill)
        td.textContent = val;
      }

      if(entries && entries.length){
        // Normalize durations >= 1
        entries = entries.map(e => ({...e, duration: (e && e.duration && e.duration > 0) ? e.duration : 1 }));
        const maxDur = Math.max(...entries.map(e => e.duration));

        // Apply rowSpan for the tallest entry
        if(maxDur > 1){
          td.rowSpan = maxDur;
          skip[dayKey] = maxDur - 1;
          td.classList.add("merged");
        }

        if(entries.length > 1){
          // Vertically split into equal columns
          td.classList.add("split","has-event");
          const wrap = document.createElement("div");
          wrap.className = "split-wrap";

          entries.forEach((e, idx) => {
            const col = document.createElement("div");
            col.className = "col";
            if(e.color) {
              col.style.background = e.color;
              col.style.color = "#fff";
            }
            col.innerHTML = `
              <div class="title">${e.title ? escapeHtml(e.title) : ""}</div>
              <div class="meta">${e.meta ? escapeHtml(e.meta) : ""}</div>
            `;
            wrap.appendChild(col);
          });

          td.appendChild(wrap);
        } else {
          // Single entry — full cell color fill
          const e = entries[0];
          td.classList.add("has-event");
          const fill = document.createElement("div");
          fill.className = "tcell-fill";
          if(e.color){
            fill.style.background = e.color;
            fill.style.color = "#fff";
          }
          fill.innerHTML = `
            <div class="title">${e.title ? escapeHtml(e.title) : ""}</div>
            <div class="meta">${e.meta ? escapeHtml(e.meta) : ""}</div>
          `;
          td.appendChild(fill);
        }
      }

      tr.appendChild(td);
    }

    tbody.appendChild(tr);

    // Insert TEA BREAK and LUNCH BREAK rows that DO NOT consume rowSpan
    if(slotKey === "09_00_10_00"){
      const br = document.createElement("tr");
      br.className = "break";
      br.innerHTML = '<td class="slot">10:00–10:15</td><td colspan="5">TEA BREAK</td>';
      tbody.appendChild(br);
    }
    if(slotKey === "11_15_12_15"){
      const br2 = document.createElement("tr");
      br2.className = "break";
      br2.innerHTML = '<td class="slot">12:15–13:15</td><td colspan="5">LUNCH BREAK</td>';
      tbody.appendChild(br2);
    }
  }
}
