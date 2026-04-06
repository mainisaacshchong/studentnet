// motion.js
// Handles loading motion details, supporters, articles, signing, and article submission

// Get motion ID from URL
const motionId = window.location.pathname.split("/").pop();

// DOM elements
const titleEl = document.getElementById("motionTitle");
const descEl = document.getElementById("motionDescription");
const councilEl = document.getElementById("motionCouncil");
const creatorEl = document.getElementById("motionCreator");
const supportersEl = document.getElementById("supportersList");
const supporterCountEl = document.getElementById("supporterCount");
const articleListEl = document.getElementById("articleList");
const pendingListEl = document.getElementById("pendingArticles");
const addArticleForm = document.getElementById("addArticleForm");
const signBtn = document.getElementById("signMotionBtn");

// Load current user
let currentUser = null;
fetch("/me")
    .then(res => res.json())
    .then(user => {
        currentUser = user;
        document.getElementById("userName").innerText = user.username;
        document.getElementById("userPic").src = user.profilePic || "/defaultpfp.png";

        loadMotion();
        loadArticles();
    });

// Load motion details
function loadMotion() {
    fetch(`/api/motion/${motionId}`)
        .then(res => res.json())
        .then(motion => {
            if (!motion) return;

            titleEl.innerText = motion.title;
            descEl.innerText = motion.description;
            creatorEl.innerText = motion.creator;
            supporterCountEl.innerText = motion.supporters.length;

            supportersEl.innerHTML = "";
            motion.supporters.forEach(name => {
                const li = document.createElement("li");
                li.innerText = name;
                supportersEl.appendChild(li);
            });

            fetch("/api/council/browse")
                .then(res => res.json())
                .then(councils => {
                    const council = councils.find(c => c.id === motion.councilId);
                    councilEl.innerText = council ? council.name : "Unknown Council";
                });

            if (motion.supporters.includes(currentUser.username)) {
                signBtn.innerText = "You already signed";
                signBtn.disabled = true;
            }
        });
}

// Sign motion
signBtn.addEventListener("click", () => {
    fetch("/api/motion/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motionId })
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                signBtn.innerText = "Signed!";
                signBtn.disabled = true;
                loadMotion();
            }
        });
});

// Load articles
function loadArticles() {
    fetch(`/api/article/byMotion/${motionId}`)
        .then(res => res.json())
        .then(articles => {
            articleListEl.innerHTML = "";
            pendingListEl.innerHTML = "";

            articles.forEach(article => {
                const div = document.createElement("div");
                div.className = "article-card";

                div.innerHTML = `
                    <p>${article.text}</p>
                    <small>By: ${article.author}</small>
                `;

                if (article.status === "approved") {
                    articleListEl.appendChild(div);
                }

                if (article.status === "pending" && article.author !== currentUser.username) {
                    const pendingDiv = document.createElement("div");
                    pendingDiv.className = "article-card pending";

                    pendingDiv.innerHTML = `
                        <p>${article.text}</p>
                        <small>By: ${article.author}</small>
                        <button class="approveBtn">Approve</button>
                        <button class="rejectBtn">Reject</button>
                    `;

                    pendingDiv.querySelector(".approveBtn").onclick = () => reviewArticle(article.id, true);
                    pendingDiv.querySelector(".rejectBtn").onclick = () => reviewArticle(article.id, false);

                    pendingListEl.appendChild(pendingDiv);
                }
            });
        });
}

// Review article
function reviewArticle(articleId, approve) {
    fetch("/api/article/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, approve })
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) loadArticles();
        });
}

// Add article
addArticleForm.addEventListener("submit", e => {
    e.preventDefault();

    const text = document.getElementById("articleText").value;

    fetch("/api/article/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motionId, text })
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                document.getElementById("articleText").value = "";
                loadArticles();
            }
        });
});
