const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  const markdown = markdownIt({ html: true, linkify: true, typographer: true });
  const defaultLinkOpen = markdown.renderer.rules.link_open || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = tokens[index].attrGet("href") || "";
    if (href === "https://goffbaby.com" || href.startsWith("https://goffbaby.com/")) {
      tokens[index].attrSet("target", "_blank");
      tokens[index].attrSet("rel", "noopener");
      tokens[index].attrJoin("class", "inline-link");
    }
    return defaultLinkOpen(tokens, index, options, env, self);
  };
  eleventyConfig.setLibrary("md", markdown);

  eleventyConfig.addFilter("markdownInline", (value = "") => markdown.renderInline(value));
  eleventyConfig.addFilter("displayDate", (value) => {
    const date = value instanceof Date ? value : new Date(`${value}T12:00:00Z`);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  });
  eleventyConfig.addFilter("year", (value) => value instanceof Date ? value.getUTCFullYear() : String(value || "").slice(0, 4));
  eleventyConfig.addFilter("pad2", (value) => String(value).padStart(2, "0"));
  eleventyConfig.addFilter("relativeUrl", (value = "") => String(value).replace(/^\//, ""));
  eleventyConfig.addFilter("countType", (items, type) =>
    items.filter((item) => (item.data.work_types || []).includes(type)).length
  );
  eleventyConfig.addCollection("publishedWorks", (collectionApi) =>
    collectionApi.getAll().filter((item) => {
      const tags = Array.isArray(item.data.tags) ? item.data.tags : [];
      return item.data.published && (tags.includes("works") || item.data.include_in_works);
    })
  );
  ["performances", "residencies", "downloads"].forEach((tag) => {
    const name = `published${tag[0].toUpperCase()}${tag.slice(1)}`;
    eleventyConfig.addCollection(name, (collectionApi) =>
      collectionApi.getFilteredByTag(tag).filter((item) => item.data.published && (tag !== "downloads" || item.data.external_url))
    );
  });

  const staticPages = ["404.html", "about.html", "bookings.html", "contact.html", "index.html"];
  staticPages.forEach((page) => eleventyConfig.addPassthroughCopy(page));
  [
    "CNAME",
    ".nojekyll",
    "_redirects",
    "bookings.css",
    "bookings.js",
    "landing.css",
    "landing.js",
    "stellar-player.js",
    "images",
    "downloads"
  ].forEach((asset) => eleventyConfig.addPassthroughCopy(asset));

  return {
    dir: {
      input: "site",
      includes: "_includes",
      layouts: "_layouts",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
