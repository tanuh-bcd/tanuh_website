import { loadSecrets } from './secrets.js';
await loadSecrets();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
const { getPool } = await import('../mysql_explorer/db.js');
import questionnaireJson from '../public/locales/english/questionnaire.json' with { type: 'json' };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const GCS_BUCKET = process.env.GCS_BUCKET || 'breast-cancer-image-dataset';


const questionnaireData = questionnaireJson.questions; 
const formStructure = questionnaireJson.formStructure;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.set('trust proxy', true);


function calculateSnehithaRisk(formData) {
    console.log('--- Starting Snehitha Risk Calculation ---');
    console.log('Received Form Data:', JSON.stringify(formData, null, 2));

    // --- 1. Map form answers to variables (with defaults) ---
    // Safely parse numbers, defaulting to 0 if they are missing or not a number.
    const age = parseInt(formData.Q1, 10) || 0;
    const ageAtMenarche = parseInt(formData.Q10, 10) || 0; // From sub-question of Q9
    
    // Convert text answers to 0 or 1 based on the exact text from questionnaire.json
    const irregularCycles = formData.Q12_Current === 'No' ? 1 : 0;
    const breastfeeding24M = formData.Q17 === 'greater than 24 months' ? 1 : 0;
    const firstDegreeRelatives = formData.Q21 === 'First Order (Mother, Sibling, Father)' ? 1 : 0;
    const previousBiopsy = formData.Q40 === 'Yes' ? 1 : 0;

    // --- 2. Handle composite variables ---
    const isNullipara = formData.Q14 === 'No'; // Q14: "Have you given birth...?"
    const ageAtFirstBirth_25_29 = formData.Q16 === '25 to 29';
    const ageAtFirstBirth_gte30 = formData.Q16 === 'After 30';

    const ageAtFirstLiveBirth2529OrNullipara = (isNullipara || ageAtFirstBirth_25_29) ? 1 : 0;
    const ageAtFirstLiveBirth30OrMore = ageAtFirstBirth_gte30 ? 1 : 0;

    // --- Log the interpreted values for debugging ---
    console.log('Interpreted Variables:');
    console.log(`  - Age: ${age}`);
    console.log(`  - Age at Menarche: ${ageAtMenarche}`);
    console.log(`  - Irregular Cycles: ${irregularCycles} (from '${formData.Q12_Current}')`);
    console.log(`  - Breastfeeding >24M: ${breastfeeding24M} (from '${formData.Q17}')`);
    console.log(`  - First-Degree Relatives: ${firstDegreeRelatives} (from '${formData.Q21}')`);
    console.log(`  - Previous Biopsy: ${previousBiopsy} (from '${formData.Q40}')`);
    console.log(`  - Age at First Birth 25-29 or Nullipara: ${ageAtFirstLiveBirth2529OrNullipara}`);
    console.log(`  - Age at First Birth >=30: ${ageAtFirstLiveBirth30OrMore}`);

    // --- 3. Calculate logit(p) using the provided formula ---
    const logitP = -0.940 +
        (0.027 * age) -
        (0.082 * ageAtMenarche) +
        (0.453 * irregularCycles) -
        (0.892 * breastfeeding24M) +
        (0.810 * firstDegreeRelatives) +
        (1.420 * previousBiopsy) +
        (0.811 * ageAtFirstLiveBirth2529OrNullipara) +
        (1.035 * ageAtFirstLiveBirth30OrMore);

    // --- 4. Convert logit(p) to probability ---
    const probability = 1 / (1 + Math.exp(-logitP));

    // --- 5. Format to percentage and handle potential NaN errors ---
    let riskPercentage = (probability * 100).toFixed(2);
    if (isNaN(riskPercentage)) {
        console.error("Calculation resulted in NaN. Defaulting to 0.00. Please check inputs.");
        riskPercentage = "0.00";
    }
    
    console.log(`Final Calculation: Logit(p)=${logitP.toFixed(4)}, Probability=${probability.toFixed(4)}, Risk=${riskPercentage}%`);
    console.log('--- Risk Calculation Finished ---');
    return riskPercentage;
}

function getRiskCategory(riskFraction) {
    const val = parseFloat(riskFraction);
    if (isNaN(val)) return 'Baseline Risk';
    if (val < 0.4004) return 'Baseline Risk';
    if (val < 0.574)  return 'Evident Risk';
    if (val < 0.795)  return 'Significant Risk';
    return 'High Risk';
}


