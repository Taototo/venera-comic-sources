/** @type {import('../_venera_.js')} */
class Csmanhua extends ComicSource {
  name = "成色漫画（私人）";
  key = "private_csmanhua";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/csmanhua.js";

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "csmanhua.cc",
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
    if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, "https:");
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
      let match = href.match(/\/(?:cstype\/\d+-|cssearch\/[^/]+------)(\d+)-?\/?$/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll(".sp-card, .sp-rank-item, .sp-bcarousel-item")) {
      let link = item.localName === "a" ? item : item.querySelector("a[href]");
      if (!link) continue;
      let id = this.attribute(link, "href");
      if (!/^\/cs-\d+\/?$/i.test(id) || seen[id]) continue;
      let titleNode = item.querySelector(".sp-card-title, .sp-rank-title, .sp-bcarousel-label");
      let title = this.attribute(link, "title") || this.textOf(titleNode) || this.textOf(link);
      let image = item.querySelector("img");
      let cover = image && (this.attribute(image, "data-src") || this.attribute(image, "src"));
      if (!cover) {
        let cropped = item.querySelector(".cropped");
        cover = this.attribute(cropped, "data-src") || this.attribute(cropped, "data-bg2");
      }
      if (!title || !cover) continue;
      seen[id] = true;
      comics.push(new Comic({
        id: id,
        title: title,
        cover: this.absoluteUrl(cover),
        description: this.textOf(item.querySelector(".sp-card-desc, .sp-rank-desc")),
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
    title: "成色漫画",
    type: "multiPageComicList",
    load: async (page) => this.loadList(`/cstype/1-${Number(page) || 1}/`),
  }];

  category = {
    title: "成色漫画",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["全部", "汉化", "日语", "外语", "同人志", "韩漫", "杂志&短篇", "3D漫画"],
      itemType: "category",
      categoryParams: ["1", "21", "22", "23", "7", "9", "6", "17"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let type = String(param || "1");
      return this.loadList(`/cstype/${type}-${Number(page) || 1}/`);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let encoded = encodeURIComponent(String(keyword || "").trim());
      let current = Number(page) || 1;
      let path = current <= 1
        ? `/cssearch/${encoded}-------/`
        : `/cssearch/${encoded}------${current}-/`;
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
      let title = this.textOf(document.querySelector(".sp-reader-title"));
      if (!title) {
        let titleNode = document.querySelector("title");
        title = this.textOf(titleNode).replace(/\s*-\s*成色漫画.*$/i, "");
      }
      let descriptionNode = document.querySelector('meta[name="description"]');
      let description = this.attribute(descriptionNode, "content");
      let imageNode = document.querySelector("#comicpage img, img.runtime-image");
      let firstImage = this.attribute(imageNode, "src") || this.attribute(imageNode, "data-src");
      let cover = this.absoluteUrl(firstImage);
      let chapters = new Map();
      let match = String(id || "").match(/\/cs-(\d+)/i);
      let comicNumber = match ? match[1] : "";
      for (let node of document.querySelectorAll("a.sp-chapter-item[href]")) {
        let href = this.attribute(node, "href");
        let pageMatch = href.match(/\/cs-\d+-(\d+)\/?$/i);
        if (pageMatch) chapters.set(href, `第${pageMatch[1]}页`);
      }
      if (comicNumber && chapters.size === 0) chapters.set(`/cs-${comicNumber}/`, "阅读");
      else if (comicNumber && !chapters.has(`/cs-${comicNumber}/`)) chapters.set(`/cs-${comicNumber}/`, "第1页");
      document.dispose();
      return new ComicDetails({
        title: title || "成色漫画",
        cover: cover,
        description: description,
        tags: {},
        chapters: chapters,
        url: url,
      });
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let images = [];
      for (let node of document.querySelectorAll("#comicpage img, img.runtime-image")) {
        let image = this.attribute(node, "src") || this.attribute(node, "data-src");
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
      domains: ["csmanhua.cc"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/cs-\d+(?:-\d+)?\/?)/i);
        return match ? match[1] : null;
      },
    },
  };
}
