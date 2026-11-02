export const assessments = [
  {
    key: "web-fundamentals",
    title: "Web fundamentals",
    category: "Engineering",
    minutes: 8,
    questions: [
      { id: "html-semantic", prompt: "Which element represents the main content of a document?", choices: ["<main>", "<aside>", "<footer>", "<summary>"], answer: 0 },
      { id: "css-box", prompt: "With box-sizing: border-box, what does width include?", choices: ["Content only", "Content and padding", "Content, padding and border", "Margin only"], answer: 2 },
      { id: "http-post", prompt: "Which HTTP method is commonly used to create a resource?", choices: ["GET", "POST", "HEAD", "OPTIONS"], answer: 1 },
      { id: "js-const", prompt: "What does const prevent in JavaScript?", choices: ["Changing the binding", "Changing nested object values", "Reading the variable", "Using the variable in a function"], answer: 0 },
      { id: "a11y-label", prompt: "Which attribute associates a label with a form control?", choices: ["for / id", "class / name", "title / role", "href / id"], answer: 0 },
    ],
  },
  {
    key: "sql-foundations",
    title: "SQL foundations",
    category: "Data",
    minutes: 8,
    questions: [
      { id: "sql-filter", prompt: "Which clause filters rows before grouping?", choices: ["HAVING", "WHERE", "ORDER BY", "LIMIT"], answer: 1 },
      { id: "sql-join", prompt: "Which join keeps every row from its left table?", choices: ["INNER JOIN", "CROSS JOIN", "LEFT JOIN", "NATURAL JOIN"], answer: 2 },
      { id: "sql-count", prompt: "What does COUNT(*) return?", choices: ["Non-null values of the first column", "Number of rows", "Number of unique rows", "Column names"], answer: 1 },
      { id: "sql-insert", prompt: "Which statement adds new rows?", choices: ["ALTER", "INSERT", "UPDATE", "SELECT"], answer: 1 },
      { id: "sql-group", prompt: "Which clause groups rows sharing values?", choices: ["GROUP BY", "PARTITION", "UNION", "HAVING"], answer: 0 },
    ],
  },
];

export const publicAssessment = (assessment) => ({
  key: assessment.key,
  title: assessment.title,
  category: assessment.category,
  minutes: assessment.minutes,
  questions: assessment.questions.map(({ id, prompt, choices }) => ({ id, prompt, choices })),
});
