
// ==========================================
// PENGUIN VALUES - SUPABASE SYSTEM
// ==========================================

const db = window.supabaseClient;

let pets = [];
let editingPetId = null;

// ==========================================
// HELPERS
// ==========================================

function formatValue(value) {
    if (value === null || value === undefined || value === "") {
        return "N/A";
    }

    value = Number(value);

    if (value >= 1e12) return (value / 1e12).toFixed(2) + "T";
    if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
    if (value >= 1e3) return (value / 1e3).toFixed(2) + "K";

    return value.toLocaleString("en-US");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = message;
}

// ==========================================
// LOAD PETS FROM SUPABASE
// ==========================================

async function loadPets() {
    const { data, error } = await db
        .from("pets")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Loading pets:", error.message);
        showMessage("adminMessage", "Database error: " + error.message);
        return false;
    }

    pets = data || [];

    renderPets();
    renderAdminPets();

    return true;
}

// ==========================================
// PUBLIC HOME PAGE
// ==========================================

function renderPets() {
    const petList = document.getElementById("petList");

    if (!petList) return;

    const search = document.getElementById("search").value.toLowerCase();
    const rarity = document.getElementById("rarity").value;
    const sort = document.getElementById("sort").value;

    let filtered = pets.filter(pet =>
        pet.name.toLowerCase().includes(search) &&
        (rarity === "All" || pet.rarity === rarity)
    );

    if (sort === "gems") {
        filtered.sort((a, b) => (b.gems ?? -1) - (a.gems ?? -1));
    }

    if (sort === "rap") {
        filtered.sort((a, b) => (b.rap ?? -1) - (a.rap ?? -1));
    }

    document.getElementById("totalPets").textContent = pets.length;

    petList.innerHTML = filtered.map(pet => `
        <div class="pet-card">
            <div class="pet-image">
                ${
                    pet.image_url
                    ? `<img src="${escapeHTML(pet.image_url)}"
                         alt="${escapeHTML(pet.name)}"
                         loading="lazy"
                         onerror="this.style.display='none'">`
                    : `<div class="no-image">🐧</div>`
                }
            </div>

            <div class="pet-card-info">
                <h3>${escapeHTML(pet.name)}</h3>
                <span class="rarity">${escapeHTML(pet.rarity)}</span>

                <div class="pet-value">
                    <span>Gems:</span>
                    <strong>${formatValue(pet.gems)}</strong>
                </div>

                <div class="pet-value">
                    <span>RAP:</span>
                    <strong>${formatValue(pet.rap)}</strong>
                </div>
            </div>
        </div>
    `).join("") || "<p>No pets found.</p>";
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

function showAdminDashboard(user) {
    const isAdmin = user && user.id === ADMIN_UID;

    document.getElementById("loginSection").hidden = isAdmin;
    document.getElementById("adminApp").hidden = !isAdmin;

    if (!isAdmin && user) {
        showMessage("loginMessage", "You are not an authorized administrator.");
    }

    return isAdmin;
}

async function checkAdminSession() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        console.error(error.message);
        return;
    }

    const user = data.session?.user || null;

    if (showAdminDashboard(user)) {
        await loadPets();
    }
}

// LOGIN

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        showMessage("loginMessage", "Logging in...");

        try {
    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage("loginMessage", "Login failed: " + error.message);
        return;
    }

    if (!showAdminDashboard(data.user)) {
        await db.auth.signOut();
        return;
    }

    showMessage("loginMessage", "");
    loginForm.reset();

    await loadPets();

} catch (err) {
    showMessage("loginMessage", "Connection error: " + err.message);
    console.error(err);
}

        if (error) {
            showMessage("loginMessage", "Login failed: " + error.message);
            return;
        }

        if (!showAdminDashboard(data.user)) {
            await db.auth.signOut();
            return;
        }

        showMessage("loginMessage", "");
        loginForm.reset();

        await loadPets();
    });
}

// LOGOUT

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        const { error } = await db.auth.signOut();

        if (error) {
            alert("Logout error: " + error.message);
            return;
        }

        editingPetId = null;
        document.getElementById("petForm").reset();

        showAdminDashboard(null);
        showMessage("loginMessage", "You have logged out.");
    });
}

// Watch login changes in this browser

if (document.getElementById("loginSection")) {
    db.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
            showAdminDashboard(null);
        }
    });
}

// ==========================================
// ADMIN PET DATABASE
// ==========================================

