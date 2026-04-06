// Handles signup form logic

// Send confirmation code
document.getElementById("sendSignupCodeBtn").addEventListener("click", () => {
    const form = document.getElementById("signupForm");
    const data = new URLSearchParams(new FormData(form));

    fetch("/auth/send-signup-code", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data
    })
        .then(res => res.json())
        .then(data => {
            if (!data.ok) {
                alert(data.error || "Failed to send code");
            } else {
                showSuccess("Confirmation code sent to your email");
            }
        });
});

// Final signup
document.getElementById("signupForm").addEventListener("submit", e => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form); // multipart for file upload

    fetch("/signup", {
        method: "POST",
        body: formData
    })
        .then(res => {
            if (res.redirected) {
                window.location.href = res.url;
            } else {
                return res.text();
            }
        })
        .then(text => {
            if (text) alert(text);
        });
});
