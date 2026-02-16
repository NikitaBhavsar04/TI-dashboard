const fs = require('fs');
const path = require('path');

// 1. Read the HTML file
const htmlPath = path.resolve('templates/advisory_4.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 2. Define the regex
const regex = /<p[\s\S]*?style="margin: 5px 0;[^>]*>[\s\S]*?Detected at:[\s\S]*?<\/p>/;

// 3. Test the regex
const match = htmlContent.match(regex);

if (match) {
    console.log("✅ Regex successfully matched the content!");
    console.log("Matched content:\n", match[0]);
} else {
    console.log("❌ Regex failed to match the content.");
    
    // Let's try to isolate the target section to see what's wrong
    // Looking for the paragraph with "Detected at:"
    const debugRegex = /<p[^>]*>[\s\S]*?Detected at:[\s\S]*?<\/p>/;
    const debugMatch = htmlContent.match(debugRegex);
    
    if (debugMatch) {
        console.log("Found the section with a looser regex:\n", debugMatch[0]);
        console.log("Analyzing why the specific regex failed...");
        
        const target = debugMatch[0];
        if (!target.includes('style="margin: 5px 0;')) {
            console.log("--> 'style=\"margin: 5px 0;' not found exactly.");
        }
    } else {
        console.log("Could not even find a <p> tag containing 'Detected at:'. Please check the file content.");
    }
}
