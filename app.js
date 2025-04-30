// DOM Elements
const colorPicker = document.getElementById("colorPicker");
const colorInput = document.getElementById("colorInput");
const addColorBtn = document.getElementById("addColorBtn");
const clearColorsBtn = document.getElementById("clearColorsBtn");
const colorPreviewContainer = document.getElementById("colorPreviewContainer");
const suggestNameBtn = document.getElementById("suggestNameBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const paletteContainer = document.getElementById("paletteContainer");
const paletteNameInput = document.getElementById("paletteName");
const addBtn = document.getElementById("addPalette");
const updateBtn = document.getElementById("updatePalette");

// API Configuration
const API_URL = window.location.hostname === 'paulmagadi.github.io' 
  ? 'https://api-eeex.onrender.com/api/palettes'
  : 'http://localhost:8000/api/palettes';

// State
let selectedColors = [];
let currentlyEditingId = null;

// Initialize SortableJS for drag and drop
if (colorPreviewContainer) {
    new Sortable(colorPreviewContainer, {
        animation: 150,
        ghostClass: 'dragging',
        onEnd: () => {
            updateColorInputField();
        }
    });
}

// Color Database
const colorNames = {
    "#FF0000": "Red", "#00FF00": "Green", "#0000FF": "Blue",
    "#FFFF00": "Yellow", "#FF00FF": "Magenta", "#00FFFF": "Cyan",
    "#000000": "Black", "#FFFFFF": "White", "#BF39A9": "Purple",
    "#034AA6": "Navy Blue", "#F2911B": "Orange", "#D95F18": "Dark Orange",
    "#8C1C03": "Brown", "#FFA500": "Orange", "#FF6347": "Tomato",
    "#FF69B4": "Hot Pink", "#9370DB": "Medium Purple", "#32CD32": "Lime Green"
};

const paletteNameSuggestions = [
    "Vibrant Sunset", "Ocean Breeze", "Forest Greens", "Autumn Leaves",
    "Winter Frost", "Summer Vibes", "Spring Bloom", "Pastel Dreams",
    "Neon Nights", "Earth Tones", "Cool Blues", "Warm Reds",
    "Muted Palette", "Bold Contrasts", "Rainbow Spectrum"
];

// Event Listeners
addColorBtn?.addEventListener("click", addColorFromInput);
clearColorsBtn?.addEventListener("click", clearAllColors);
suggestNameBtn?.addEventListener("click", suggestPaletteName);
cancelEditBtn?.addEventListener("click", cancelEdit);
colorInput?.addEventListener("keypress", (e) => e.key === "Enter" && addColorFromInput());
colorPicker?.addEventListener("input", (e) => colorInput.value = e.target.value);
addBtn?.addEventListener("click", addPalette);
updateBtn?.addEventListener("click", updatePalette);

// Color Management
function addColorFromInput() {
    let colorValue = colorInput.value.trim();
    
    // Convert color name to hex if needed
    if (!colorValue.startsWith('#') && colorNames[colorValue.toLowerCase()]) {
        colorValue = Object.keys(colorNames).find(key => 
            colorNames[key].toLowerCase() === colorValue.toLowerCase()
        ) || colorValue;
    }
    
    if (!isValidColor(colorValue)) {
        alert("Please enter a valid hex color (e.g., #FF0000) or color name");
        return;
    }
    
    colorValue = colorValue.toUpperCase();
    
    if (!selectedColors.includes(colorValue)) {
        selectedColors.push(colorValue);
        updateColorPreviews();
        updateColorInputField();
        colorInput.value = "";
        colorPicker.value = colorValue;
    }
}

function clearAllColors() {
    if (!selectedColors.length || confirm("Clear all colors?")) {
        selectedColors = [];
        updateColorPreviews();
        updateColorInputField();
    }
}

function updateColorPreviews() {
    if (!colorPreviewContainer) return;
    
    colorPreviewContainer.innerHTML = selectedColors.map((color, index) => {
        const textColor = getContrastColor(color);
        return `
            <div class="color-preview" style="background-color: ${color}; color: ${textColor}" 
                 data-index="${index}" draggable="true">
                ${getColorName(color)}
                <span class="delete-color" onclick="event.stopPropagation(); removeColor(${index})">×</span>
            </div>
        `;
    }).join('');
}

function updateColorInputField() {
    if (colorInput) colorInput.value = selectedColors.join(", ");
}

function removeColor(index) {
    selectedColors.splice(index, 1);
    updateColorPreviews();
    updateColorInputField();
}

// Palette Name Suggestions
function suggestPaletteName() {
    if (!selectedColors.length) {
        paletteNameInput.value = paletteNameSuggestions[Math.floor(Math.random() * paletteNameSuggestions.length)];
        return;
    }
    
    const colorCategories = selectedColors.map(getColorCategory);
    const counts = colorCategories.reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    
    const [primary, secondary = primary] = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const nameGroups = {
        "Red": ["Passionate", "Fiery", "Bold"],
        "Orange": ["Energetic", "Warm", "Sunset"],
        "Yellow": ["Sunny", "Bright", "Golden"],
        "Green": ["Natural", "Fresh", "Forest"],
        "Blue": ["Cool", "Ocean", "Sky"],
        "Purple": ["Royal", "Mystical", "Lavender"],
        "Pink": ["Sweet", "Romantic", "Playful"],
        "Neutral": ["Minimal", "Elegant", "Classic"]
    };
    
    const randomName = (group) => nameGroups[group][Math.floor(Math.random() * nameGroups[group].length)];
    paletteNameInput.value = `${randomName(primary)} ${randomName(secondary)}`;
}

// Helper Functions
function isValidColor(color) {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color) || 
           Object.values(colorNames).some(n => n.toLowerCase() === color.toLowerCase());
}

