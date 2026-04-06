// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".form").forEach(f => f.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.target).classList.add("active");
    });
});

// Password login
document.getElementById("passwordForm").addEventListener("submit", e => {
    e.preventDefault();
    const formData = new URLSearchParams(new FormData(e.target));

    fetch("/auth/login", {
        method:"POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                showSuccess(data.message);
                setTimeout(() => window.location.href="/dashboard", 1500);
            } else {
                alert(data.error || "Login failed");
            }
        });
});

// Send code
document.getElementById("sendCodeBtn").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    fetch("/auth/send-code", {
        method:"POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.ok) alert(data.error || "Failed to send code");
            else showSuccess("Verification code sent to your email");
        });
});

// Email login
document.getElementById("emailForm").addEventListener("submit", e => {
    e.preventDefault();
    const formData = new URLSearchParams(new FormData(e.target));

    fetch("/auth/login-email", {
        method:"POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                showSuccess(data.message);
                setTimeout(() => window.location.href="/dashboard", 1500);
            } else {
                alert(data.error || "Login failed");
            }
        });
});
