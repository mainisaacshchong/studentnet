const fs = require("fs");
const path = require("path");

function generateId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 10; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

const id = generateId();
const templatePath = path.join(__dirname, "help_articles", "template.html");
const newArticlePath = path.join(__dirname, "help_articles", `${id}.html`);

let content = fs.readFileSync(templatePath, "utf8");
content = content.replace("Article ID: TEMPLATE", `Article ID: ${id}`);

fs.writeFileSync(newArticlePath, content);

console.log(`Created new article: ${id}.html`);

require("./generateHelpList.js");
