(function() {
    const errorBox = document.createElement("div");
    errorBox.id = "errorBox";
    Object.assign(errorBox.style, {
        position: "fixed", top: "20px", right: "20px",
        background: "#ff4d4d", color: "#fff",
        padding: "12px 16px", borderRadius: "6px",
        fontWeight: "bold", border: "1px solid #cc0000",
        display: "none", zIndex: "9999"
    });
    document.body.appendChild(errorBox);

    const successBox = document.createElement("div");
    successBox.id = "successBox";
    Object.assign(successBox.style, {
        position: "fixed", top: "70px", right: "20px",
        background: "#4dff88", color: "#000",
        padding: "12px 16px", borderRadius: "6px",
        fontWeight: "bold", border: "1px solid #00cc44",
        display: "none", zIndex: "9999"
    });
    document.body.appendChild(successBox);

    window.alert = function(message) {
        errorBox.innerText = message;
        errorBox.style.display = "block";
        setTimeout(() => { errorBox.style.display = "none"; }, 4000);
    };

    window.showSuccess = function(message) {
        successBox.innerText = message;
        successBox.style.display = "block";
        setTimeout(() => { successBox.style.display = "none"; }, 4000);
    };
})();
