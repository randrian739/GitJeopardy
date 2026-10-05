console.log("javascript running")
// all of the dom elements we will need to reference in the code

const gameTable = document.getElementById("jeopardy");
const gameHeadRow = document.getElementById("jeopardy-head-row");
const gameBody = document.getElementById("jeopardy-body");
// buttons
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const loadingSpinner = document.getElementById("loading-spinner");

// some constants we will use in the code
// the number of columns and rows in the table, and the possible states of a cell
const COLUMN_COUNT = 6;
const ROW_COUNT = 5;
const CELL_STATE = {
    UNCLICKED: "unclicked",
    CLICKED: "clicked",
    REVEALED: "revealed"
};


// we need to first get all of the categories with the following url
// "https://rithm-jeopardy.herokuapp.com/api/categories?count=[**integer**]
// then we need to get all the game data for each category, with the following url
// "https://rithm-jeopardy.herokuapp.com/api/category?id=[**integer**]"
// we can do it with fetch or axios

// we need to build a data structure to feed into the table
let categoryIds= [];
let gameDataList = []; 

// Hint: render one table header per category title.
// titles ["sports, history, etc"]
function renderCategoryHeaders(titles = Array(COLUMN_COUNT).fill("No Category")) {
    gameHeadRow.innerHTML = "";
    
    for (let col = 0; col < COLUMN_COUNT; col++) {
        const th = document.createElement("th");
        th.textContent = titles[col] || "Category Here";
        gameHeadRow.appendChild(th);
    }
}



// Hint: build the game grid with row/column cells and initial metadata.
function renderGameCells(rowCount = ROW_COUNT, colCount = COLUMN_COUNT) {
    gameBody.innerHTML = "";

    for (let row = 0; row < rowCount; row++) {
        const tr = document.createElement("tr");
        // create columns for each row
        for (let col = 0; col < colCount; col++) {
            const td = document.createElement("td");
            td.classList.add("gameCell");
            // cells state
            td.dataset.state = CELL_STATE.UNCLICKED;
            // coordinates

            td.dataset.coords = `${col}-${row}`;
            // text content
            // td.textContent = `[${col}, ${row}]`;
            td.textContent = `${(row+1) * 100}`
            tr.appendChild(td);
        }
        // append the row to the table body
        gameBody.appendChild(tr);
    }
}



// Hint: fetch clue data for a single category id.
async function fetchQuestionsAnswers(categoryId) {
    //do a loop to fetch all questions
    try {
        const URL = `https://rithm-jeopardy.herokuapp.com/api/category?id=${categoryId}`;
        const response = await axios.get(URL);
        return response.data;
    } catch (error){
        console.error(error);
    }
}
// Hint: fetch category ids and return them as an array.
async function fetchCategories() {
    try {
        const URL = `https://rithm-jeopardy.herokuapp.com/api/categories?count=100`
        const response = await axios.get(URL);
        const categoryIds = response.data.map((category) => {
            return category.id
        });
        return categoryIds;
    }   catch (error) {
        console.error(error);
    }
}


// if you want to use these functions, you can uncomment them and use them in your code. You can also write your own functions to handle the game logic and rendering.
// make sure to grab the variables from the dom elements at the top of the file.

// Hint: on start click, load data and render a fresh board.
startButton.addEventListener("click", async function() {
    //while the API loads, we will the loading spinner
    setLoading(true);
    try {
        gameDataList = [];
        categoryIds = await fetchCategories();
        //trims down 6 random categories
        const randomIds = selectRandomCategoryIds(categoryIds, COLUMN_COUNT);
        console.log(`Our random ids for the board: `, randomIds);
        // console.log(categoryIds);

        if (randomIds.length === 0){
            console.log(`No random Categories fetched!`);
            return;
        }

        //TODO; randomize
        for (let i = 0; i < COLUMN_COUNT; i++){
            const rawData = await fetchQuestionsAnswers(randomIds[i]);
            console.log("rawData for", categoryIds[i], rawData); //Added to view responses whether the key is clues, title, etc.
            
            // validation
            if (!rawData || !Array.isArray(rawData.clues)) {
                continue;
            }

            const gameData = {
                title: rawData.title,
                data: rawData.clues.map(clue => ({ question: clue.question, answer: clue.answer, x: i, y: rawData.clues.indexOf(clue) }))
            };

            gameDataList.push(gameData);
        }
        if (gameDataList.length > 0) {
            const titles = gameDataList.map(gameData => gameData.title);
            renderCategoryHeaders(titles);
        }
    }   catch (error){
        console.error(error);
    }   finally {
        // for loader
        setLoading(false);
    }
});

// Hint: on reset click, clear state and rerender defaults.
resetButton.addEventListener("click", function() {
    categoryIds = [];
    gameDataList = [];
    renderCategoryHeaders();
    renderGameCells();
});

// Hint: on cell click, route the clicked cell to the reveal handler.
gameTable.addEventListener("click", function(e) {
    if (!e.target.classList.contains("gameCell"))
        return;
    if (gameDataList.length === 0) {
        console.log("Game data not loaded yet. Click Start game");
        return;
    }
    processCellClick(e.target);
});



// Hint: reveal question first, then answer, based on cell state.
function processCellClick(cell) {
    if (gameDataList.length === 0) {
        console.log(`No game data available!`);
        return;
    }

    const coordsString = cell.dataset["coords"];
    const [x, y] = coordsString.split("-").map(Number);
    // granb the game data for the clicked cell
    const gameData = gameDataList[x];

    if (!gameData) {
        console.error(`No game data found for coordinate ${x}`);
        return;
    }

    const questionData = gameData.data[y];

    if (!questionData) {
        console.error(`No game data found for coordinate ${y}`);
        return;
    }

    const cellState = cell.dataset["state"];

    if (cellState === CELL_STATE.UNCLICKED) {
        cell.dataset["state"] = CELL_STATE.CLICKED;
        cell.innerHTML = `${questionData.question}`;
        return;
    }
    if (cellState === CELL_STATE.CLICKED) {
        cell.dataset["state"] = CELL_STATE.REVEALED;
        cell.innerHTML = `${questionData.answer}`;
        return;
    }

    if (cellState === CELL_STATE.REVEALED) {
        //log message for now but might need something else
        console.log(`Cell at ${coordsString} has already been revealed`);
        return;
    }
}



// Hint: toggle spinner visibility and start-button disabled state.
function setLoading(isLoading) {
    loadingSpinner.classList.toggle("is-loading", isLoading);
    loadingSpinner.setAttribute("aria-hidden", !isLoading);
    startButton.disabled = isLoading;
}



// Hint: choose unique random category ids up to column count.
function selectRandomCategoryIds(categoryIds, columnCount) {
    const randomIds = [];

    while (randomIds.length < columnCount && categoryIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * categoryIds.length);
        const randomId = categoryIds[randomIndex];

        if (!randomIds.includes(randomId)) {
            randomIds.push(randomId);
        }
    }
    return randomIds;
}



// Hint: render the default board on page load.
window.addEventListener("load", function() {
    renderCategoryHeaders();
    renderGameCells();
});