function getColorName(hex) {
    return colorNames[hex] || hex;
}

function getColorCategory(hex) {
    const hue = getHueFromHex(hex);
    if (hue < 15 || hue >= 345) return "Red";
    if (hue < 45) return "Orange";
    if (hue < 75) return "Yellow";
    if (hue < 165) return "Green";
    if (hue < 195) return "Cyan";
    if (hue < 255) return "Blue";
    if (hue < 285) return "Purple";
    if (hue < 345) return "Pink";
    return "Neutral";
}




// CRUD Operations

// Helper function to ensure clean URLs
function getApiUrl(path = "") {
    // Remove any leading slashes from path
    const cleanPath = path.replace(/^\//, '');
    
    // For collection endpoints (like listing/all), don't add trailing slash
    if (!cleanPath) {
        return `${API_URL}/`;
    }
    // For specific resource endpoints, add trailing slash
    return `${API_URL}/${cleanPath}/`;
}


async function fetchAndRenderPalettes() {
    try {
        const response = await fetch(getApiUrl());
        if (!response.ok) 
            throw new Error("Network response was not ok");
        renderPalettes(await response.json());
    } catch (error) {
        console.error("Error fetching palettes:", error);
        alert("Failed to load palettes. See console for details. No that you might wait a few seconds for the first load.");
        // Optionally, you can render an empty state or a message to the user
        paletteContainer.innerHTML = "<p>No palettes available.</p>";
        // Or render a default state
        renderPalettes([
            { id: 1, name: "Default Palette 1", colors: ["#FF0000", "#00FF00", "#0000FF", "#BF39A9"] },
            { id: 2, name: "Default Palette 2", colors: ["#000298", "#F2F2F0", "#A5D7FC", "#0E0F52"] },
            { id: 3, name: "Default Palette 3", colors: ["#FFFFFF", "#FFA500", "#FF6347", "#9370DB"] },
            { id: 4, name: "Default Palette 4", colors: ["#32CD32", "#8C1C03", "#F2911B", "#D95F18"] },
            { id: 5, name: "Default Palette 5", colors: ["#FF69B4", "#FFA500", "#FF6347", "#9370DB"] },
            { id: 6, name: "Default Palette 6", colors: ["#177654", "#EBDFAB", "#0C211D", "#E15D3D"] }
        ]); // Uncomment this line if you have a default state to show
        // renderPalettes([]);
        // return []; 
    }
}

function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;
    
    // Calculate relative luminance
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function renderPalettes(palettes) {
    paletteContainer.innerHTML = palettes.map(palette => {
        const colors = typeof palette.colors === 'string' ? JSON.parse(palette.colors) : palette.colors;
        return `
            <div class="color-palette" data-id="${palette.id}">
                ${colors.map(color => {
                    const textColor = getContrastColor(color);
                    return `
                        <div class="color-container">
                            <div class="circle" style="background-color: ${color}"></div>
                            <div class="color" style="background-color: ${color}; color: ${textColor}">
                                <p>${color}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
                <hr>
                <h5 style="color: black; text-align: center; margin: 10px 0">${palette.name}</h5>
                <div class="palette-actions">
                    <button class="copy-css-btn" data-id="${palette.id}"  title ='Copy code'>CSS</button>
                    <button class="demo-btn" data-id="${palette.id}" title ='View demo'>Demo</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", handleEdit);
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", handleDelete);
    });
}






function handleError(operation, error) {
    console.error(`Error ${operation}:`, error);
    alert(`Error ${operation}. See console for details.`);
}

// Initialize
fetchAndRenderPalettes();




// Modal elements
document.addEventListener('DOMContentLoaded', function() {
const cssModal = document.getElementById("cssModal");
const cssCode = document.getElementById("cssCode");
const copyCssBtn = document.getElementById("copyCssBtn");
const closeCssModal = document.getElementById("closeCssModal");

// Generate CSS snippet
function generateCssSnippet(colors, paletteName) {
    const sanitizedName = paletteName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    let css = `/* ${paletteName} Color Palette */\n`;
    css += `.${sanitizedName}-palette {\n`;
    css += `  /* Usage: apply these classes to your elements */\n`;
    
    colors.forEach((color, index) => {
        css += `  --color-${index + 1}: ${color};\n`;
    });
    
    css += `}\n\n`;
    
    colors.forEach((color, index) => {
        css += `.${sanitizedName}-color-${index + 1} {\n`;
        css += `  background-color: ${color};\n`;
        css += `  color: ${getContrastColor(color)};\n`;
        css += `}\n\n`;
    });
    
    return css;
}

// Show CSS modal
function showCssModal(paletteId) {
    const palette = document.querySelector(`.color-palette[data-id="${paletteId}"]`);
    const paletteName = palette.querySelector("h5").textContent;
    const colors = Array.from(palette.querySelectorAll(".color p")).map(el => el.textContent);
    
    cssCode.textContent = generateCssSnippet(colors, paletteName);
    cssModal.style.display = "block";
}

// Close modal
closeCssModal.addEventListener("click", () => {
    cssModal.style.display = "none";
});

// Copy to clipboard
copyCssBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(cssCode.textContent)
        .then(() => {
            copyCssBtn.textContent = "Copied!";
            setTimeout(() => {
                copyCssBtn.textContent = "Copy to Clipboard";
            }, 2000);
        })
        .catch(err => {
            console.error("Failed to copy CSS: ", err);
            alert("Failed to copy CSS to clipboard");
        });
});

// Close when clicking outside modal
window.addEventListener("click", (event) => {
    if (event.target === cssModal) {
        cssModal.style.display = "none";
    }
});

// Add event listeners for copy CSS buttons
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("copy-css-btn")) {
        showCssModal(e.target.dataset.id);
    }
});
});


