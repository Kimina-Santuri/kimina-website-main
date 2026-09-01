module.exports = {
  releases: {
    label: "Releases",
    directory: "site/content/releases",
    tags: ["works", "releases"],
    defaults: {
      layout: "project.njk",
      published: false,
      type_label: "Release",
      currentPage: "works",
      animation: "dots",
      collection_url: "works.html",
      collection_label: "works",
      work_types: ["release"]
    },
    fields: [
      ["title", "Title", "text", true],
      ["display_title", "Display title", "text", true],
      ["date", "Release date", "date", true],
      ["description", "Search description", "textarea", true],
      ["summary", "Archive summary", "textarea", true],
      ["image", "Archive image", "image", true],
      ["image_alt", "Archive image description", "textarea", true],
      ["socialImage", "Social image", "image", false],
      ["story_heading", "Story heading", "text", true],
      ["hero_meta", "Hero details", "lines", false],
      ["external_url", "External link", "url", false],
      ["external_label", "External link label", "text", false],
      ["published", "Published", "checkbox", false]
    ]
  },
  performances: {
    label: "Performances",
    directory: "site/content/performances",
    exclude: ["smem-recap.md"],
    tags: ["performances"],
    defaults: {
      layout: "project.njk",
      published: false,
      status: "upcoming",
      type_label: "Performance",
      currentPage: "performances",
      animation: "waveform",
      collection_url: "performances.html",
      collection_label: "performances"
    },
    fields: [
      ["title", "Title", "text", true],
      ["display_title", "Display title", "text", true],
      ["date", "Date", "date", true],
      ["status", "Status", "select", true, ["upcoming", "archived"]],
      ["category", "Event category", "text", true],
      ["time", "Time", "text", false],
      ["programme", "Programme or admission", "text", false],
      ["location", "Location", "text", false],
      ["address", "Address lines", "lines", false],
      ["description", "Search description", "textarea", true],
      ["summary", "Archive summary", "textarea", true],
      ["additional_summary", "Additional archive note", "textarea", false],
      ["lead_image", "Lead image", "image", true],
      ["lead_alt", "Lead image description", "textarea", true],
      ["lead_caption", "Lead image caption", "text", false],
      ["story_heading", "Story heading", "text", true],
      ["hero_meta", "Hero details", "lines", false],
      ["external_url", "External link", "url", false],
      ["external_label", "External link label", "text", false],
      ["published", "Published", "checkbox", false]
    ]
  },
  residencies: {
    label: "Residencies",
    directory: "site/content/residencies",
    tags: ["residencies", "works"],
    defaults: {
      layout: "project.njk",
      published: false,
      status: "upcoming",
      type_label: "Residency",
      currentPage: "residencies",
      animation: "constellation",
      collection_url: "residencies.html",
      collection_label: "residencies",
      work_types: ["research"]
    },
    fields: [
      ["title", "Title", "text", true],
      ["display_title", "Display title", "text", true],
      ["date", "Closing or publication date", "date", true],
      ["status", "Status", "select", true, ["upcoming", "current", "archived"]],
      ["work_types", "Work categories", "multiselect", true, ["research", "collaboration", "installation", "instrument", "release"]],
      ["location", "Location", "text", true],
      ["duration", "Duration", "text", false],
      ["description", "Search description", "textarea", true],
      ["summary", "Archive summary", "textarea", true],
      ["image", "Archive image", "image", true],
      ["image_alt", "Archive image description", "textarea", true],
      ["story_heading", "Story heading", "text", true],
      ["hero_meta", "Hero details", "lines", false],
      ["external_url", "External link", "url", false],
      ["external_label", "External link label", "text", false],
      ["published", "Published", "checkbox", false]
    ]
  },
  downloads: {
    label: "Downloads",
    directory: "site/content/downloads",
    tags: ["downloads"],
    defaults: { permalink: false, published: false },
    fields: [
      ["title", "Title", "text", true],
      ["date", "Release date", "date", true],
      ["kind", "Type", "text", true],
      ["summary", "Description", "textarea", true],
      ["external_url", "Shop or download link", "url", true],
      ["external_label", "Button text", "text", true],
      ["published", "Published", "checkbox", false]
    ]
  }
};
