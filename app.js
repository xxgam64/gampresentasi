document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");
    const btnUploadNav = document.getElementById("btn-upload-nav");
    const btnUploadBanner = document.getElementById("btn-upload-banner");
    const btnManageMatkul = document.getElementById("btn-manage-matkul");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
    
    const uploadForm = document.getElementById("upload-form");
    const formMatkul = document.getElementById("form-matkul");
    const formJudul = document.getElementById("form-judul");
    const formPertemuan = document.getElementById("form-pertemuan");
    const formUrl = document.getElementById("form-url");
    const formTipe = document.getElementById("form-tipe");
    const formSubmit = document.getElementById("form-submit");
    
    const presentationsGrid = document.getElementById("presentations-grid");
    const statSlide = document.getElementById("stat-slide");
    const cardCountLabel = document.getElementById("card-count-label");
    const noResultsState = document.getElementById("no-results-state");
    
    const searchInput = document.getElementById("live-search-input");
    const headerSearchInput = document.getElementById("header-search-input");
    const categoryPillsContainer = document.getElementById("category-pills");
    
    const newMatkulInput = document.getElementById("new-matkul-input");
    const btnAddMatkul = document.getElementById("btn-add-matkul");
    const matkulList = document.getElementById("matkul-list");

    let allSlides = [];
    let allSubjects = [];
    let currentCategory = "all";
    let searchQuery = "";
    let currentUser = null;

    // --- Firebase Auth ---
    window.onAuthStateChanged(window.firebaseAuth, (user) => {
        currentUser = user;
        if (user) {
            btnLogin.classList.add("hidden");
            btnLogout.classList.remove("hidden");
            btnLogout.classList.add("inline-flex");
            btnUploadNav.classList.remove("hidden");
            btnUploadNav.classList.add("inline-flex");
            if (btnUploadBanner) {
                btnUploadBanner.classList.remove("hidden");
                btnUploadBanner.classList.add("inline-flex");
            }
            btnManageMatkul.classList.remove("hidden");
            btnManageMatkul.classList.add("inline-flex");
        } else {
            btnLogin.classList.remove("hidden");
            btnLogout.classList.add("hidden");
            btnLogout.classList.remove("inline-flex");
            btnUploadNav.classList.add("hidden");
            btnUploadNav.classList.remove("inline-flex");
            if (btnUploadBanner) {
                btnUploadBanner.classList.add("hidden");
                btnUploadBanner.classList.remove("inline-flex");
            }
            btnManageMatkul.classList.add("hidden");
            btnManageMatkul.classList.remove("inline-flex");
            document.getElementById("upload-panel").classList.add("hidden");
        }
        renderGrid();
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = loginEmail.value;
        const password = loginPassword.value;
        try {
            await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
            closeModal('admin-login-modal');
            showToast("Berhasil login!");
            loginForm.reset();
            loginError.innerText = "";
        } catch (error) {
            loginError.innerText = "Gagal login: " + error.message;
        }
    });

    btnLogout.addEventListener("click", async () => {
        await window.signOut(window.firebaseAuth);
        showToast("Anda telah logout.");
    });

    // --- Manage Matkul ---
    async function loadSubjects() {
        try {
            const q = window.query(window.collection(window.firebaseDb, "subjects"), window.orderBy("name", "asc"));
            const snapshot = await window.getDocs(q);
            allSubjects = [];
            snapshot.forEach(doc => {
                allSubjects.push({ id: doc.id, ...doc.data() });
            });
            renderSubjects();
        } catch (error) {
            console.error("Gagal load subjects", error);
        }
    }

    function renderSubjects() {
        // Render in Upload Form
        formMatkul.innerHTML = '<option disabled selected value="">Pilih Mata Kuliah...</option>';
        allSubjects.forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub.name;
            opt.innerText = sub.name;
            formMatkul.appendChild(opt);
        });

        // Render Category Pills
        categoryPillsContainer.innerHTML = `
            <button class="category-btn ${currentCategory === 'all' ? 'active-pill bg-parchment text-obsidian-950' : 'bg-obsidian-900 text-slate-300 border border-obsidian-800 hover:border-obsidian-700'} px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all" data-cat="all">
              Semua Mata Kuliah
            </button>
        `;
        allSubjects.forEach(sub => {
            const isActive = currentCategory === sub.name;
            const btn = document.createElement("button");
            btn.className = `category-btn ${isActive ? 'active-pill bg-parchment text-obsidian-950' : 'bg-obsidian-900 text-slate-300 border border-obsidian-800 hover:border-obsidian-700'} px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all`;
            btn.setAttribute("data-cat", sub.name);
            btn.innerText = sub.name;
            categoryPillsContainer.appendChild(btn);
        });

        // Re-attach pill listeners
        const categoryPills = document.querySelectorAll(".category-btn");
        categoryPills.forEach(pill => {
            pill.addEventListener("click", () => {
                currentCategory = pill.getAttribute("data-cat");
                categoryPills.forEach(p => {
                    p.classList.remove('bg-parchment', 'text-obsidian-950', 'active-pill', 'font-semibold');
                    p.classList.add('bg-obsidian-900', 'text-slate-300', 'border', 'border-obsidian-800');
                });
                pill.classList.remove('bg-obsidian-900', 'text-slate-300', 'border', 'border-obsidian-800');
                pill.classList.add('bg-parchment', 'text-obsidian-950', 'active-pill', 'font-semibold');
                renderGrid();
            });
        });

        // Render in Modal List
        matkulList.innerHTML = "";
        allSubjects.forEach(sub => {
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-2.5 bg-obsidian-950 border border-obsidian-800/80 rounded-xl";
            li.innerHTML = `
                <span class="text-xs text-slate-200 font-medium">${sub.name}</span>
                <button class="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1 rounded-lg transition-colors" onclick="deleteMatkul('${sub.id}')" title="Hapus">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
            `;
            matkulList.appendChild(li);
        });
    }

    btnAddMatkul.addEventListener("click", async () => {
        const val = newMatkulInput.value.trim();
        if (!val) return;
        try {
            await window.addDoc(window.collection(window.firebaseDb, "subjects"), {
                name: val,
                timestamp: new Date()
            });
            newMatkulInput.value = "";
            showToast("Mata kuliah berhasil ditambahkan");
            loadSubjects();
        } catch (error) {
            alert("Gagal menambah matkul: " + error.message);
        }
    });

    window.deleteMatkul = async (id) => {
        if (!confirm("Hapus mata kuliah ini?")) return;
        try {
            await window.deleteDoc(window.doc(window.firebaseDb, "subjects", id));
            showToast("Mata kuliah dihapus");
            loadSubjects();
        } catch (error) {
            alert("Gagal menghapus: " + error.message);
        }
    };

    window.deleteSlide = async (id) => {
        if (!confirm("Hapus presentasi ini dari katalog?")) return;
        try {
            await window.deleteDoc(window.doc(window.firebaseDb, "presentations", id));
            showToast("Slide berhasil dihapus");
            loadSlides();
        } catch (error) {
            alert("Gagal menghapus slide: " + error.message);
        }
    };

    // --- Upload ---
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const matkul = formMatkul.value;
        const judul = formJudul.value;
        const pertemuan = formPertemuan.value || "-";
        const url = formUrl.value;
        const type = formTipe.value;

        if (!url) {
            alert("Masukkan link terlebih dahulu!");
            return;
        }

        formSubmit.disabled = true;
        formSubmit.innerHTML = "Menyimpan ke arsip...";

        try {
            await window.addDoc(window.collection(window.firebaseDb, "presentations"), {
                matkul,
                judul,
                pertemuan,
                url,
                fileName: "Materi Terbit",
                type: type,
                timestamp: new Date()
            });

            showToast("Berhasil menerbitkan materi!");
            uploadForm.reset();
            toggleUploadDrawer();
            loadSlides();
        } catch (error) {
            alert("Gagal upload: " + error.message);
        } finally {
            formSubmit.disabled = false;
            formSubmit.innerHTML = `<span class="material-symbols-outlined text-[18px]">publish</span><span>Publikasikan Slide</span>`;
        }
    });

    // --- Data Load & Render ---
    async function loadSlides() {
        try {
            const q = window.query(window.collection(window.firebaseDb, "presentations"), window.orderBy("timestamp", "desc"));
            const snapshot = await window.getDocs(q);
            allSlides = [];
            snapshot.forEach(doc => {
                allSlides.push({ id: doc.id, ...doc.data() });
            });
            statSlide.innerText = `${allSlides.length} Dokumen`;
            renderGrid();
        } catch (error) {
            console.error("Gagal load data", error);
            statSlide.innerText = "0 Dokumen";
        }
    }

    function renderGrid() {
        presentationsGrid.innerHTML = "";
        
        let filtered = allSlides;
        if (currentCategory !== "all") {
            filtered = filtered.filter(s => s.matkul === currentCategory);
        }
        if (searchQuery) {
            filtered = filtered.filter(s => 
                (s.judul && s.judul.toLowerCase().includes(searchQuery.toLowerCase())) || 
                (s.matkul && s.matkul.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        cardCountLabel.innerText = `${filtered.length} Slide Ditampilkan`;

        if (filtered.length === 0) {
            noResultsState.classList.remove("hidden");
            noResultsState.classList.add("flex");
        } else {
            noResultsState.classList.add("hidden");
            noResultsState.classList.remove("flex");
            
            filtered.forEach(item => {
                const isPdf = item.type === "PDF";
                const badgeColor = isPdf 
                    ? "bg-rose-950/60 text-rose-300 border-rose-800/40" 
                    : "bg-amber-950/60 text-amber-300 border-amber-800/40";
                
                const typeIcon = isPdf ? "picture_as_pdf" : (item.type === "PPTX" ? "co_present" : "link");
                const dateObj = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
                const dateStr = dateObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });

                const card = document.createElement("article");
                card.className = "group flex flex-col justify-between bg-obsidian-900 border border-obsidian-800 hover:border-obsidian-700/80 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-sm";
                
                card.innerHTML = `
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between gap-2">
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded border ${badgeColor}">
                                <span class="material-symbols-outlined text-[13px]">${typeIcon}</span>
                                ${item.type || 'DOKUMEN'}
                            </span>
                            <span class="text-[11px] font-mono text-slate-400 bg-obsidian-950 px-2 py-0.5 rounded border border-obsidian-800">
                                Pertemuan ${item.pertemuan}
                            </span>
                        </div>

                        <div class="flex flex-col gap-1 mt-1">
                            <span class="text-[11px] font-mono uppercase tracking-wider text-accent font-medium">${item.matkul}</span>
                            <h3 class="text-sm sm:text-base font-semibold text-parchment leading-snug group-hover:text-white transition-colors line-clamp-2">
                                ${item.judul}
                            </h3>
                        </div>
                    </div>

                    <div class="pt-4 mt-4 border-t border-obsidian-800/70 flex items-center justify-between gap-2">
                        <span class="text-[11px] text-slate-400 font-mono">
                            ${dateStr}
                        </span>

                        <div class="flex items-center gap-1.5">
                            ${currentUser ? `
                                <button onclick="deleteSlide('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition-colors" title="Hapus Slide">
                                    <span class="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            ` : ''}
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-parchment hover:bg-white text-obsidian-950 text-xs font-bold rounded-lg shadow-sm transition-all">
                                <span>Akses Slide</span>
                                <span class="material-symbols-outlined text-[14px]">arrow_outward</span>
                            </a>
                        </div>
                    </div>
                `;
                presentationsGrid.appendChild(card);
            });
        }
    }

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        if (headerSearchInput) headerSearchInput.value = searchQuery;
        renderGrid();
    });

    if (headerSearchInput) {
        headerSearchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            searchInput.value = searchQuery;
            renderGrid();
        });
    }

    // Hotkey Cmd+K or Ctrl+K focus
    window.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // Initial load
    loadSubjects();
    loadSlides();
});
