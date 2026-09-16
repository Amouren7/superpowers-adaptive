function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

module.exports = { slugify };