// === NEW ENDPOINT: To start a session ===
app.post('/api/session/start', async (req, res) => {
    const pool = await getPool();
    const sessionId = uuidv4();
    const sessionStartTime = new Date();
    const ipAddress = req.ip; // Get user's IP address

    console.log(`🚀 Starting new session for IP: ${ipAddress}`);

    try {
        const sessionSql = 'INSERT INTO session_table (session_id, ip_address, session_start_time) VALUES (?, ?, ?)';
        await pool.query(sessionSql, [sessionId, ipAddress, sessionStartTime]);
        
        console.log(`✅ Session created with ID: ${sessionId}`);
        // Send the new session ID back to the frontend
        res.status(200).json({ success: true, sessionId: sessionId });

    } catch (err) {
        console.error('❌ Error creating session:', err);
        res.status(500).json({ success: false, message: 'Failed to create a session.' });
    }
});
// === Consent image upload ===
app.post('/api/session/:sessionId/consent', upload.single('file'), async (req, res) => {
    const { sessionId } = req.params;
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    try {
        const extension = req.file.originalname.rsplit ? req.file.originalname.split('.').pop() : 'jpg';
        const uploadDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const blobName = `tanuh-data-capture/consent/${sessionId}_consent_${uploadDate}.${extension}`;

        const gcsClient = new Storage();
        const bucket = gcsClient.bucket(GCS_BUCKET);
        const blob = bucket.file(blobName);
        await blob.save(req.file.buffer, { contentType: req.file.mimetype || 'application/octet-stream' });

        const gcsUrl = `gs://${GCS_BUCKET}/${blobName}`;
        const pool = await getPool();
        await pool.query('UPDATE session_table SET consent_url = ? WHERE session_id = ?', [gcsUrl, sessionId]);

        console.log(`✅ Consent uploaded for session ${sessionId}: ${gcsUrl}`);
        res.status(200).json({ success: true, consent_url: gcsUrl });
    } catch (err) {
        console.error('❌ Consent upload error:', err);
        res.status(500).json({ success: false, message: 'Consent upload failed.', error: err.message });
    }
});

// Endpoint to submit answers
app.post('/api/submit', async (req, res) => {
    const { sessionId, formDataEn } = req.body; 
    console.log(`🚀 Received submission for session ID: ${sessionId}`);
    if (!sessionId || !formDataEn) {
        console.warn('⚠️ Missing sessionId or formDataEn in request body');
        return res.status(400).json({ success: false, message: 'Session ID and form data are required.' });
    }
    const pool = await getPool();
    let connection;

    try {
        // --- NEW: Calculate the risk before saving ---
        const riskPercentage = calculateSnehithaRisk(formDataEn);
        
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // --- NEW: Helper to get ordered keys from formStructure ---
        const getOrderedKeys = (structure) => {
            const keys = [];
            const traverse = (questions) => {
                if (!Array.isArray(questions)) return;
                questions.forEach(q => {
                    const qKey = q.name || q.key;
                    if (qKey) keys.push(qKey);
                    if (q.otherOptionId) keys.push(q.otherOptionId);
                    if (q.subQuestions) traverse(q.subQuestions);
                });
            };
            structure.forEach(section => traverse(section.questions));
            return keys;
        };

        const orderedKeys = getOrderedKeys(formStructure);
        // Also add keys that might be in formDataEn but not in formStructure (like Q46 language)
        const allKeys = [...new Set([...orderedKeys, ...Object.keys(formDataEn)])];

        // --- Use a common timestamp and increment it for each answer to ensure uniqueness and sequence ---
        let currentTimestamp = new Date();

        for (const questionKey of allKeys) {
            if (Object.prototype.hasOwnProperty.call(formDataEn, questionKey)) {
                const answerValue = formDataEn[questionKey];
                const sessionDataId = uuidv4();
                const finalAnswer = Array.isArray(answerValue) ? answerValue.join(', ') : answerValue;

                // --- Look up the full question text ---
                const questionText = questionnaireData[questionKey]?.question || questionKey;

                const answerSql = 'INSERT INTO session_data_table (session_data_id, session_id, question, answer, created_at) VALUES (?, ?, ?, ?, ?)';
                await connection.query(answerSql, [sessionDataId, sessionId, questionText, finalAnswer, new Date(currentTimestamp)]);
                
                // Increment timestamp by 1 second for each question to ensure they are unique and sequential in the DB
                currentTimestamp.setSeconds(currentTimestamp.getSeconds() + 1);
            }
        }
        
        // --- MODIFIED: Update session_table with end_time, calculated risk, AND risk_category ---
        const riskFraction = (riskPercentage / 100).toFixed(2);
        const riskCategory = getRiskCategory(riskFraction);
        const updateSessionSql = 'UPDATE session_table SET session_end_time = ?, snehita_lifetime_risk = ?, risk_category = ? WHERE session_id = ?';
        await connection.query(updateSessionSql, [new Date(), riskFraction, riskCategory, sessionId]);

        console.log(`✅ Finalized session ${sessionId} with risk ${riskPercentage}% (${riskCategory})`);
        
        await connection.commit();
        // --- MODIFIED: Send the risk percentage back to the frontend ---
        res.status(200).json({ success: true, message: 'Questionnaire submitted successfully!', riskPercentage: riskPercentage });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('❌ Error during database submission:', err);
        res.status(500).json({ success: false, message: 'Database submission failed' });
    } finally {
        if (connection) connection.release();
    }
});

