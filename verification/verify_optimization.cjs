const fs = require('fs');

// Mock Data
const formStructure = [
  {
    questions: [
      { key: 'Q1', type: 'text' },
      { key: 'Q2', type: 'text', condition: { key: 'Q1', value: 'Yes' } },
      { key: 'Q5', type: 'select', otherOptionId: 'Q5_Other' },
      {
          key: 'Q6',
          type: 'radio',
          // Condition on self to traverse children?
          // In real app, Q20 has subquestions and condition: { key: 'Q20', value: 'Yes' } ?
          // No, usually subquestions are children of a question.
          // In my code:
          /*
            if (q.subQuestions && q.condition)
          */
          // Wait, if Q6 (the parent) has a condition that determines ITs visibility (dependent on Q1),
          // AND it has subQuestions.
          // Does it have a second condition for subQuestions?
          // No, the  is the condition for the question itself OR for its children traversal?

          // Case 1: Cross-question dependency (Q2 depends on Q1).
          // Q2 has condition: { key: Q1, value: Yes }.
          // Q2 is hidden if Q1!=Yes.
          // If Q2 is visible, are its children visible?
          // Code:
          /*
            if (q.subQuestions && q.condition) {
                if (q.condition.key !== qKey) {
                   // Cross-trigger (e.g. Q9 depends on Q47).
                   // If Q47=Female, Q9 is visible.
                   // Does Q9 have subquestions? Yes (Q10).
                   // Does traversing to Q10 require another check?
                   // Code:
                   if (formDataEn[q.condition.key] === q.condition.value) {
                      traverse(q.subQuestions);
                   }
                }
          */
          // Yes. It checks the condition again.
          // Ideally, if Q9 is visible (first check passed), then we traverse?
          // The code checks  which is the SAME check as visibility.
          // So if Q9 is visible, we traverse its children?
          // Yes.

          condition: { key: 'Q1', value: 'Yes' },
          subQuestions: [
              { key: 'Q6_Sub', type: 'text', condition: { key: 'Q6', value: 'Deep' } }
          ]
      }
    ]
  }
];

// Logic under test (Optimized)
const getVisibleKeys = (structure, dataEn) => {
    const visibleKeys = new Set();
    const traverse = (questions) => {
        if (!Array.isArray(questions)) return;
        questions.forEach(q => {
            const qKey = q.name || q.key;

            // 1. Visibility Check
            if (q.condition && q.condition.key !== qKey) {
              if (dataEn[q.condition.key] !== q.condition.value) {
                return;
              }
            }

            visibleKeys.add(qKey);

            // 2. Other Field Check
            if (q.otherOptionId) {
              const valEn = dataEn[qKey];
              const isOtherSelected = Array.isArray(valEn)
                ? (valEn.includes('Other') || valEn.includes('others'))
                : (valEn === 'Other');
              if (isOtherSelected) {
                visibleKeys.add(q.otherOptionId);
              }
            }

            // 3. Sub-questions Check
            if (q.subQuestions && q.condition) {
                if (q.condition.key !== qKey) {
                  // Cross-trigger: If parent is visible (condition met), traverse children.
                  if (dataEn[q.condition.key] === q.condition.value) {
                    traverse(q.subQuestions);
                  }
                } else {
                  // Self-trigger: Parent is always visible (or controlled by logic above if nested),
                  // but children are controlled by parent's value.
                  if (dataEn[q.condition.key] === q.condition.value) {
                      traverse(q.subQuestions);
                  }
                }
            }
        });
    };
    structure.forEach(section => traverse(section.questions));
    return visibleKeys;
};

// Tests
let dataEn = { Q1: 'No', Q5: 'Apple' };
let keys = getVisibleKeys(formStructure, dataEn);
console.log('Test 1 (Basic Hide):', keys.has('Q1') && !keys.has('Q2') && keys.has('Q5') && !keys.has('Q5_Other') && !keys.has('Q6') ? 'PASS' : 'FAIL', keys);

dataEn = { Q1: 'Yes', Q5: 'Apple' };
keys = getVisibleKeys(formStructure, dataEn);
// Q6 visible because Q1=Yes.
// Q6 has subQuestions.
// q.condition.key (Q1) !== qKey (Q6).
// Check: dataEn[Q1] ('Yes') === 'Yes'. True.
// Traverse children (Q6_Sub).
// Child Q6_Sub: condition key Q6, value Deep.
// Q6 is undefined/empty. !== Deep.
// Q6_Sub hidden.
console.log('Test 2 (Basic Show, Sub Hidden):', keys.has('Q2') && keys.has('Q6') && !keys.has('Q6_Sub') ? 'PASS' : 'FAIL', keys);

dataEn = { Q1: 'Yes', Q5: 'Other', Q6: 'Deep' };
keys = getVisibleKeys(formStructure, dataEn);
// Q5_Other visible.
// Q6_Sub visible?
// Parent Q6 traversal: condition met.
// Child Q6_Sub: condition key Q6. dataEn[Q6] is Deep. condition value Deep. Match.
// Q6_Sub visible.
console.log('Test 3 (Sub Show, Other Show):', keys.has('Q5_Other') && keys.has('Q6_Sub') ? 'PASS' : 'FAIL', keys);
