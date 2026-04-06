const fs = require("fs");

// List of marketing pages
const pages = [
    "index.html",

    "plan.html",

];

// Load the new sidebar template
const newSidebar = fs.readFileSync("sidebar_marketing.html", "utf8");

// Regex to find the old sidebar block
const sidebarRegex = /<div class="sidebar">[\s\S]*?<\/div>/;

pages.forEach(page => {
    let html = fs.readFileSync(page, "utf8");

    // Replace the sidebar
    const updated = html.replace(sidebarRegex, newSidebar);

    fs.writeFileSync(page, updated, "utf8");
    console.log(`Updated sidebar in ${page}`);
});
