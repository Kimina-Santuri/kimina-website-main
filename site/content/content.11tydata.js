module.exports = {
  permalink: ({ page, published }) => published ? `${page.fileSlug}.html` : false
};
