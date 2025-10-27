require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json()); // parse JSON bodies

// -------------------------------
// In-memory data (example seed)
// -------------------------------
let students = [
  { id: 101, indexNumber: 'UG1001', name: 'Alice Smith', major: 'Computer Science', age: 20, gpa: 3.8, email: 'alice@example.com', enrollmentDate: '2023-09-01' },
  { id: 102, indexNumber: 'UG1002', name: 'Bob Johnson', major: 'Mechanical Engineering', age: 21, gpa: 3.2, email: 'bob@example.com', enrollmentDate: '2022-09-01' },
  { id: 103, indexNumber: 'UG1003', name: 'Charlie Brown', major: 'History', age: 19, gpa: 2.9, email: 'charlie@example.com', enrollmentDate: '2023-01-15' },
  { id: 104, indexNumber: 'UG1004', name: 'Dana Scully', major: 'Biology', age: 22, gpa: 3.95, email: 'dana@example.com', enrollmentDate: '2021-09-01' },
  { id: 105, indexNumber: 'UG1005', name: 'Evan Peters', major: 'Fine Arts', age: 20, gpa: 3.5, email: 'evan@example.com', enrollmentDate: '2023-09-01' }
];
let nextId = 106;

// -------------------------------
// Helper functions & validators
// -------------------------------
const isValidGpa = (g) => {
  if (typeof g !== 'number') return false;
  return g >= 0.0 && g <= 4.0;
};

const indexNumberRegex = /^[A-Za-z0-9]+$/; // letters + numbers only

function findStudentById(id) {
  return students.find(s => s.id === id);
}

function findStudentByIndex(indexNumber) {
  return students.find(s => s.indexNumber === indexNumber);
}

// -------------------------------
// Middleware: Simple request logger
// -------------------------------
app.use((req, res, next) => {
  console.log('${new Date().toISOString()} - ${req.method} ${req.originalUrl}');
  next();
});

// -------------------------------
// ROUTES
// -------------------------------

// TASK B (Read) + Sorting & Pagination (F)
// GET /studentrecords
// Query support: minGpa, maxGpa, name, major, sort (field), order (asc|desc), limit, page
app.get('/studentrecords', (req, res, next) => {
  try {
    let results = [...students];

    // Filters
    const { minGpa, maxGpa, name, major, sort, order, limit, page } = req.query;

    if (minGpa !== undefined) {
      const m = parseFloat(minGpa);
      if (!isNaN(m)) results = results.filter(s => s.gpa >= m);
    }
    if (maxGpa !== undefined) {
      const M = parseFloat(maxGpa);
      if (!isNaN(M)) results = results.filter(s => s.gpa <= M);
    }
    if (name) {
      const q = name.toLowerCase();
      results = results.filter(s => s.name.toLowerCase().includes(q));
    }
    if (major) {
      const q = major.toLowerCase();
      results = results.filter(s => s.major.toLowerCase().includes(q));
    }

    // Sorting
    if (sort) {
      const sortField = sort;
      const direction = (order && order.toLowerCase() === 'desc') ? -1 : 1;
      results.sort((a, b) => {
        const va = a[sortField];
        const vb = b[sortField];
        if (va === undefined || vb === undefined) return 0;
        if (typeof va === 'string') return va.localeCompare(vb) * direction;
        return (va < vb ? -1 : va > vb ? 1 : 0) * direction;
      });
    }

    // Pagination
    const lim = Math.max(1, parseInt(limit || '10', 10));
    const pg = Math.max(1, parseInt(page || '1', 10));
    const start = (pg - 1) * lim;
    const paginated = results.slice(start, start + lim);

    res.json({
      total: results.length,
      page: pg,
      limit: lim,
      data: paginated
    });
  } catch (err) {
    next(err);
  }
});

// TASK A (Create) - POST /studentrecords
app.post('/studentrecords', (req, res, next) => {
  try {
    const { name, indexNumber, major, age, gpa, email, enrollmentDate } = req.body;

    // Required fields check
    if (!name || !email || typeof gpa === 'undefined' || !indexNumber) {
      return res.status(400).json({ error: 'Missing required fields: name, email, gpa, and indexNumber are required.' });
    }

    // indexNumber format check
    if (!indexNumberRegex.test(indexNumber)) {
      return res.status(400).json({ error: 'Invalid indexNumber. Only letters and numbers are allowed (no spaces or symbols).' });
    }

    // Prevent duplicate indexNumber
    if (findStudentByIndex(indexNumber)) {
      return res.status(409).json({ error: 'A student with this indexNumber already exists.' });
    }

    // GPA check
    const numericGpa = Number(gpa);
    if (isNaN(numericGpa) || !isValidGpa(numericGpa)) {
      return res.status(400).json({ error: 'Invalid GPA. It must be a number between 0.0 and 4.0.' });
    }

    // Create record
    const newStudent = {
      id: nextId++,
      indexNumber,
      name,
      major: major || 'Undeclared',
      age: (typeof age === 'number') ? age : (age ? Number(age) : null),
      gpa: numericGpa,
      email,
      enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0]
    };

    students.push(newStudent);
    return res.status(201).json({ message: 'Student created successfully', student: newStudent });
  } catch (err) {
    next(err);
  }
});

// TASK C (Update) - PATCH /studentrecords/:id
// Allows partial updates. Validates fields if provided (gpa range, indexNumber format & uniqueness).
app.patch('/studentrecords/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID parameter.' });

    const student = findStudentById(id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const updates = req.body;

    // If indexNumber provided, validate format and uniqueness
    if (updates.indexNumber !== undefined) {
      if (!indexNumberRegex.test(updates.indexNumber)) {
        return res.status(400).json({ error: 'Invalid indexNumber. Only letters and numbers are allowed.' });
      }
      const other = findStudentByIndex(updates.indexNumber);
      if (other && other.id !== student.id) {
        return res.status(409).json({ error: 'Another student already uses this indexNumber.' });
      }
    }

    // If gpa provided, validate numeric and range
    if (updates.gpa !== undefined) {
      const numericGpa = Number(updates.gpa);
      if (isNaN(numericGpa) || !isValidGpa(numericGpa)) {
        return res.status(400).json({ error: 'Invalid GPA. It must be a number between 0.0 and 4.0.' });
      }
      updates.gpa = numericGpa;
    }

    // Apply allowed updates - only keys that exist in schema are applied
    const allowedFields = ['name', 'indexNumber', 'major', 'age', 'gpa', 'email', 'enrollmentDate'];
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        student[key] = updates[key];
      }
    });

    return res.json({ message: 'Student updated successfully', student });
  } catch (err) {
    next(err);
  }
});

// TASK D (Delete) - DELETE /studentrecords/:id
app.delete('/studentrecords/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID parameter.' });

    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Student not found.' });

    const deleted = students.splice(idx, 1)[0];
    return res.json({ message: 'Student deleted successfully', student: deleted });
  } catch (err) {
    next(err);
  }
});

// -------------------------------
// Error handling middleware (TASK E)
// -------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// -------------------------------
// Start server
// -------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Student Manager API listening on http://localhost:${PORT}');
});