function renderAdminPets() {
    const list = document.getElementById("adminPetList");

    if (!list) return;

    const search = document.getElementById("adminSearch").value.toLowerCase();

    const filtered = pets.filter(pet =>
        pet.name.toLowerCase().includes(search)
    );

    list.innerHTML = filtered.map(pet => `
        <div class="admin-pet">
            <div class="admin-pet-info">
                <strong>🐾 ${escapeHTML(pet.name)}</strong>
                <small>
                    ${escapeHTML(pet.rarity)} |
                    Gems: ${formatValue(Number(pet.gems))} |
                    RAP: ${formatValue(Number(pet.rap))}
                </small>
            </div>

            <div class="pet-actions">
                <button class="pet-action edit-button"
                    data-action="edit" data-id="${pet.id}">
                    EDIT
                </button>

                <button class="pet-action delete-button"
                    data-action="delete" data-id="${pet.id}">
                    DELETE
                </button>
            </div>
        </div>
    `).join("") || "<p>No pets found.</p>";
}

// ==========================================
// ADD / EDIT PET
// ==========================================

const petForm = document.getElementById("petForm");

if (petForm) {
    petForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name = document.getElementById("petName").value.trim();
        const rarity = document.getElementById("petRarity").value;
        const image_url = document.getElementById("petImage").value.trim() || null;

        const gemsInput = document.getElementById("petGems").value;
        const rapInput = document.getElementById("petRap").value;

        const gems = gemsInput === "" ? null : Number(gemsInput);
        const rap = rapInput === "" ? null : Number(rapInput);

        if (
            !name ||
            (gems !== null && (!Number.isSafeInteger(gems) || gems < 0)) ||
            (rap !== null && (!Number.isSafeInteger(rap) || rap < 0))
        ) {
            showMessage("adminMessage", "Invalid pet name or values.");
            return;
        }

        const petData = { name, rarity, image_url, gems, rap };

        let result;

        if (editingPetId !== null) {
            result = await db
                .from("pets")
                .update(petData)
                .eq("id", editingPetId);
        } else {
            result = await db
                .from("pets")
                .insert([petData]);
        }

        if (result.error) {
            showMessage("adminMessage", "Save failed: " + result.error.message);
            return;
        }

        editingPetId = null;
        petForm.reset();

        document.getElementById("formTitle").textContent = "Add New Pet";
        document.getElementById("saveButton").textContent = "ADD PET";
        document.getElementById("cancelEdit").hidden = true;

        showMessage("adminMessage", "Pet saved successfully!");

        await loadPets();
    });
}

// ==========================================
// EDIT / DELETE PET
// ==========================================

const adminList = document.getElementById("adminPetList");

if (adminList) {
    adminList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = Number(button.dataset.id);
        const action = button.dataset.action;

        const pet = pets.find(item => Number(item.id) === id);

        if (!pet) return;

        if (action === "edit") {
            editingPetId = id;

            document.getElementById("petName").value = pet.name;
            document.getElementById("petImage").value = pet.image_url || "";
            document.getElementById("petRarity").value = pet.rarity;
            document.getElementById("petGems").value = pet.gems ?? "";
            document.getElementById("petRap").value = pet.rap ?? "";

            document.getElementById("formTitle").textContent = "Edit Pet";
            document.getElementById("saveButton").textContent = "SAVE CHANGES";
            document.getElementById("cancelEdit").hidden = false;

            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        if (action === "delete") {
            if (!confirm("Delete " + pet.name + "?")) return;

            const { error } = await db
                .from("pets")
                .delete()
                .eq("id", id);

            if (error) {
                showMessage("adminMessage", "Delete failed: " + error.message);
                return;
            }

            if (editingPetId === id) {
                editingPetId = null;
                petForm.reset();
                document.getElementById("formTitle").textContent = "Add New Pet";
                document.getElementById("saveButton").textContent = "ADD PET";
                document.getElementById("cancelEdit").hidden = true;
            }

            showMessage("adminMessage", "Pet deleted.");
            await loadPets();
        }
    });
}

// ==========================================
// CANCEL EDIT
// ==========================================

const cancelButton = document.getElementById("cancelEdit");

if (cancelButton) {
    cancelButton.addEventListener("click", () => {
        editingPetId = null;
        petForm.reset();

        document.getElementById("formTitle").textContent = "Add New Pet";
        document.getElementById("saveButton").textContent = "ADD PET";
        cancelButton.hidden = true;

        showMessage("adminMessage", "");
    });
}

