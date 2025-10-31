require('dotenv').config(); // Load .env variables
const express = require('express');
const app = express();
app.use(express.json()); // Parse JSON bodies

// -------------------------------
// In-memory data (with consistent fields for validation)
// -------------------------------
let students = [
    { id: 101, name: 'Alice Smith', major: 'Computer Science', age: 20, gpa: 3.8, email: 'alice@example.com', enrollmentDate: '2023-09-01' },
    { id: 102, name: 'Bob Johnson', major: 'Mechanical Engineering', age: 21, gpa: 3.2, email: 'bob@example.com', enrollmentDate: '2022-09-01' },
    { id: 103, name: 'Charlie Brown', major: 'History', age: 19, gpa: 2.9, email: 'charlie@example.com', enrollmentDate: '2023-01-15' },
    { id: 104, name: 'Dana Scully', major: 'Biology', age: 22, gpa: 3.95, email: 'dana@example.com', enrollmentDate: '2021-09-01' },
    { id: 105, name: 'Evan Peters', major: 'Fine Arts', age: 20, gpa: 3.5, email: 'evan@example.com', enrollmentDate: '2023-09-01' },
];
let nextId = 106;

// -------------------------------
// Helper & Validation Functions (Tasks 5 & 6)
// -------------------------------

const isValidGpa = (g) => {
    // Ensures GPA is a number and is within the 0.0 to 4.0 range (Task 6)
    return typeof g === 'number' && g >= 0.0 && g <= 4.0;
};

const findStudentById = (id) => {
    return students.find(s => s.id === parseInt(id, 10));
};

// -------------------------------
// ROUTES
// -------------------------------

// Task 2 & 8: Read Students with Filtering, Sorting, and Pagination
// GET /studentrecords?minGpa=3.5&sort=name&order=asc&limit=10&page=1
app.get('/studentrecords', (req, res, next) => {
    try {
        let results = [...students];

        // --- Filtering (Task 2) ---
        const { minGpa, maxGpa, name, major, sort, order, limit, page } = req.query;

        // Filter by GPA Range
        if (minGpa !== undefined) {
            const m = parseFloat(minGpa);
            if (!isNaN(m)) results = results.filter(s => s.gpa >= m);
        }
        if (maxGpa !== undefined) {
            const M = parseFloat(maxGpa);
            if (!isNaN(M)) results = results.filter(s => s.gpa <= M);
        }
        
        // Optional: Filter by name/major (partial match)
        if (name) {
            const q = name.toLowerCase();
            results = results.filter(s => s.name.toLowerCase().includes(q));
        }

        // --- Sorting (Task 8) ---
        if (sort) {
            const direction = (order && order.toLowerCase() === 'desc') ? -1 : 1;
            results.sort((a, b) => {
                const va = a[sort];
                const vb = b[sort];
                if (va === undefined || vb === undefined) return 0;
                if (typeof va === 'string') return va.localeCompare(vb) * direction;
                return (va < vb ? -1 : va > vb ? 1 : 0) * direction;
            });
        }

        // --- Pagination (Task 8) ---
        const lim = Math.max(1, parseInt(limit || '10', 10));
        const pg = Math.max(1, parseInt(page || '1', 10));
        const start = (pg - 1) * lim;
        const paginated = results.slice(start, start + lim);

        res.status(200).json({
            total: results.length,
            page: pg,
            limit: lim,
            data: paginated
        });
    } catch (err) {
        next(err);
    }
});

// GET /studentrecords/:id (Read Single)
app.get('/studentrecords/:id', (req, res) => {
    const student = findStudentById(req.params.id);

    if (!student) {
        return res.status(404).json({ error: 'Student record not found.' }); // Task 7
    }
    res.status(200).json(student);
});


// Task 1, 5, 6: Create New Student Record
app.post('/studentrecords', (req, res, next) => {
    try {
        const { name, major, age, gpa, email, enrollmentDate } = req.body;

        // --- Validation (Task 5) ---
        if (!name || !email || gpa === undefined || gpa === null) {
            return res.status(400).json({ error: 'Missing required fields: name, email, and gpa are required.' }); // Task 7
        }
        if (!isValidGpa(gpa)) {
            return res.status(400).json({ error: 'Invalid GPA. It must be a number between 0.0 and 4.0.' }); // Task 6 & 7
        }
        if (age !== undefined && age !== null && (typeof age !== 'number' || age < 16)) {
             return res.status(400).json({ error: 'Invalid Age. It must be a number greater than 15.' });
        }
        
        // --- Create record ---
        const newStudent = {
            id: nextId++,
            name,
            major: major || 'Undeclared',
            age: age || null,
            gpa: Number(gpa), // Ensure gpa is stored as a number
            email,
            enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0]
        };

        students.push(newStudent);
        return res.status(201).json({ message: 'Student created successfully', student: newStudent });
    } catch (err) {
        next(err);
    }
});


// Task 3: Update Student Endpoint (PATCH)
app.patch('/studentrecords/:id', (req, res, next) => {
    try {
        const student = findStudentById(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student record not found.' }); // Task 7

        const updates = req.body;

        // --- Validation for updates (Task 5 & 6) ---
        if (updates.gpa !== undefined && !isValidGpa(Number(updates.gpa))) {
            return res.status(400).json({ error: 'Invalid GPA provided in update.' }); // Task 7
        }
        if (updates.name !== undefined && updates.name.trim() === '') {
            return res.status(400).json({ error: 'Name cannot be empty.' });
        }
        // ... add more validation checks for other fields (e.g., age range) ...

        // Apply partial updates
        Object.keys(updates).forEach(key => {
            // Only update keys that are present in the existing student schema
            if (student.hasOwnProperty(key)) {
                // Special handling for number fields that might come in as strings
                if (key === 'gpa' || key === 'age') {
                    student[key] = Number(updates[key]);
                } else {
                    student[key] = updates[key];
                }
            }
        });

        return res.status(200).json({ message: 'Student updated successfully', student });
    } catch (err) {
        next(err);
    }
});


// Task 4: Delete Student Endpoint
app.delete('/studentrecords/:id', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const initialLength = students.length;

        // Filter out the student with the matching ID
        students = students.filter(s => s.id !== id);

        if (students.length === initialLength) {
            return res.status(404).json({ error: 'Student record not found.' }); // Task 7
        }

        // 204 No Content is standard for a successful DELETE
        return res.status(204).send(); 
    } catch (err) {
        next(err);
    }
});


// -------------------------------
// Error Handling Middleware (Task 7 - FINAL CATCH-ALL)
// -------------------------------
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err.stack);
    // Use the error's status if available, otherwise default to 500
    res.status(err.statusCode || 500).json({ error: 'An unexpected error occurred on the server.' });
});


// -------------------------------
// Server Start (Fixing PORT issue)
// -------------------------------
const PORT = process.env.PORT || 3000; // Added fallback port
app.listen(PORT, () => {
    console.log(`Student Manager API listening on http://localhost:${PORT}`);
});