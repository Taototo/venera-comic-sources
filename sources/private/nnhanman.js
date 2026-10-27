/** @type {import('../_venera_.js')} */
class NnHanman extends ComicSource {
  name = "鸟鸟韩漫（私人）";
  key = "private_nnhanman";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/nnhanman.js";

  settings = {
    domain: {
      title: "域名",
      type: "select",
      options: [
        { value: "nnhm81.com", text: "nnhm81.com（推荐）" },
        { value: "nnhanman.xyz", text: "nnhanman.xyz" },
        { value: "nnhanman66.com", text: "nnhanman66.com" },
        { value: "nnhanman88.com", text: "nnhanman88.com" },
        { value: "nnhm92.com", text: "nnhm92.com" },
        { value: "nnhm91.com", text: "nnhm91.com" },
      ],
      default: "nnhm81.com",
    },
  };

  get baseUrl() {
    let domain = this.loadSetting("domain") || this.settings.domain.default;
    domain = String(domain).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${domain}`;
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    value = String(value);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf("//") === 0) return `https:${value}`;
    return `${this.baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`;
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? node.attributes[name] || "" : "";
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let href = this.attribute(node, "href");
      let match = href.match(/[?&]page=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll(".itemBox, .col_3_1 li")) {
      let link = item.querySelector("a[href^='/comic/'][href$='.html']");
      if (!link) continue;
      let id = this.attribute(link, "href");
      let titleNode = item.querySelector("a.title, a.txtA") || link;
      let title = this.attribute(titleNode, "title") || this.textOf(titleNode);
      let image = item.querySelector("img");
      let cover = this.attribute(image, "src") || this.attribute(image, "data-src");
      let latest = item.querySelector("a[href*='/chapter-']");
      if (!id || !title || !cover || seen[id]) continue;
      seen[id] = true;
      comics.push(new Comic({
        id: id,
        title: title,
        cover: this.absoluteUrl(cover),
        description: latest ? this.textOf(latest) : "",
      }));
    }
    return comics;
  }

  async loadList(path) {
    let res = await Network.get(this.absoluteUrl(path), this.headers);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let result = { comics: this.parseComics(document), maxPage: this.parsePageCount(document) };
    document.dispose();
    return result;
  }

  explore = [{
    title: "鸟鸟韩漫",
    type: "multiPageComicList",
    load: async (page) => this.loadList(`/update${Number(page) > 1 ? `?page=${Number(page)}` : ""}`),
  }];

  category = {
    title: "鸟鸟韩漫",
    parts: [{
      name: "页面",
      type: "fixed",
      categories: ["最新更新", "排行", "分类"],
      itemType: "category",
      categoryParams: ["/update", "/ranking", "/comics"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let path = String(param || "/update");
      if (Number(page) > 1 && path === "/update") path += `?page=${Number(page)}`;
      return this.loadList(path);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let encoded = encodeURIComponent(String(keyword || "").trim());
      let path = `/catalog.php?key=${encoded}`;
      if (Number(page) > 1) path += `&page=${Number(page)}`;
      return this.loadList(path);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let title = this.textOf(document.querySelector(".txtItme2 h1"));
      let coverNode = document.querySelector("#Cover img");
      let cover = this.attribute(coverNode, "src") || this.attribute(coverNode, "data-src");
      let author = this.textOf(document.querySelector(".sub_r .txtItme:nth-of-type(2)"));
      let description = this.textOf(document.querySelector(".txtDesc"));
      let tags = [];
      for (let node of document.querySelectorAll(".sub_r a[href^='/comics/']")) {
        let value = this.textOf(node);
        if (value && tags.indexOf(value) < 0) tags.push(value);
      }
      let updateTime = this.textOf(document.querySelector(".sub_r .date"));
      let chapters = new Map();
      for (let node of document.querySelectorAll("#mh-chapter-list-ol-0 a[href*='/chapter-']")) {
        let href = this.attribute(node, "href");
        let chapterTitle = this.textOf(node);
        if (href && chapterTitle) chapters.set(href, chapterTitle);
      }
      document.dispose();
      return new ComicDetails({
        title: title || "鸟鸟韩漫",
        cover: this.absoluteUrl(cover),
        description: description,
        tags: { "作者": author ? [author] : [], "标签": tags },
        chapters: chapters,
        updateTime: updateTime,
        url: url,
      });
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let images = [];
      for (let node of document.querySelectorAll("#currentCache img[data-src], .view-imgBox img[data-src]")) {
        let image = this.attribute(node, "data-src") || this.attribute(node, "src");
        image = this.absoluteUrl(image);
        if (image && images.indexOf(image) < 0) images.push(image);
      }
      document.dispose();
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["nnhanman.xyz", "nnhanman66.com", "nnhanman88.com", "nnhm81.com", "nnhm92.com", "nnhm91.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/comic\/[^?#]+\.html)/i);
        return match ? match[1] : null;
      },
    },
  };
}
