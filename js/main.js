(() => {
  "use strict";

  const PAGE_SIZE = 18;
  const POKEAPI_BASE = "https://pokeapi.co/api/v2";

  const pokemonDetailsCache = [];
  const pokemonNameCache = [];
  const pokemonListCache = { items: null };

  const pokemonGrid = document.getElementById("pokemon-grid");
  const paginationEl = document.getElementById("pokemon-pagination");
  const searchForm = document.getElementById("pokemon-search-form");
  const searchInput = document.getElementById("pokemon-search-input");

  if (!pokemonGrid || !paginationEl || !searchForm || !searchInput) {
    console.warn("Pokédex: elementos da interface não encontrados.");
    return;
  }

  const typeLabelMap = {
    normal: "Normal",
    fire: "Fogo",
    water: "Água",
    electric: "Elétrico",
    grass: "Planta",
    ice: "Gelo",
    fighting: "Lutador",
    poison: "Veneno",
    ground: "Terra",
    flying: "Voador",
    psychic: "Psíquico",
    bug: "Inseto",
    rock: "Rocha",
    ghost: "Fantasma",
    dragon: "Dragão",
    dark: "Noturno",
    steel: "Aço",
    fairy: "Fada",
  };

  const state = {
    query: "",
    currentPage: 1,
    items: [],
    filteredItems: [],
  };

  let renderCount = 0;

  const padId = (id) => `#${String(id).padStart(4, "0")}`;

  const debounce = (fn, delayMs) => {
    let t = null;
    return (...args) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), delayMs);
    };
  };

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Falha ao chamar ${url}. Status=${res.status}. ${text}`);
    }
    return res.json();
  }

  function extractNumericIdFromUrl(url) {
    const match = String(url || "").match(/\/(\d+)\/$/);
    return match ? Number(match[1]) : null;
  }

  async function getPokemonList() {
    if (pokemonListCache.items) return pokemonListCache.items;

    const url = `${POKEAPI_BASE}/pokemon-species?limit=100000&offset=0`;
    const data = await fetchJson(url);
    const results = data.results || [];
    pokemonListCache.items = results
      .map((it) => {
        const id = extractNumericIdFromUrl(it.url);
        return id ? { id, name: it.name, url: it.url } : null;
      })
      .filter(Boolean);
    return pokemonListCache.items;
  }

  async function getPokemonDetails(id) {
    const cached = pokemonDetailsCache.find((e) => e.id === id);
    if (cached) return cached.details;

    const url = `${POKEAPI_BASE}/pokemon/${id}`;
    const pokemon = await fetchJson(url);

    const types = (pokemon.types || []).map((t) => t.type?.name).filter(Boolean);
    const spriteUrl =
      pokemon?.sprites?.other?.["official-artwork"]?.front_default ||
      pokemon?.sprites?.front_default ||
      "";

    const details = { id, types, spriteUrl };
    pokemonDetailsCache.push({ id, details });
    return details;
  }

  async function getPokemonName(id) {
    const cached = pokemonNameCache.find((e) => e.id === id);
    if (cached) return cached.name;

    const url = `${POKEAPI_BASE}/pokemon-species/${id}`;
    const species = await fetchJson(url);

    const names = species?.names || [];
    const name =
      names.find((n) => n.language?.name === "pt")?.name ||
      names.find((n) => n.language?.name === "pt-BR")?.name ||
      names.find((n) => n.language?.name === "pt-br")?.name ||
      names.find((n) => n.language?.name === "en")?.name ||
      names[0]?.name || "";

    pokemonNameCache.push({ id, name });
    return name;
  }

  function getTypeMeta(types) {
    const key = String((types && types.length ? types[0] : "") || "").toLowerCase();
    return {
      key,
      label: typeLabelMap[key] || key || "-",
    };
  }

  function createCard({ id, typeMeta, name, spriteUrl }) {
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-md-4 col-lg-2";

    const safeTypeKey = String(typeMeta.key || "").replace(/[^a-z0-9-]/g, "");
    const typeClass = safeTypeKey ? `type-${safeTypeKey}` : "";

    col.innerHTML = `
      <div class="card pokemon-card h-100">
        <div class="card-body p-4 p-md-4 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="pokemon-type pokemon-type-badge ${typeClass}">${escapeHtml(typeMeta.label)}</div>
            <div class="pokemon-id fs-6">${escapeHtml(padId(id))}</div>
          </div>

          <div class="d-flex justify-content-center py-3">
            <img
              alt="${escapeHtml(name || `pokemon-${id}`)}"
              class="pokemon-art"
              src="${escapeHtml(spriteUrl)}"
              loading="lazy"
              onerror="this.style.visibility='hidden'"
            >
          </div>

          <div class="text-center mt-auto pt-1">
            <div class="pokemon-name fs-6 fw-bold">${escapeHtml(name)}</div>
          </div>
        </div>
      </div>
    `;

    return col;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setLoading(isLoading) {
    if (isLoading) {
      pokemonGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="spinner-border" role="status" aria-label="Carregando"></div>
          <div class="mt-2 text-muted">Carregando Pokémon...</div>
        </div>
      `;
    }
  }

  function renderPagination() {
    const total = state.filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const current = state.currentPage;

    const items = [];

    const makePageItem = (page, label, isActive = false, isDisabled = false) => {
      const li = document.createElement("li");
      const btnClass = "page-link";
      li.className = `page-item${isActive ? " active" : ""}${isDisabled ? " disabled" : ""}`;
      li.innerHTML = `<button class="${btnClass}" type="button" ${isDisabled ? "disabled" : ""} data-page="${page}">${escapeHtml(
        label
      )}</button>`;
      return li;
    };

    const makeEllipsis = () => {
      const li = document.createElement("li");
      li.className = "page-item disabled";
      li.innerHTML = `<span class="page-link">…</span>`;
      return li;
    };

    items.push(
      makePageItem(current - 1, "Anterior", false, current <= 1)
    );

    const neighborCount = 1;
    const start = Math.max(1, current - neighborCount);
    const end = Math.min(totalPages, current + neighborCount);

    const showAll = totalPages <= 7;

    if (showAll) {
      for (let p = 1; p <= totalPages; p++) {
        items.push(makePageItem(p, String(p), p === current, false));
      }
    } else {
      items.push(makePageItem(1, "1", current === 1, false));

      if (start > 2) items.push(makeEllipsis());

      for (let p = Math.max(2, start); p <= Math.min(totalPages - 1, end); p++) {
        items.push(makePageItem(p, String(p), p === current, false));
      }

      if (end < totalPages - 1) items.push(makeEllipsis());

      items.push(makePageItem(totalPages, String(totalPages), current === totalPages, false));
    }

    items.push(
      makePageItem(current + 1, "Próximo", false, current >= totalPages)
    );

    paginationEl.innerHTML = "";
    paginationEl.append(...items);

    paginationEl.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = Number(btn.getAttribute("data-page"));
        if (!Number.isFinite(page)) return;
        if (page < 1 || page > totalPages) return;
        state.currentPage = page;
        renderPagination();
        renderPage();
      });
    });
  }

  async function renderPage() {
    const total = state.filteredItems.length;
    if (total === 0) {
      pokemonGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="text-muted">Nenhum Pokémon encontrado.</div>
        </div>
      `;
      paginationEl.innerHTML = "";
      return;
    }

    const seq = ++renderCount;

    const startIndex = (state.currentPage - 1) * PAGE_SIZE;
    const endIndexExclusive = Math.min(startIndex + PAGE_SIZE, total);

    const pageItems = state.filteredItems.slice(startIndex, endIndexExclusive);

    pokemonGrid.innerHTML = `
      ${Array.from({ length: pageItems.length }).map(() => `
        <div class="col-12 col-sm-6 col-md-4 col-lg-2">
          <div class="card pokemon-card h-100">
            <div class="card-body p-4 d-flex flex-column">
              <div class="skeleton-line" style="height:16px; width:60%; background:#e9eaff; border-radius:8px;"></div>
              <div class="mt-3 skeleton-line" style="height:90px; background:#e9eaff; border-radius:12px;"></div>
              <div class="mt-auto skeleton-line" style="height:16px; width:80%; background:#e9eaff; border-radius:8px;"></div>
            </div>
          </div>
        </div>
      `).join("")}
    `;

    const ids = pageItems
      .map((it) => it.id)
      .filter((x) => Number.isFinite(x));

    const renderPromises = ids.map(async (id, i) => {
      const details = await getPokemonDetails(id);
      const name = await getPokemonName(id);

      if (seq !== renderCount) return;

      const typeMeta = getTypeMeta(details.types);
      const spriteUrl = details.spriteUrl;

      const col = createCard({
        id,
        typeMeta,
        name: name ? name : String(details.id),
        spriteUrl,
      });

      const target = pokemonGrid.children[i];
      if (target && seq === renderCount) target.replaceWith(col);
    });

    try {
      await Promise.all(renderPromises);
    } catch (e) {
      if (seq !== renderCount) return;
      console.error(e);
      pokemonGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="text-danger">Erro ao carregar Pokémon. Tente novamente.</div>
        </div>
      `;
    }
  }

  function applyFilterAndResetPagination() {
    const q = state.query.trim().toLowerCase();
    if (!q) {
      state.filteredItems = state.items.slice();
    } else {
      state.filteredItems = state.items.filter((p) => p.name.toLowerCase().includes(q));
    }
    state.currentPage = 1;
    renderPagination();
    renderPage();
  }

  async function init() {
    try {
      setLoading(true);
      state.items = await getPokemonList();
      state.filteredItems = state.items.slice();

      renderPagination();
      await renderPage();
    } catch (e) {
      console.error(e);
      pokemonGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="text-danger">Falha ao carregar a lista de Pokémon.</div>
          <div class="text-muted mt-2">Verifique sua conexão com a internet.</div>
        </div>
      `;
      paginationEl.innerHTML = "";
    }
  }

  searchForm.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      applyFilterAndResetPagination();
    }
  );

  searchInput.addEventListener(
    "input",
    debounce(() => {
      state.query = searchInput.value || "";
      applyFilterAndResetPagination();
    }, 250)
  );

  init();
})();
