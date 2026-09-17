/** @type {import('../_venera_.js')} */
class PrivateDrmh3 extends ComicSource {
  name = "大人漫画（私人）";
  key = "private_drmh3";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/drmh3.js";

  settings = {
    domains: {
      title: "选择域名",
      type: "select",
      options: [
        { value: "https://drmh3.com", text: "drmh3.com" },
        { value: "https://drmh8.org", text: "drmh8.org（备用）" },
        { value: "https://drmh6.xyz", text: "drmh6.xyz（备用）" },
        { value: "https://drmh6.org", text: "drmh6.org（备用）" },
        { value: "https://drmh3.org", text: "drmh3.org（备用）" },
        { value: "https://drmh5.com", text: "drmh5.com（备用）" },
        { value: "https://drmh2.com", text: "drmh2.com（备用）" },
      ],
      default: "https://drmh3.com",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domains") || this.settings.domains.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (String(value).indexOf("//") === 0) return `https:${value}`;
    return `${this.baseUrl}${String(value).indexOf("/") === 0 ? "" : "/"}${value}`;
  }

  attribute(node, name) {
    if (!node) return "";
    let attributes = node.attributes || {};
    return attributes[name] || "";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  optionValue(value, fallback) {
    let result = String(value || "");
    let separator = result.indexOf("-");
    if (separator >= 0) result = result.substring(0, separator);
    return result || fallback;
  }

  pageUrl(path, page) {
    let current = Number(page) || 1;
    let value = String(path || "/").replace(/\/+$/, "");
    if (current <= 1) return this.absoluteUrl(value || "/");
    return `${this.baseUrl}${value || ""}/page/${current}`;
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let link of document.querySelectorAll("a[href]")) {
      let href = this.attribute(link, "href");
      let match = href.match(/\/page\/(\d+)(?:[\/?#]|$)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }

    let pageNode = document.querySelector(".hl-page-total");
    let pageText = this.textOf(pageNode);
    let pageMatch = pageText.match(/\/\s*(\d+)/);
    if (pageMatch) maxPage = Math.max(maxPage, parseInt(pageMatch[1], 10));
    return maxPage;
  }

  parseComic(item) {
    let thumb = item.querySelector("a.hl-item-thumb[href*='/comics-reading/']");
    let titleNode = item.querySelector(".hl-item-title a") || thumb;
    if (!thumb || !titleNode) return null;

    let id = this.attribute(titleNode, "href") || this.attribute(thumb, "href");
    let title =
      this.attribute(titleNode, "title") ||
      this.textOf(titleNode) ||
      this.attribute(thumb, "title");
    let cover =
      this.attribute(thumb, "data-original") ||
      this.attribute(thumb, "data-src") ||
      this.attribute(thumb, "src");
    let subtitle = this.textOf(item.querySelector(".hl-item-sub"));

    if (!id || !title || !cover) return null;
    return new Comic({
      id: id,
      title: title,
      subTitle: subtitle,
      cover: this.absoluteUrl(cover),
      description: subtitle,
    });
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll("li.hl-list-item")) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  async parseListPage(url) {
    let res = await Network.get(url, this.headers);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(document),
      maxPage: this.parsePageCount(document),
    };
    document.dispose();
    return result;
  }

  async loadList(path, page) {
    return this.parseListPage(this.pageUrl(path, page));
  }

  explore = [
    {
      title: "大人漫画",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", "/latest-comics"],
          ["新书上架", "/latest-comics/latest-comics"],
          ["推荐漫画", "/latest-comics/recommend"],
          ["热门排行", "/desirable-comics"],
        ];
        let result = [];
        for (let section of sections) {
          let page = await this.loadList(section[1], 1);
          if (page.comics.length > 0) {
            result.push({
              title: section[0],
              comics: page.comics,
              viewMore: `category:${section[0]}@${section[1]}`,
            });
          }
        }
        return result;
      },
    },
  ];

  category = {
    title: "大人漫画",
    parts: [
      {
        name: "页面",
        type: "fixed",
        categories: ["最新更新", "新书上架", "推荐漫画", "热门排行"],
        itemType: "category",
        categoryParams: [
          "/latest-comics",
          "/latest-comics/latest-comics",
          "/latest-comics/recommend",
          "/desirable-comics",
        ],
      },
      {
        name: "分类",
        type: "fixed",
        categories: ["全部", "韩漫", "日漫", "真人", "3D漫画"],
        itemType: "category",
        categoryParams: ["all", "韩漫", "日漫", "真人", "3D漫画"],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let value = String(param || "");
      if (value.indexOf("/") === 0) return this.loadList(value, page || 1);

      let order = this.optionValue(options && options[0], "time");
      let status = this.optionValue(options && options[1], "all");
      let categoryPath = encodeURIComponent(value || "all");
      let path = `/comics-catalog/${categoryPath}/ob/${order}/st/${status}`;
      return this.loadList(path, page || 1);
    },
    optionList: [
      { options: ["time-按时间", "hits-按阅读"] },
      { options: ["all-全部", "serialized-连载中", "completed-已完结"] },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      let current = Number(page) || 1;
      let encoded = encodeURIComponent(String(keyword || "").trim());
      let url =
        current <= 1
          ? `${this.baseUrl}/cata.php?key=${encoded}`
          : `${this.baseUrl}/comics-searching/${encoded}/page/${current}`;
      return this.parseListPage(url);
    },
    optionList: [],
  };

  fieldValue(document, label) {
    for (let item of document.querySelectorAll(".hl-full-box li")) {
      let value = this.textOf(item);
      if (value.indexOf(label) === 0) return value.substring(label.length).trim();
    }
    return "";
  }

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);

      let title = this.textOf(document.querySelector("h1.hl-dc-title")) || "大人漫画";
      let coverNode =
        document.querySelector(".hl-dc-pic .hl-item-thumb") ||
        document.querySelector(".hl-item-pic .hl-item-thumb");
      let cover =
        this.attribute(coverNode, "data-original") ||
        this.attribute(coverNode, "data-src") ||
        this.attribute(coverNode, "src");
      let author = this.textOf(
        document.querySelector(".hl-full-box li a[href*='/comics-searching/']")
      );
      let description = this.fieldValue(document, "简介：");
      if (!description) {
        let descriptionNode = document.querySelector('meta[name="description"]');
        description = this.attribute(descriptionNode, "content");
      }

      let categories = [];
      for (let node of document.querySelectorAll(".hl-full-box a.detail-tags-item")) {
        let value = this.textOf(node);
        if (value && categories.indexOf(value) < 0) categories.push(value);
      }
      let status = this.fieldValue(document, "状态：");
      let updateTime = this.fieldValue(document, "更新：");
      let chapters = new Map();
      let chapterNodes = document.querySelectorAll("#hl-plays-list a[href]");
      if (chapterNodes.length === 0) {
        chapterNodes = document.querySelectorAll(
          ".hl-rb-playlist a[href*='/comics-reading/']"
        );
      }
      for (let node of chapterNodes) {
        let chapterId = this.attribute(node, "href");
        let chapterTitle = this.attribute(node, "title") || this.textOf(node);
        if (chapterId && chapterTitle) chapters.set(chapterId, chapterTitle);
      }
      if (chapters.size === 0) {
        let reading = document.querySelector(".hl-play-wb a[href*='/comics-reading/']");
        let chapterId = this.attribute(reading, "href");
        if (chapterId) chapters.set(chapterId, "阅读");
      }

      let tags = { "作者": author ? [author] : [], "分类": categories };
      if (status) tags["状态"] = [status];
      let details = new ComicDetails({
        title: title,
        cover: this.absoluteUrl(cover),
        description: description,
        tags: tags,
        chapters: chapters,
        updateTime: updateTime,
        url: url,
      });
      document.dispose();
      return details;
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let images = [];
      let imageNodes = document.querySelectorAll("img[data-original]");
      if (imageNodes.length === 0) imageNodes = document.querySelectorAll("img[data-src]");
      for (let node of imageNodes) {
        let imageUrl =
          this.attribute(node, "data-original") ||
          this.attribute(node, "data-src") ||
          this.attribute(node, "src");
        imageUrl = this.absoluteUrl(imageUrl);
        if (imageUrl && images.indexOf(imageUrl) < 0) images.push(imageUrl);
      }
      document.dispose();
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: [
        "drmh3.com",
        "drmh8.org",
        "drmh6.xyz",
        "drmh6.org",
        "drmh3.org",
        "drmh5.com",
        "drmh2.com",
      ],
      linkToId: (url) => {
        let match = String(url || "").match(
          /^(https?:\/\/[^/]+\/comics-reading\/\d+\.html)/i
        );
        return match ? match[1] : null;
      },
    },
  };
}
