// Maps the technologies a user selected (e.g. ["React", "Node.js",
// "MongoDB"]) to knowledge areas. Used by both the architecture rules
// loader and RAG retrieval so they always agree.
//
// Areas match the RAG document / rule file names:
//   static-web, react-vite, node-express, mern,
//   python-fastapi, java-springboot

const normalize = (techStack) =>
  Array.isArray(techStack)
    ? techStack
        .map((tech) => String(tech).trim().toLowerCase())
        .filter(Boolean)
    : [];

const anyMatches = (list, pattern) =>
  list.some((tech) => pattern.test(tech));

export const detectTechAreas = (techStack = []) => {
  const list = normalize(techStack);
  const areas = new Set();

  const hasReact = anyMatches(list, /react|vite/);

  if (hasReact) {
    areas.add("react-vite");
  }

  // Any one of HTML / CSS / JavaScript is enough
  if (!hasReact && anyMatches(list, /html|css|javascript|static/)) {
    areas.add("static-web");
  }

  if (anyMatches(list, /node|express/)) {
    areas.add("node-express");
  }

  // "MongoDB" / "Mongoose" select MERN guidance too
  if (anyMatches(list, /mern|mongo/)) {
    areas.add("mern");
  }

  // The MERN stack itself implies React and Node/Express
  if (list.includes("mern")) {
    areas.add("react-vite");
    areas.add("node-express");
  }

  if (anyMatches(list, /python|fastapi/)) {
    areas.add("python-fastapi");
  }

  // Whole word "java" so that "JavaScript" does not match
  if (anyMatches(list, /\bjava\b|spring/)) {
    areas.add("java-springboot");
  }

  return areas;
};
