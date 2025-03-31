/********** הגדרות כלליות **********/
let cols = 150;
let rows = 100;
let pixelSize = 5;
let grid = [];                // גריד דו-ממדי לאחסון צבע סופי של כל תא
let eraseMode = false;        // מצב מחיקה
let currentColor;             // הצבע הנוכחי לבחירה
let color1, color2;           // לא בשימוש כעת (הוחלף בבחירה מתוך 4 צבעים)
let undoStack = [];           // מחסן מצבים ל־Undo

// ממשק (UI)
let brushSlider;              // סליידר לגודל המברשת (בחזקות 2)
let alphaSlider;              // סליידר לשקיפות (0..255)
let colorSelect;              // בחירת צבע (שחור/אדום/כחול/ירוק)
let blendSelect;              // בחירת מצב Blend
let currentBlendMode = "normal";

/********** setup **********/
function setup() {
  createCanvas(cols * pixelSize, rows * pixelSize + 100);
  noStroke();

  // יצירת הגריד
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = color(255);
    }
  }

  // סליידר גודל מברשת
  createSpan("גודל מברשת (חזקת 2): ");
  brushSlider = createSlider(0, 4, 0, 1);
  brushSlider.style('width', '120px');
  createP("");

  // סליידר שקיפות
  createSpan("שקיפות (Alpha): ");
  alphaSlider = createSlider(0, 255, 255, 1);
  alphaSlider.style('width', '120px');
  createP("");

  // Select של צבע
  createSpan("בחר צבע: ");
  colorSelect = createSelect();
  colorSelect.option("שחור");
  colorSelect.option("אדום");
  colorSelect.option("כחול");
  colorSelect.option("ירוק");
  colorSelect.changed(updateColor);
  createP("");

  // כפתורי צבע נוספים
  createP("בחר צבע באמצעות כפתורים:");
  createButton("שחור").mousePressed(() => setColorAndExitErase(color(0, 0, 0)));
  createButton("אדום").mousePressed(() => setColorAndExitErase(color(255, 0, 0)));
  createButton("כחול").mousePressed(() => setColorAndExitErase(color(0, 0, 255)));
  createButton("ירוק").mousePressed(() => setColorAndExitErase(color(0, 255, 0)));
  createP("");

  // מצב blend
  createSpan("מצב מיזוג: ");
  blendSelect = createSelect();
  blendSelect.option("normal");
  blendSelect.option("multiply");
  blendSelect.option("screen");
  blendSelect.option("difference");
  blendSelect.changed(() => {
    currentBlendMode = blendSelect.value();
  });
  createP("");

  // כפתורים נוספים
  createButton("מצב מחק").mousePressed(toggleEraseMode);
  createButton("שמור ציור").mousePressed(saveDrawing);
  createButton("מחיקת הכל").mousePressed(clearAll);

  // צבע התחלתי
  currentColor = color(0);
}

/********** draw **********/
function draw() {
  background(220);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      fill(grid[y][x]);
      rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

/********** אירוע לחיצה **********/
function mousePressed() {
  storeCurrentGrid(); // שמירה ל־Undo
  paintPixel();
}

function mouseDragged() {
  paintPixel();
}

/********** צביעה **********/
function paintPixel() {
  let x = floor(mouseX / pixelSize);
  let y = floor(mouseY / pixelSize);
  if (x < 0 || x >= cols || y < 0 || y >= rows) return;

  let brushExp = brushSlider.value();
  let brushSize = pow(2, brushExp);
  let a = alphaSlider.value();

  let newCol = color(red(currentColor), green(currentColor), blue(currentColor), 255);

  for (let dy = 0; dy < brushSize; dy++) {
    for (let dx = 0; dx < brushSize; dx++) {
      let nx = x + dx;
      let ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        let oldCol = grid[ny][nx];
        let finalCol = blendPixel(oldCol, newCol, a, currentBlendMode);
        grid[ny][nx] = finalCol;
      }
    }
  }
}

/********** blendPixel **********/
function blendPixel(oldColor, newColor, alphaValue, mode) {
  let blended = applyBlendMode(oldColor, newColor, mode);
  let a = alphaValue / 255.0;
  let r = lerp(red(oldColor), red(blended), a);
  let g = lerp(green(oldColor), green(blended), a);
  let b = lerp(blue(oldColor), blue(blended), a);
  return color(r, g, b);
}

/********** applyBlendMode **********/
function applyBlendMode(c1, c2, mode) {
  let r1 = red(c1), g1 = green(c1), b1 = blue(c1);
  let r2 = red(c2), g2 = green(c2), b2 = blue(c2);
  let r, g, b;

  switch(mode) {
    case "multiply":
      r = (r1 * r2) / 255;
      g = (g1 * g2) / 255;
      b = (b1 * b2) / 255;
      break;
    case "screen":
      r = 255 - (255 - r1) * (255 - r2) / 255;
      g = 255 - (255 - g1) * (255 - g2) / 255;
      b = 255 - (255 - b1) * (255 - b2) / 255;
      break;
    case "difference":
      r = abs(r1 - r2);
      g = abs(g1 - g2);
      b = abs(b1 - b2);
      break;
    default: // normal
      r = r2;
      g = g2;
      b = b2;
      break;
  }

  return color(r, g, b);
}

/********** updateColor **********/
function updateColor() {
  let val = colorSelect.value();
  switch(val) {
    case "שחור": currentColor = color(0, 0, 0); break;
    case "אדום": currentColor = color(255, 0, 0); break;
    case "כחול": currentColor = color(0, 0, 255); break;
    case "ירוק": currentColor = color(0, 255, 0); break;
  }
  eraseMode = false;
}

/********** setColorAndExitErase **********/
function setColorAndExitErase(c) {
  currentColor = c;
  eraseMode = false;
  updateColor();
}

/********** מצב מחק **********/
function toggleEraseMode() {
  eraseMode = !eraseMode;
  if (eraseMode) {
    currentColor = color(255);
  } else {
    updateColor();
  }
}

/********** שמירת ציור **********/
function saveDrawing() {
  saveCanvas("pixel_art", "png");
}

/********** Undo **********/
function storeCurrentGrid() {
  let copy = [];
  for (let y = 0; y < rows; y++) {
    copy[y] = [];
    for (let x = 0; x < cols; x++) {
      let c = grid[y][x];
      copy[y][x] = color(red(c), green(c), blue(c), alpha(c));
    }
  }
  undoStack.push(copy);
}

function keyPressed() {
  if (key === 'z' || key === 'Z') {
    if (undoStack.length > 0) {
      grid = undoStack.pop();
    }
  }
}

/********** מחיקת הכל **********/
function clearAll() {
  storeCurrentGrid();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      grid[y][x] = color(255);
    }
  }
}
