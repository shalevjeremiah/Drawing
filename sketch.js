/********** הגדרות כלליות **********/
let cols = 150;
let rows = 100;
let pixelSize = 5;
let grid = [];                // גריד דו-ממדי לאחסון צבע סופי של כל תא
let eraseMode = false;        // מצב מחיקה
let currentColor;             // הצבע הנוכחי לבחירה
let color1, color2;           // לא בשימוש כעת (הוחלף בבחירה מתוך 4 צבעים)

// ממשק (UI) חדש:
let brushSlider;              // סליידר לגודל המברשת (בחזקות 2)
let alphaSlider;              // סליידר לשקיפות (0..255)
let colorSelect;              // בחירת צבע (שחור/אדום/כחול/ירוק)
let blendSelect;              // בחירת מצב Blend
let currentBlendMode = "normal";

/********** פונקציית setup **********/
function setup() {
  createCanvas(cols * pixelSize, rows * pixelSize + 80); // קצת יותר גובה לממשק
  noStroke();

  // 1. יצירת הגריד עם צבע התחלתי לבן
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = color(255); // צבע לבן
    }
  }

  // 2. יצירת אלמנטים של הממשק (UI)

  // סליידר גודל מברשת (0..4 -> 2^0..2^4)
  createSpan("גודל מברשת (חזקת 2): ");
  brushSlider = createSlider(0, 4, 0, 1);
  brushSlider.style('width', '120px'); // רק ליופי

  createP(""); // ירידת שורה

  // סליידר שקיפות (0..255)
  createSpan("שקיפות (Alpha): ");
  alphaSlider = createSlider(0, 255, 255, 1);
  alphaSlider.style('width', '120px');

  createP(""); // ירידת שורה

  // בחירת צבע
  createSpan("בחר צבע: ");
  colorSelect = createSelect();
  colorSelect.option("שחור");
  colorSelect.option("אדום");
  colorSelect.option("כחול");
  colorSelect.option("ירוק");
  colorSelect.changed(updateColor);

  createP(""); // ירידת שורה

  // בחירת מצב Blend
  createSpan("מצב מיזוג: ");
  blendSelect = createSelect();
  blendSelect.option("normal");
  blendSelect.option("multiply");
  blendSelect.option("screen");
  blendSelect.option("difference");
  blendSelect.changed(() => {
    currentBlendMode = blendSelect.value();
  });

  createP(""); // ירידת שורה

  // כפתורים קיימים
  createButton("מצב מחק").mousePressed(toggleEraseMode);
  createButton("שמור ציור").mousePressed(saveDrawing);

  // כיוון צבע התחלתי
  currentColor = color(0); // שחור

  // מציג כפתור החלפת צבע (אם עדיין מעוניינים בו)
  // createButton("החלף צבע").mousePressed(switchColor); // אופציונלי
}

/********** פונקציית draw **********/
function draw() {
  background(220);

  // ציור הגריד
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      fill(grid[y][x]);
      rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

/********** אירוע לחיצה בעכבר **********/
function mousePressed() {
  paintPixel();
}

/********** אירוע גרירה בעכבר **********/
function mouseDragged() {
  paintPixel();
}

/***********************************
 * paintPixel():
 * צובע אזור בגודל המברשת (Square)
 * סביב מיקום העכבר.
 ***********************************/
function paintPixel() {
  // חישוב קואורדינטה בגריד
  let x = floor(mouseX / pixelSize);
  let y = floor(mouseY / pixelSize);

  // בדיקה שהעכבר בתוך התמונה
  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return;
  }

  // 1. קבלת ערכי הסליידרים
  let brushExp = brushSlider.value();         // אקספוננט (0..4)
  let brushSize = pow(2, brushExp);           // הופך ל-1,2,4,8,16
  let a = alphaSlider.value();                // (0..255) שקיפות חדשה

  // 2. הכנת צבע חדש עם אלפא = 255 (כי נערבב ידנית)
  let newCol = color(red(currentColor), green(currentColor), blue(currentColor), 255);

  // 3. צביעה של ריבוע בגודל המברשת
  for (let dy = 0; dy < brushSize; dy++) {
    for (let dx = 0; dx < brushSize; dx++) {
      let nx = x + dx;
      let ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        // צבע קודם בתא
        let oldCol = grid[ny][nx];
        // מחשבים צבע סופי באמצעות blending + alpha
        let finalCol = blendPixel(oldCol, newCol, a, currentBlendMode);
        // שומרים צבע סופי
        grid[ny][nx] = finalCol;
      }
    }
  }
}

/***********************************
 * blendPixel():
 * פונקציה שממזגת שני צבעים:
 *  1) קודם מפעילים blending mode בין oldColor ל-newColor
 *  2) על התוצאה עושים lerp (alpha) בין oldColor לתוצאה הסופית
 ***********************************/
function blendPixel(oldColor, newColor, alphaValue, mode) {
  // קודם מחשבים תוצאה לפי blending mode
  let blended = applyBlendMode(oldColor, newColor, mode);

  // הופכים alphaValue מ-0..255 ל-0..1
  let a = alphaValue / 255.0;

  // כעת עושים "ערבוב אלפא" בין הצבע הישן לתוצאה
  let r = lerp(red(oldColor),   red(blended),   a);
  let g = lerp(green(oldColor), green(blended), a);
  let b = lerp(blue(oldColor),  blue(blended),  a);
  
  return color(r, g, b);
}

/***********************************
 * applyBlendMode():
 * מספר מצבי מיזוג בסיסיים (normal/multiply/screen/difference)
 ***********************************/
function applyBlendMode(c1, c2, mode) {
  // מפרקים לרכיבי RGB
  let r1 = red(c1), g1 = green(c1), b1 = blue(c1);
  let r2 = red(c2), g2 = green(c2), b2 = blue(c2);

  let r, g, b;

  switch(mode) {
    case "multiply":
      // הכפלה
      r = (r1 * r2) / 255;
      g = (g1 * g2) / 255;
      b = (b1 * b2) / 255;
      break;

    case "screen":
      // Screen = 1 - (1 - c1)*(1 - c2)
      r = 255 - (255 - r1) * (255 - r2) / 255;
      g = 255 - (255 - g1) * (255 - g2) / 255;
      b = 255 - (255 - b1) * (255 - b2) / 255;
      break;

    case "difference":
      // הפרש מוחלט
      r = abs(r1 - r2);
      g = abs(g1 - g2);
      b = abs(b1 - b2);
      break;

    // normal (או ברירת מחדל)
    case "normal":
    default:
      r = r2;
      g = g2;
      b = b2;
      break;
  }

  return color(r, g, b);
}

/***********************************
 * updateColor():
 * פונקציה שמגיבה לבחירת המשתמש מתוך ה-Select
 ***********************************/
function updateColor() {
  let val = colorSelect.value();
  switch(val) {
    case "שחור":
      currentColor = color(0, 0, 0);
      break;
    case "אדום":
      currentColor = color(255, 0, 0);
      break;
    case "כחול":
      currentColor = color(0, 0, 255);
      break;
    case "ירוק":
      currentColor = color(0, 255, 0);
      break;
  }
}

/********** מצב מחיקה (צובע בלבן) **********/
function toggleEraseMode() {
  eraseMode = !eraseMode;
  if (eraseMode) {
    currentColor = color(255); // אם במצב מחיקה - צובע בלבן
  } else {
    // חוזרים לצבע הנבחר מתוך ה-Select
    updateColor();
  }
}

/********** שמירת הציור **********/
function saveDrawing() {
  saveCanvas("pixel_art", "png");
}