const INST_QUESTIONS = ['Institute Name', 'Institute Name:', 'Enter the Hospital ID(If any, else leave):', 'Q45'];
const AGE_QUESTIONS = ['What is your current age? (Please enter a number - years)', 'Q1'];

// === NEW ENDPOINT: Stats Dashboard ===
app.get('/api/stats', async (req, res) => {
    const pool = await getPool();
    try {
        // Fetch valid hospital names from bcd_application2 (whitelist approach, matching tanuh_bcd_website)
        const [hospitalRows] = await pool.query("SELECT name, short_name FROM bcd_application2.hospitals WHERE name NOT IN ('Test', 'Tanuh Foundation')");
        const validNames = hospitalRows.map(r => r.name);
        const shortNameMap = Object.fromEntries(hospitalRows.map(r => [r.name, r.short_name || r.name]));

        if (validNames.length === 0) {
            return res.status(200).json({
                success: true, totalSubjects: 0, institutionsEmpanelled: 0, statesCount: 0,
                riskBins: [], hospitalBins: [], ageBins: [], monthBins: []
            });
        }

        const instFilter = `
            JOIN (
                SELECT session_id, MAX(answer) as answer
                FROM session_data_table
                WHERE question IN (?) AND answer IN (?)
                GROUP BY session_id
            ) sd_inst ON s.session_id = sd_inst.session_id
        `;

        // 1. Total Subjects
        const [totalRes] = await pool.query(`
            SELECT COUNT(DISTINCT s.session_id) as total
            FROM session_table s ${instFilter}
            WHERE s.snehita_lifetime_risk IS NOT NULL
        `, [INST_QUESTIONS, validNames]);
        const totalSubjects = totalRes[0].total;

        // 2. Risk Bins
        const [riskRes] = await pool.query(`
            SELECT
              SUM(CASE WHEN s.snehita_lifetime_risk < 0.4004 THEN 1 ELSE 0 END) as no_risk,
              SUM(CASE WHEN s.snehita_lifetime_risk >= 0.4004 AND s.snehita_lifetime_risk < 0.574 THEN 1 ELSE 0 END) as low_risk,
              SUM(CASE WHEN s.snehita_lifetime_risk >= 0.574 AND s.snehita_lifetime_risk < 0.795 THEN 1 ELSE 0 END) as moderate_risk,
              SUM(CASE WHEN s.snehita_lifetime_risk >= 0.795 THEN 1 ELSE 0 END) as high_risk
            FROM session_table s ${instFilter}
            WHERE s.snehita_lifetime_risk IS NOT NULL
        `, [INST_QUESTIONS, validNames]);
        const riskBins = [
            { name: 'Baseline Risk', value: Number(riskRes[0].no_risk) || 0 },
            { name: 'Evident Risk', value: Number(riskRes[0].low_risk) || 0 },
            { name: 'Significant Risk', value: Number(riskRes[0].moderate_risk) || 0 },
            { name: 'High Risk', value: Number(riskRes[0].high_risk) || 0 }
        ];

        // 3. Bin by Institute (Stacked by Risk)
        const [instituteRes] = await pool.query(`
            SELECT
                sd_inst.answer as institute,
                SUM(CASE WHEN s.snehita_lifetime_risk < 0.4004 THEN 1 ELSE 0 END) as no_risk,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.4004 AND s.snehita_lifetime_risk < 0.574 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.574 AND s.snehita_lifetime_risk < 0.795 THEN 1 ELSE 0 END) as moderate,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.795 THEN 1 ELSE 0 END) as high
            FROM session_table s ${instFilter}
            WHERE s.snehita_lifetime_risk IS NOT NULL
            GROUP BY sd_inst.answer
        `, [INST_QUESTIONS, validNames]);
        const hospitalBins = instituteRes.map(row => ({
            name: shortNameMap[row.institute] || row.institute || 'Unknown',
            no_risk: Number(row.no_risk) || 0,
            low: Number(row.low) || 0,
            moderate: Number(row.moderate) || 0,
            high: Number(row.high) || 0
        }));

        // 4. Bin by Age Range (Stacked by Risk)
        const [ageStackRes] = await pool.query(`
            SELECT
                CASE
                    WHEN CAST(sd_age.answer AS UNSIGNED) BETWEEN 18 AND 29 THEN '18-29'
                    WHEN CAST(sd_age.answer AS UNSIGNED) BETWEEN 30 AND 39 THEN '30-39'
                    WHEN CAST(sd_age.answer AS UNSIGNED) BETWEEN 40 AND 49 THEN '40-49'
                    WHEN CAST(sd_age.answer AS UNSIGNED) BETWEEN 50 AND 59 THEN '50-59'
                    WHEN CAST(sd_age.answer AS UNSIGNED) BETWEEN 60 AND 69 THEN '60-69'
                    ELSE '70+'
                END as age_group,
                SUM(CASE WHEN s.snehita_lifetime_risk < 0.4004 THEN 1 ELSE 0 END) as no_risk,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.4004 AND s.snehita_lifetime_risk < 0.574 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.574 AND s.snehita_lifetime_risk < 0.795 THEN 1 ELSE 0 END) as moderate,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.795 THEN 1 ELSE 0 END) as high
            FROM session_table s
            JOIN session_data_table sd_age ON s.session_id = sd_age.session_id
            ${instFilter}
            WHERE s.snehita_lifetime_risk IS NOT NULL
              AND sd_age.question IN (?)
            GROUP BY age_group
            ORDER BY age_group ASC
        `, [INST_QUESTIONS, validNames, AGE_QUESTIONS]);

        const ageLabels = ['18-29', '30-39', '40-49', '50-59', '60-69', '70+'];
        const ageBins = ageLabels.map(label => {
            const match = ageStackRes.find(r => r.age_group === label);
            return {
                name: label,
                no_risk: Number(match?.no_risk) || 0,
                low: Number(match?.low) || 0,
                moderate: Number(match?.moderate) || 0,
                high: Number(match?.high) || 0
            };
        });

        // 5. Bin by Month (Stacked by Risk)
        const [monthRes] = await pool.query(`
            SELECT
                DATE_FORMAT(COALESCE(s.session_end_time, s.session_start_time), '%b %Y') as month_year,
                DATE_FORMAT(COALESCE(s.session_end_time, s.session_start_time), '%Y-%m') as sort_key,
                SUM(CASE WHEN s.snehita_lifetime_risk < 0.4004 THEN 1 ELSE 0 END) as no_risk,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.4004 AND s.snehita_lifetime_risk < 0.574 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.574 AND s.snehita_lifetime_risk < 0.795 THEN 1 ELSE 0 END) as moderate,
                SUM(CASE WHEN s.snehita_lifetime_risk >= 0.795 THEN 1 ELSE 0 END) as high
            FROM session_table s ${instFilter}
            WHERE s.snehita_lifetime_risk IS NOT NULL
            GROUP BY month_year, sort_key
            ORDER BY sort_key ASC
        `, [INST_QUESTIONS, validNames]);
        const monthBins = monthRes.map(row => ({
            name: row.month_year,
            no_risk: Number(row.no_risk) || 0,
            low: Number(row.low) || 0,
            moderate: Number(row.moderate) || 0,
            high: Number(row.high) || 0
        }));

        // Institutions & States from bcd_application2.hospitals
        const institutionsEmpanelled = validNames.length;
        const [statesRes] = await pool.query(
            "SELECT COUNT(DISTINCT state) as count FROM bcd_application2.hospitals WHERE name NOT IN ('Test', 'Tanuh Foundation') AND state IS NOT NULL AND state != ''"
        );
        const statesCount = statesRes[0].count;

        console.log(`📊 Stats Summary: Subjects:${totalSubjects}, Inst:${institutionsEmpanelled}, States:${statesCount}, RiskBins:${riskBins.length}, HospBins:${hospitalBins.length}, AgeBins:${ageBins.length}, MonthBins:${monthBins.length}`);

        res.status(200).json({
            success: true,
            totalSubjects,
            institutionsEmpanelled,
            statesCount,
            riskBins,
            hospitalBins,
            ageBins,
            monthBins
        });
    } catch (err) {
        console.error('❌ CRITICAL ERROR in /api/stats:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics.',
            error: err.message,
            stack: err.stack
        });
    }
});

