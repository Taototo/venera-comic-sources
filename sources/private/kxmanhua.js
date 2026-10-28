/** @type {import('../_venera_.js')} */
class Kxmanhua extends ComicSource {
  name = "开心看漫画（私人）";
  key = "private_kxmanhua";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/kxmanhua.js";
  _activeDomain = "";

  settings = {
    domain: {
      title: "域名（失败时自动尝试备用域名）",
      type: "input",
      default: "kxmanhua1.com",
    },
  };

  normalizeDomain(value) {
    return String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }

  get configuredDomain() {
    return this.normalizeDomain(this.loadSetting("domain") || this.settings.domain.default);
  }

  get domainCandidates() {
    let candidates = [this._activeDomain, this.configuredDomain, "kxmanhua1.com", "kxmanhua.com"];
    let result = [];
    for (let domain of candidates) {
      domain = this.normalizeDomain(domain);
      if (domain && result.indexOf(domain) < 0) result.push(domain);
    }
    return result;
  }

  get baseUrl() {
    return `https://${this._activeDomain || this.configuredDomain}`;
  }

  headersFor(domain) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: `https://${domain}/`,
    };
  }

  get headers() {
    return this.headersFor(this._activeDomain || this.configuredDomain);
  }

  absoluteUrl(value, domain) {
    if (!value) return "";
    value = String(value);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf("//") === 0) return `https:${value}`;
    let baseUrl = `https://${this.normalizeDomain(domain || this._activeDomain || this.configuredDomain)}`;
    return `${baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`;
  }

  pathOf(value) {
    let input = String(value || "/");
    let match = input.match(/^https?:\/\/[^/]+(\/.*)?$/i);
    return match ? match[1] || "/" : input;
  }

  async request(value) {
    let input = String(value || "/");
    let hostMatch = input.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
    let preferred = hostMatch ? this.normalizeDomain(hostMatch[1]) : "";
    let path = hostMatch ? hostMatch[2] || "/" : input;
    let candidates = this.domainCandidates;
    if (preferred) {
      candidates = [preferred].concat(candidates.filter((domain) => domain !== preferred));
    }
    let lastError = "";
    for (let domain of candidates) {
      try {
        let res = await Network.get(this.absoluteUrl(path, domain), this.headersFor(domain));
        if (res.status === 200) {
          this._activeDomain = domain;
          return res;
        }
        lastError = `Invalid status code: ${res.status}`;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || "无法连接到开心看漫画";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? node.attributes[name] || "" : "";
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll(".product__pagination a[href]")) {
      let match = this.attribute(node, "href").match(/[?&]page=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll(".product__item")) {
      let link = item.querySelector(".product__item__text a[href*='/manga/']");
      if (!link) continue;
      let id = this.attribute(link, "href");
      let title = this.attribute(link, "title") || this.textOf(link);
      let coverNode = item.querySelector(".product__item__pic");
      let cover = this.attribute(coverNode, "data-setbg");
      if (!cover) {
        let image = item.querySelector("img");
        cover = this.attribute(image, "data-src") || this.attribute(image, "src");
      }
      if (!id || !title || !cover || seen[id]) continue;
      seen[id] = true;
      comics.push(new Comic({ id: id, title: title, cover: this.absoluteUrl(cover) }));
    }
    return comics;
  }

  async loadList(path) {
    let res = await this.request(path);
    let document = new HtmlDocument(res.body);
    let result = { comics: this.parseComics(document), maxPage: this.parsePageCount(document) };
    document.dispose();
    return result;
  }

  explore = [{
    title: "开心看漫画",
    type: "multiPageComicList",
    load: async (page) => this.loadList(`/manga/library?type=0&complete=1&page=${Number(page) || 1}&orderby=2`),
  }];

  category = {
    title: "开心看漫画",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["全部", "3D漫画", "韩漫", "日漫", "真人漫画", "耽美BL漫画"],
      itemType: "category",
      categoryParams: ["0", "1", "2", "3", "4", "5"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let type = String(param || "0");
      let complete = options && options[0] ? String(options[0]).split("-")[0] : "1";
      let order = options && options[1] ? String(options[1]).split("-")[0] : "2";
      return this.loadList(`/manga/library?type=${encodeURIComponent(type)}&complete=${encodeURIComponent(complete)}&page=${Number(page) || 1}&orderby=${encodeURIComponent(order)}`);
    },
    optionList: [
      { options: ["1-全部", "2-完结", "3-连载"] },
      { options: ["1-最热门", "2-最近更新", "3-最新上架"] },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      return this.loadList(`/manga/search?keyword=${encodeURIComponent(String(keyword || "").trim())}&page=${Number(page) || 1}`);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let res = await this.request(id);
      let url = this.absoluteUrl(this.pathOf(id));
      let document = new HtmlDocument(res.body);
      let title = this.textOf(document.querySelector(".anime__details__title h3"));
      let coverNode = document.querySelector(".anime__details__pic");
      let cover = this.attribute(coverNode, "data-setbg");
      let descriptionNode = document.querySelector('meta[name="description"]');
      let description = this.attribute(descriptionNode, "content").replace(/^\s*/, "");
      let authorNode = document.querySelector(".anime__details__title span");
      let author = this.textOf(authorNode).replace(/^作者：\s*/, "");
      let tags = [];
      for (let node of document.querySelectorAll(".anime__details__widget a")) {
        let value = this.textOf(node);
        if (value && tags.indexOf(value) < 0) tags.push(value);
      }
      let chapters = new Map();
      for (let node of document.querySelectorAll(".chapter_list a[href]")) {
        let href = this.attribute(node, "href");
        let chapterTitle = this.attribute(node, "title") || this.textOf(node);
        if (href && chapterTitle) chapters.set(href, chapterTitle.replace(/^韩漫\s+[^\s]+\s+/, ""));
      }
      document.dispose();
      return new ComicDetails({
        title: title || "开心看漫画",
        cover: this.absoluteUrl(cover),
        description: description,
        tags: { "作者": author ? [author] : [], "分类": tags },
        chapters: chapters,
        url: url,
      });
    },

    loadEp: async (comicId, epId) => {
      let res = await this.request(epId || comicId);
      let document = new HtmlDocument(res.body);
      let images = [];
      for (let node of document.querySelectorAll(".blog__details__content img")) {
        let image = this.attribute(node, "data-src") || this.attribute(node, "src");
        image = this.absoluteUrl(image);
        if (image && images.indexOf(image) < 0) images.push(image);
      }
      document.dispose();
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    onImageLoad: (url, comicId, epId) => ({
      headers: Object.assign({}, this.headers, {
        Referer: epId ? this.absoluteUrl(this.pathOf(epId)) : `${this.baseUrl}/`,
      }),
    }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["kxmanhua.com", "kxmanhua1.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/manga\/\d+(?:\/detail\/\d+)?)/i);
        return match ? match[1] : null;
      },
    },
  };
}
