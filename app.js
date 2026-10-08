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
    const categoryPillsContainer = document.getElementById("category-pills");
    
    const newMatkulInput = document.getElementById("new-matkul-input");
    const btnAddMatkul = document.getElementById("btn-add-matkul");
    const matkulList = document.getElementById("matkul-list");

    let allSlides = [];
    let allSubjects = [];
    let currentCategory = "all";
    let searchQuery = "";

    // --- Firebase Auth ---
    window.onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            btnLogin.classList.add("hidden");
            btnLogout.classList.remove("hidden");
            btnUploadNav.classList.remove("hidden");
            btnUploadBanner.classList.remove("hidden");
            btnManageMatkul.classList.remove("hidden");
            btnUploadBanner.classList.add("inline-flex");
            btnUploadNav.classList.add("inline-flex");
            btnManageMatkul.classList.add("inline-flex");
        } else {
            btnLogin.classList.remove("hidden");
            btnLogout.classList.add("hidden");
            btnUploadNav.classList.add("hidden");
            btnUploadBanner.classList.add("hidden");
            btnManageMatkul.classList.add("hidden");
            document.getElementById("upload-panel").classList.add("hidden");
        }
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
        categoryPillsContainer.innerHTML = '<button class="category-btn active-pill px-4 py-2 rounded-full font-label-md text-label-md bg-primary text-on-primary whitespace-nowrap shadow-sm border-transparent transition-all" data-cat="all">Semua Mata Kuliah</button>';
        allSubjects.forEach(sub => {
            const btn = document.createElement("button");
            btn.className = "category-btn px-4 py-2 rounded-full font-label-md text-label-md bg-surface-container-low text-on-surface border border-surface-container hover:bg-surface-container-high transition-colors whitespace-nowrap";
            btn.setAttribute("data-cat", sub.name);
            btn.innerText = sub.name;
            categoryPillsContainer.appendChild(btn);
        });

        // Re-attach pill listeners
        const categoryPills = document.querySelectorAll(".category-btn");
        categoryPills.forEach(pill => {
            pill.addEventListener("click", () => {
                categoryPills.forEach(p => {
                    p.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm', 'border-transparent');
                    p.classList.add('bg-surface-container-low', 'text-on-surface', 'border', 'border-surface-container');
                });
                pill.classList.remove('bg-surface-container-low', 'text-on-surface', 'border', 'border-surface-container');
                pill.classList.add('bg-primary', 'text-on-primary', 'shadow-sm', 'border-transparent');
                currentCategory = pill.getAttribute("data-cat");
                renderGrid();
            });
        });

        // Render in Modal List
        matkulList.innerHTML = "";
        allSubjects.forEach(sub => {
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-2 bg-surface-container-low rounded-lg";
            li.innerHTML = `
                <span class="font-body-sm text-on-surface">${sub.name}</span>
                <button class="text-error hover:bg-error-container p-1 rounded transition-colors" onclick="deleteMatkul('${sub.id}')">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
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
        formSubmit.innerHTML = "Menyimpan...";

        try {
            await window.addDoc(window.collection(window.firebaseDb, "presentations"), {
                matkul,
                judul,
                pertemuan,
                url,
                fileName: "Dari Link",
                type: type,
                timestamp: new Date()
            });

            showToast("Berhasil menyimpan link presentasi!");
            uploadForm.reset();
            toggleUploadDrawer();
            loadSlides();
        } catch (error) {
            alert("Gagal upload: " + error.message);
        } finally {
            formSubmit.disabled = false;
            formSubmit.innerHTML = `<span class="material-symbols-outlined text-[18px]">publish</span><span>Upload & Publikasikan</span>`;
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
            statSlide.innerText = `${allSlides.length} Slide Tersedia`;
            renderGrid();
        } catch (error) {
            console.error("Gagal load data", error);
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
                s.judul.toLowerCase().includes(searchQuery.toLowerCase()) || 
                s.matkul.toLowerCase().includes(searchQuery.toLowerCase())
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
                const badgeColor = item.type === "PDF" ? "bg-error text-on-error" : "bg-primary text-on-primary";
                
                const dateObj = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
                const dateStr = dateObj.toLocaleDateString("id-ID");

                const card = document.createElement("article");
                card.className = "presentation-card group flex flex-col justify-between bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container hover:border-surface-container-high transition-all duration-300 hover:-translate-y-1 overflow-hidden";
                card.innerHTML = `
                    <div>
                        <div class="relative w-full aspect-video bg-surface-container-low overflow-hidden flex items-center justify-center">
                            <span class="material-symbols-outlined text-[64px] text-surface-variant">description</span>
                            <div class="absolute top-3 left-3 flex items-center gap-1.5">
                                <span class="px-2.5 py-1 rounded-md ${badgeColor} font-label-sm text-label-sm uppercase font-bold tracking-wider shadow">${item.type || 'FILE'}</span>
                                <span class="px-2.5 py-1 rounded-md bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold shadow">Pertemuan ${item.pertemuan}</span>
                            </div>
                        </div>
                        <div class="p-space-md flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                                <span class="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">${item.matkul}</span>
                            </div>
                            <h3 class="font-headline-sm text-headline-sm text-primary group-hover:text-primary-container transition-colors line-clamp-2">${item.judul}</h3>
                            <div class="flex items-center gap-2 pt-2 text-secondary">
                                <div class="flex items-center gap-2 font-body-sm text-body-sm">
                                    <span>Diunggah pada ${dateStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="px-space-md pb-space-md pt-2 flex items-center justify-end border-t border-surface-container-high/60">
                        <a href="${item.url}" target="_blank" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm">
                            <span class="material-symbols-outlined text-[16px]">file_download</span>
                            <span>Download / Lihat</span>
                        </a>
                    </div>
                `;
                presentationsGrid.appendChild(card);
            });
        }
    }

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderGrid();
    });

    // Initial load
    loadSubjects();
    loadSlides();
});