// ==========================================
// SEARCH AND FILTERS
// ==========================================

const searchInput = document.getElementById("search");

if (searchInput) {
    searchInput.addEventListener("input", renderPets);
}

const raritySelect = document.getElementById("rarity");

if (raritySelect) {
    raritySelect.addEventListener("change", renderPets);
}

const sortSelect = document.getElementById("sort");

if (sortSelect) {
    sortSelect.addEventListener("change", renderPets);
}

const adminSearch = document.getElementById("adminSearch");

if (adminSearch) {
    adminSearch.addEventListener("input", renderAdminPets);
}

// ==========================================
// START APPLICATION
// ==========================================

if (!db) {
    console.error("Supabase client not initialized!");
} else if (document.getElementById("loginSection")) {
    checkAdminSession();
} else {
    loadPets();
}
// LIGHT / DARK MODE

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    if (themeToggle) {
        themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    }
}

const savedTheme = localStorage.getItem("penguin-theme") || "light";
applyTheme(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const nextTheme =
            document.documentElement.dataset.theme === "dark"
            ? "light"
            : "dark";

        localStorage.setItem("penguin-theme", nextTheme);
        applyTheme(nextTheme);
    });
}
// ==========================================
// IMAGE SEARCHER (Pet Simulator wiki)
// ==========================================

const WIKI_API = "https://pet-simulator.fandom.com/api.php";
let wikiTitles = null;

async function loadWikiTitles() {
    if (wikiTitles) return wikiTitles;

    let titles = [];
    let cont = {};

    do {
        const params = new URLSearchParams({
            action: "query",
            list: "allpages",
            aplimit: "500",
            format: "json",
            origin: "*",
            ...cont
        });

        const res = await fetch(WIKI_API + "?" + params);
        const data = await res.json();

        titles.push(...data.query.allpages.map(page => page.title));
        cont = data.continue || null;
    } while (cont);

    // only Huge / Titanic pages
    wikiTitles = titles.filter(title => /huge|titanic/i.test(title));
    return wikiTitles;
}

async function getThumbnails(titles) {
    const params = new URLSearchParams({
        action: "query",
        prop: "pageimages",
        piprop: "thumbnail",
        pithumbsize: "300",
        titles: titles.join("|"),
        format: "json",
        origin: "*"
    });

    const res = await fetch(WIKI_API + "?" + params);
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});

    return pages
        .filter(page => page.thumbnail)
        .map(page => ({ title: page.title, url: page.thumbnail.source }));
}

function setupImageSearcher() {
    const urlInput = document.getElementById("petImage");
    if (!urlInput) return;

    const box = document.createElement("div");
    box.className = "image-searcher";
    box.innerHTML = `
        <input type="text" id="imageSearch"
               placeholder="🔍 Find image (type a letter or name, e.g. i)">
        <div id="imageResults" class="image-results"></div>
    `;
    urlInput.insertAdjacentElement("afterend", box);

    const searchBox = box.querySelector("#imageSearch");
    const results = box.querySelector("#imageResults");
    let timer;

    searchBox.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(runSearch, 300);
    });

    async function runSearch() {
        const q = searchBox.value.trim().toLowerCase();

        if (!q) {
            results.innerHTML = "";
            return;
        }

        results.innerHTML = "<p>Searching...</p>";

        try {
            const all = await loadWikiTitles();

            // match letters inside the pet name (ignore the "(Pet Simulator X)" part)
            const matches = all
                .filter(title => title.replace(/\(.*\)/, "").toLowerCase().includes(q))
                .slice(0, 24);

            if (!matches.length) {
                results.innerHTML = "<p>No matches.</p>";
                return;
            }

            const images = await getThumbnails(matches);

            results.innerHTML = images.map(img => `
                <button type="button" class="image-result" data-url="${escapeHTML(img.url)}">
                    <img src="${escapeHTML(img.url)}" alt="" loading="lazy">
                    <span>${escapeHTML(img.title.replace(/\(.*\)/, ""))}</span>
                </button>
            `).join("") || "<p>No images found.</p>";

        } catch (err) {
            console.error(err);
            results.innerHTML = "<p>Search failed. Check the console (F12).</p>";
        }
    }

    results.addEventListener("click", event => {
        const button = event.target.closest(".image-result");
        if (!button) return;

        urlInput.value = button.dataset.url;
        results.innerHTML = "";
        searchBox.value = "";
    });
}

setupImageSearcher();