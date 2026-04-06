// council.js
// Handles all council page logic: browsing, joining, creating, motions, managing

let currentUser = null;

// Load user info
fetch("/me")
    .then(res => res.json())
    .then(user => {
        currentUser = user;
        document.getElementById("userName").innerText = user.username;
        document.getElementById("userPic").src = user.profilePic || "/defaultpfp.png";

        loadBrowse();
        loadYourCouncils();
        loadMotions();
        loadManage();
    });

// ------------------------------
// Load Public Councils
// ------------------------------
function loadBrowse() {
    fetch("/api/council/browse")
        .then(res => res.json())
        .then(councils => {
            const box = document.getElementById("browseList");
            box.innerHTML = "";

            councils.forEach(c => {
                const div = document.createElement("div");
                div.className = "council-item";

                div.innerHTML = `
                    <h3>${c.name}</h3>
                    <p>${c.description}</p>
                    <button onclick="joinCouncil('${c.id}')">Join</button>
                `;

                box.appendChild(div);
            });
        });
}

// ------------------------------
// Load Your Councils
// ------------------------------
function loadYourCouncils() {
    fetch("/api/council/your")
        .then(res => res.json())
        .then(councils => {
            const box = document.getElementById("yourCouncilList");
            box.innerHTML = "";

            councils.forEach(c => {
                const div = document.createElement("div");
                div.className = "council-item";

                div.innerHTML = `
                    <h3>${c.name}</h3>
                    <p>${c.description}</p>
                    <button onclick="enterCouncil('${c.id}')">Enter</button>
                `;

                box.appendChild(div);
            });
        });
}

function enterCouncil(id) {
    window.location.href = `/council/${id}`;
}

// ------------------------------
// Join Council
// ------------------------------
function joinCouncil(id) {
    fetch("/api/council/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ councilId: id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                loadYourCouncils();
            }
        });
}

// ------------------------------
// Create Council
// ------------------------------
document.getElementById("createCouncilForm").addEventListener("submit", e => {
    e.preventDefault();

    const form = new FormData(e.target);

    fetch("/api/council/create", {
        method: "POST",
        body: new URLSearchParams(form)
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                loadYourCouncils();
                alert("Council created!");
            }
        });
});

// ------------------------------
// Load Motions
// ------------------------------
function loadMotions() {
    fetch("/api/motion/list")
        .then(res => res.json())
        .then(motions => {
            const box = document.getElementById("motionList");
            box.innerHTML = "";

            motions.forEach(m => {
                const div = document.createElement("div");
                div.className = "motion-card";

                div.innerHTML = `
                    <h3>${m.title}</h3>
                    <p class="meta">By ${m.creator}</p>
                    <p>${m.description}</p>
                    <button onclick="openMotion('${m.id}')">View Motion</button>
                `;

                box.appendChild(div);
            });

            // Update stats
            document.getElementById("totalMotions").innerText = motions.length;
            document.getElementById("yourMotions").innerText =
                motions.filter(m => m.creator === currentUser.username).length;
            document.getElementById("signedMotions").innerText =
                motions.filter(m => m.supporters.includes(currentUser.username)).length;
        });
}

function openMotion(id) {
    window.location.href = `/council/motion/${id}`;
}

// ------------------------------
// Manage Councils
// ------------------------------
function loadManage() {
    fetch("/api/council/your")
        .then(res => res.json())
        .then(councils => {
            const box = document.getElementById("manageList");
            box.innerHTML = "";

            councils
                .filter(c => c.owner === currentUser.username)
                .forEach(c => {
                    const div = document.createElement("div");
                    div.className = "manage-card";

                    div.innerHTML = `
                        <h3>${c.name}</h3>
                        <p>${c.description}</p>
                        <p>Members: ${c.members.length}</p>
                        <p>Pending: ${c.pending.length}</p>
                    `;

                    box.appendChild(div);
                });
        });
}
