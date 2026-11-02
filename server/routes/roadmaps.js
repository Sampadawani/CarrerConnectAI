import { Router } from "express";
import Roadmap from "../models/Roadmap.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const catalog = {
  "Frontend Developer": [
    ["HTML, CSS and accessibility", "Build semantic pages, responsive layouts, and keyboard-friendly forms.", ["https://developer.mozilla.org/en-US/docs/Learn_web_development"]],
    ["JavaScript and browser APIs", "Practice modern JavaScript, events, and browser fundamentals.", ["https://javascript.info/"]],
    ["React and component design", "Build reusable components, forms, routing, and data fetching.", ["https://react.dev/learn"]],
    ["Portfolio projects", "Create and deploy a polished accessible app with tests.", ["https://web.dev/learn/"]],
  ],
  "Backend Developer": [
    ["Programming and HTTP", "Learn request/response semantics, validation, and error handling.", ["https://developer.mozilla.org/en-US/docs/Web/HTTP"]],
    ["REST APIs and Node.js", "Build a versioned API with authentication and structured errors.", ["https://nodejs.org/en/learn"]],
    ["Databases and data modeling", "Practice indexes, relations, migrations, and query performance.", ["https://www.mongodb.com/docs/manual/"]],
    ["Production readiness", "Add tests, observability, rate limits, and deployment.", ["https://owasp.org/www-project-top-ten/"]],
  ],
  "Full Stack Developer": [
    ["Web and accessibility foundations", "Understand HTML, CSS, browser APIs, and semantic interfaces.", ["https://developer.mozilla.org/en-US/docs/Learn_web_development"]],
    ["Interactive frontend", "Build a component-driven application with forms and routing.", ["https://react.dev/learn"]],
    ["APIs and persistence", "Create protected REST endpoints backed by a well-modeled database.", ["https://nodejs.org/en/learn"]],
    ["Ship an end-to-end project", "Test, secure, document, and deploy a full-stack application.", ["https://owasp.org/www-project-top-ten/"]],
  ],
  "Data Analyst": [
    ["SQL foundations", "Filter, aggregate, join, and validate data using SQL.", ["https://www.postgresql.org/docs/current/tutorial.html"]],
    ["Python for analysis", "Use notebooks and pandas to explore datasets.", ["https://pandas.pydata.org/docs/getting_started/intro_tutorials/"]],
    ["Statistics and visualization", "Explain distributions, uncertainty, and useful visual encodings.", ["https://seeing-theory.brown.edu/"]],
    ["Portfolio analysis", "Answer a real question and document your analysis end to end.", ["https://www.kaggle.com/learn"]],
  ],
  "Data Scientist": [
    ["Python and statistics", "Strengthen programming, probability, and statistical reasoning.", ["https://docs.python.org/3/tutorial/"]],
    ["Data preparation", "Practice SQL, data quality, exploration, and feature design.", ["https://pandas.pydata.org/docs/getting_started/intro_tutorials/"]],
    ["Machine learning", "Learn model evaluation and baseline methods before complex models.", ["https://scikit-learn.org/stable/tutorial/index.html"]],
    ["Responsible project", "Communicate limitations, impact, and reproducible results.", ["https://developers.google.com/machine-learning/crash-course"]],
  ],
  "Java Developer": [
    ["Java language foundations", "Practice classes, collections, exceptions, and generics.", ["https://dev.java/learn/"]],
    ["Testing and build tools", "Write unit tests and use a repeatable build.", ["https://junit.org/junit5/docs/current/user-guide/"]],
    ["APIs and persistence", "Build REST services with validation and database access.", ["https://spring.io/guides"]],
    ["Production project", "Deploy a tested service with logs and clear documentation.", ["https://owasp.org/www-project-top-ten/"]],
  ],
  "Python Developer": [
    ["Python language foundations", "Practice data structures, modules, typing, and exceptions.", ["https://docs.python.org/3/tutorial/"]],
    ["Testing and packaging", "Build tests and a reproducible package.", ["https://docs.pytest.org/en/stable/getting-started.html"]],
    ["Web APIs and persistence", "Create validated API endpoints and persist application data.", ["https://fastapi.tiangolo.com/tutorial/"]],
    ["Production project", "Document, secure, and deploy a complete service.", ["https://owasp.org/www-project-top-ten/"]],
  ],
  "UI/UX Designer": [
    ["User research", "Practice interview planning, synthesis, and research ethics.", ["https://www.nngroup.com/articles/which-ux-research-methods/"]],
    ["Information architecture", "Organize content around users’ tasks and needs.", ["https://www.nngroup.com/articles/information-architecture-ia/"]],
    ["Interaction and prototyping", "Prototype key user flows and test them with people.", ["https://www.figma.com/resource-library/what-is-prototyping/"]],
    ["Accessible design system", "Build reusable, contrast-aware patterns and document decisions.", ["https://www.w3.org/WAI/fundamentals/accessibility-intro/"]],
  ],
};

const router = Router();
router.use(authenticate, allowRoles("candidate"));

router.get("/catalog", (_req, res) => {
  res.json({ goals: Object.keys(catalog) });
});

router.get("/", async (req, res, next) => {
  try {
    const roadmaps = await Roadmap.find({ candidate: req.user.id }).sort({ updatedAt: -1 });
    res.json({ roadmaps, goals: Object.keys(catalog) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { goal } = req.body;
    if (typeof goal !== "string" || !catalog[goal]) return res.status(400).json({ message: "Choose a career goal from the roadmap catalog." });
    const milestones = catalog[goal].map(([title, description, resources]) => ({ title, description, resources }));
    const roadmap = await Roadmap.findOneAndUpdate(
      { candidate: req.user.id, goal },
      { $setOnInsert: { candidate: req.user.id, goal, milestones } },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ roadmap });
  } catch (error) { next(error); }
});

router.patch("/:id/milestones/:milestoneId", async (req, res, next) => {
  try {
    if (typeof req.body.completed !== "boolean") return res.status(400).json({ message: "Provide completed as a boolean." });
    const roadmap = await Roadmap.findOne({ _id: req.params.id, candidate: req.user.id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found." });
    const milestone = roadmap.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    milestone.completedAt = req.body.completed ? new Date() : null;
    await roadmap.save();
    res.json({ roadmap });
  } catch (error) { next(error); }
});

export default router;