// === Hospital locations for India map ===
const PINCODE_COORDS = {
    '636007': [11.6687, 78.1543, 'Salem'],
    '562160': [12.6324, 77.1836, 'Ramanagara'],
    '570004': [12.2959, 76.6479, 'Mysuru'],
    '533201': [16.5776, 81.9974, 'Amalapuram'],
    '532484': [18.3969, 83.8450, 'Srikakulam'],
    '636004': [11.6804, 78.1371, 'Salem'],
    '500063': [17.4062, 78.4738, 'Hyderabad'],
};
const geocodeCache = {};

async function geocodePincode(pincode, state) {
    if (PINCODE_COORDS[pincode]) return PINCODE_COORDS[pincode];
    if (geocodeCache[pincode]) return geocodeCache[pincode];
    try {
        const query = state ? `${pincode}, ${state}, India` : `${pincode}, India`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'BCD-Website/1.0' } });
        const data = await resp.json();
        if (data && data.length) {
            const addr = data[0].address || {};
            const city = addr.city || addr.town || addr.county || addr.state_district || '';
            const result = [parseFloat(data[0].lat), parseFloat(data[0].lon), city];
            geocodeCache[pincode] = result;
            return result;
        }
    } catch (e) {
        console.warn(`Geocode failed for pincode ${pincode}:`, e.message);
    }
    return null;
}

