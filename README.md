# טופס עם חיבור לשרת נתונים 📋

פרויקט מלא של טופס אתר עם חיבור לשרת Node.js ומסד נתונים SQLite.

## תכונות ✨

- ✅ טופס HTML/CSS מעוצב ותגובתי
- ✅ שרת Express בעברית מלאה
- ✅ מסד נתונים SQLite
- ✅ API RESTful מלא
- ✅ אימות נתונים
- ✅ ממשק נקי וידידותי למשתמש

## התקנה 🚀

```bash
npm install
```

## הרצה 🎮

```bash
npm start
```

השרת יתחיל ב: **http://localhost:3000**

## API Endpoints 🔌

### שליחת הטופס
```
POST /api/submit-form
Content-Type: application/json

{
  "name": "שם המשתמש",
  "email": "email@example.com",
  "phone": "0501234567",
  "message": "הודעה"
}
```

### קבלת כל הטפסים
```
GET /api/submissions
```

### קבלת טופס ספציפי
```
GET /api/submissions/:id
```

### מחיקת טופס
```
DELETE /api/submissions/:id
```

## מבנה הטופס 📝

- **שם מלא** - שדה חובה
- **דוא"ל** - שדה חובה עם אימות
- **טלפון** - שדה אופציונלי
- **הודעה** - שדה אופציונלי

## מסד הנתונים 🗄️

הנתונים נשמרים בקובץ `data.db` עם:
- ID ייחודי
- שם, דוא"ל, טלפון, הודעה
- חותמת זמן אוטומטית

## דרישות 📦

- Node.js 14+
- npm

## קבצים בפרויקט 📂

- `index.html` - ממשק הטופס
- `server.js` - שרת Node.js
- `package.json` - תלויות
- `data.db` - מסד הנתונים (ייווצר אוטומטית)