// Demo Modal Elements
const demoModal = document.getElementById("demoModal");
const demoTemplate = document.getElementById("demoTemplate");
const demoSidebar = document.getElementById("demoSidebar");
const demoNavbar = document.getElementById("demoNavbar");
const demoCard1 = document.getElementById("demoCard1");
const demoCard2 = document.getElementById("demoCard2");
const closeDemoModal = document.querySelector(".close-demo-modal");

// Show demo template
function showDemo(paletteId) {
    const palette = document.querySelector(`.color-palette[data-id="${paletteId}"]`);
    if (!palette) return;
    
    const colors = Array.from(palette.querySelectorAll(".color p"))
        .map(el => el.textContent)
        .filter(color => isValidColor(color));
    
    // Clear previous demo
    demoSidebar.innerHTML = '';
    
    // Apply colors to demo template
    colors.forEach((color, index) => {
        // Add color boxes to sidebar
        const colorBox = document.createElement("div");
        colorBox.className = "demo-color-box";
        colorBox.style.backgroundColor = color;
        colorBox.style.color = getContrastColor(color);
        colorBox.textContent = `Color ${index + 1}`;
        demoSidebar.appendChild(colorBox);
        
        // Apply colors to template elements
        if (index === 0) {
            demoNavbar.style.backgroundColor = color;
            demoNavbar.style.color = getContrastColor(color);
        }
        if (index === 1) {
            demoCard1.style.backgroundColor = color;
            demoCard1.style.color = getContrastColor(color);
        }
        if (index === 2) {
            demoCard2.style.backgroundColor = color;
            demoCard2.style.color = getContrastColor(color);
        }
        if (index === 3) {
            const buttons = demoCard1.querySelectorAll(".demo-button");
            buttons[0].style.backgroundColor = color;
            buttons[0].style.color = getContrastColor(color);
        }
        if (index === 4) {
            const buttons = demoCard1.querySelectorAll(".demo-button");
            buttons[1].style.backgroundColor = color;
            buttons[1].style.color = getContrastColor(color);
        }
    });
    
    demoModal.style.display = "block";
}

// Close demo modal
closeDemoModal.addEventListener("click", () => {
    demoModal.style.display = "none";
});

window.addEventListener("click", (event) => {
    if (event.target === demoModal) {
        demoModal.style.display = "none";
    }
});

// Add event delegation for demo buttons
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("demo-btn")) {
        showDemo(e.target.dataset.id);
    }
});