app.get('/api/hospital-locations', async (req, res) => {
    const pool = await getPool();
    try {
        const [hospitalRows] = await pool.query(
            "SELECT id, name, short_name, pincode, state FROM bcd_application2.hospitals WHERE name NOT IN ('Test', 'Tanuh Foundation')"
        );
        const validNames = hospitalRows.map(r => r.name);
        if (validNames.length === 0) return res.json([]);

        const [subjectRows] = await pool.query(`
            SELECT sd.answer AS institute, COUNT(DISTINCT s.session_id) AS subjects
            FROM session_table s
            JOIN session_data_table sd ON s.session_id = sd.session_id
            WHERE sd.question IN (?) AND sd.answer IN (?)
              AND s.snehita_lifetime_risk IS NOT NULL
            GROUP BY sd.answer
        `, [INST_QUESTIONS, validNames]);
        const subjectCounts = Object.fromEntries(subjectRows.map(r => [r.institute, Number(r.subjects)]));

        const locations = [];
        for (const h of hospitalRows) {
            const result = await geocodePincode(h.pincode || '', h.state || '');
            if (!result) continue;
            locations.push({
                id: h.id,
                name: h.name,
                short_name: h.short_name || h.name,
                city: result[2] || '',
                state: h.state || '',
                latitude: result[0],
                longitude: result[1],
                subjects: subjectCounts[h.name] || 0,
            });
        }
        res.json(locations);
    } catch (err) {
        console.error('❌ Error fetching hospital locations:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch hospital locations.', error: err.message });
    }
});

// === Hospitals endpoint: fetch from bcd_application2 ===
app.get('/api/hospitals', async (req, res) => {
    try {
        const pool = await getPool();
        const [rows] = await pool.query('SELECT id, name FROM bcd_application2.hospitals ORDER BY name ASC');
        const hospitals = rows.map(r => r.name);
        res.status(200).json({ success: true, hospitals });
    } catch (err) {
        console.error('❌ Error fetching hospitals:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch hospitals.', error: err.message });
    }
});

// Health check endpoints
app.get('/api/health', (req, res) => {
    console.log('GET /api/health - responding OK');
    res.status(200).json({ success: true, message: 'Backend is healthy!' });
});

app.get('/health', (req, res) => {
    console.log('GET /health - responding OK');
    res.status(200).json({ success: true, message: 'Backend is healthy!' });
});

// Test DB connection endpoint
app.get('/api/db-test', async (req, res) => {
    console.log('🚀 Received DB test request');
    try {
        const pool = await getPool();
        const [rows] = await pool.query('SELECT 1 AS ok');
        console.log('✅ DB Test successful');
        res.status(200).json({ success: true, message: 'Database connected!', result: rows });
    } catch (err) {
        console.error('❌ DB Test Error:', err);
        res.status(500).json({ success: false, message: 'Database connection failed.', error: err.message });
    }
});

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
    
    // Check DB connection on startup
    try {
        const pool = await getPool();
        await pool.query('SELECT 1');
        console.log('✅ Connected to database successfully.');
    } catch (err) {
        console.error('❌ Database connection failed on startup:', err.message);
    }
});

// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 Server is running on port ${PORT} (accessible in Docker)`);
// });


