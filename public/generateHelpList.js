const fs = require("fs");
const path = require("path");

const helpPage = path.join(__dirname, "help.html");
const articlesDir = path.join(__dirname, "help_articles");

const files = fs.readdirSync(articlesDir)
    .filter(f => f.endsWith(".html") && f !== "template.html");

let listHTML = "";

files.forEach(file => {
    const id = file.replace(".html", "");
    const filePath = path.join(articlesDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    const match = content.match(/<h1[^>]*>(.*?)<\/h1>/);
    const title = match ? match[1] : "Untitled Article";

    listHTML += `<a class="article-item" href="/help_articles/${id}.html">${title}</a>\n`;
});

let html = fs.readFileSync(helpPage, "utf8");
html = html.replace("<!-- ARTICLE_LIST -->", listHTML);
fs.writeFileSync(helpPage, html);

console.log("Help article list updated!");
